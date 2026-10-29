-- ============================================================
-- Elelyon LMS — Auto-cure Overdue Loans & Auto-mark Fully Paid
-- ============================================================

CREATE OR REPLACE FUNCTION perform_daily_credit_administration_job() RETURNS void AS $$
BEGIN
    -- 1. Calculate DPD using accurate date arithmetic
    UPDATE loans l
    SET days_past_due = COALESCE(
        (SELECT GREATEST(0, (CURRENT_DATE - due_date::DATE))
         FROM loan_installments
         WHERE loan_id = l.id AND is_settled = FALSE
         ORDER BY due_date ASC LIMIT 1), 0
    )
    WHERE l.status IN ('Active', 'Overdue', 'Substandard', 'Loss');

    -- 2. Transition Overdue Installments
    UPDATE loan_installments
    SET status = 'Overdue'
    WHERE status = 'Pending' AND due_date < CURRENT_TIMESTAMP;

    -- 3. Transition Substandard (PAR 30)
    UPDATE loans 
    SET status = 'Substandard' 
    WHERE days_past_due >= 30 AND days_past_due < 90 AND status IN ('Active', 'Overdue');

    -- 4. Transition Loss (PAR 90)
    UPDATE loans 
    SET status = 'Loss', is_accruing = FALSE 
    WHERE days_past_due >= 90 AND status IN ('Active', 'Overdue', 'Substandard');
    
    -- 5. Mark loan as Overdue if it has overdue installments but hasn't reached Substandard yet
    UPDATE loans
    SET status = 'Overdue'
    WHERE status = 'Active' 
      AND days_past_due > 0 
      AND days_past_due < 30;

    -- 6. Cure / Heal: Restore Overdue / Substandard loans back to Active if the borrower paid their overdue balance (days_past_due = 0) and loan has unpaid balance
    UPDATE loans
    SET status = 'Active'
    WHERE status IN ('Overdue', 'Substandard')
      AND days_past_due = 0
      AND balance > 0;

    -- 7. Transition loans where all installments are settled or balance <= 0 to Fully Paid
    UPDATE loans l
    SET status = 'Fully Paid',
        days_past_due = 0
    WHERE l.status IN ('Active', 'Overdue', 'Substandard', 'Loss')
      AND (
          (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND is_settled = FALSE) = 0
          OR l.balance <= 0
      )
      AND (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id) > 0;

    -- 8. Synchronize client totals with actual loans so clients.total_borrowed never goes out of sync
    UPDATE clients c
    SET total_borrowed = COALESCE(
        (SELECT SUM(principal_amount) FROM loans WHERE client_id = c.id AND status != 'Denied'), 0
    ),
    outstanding_balance = COALESCE(
        (SELECT SUM(balance) FROM loans WHERE client_id = c.id AND status != 'Denied'), 0
    );

END;
$$ LANGUAGE plpgsql;
