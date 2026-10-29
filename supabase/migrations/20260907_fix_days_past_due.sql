-- Fix days_past_due calculation
-- Bug 1: EXTRACT(DAY FROM interval) only returns the day component (0-30), not total days
-- Bug 2: Loans with status 'Overdue' were excluded from the DPD update filter,
--         so their days_past_due froze the moment they transitioned to Overdue
--
-- Fix: Use CURRENT_DATE - due_date::DATE for accurate total-day arithmetic
--       and include 'Overdue' in the status filter

DROP FUNCTION IF EXISTS perform_daily_credit_administration_job();
DROP PROCEDURE IF EXISTS perform_daily_credit_administration_job();

CREATE OR REPLACE FUNCTION perform_daily_credit_administration_job() RETURNS void AS $$
BEGIN
    -- 1. Calculate DPD using accurate date arithmetic
    --    IMPORTANT: 'Overdue' MUST be included here, otherwise DPD freezes
    --    once a loan transitions from Active → Overdue
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

END;
$$ LANGUAGE plpgsql;

-- Run immediately to retroactively fix all stuck loans
SELECT perform_daily_credit_administration_job();
