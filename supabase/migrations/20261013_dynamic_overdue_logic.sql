-- Drop any existing procedure or function with this name to avoid error 42809 (wrong_object_type)
DROP PROCEDURE IF EXISTS perform_daily_credit_administration_job();
DROP FUNCTION IF EXISTS perform_daily_credit_administration_job();

CREATE OR REPLACE FUNCTION perform_daily_credit_administration_job() RETURNS void AS $$ 
DECLARE
    v_grace_period_days INT;
BEGIN
    SELECT grace_period_days INTO v_grace_period_days FROM company_settings LIMIT 1;
    IF v_grace_period_days IS NULL THEN v_grace_period_days := 3; END IF;

    UPDATE loans l
    SET days_past_due = COALESCE(
        (SELECT GREATEST(0, (CURRENT_DATE - due_date::DATE))
         FROM loan_installments
         WHERE loan_id = l.id AND is_settled = FALSE
         ORDER BY due_date ASC LIMIT 1), 0
    )
    WHERE l.status IN ('Active', 'Overdue', 'Substandard', 'Loss');

    UPDATE loan_installments
    SET status = 'Overdue'
    WHERE status = 'Pending' AND CURRENT_DATE > (due_date::DATE + v_grace_period_days);

    UPDATE loans 
    SET status = 'Substandard' 
    WHERE days_past_due >= 30 AND days_past_due < 90 AND status IN ('Active', 'Overdue');

    UPDATE loans 
    SET status = 'Loss', is_accruing = FALSE 
    WHERE days_past_due >= 90 AND status IN ('Active', 'Overdue', 'Substandard');
    
    UPDATE loans
    SET status = 'Overdue'
    WHERE status = 'Active' 
      AND days_past_due > v_grace_period_days 
      AND days_past_due < 30;

    UPDATE loans
    SET status = 'Active'
    WHERE status IN ('Overdue', 'Substandard')
      AND days_past_due <= v_grace_period_days
      AND balance > 0;

    UPDATE loans l
    SET status = 'Fully Paid',
        days_past_due = 0
    WHERE l.status IN ('Active', 'Overdue', 'Substandard', 'Loss')
      AND (
          (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND is_settled = FALSE) = 0
          OR l.balance <= 0
      )
      AND (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id) > 0;

    UPDATE clients c
    SET total_borrowed = COALESCE(
        (SELECT SUM(principal_amount) FROM loans WHERE client_id = c.id AND status != 'Denied'), 0
    ),
    outstanding_balance = COALESCE(
        (SELECT SUM(balance) FROM loans WHERE client_id = c.id AND status != 'Denied'), 0
    );

END;
$$ LANGUAGE plpgsql;