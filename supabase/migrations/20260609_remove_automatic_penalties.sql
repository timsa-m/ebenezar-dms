-- 1. Redefine the daily job without the apply_automatic_late_fees call
DROP PROCEDURE IF EXISTS perform_daily_credit_administration_job();
DROP FUNCTION IF EXISTS perform_daily_credit_administration_job();

CREATE OR REPLACE FUNCTION perform_daily_credit_administration_job() RETURNS void AS $$
BEGIN
    -- 1. Calculate DPD
    UPDATE loans l
    SET days_past_due = COALESCE(
        (SELECT GREATEST(0, EXTRACT(DAY FROM (CURRENT_TIMESTAMP - due_date)))
         FROM loan_installments
         WHERE loan_id = l.id AND is_settled = FALSE
         ORDER BY due_date ASC LIMIT 1), 0
    )
    WHERE l.status IN ('Active', 'Substandard', 'Loss');

    -- 2. Transition Overdue Installments
    UPDATE loan_installments
    SET status = 'Overdue'
    WHERE status = 'Pending' AND due_date < CURRENT_TIMESTAMP;

    -- 3. Transition Substandard (PAR 30)
    UPDATE loans 
    SET status = 'Substandard' 
    WHERE days_past_due >= 30 AND days_past_due < 90 AND status = 'Active';

    -- 4. Transition Loss (PAR 90)
    UPDATE loans 
    SET status = 'Loss', is_accruing = FALSE 
    WHERE days_past_due >= 90 AND status IN ('Active', 'Substandard');
    
    -- 5. Mark loan as Overdue if it has Overdue installments but hasn't reached Substandard yet
    UPDATE loans
    SET status = 'Overdue'
    WHERE status = 'Active' 
      AND days_past_due > 0 
      AND days_past_due < 30;

    -- REMOVED: PERFORM apply_automatic_late_fees();
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the original penalty applying function to avoid accidental use
DROP FUNCTION IF EXISTS apply_automatic_late_fees();

-- 3. Reverse existing automatic penalties
DO $$ 
DECLARE
    v_tx RECORD;
    v_target_installment UUID;
BEGIN
    FOR v_tx IN 
        SELECT id, loan_id, amount 
        FROM loan_transactions 
        WHERE type = 'Manual Penalty' 
          AND payment_method = 'Auto Late Fee' 
          AND status = 'Active'
    LOOP
        -- a) Mark as Reversed
        UPDATE loan_transactions SET status = 'Reversed' WHERE id = v_tx.id;

        -- b) Find target installment
        SELECT id INTO v_target_installment
        FROM loan_installments
        WHERE loan_id = v_tx.loan_id AND is_settled = FALSE
        ORDER BY due_date ASC
        LIMIT 1;

        IF v_target_installment IS NULL THEN
            SELECT id INTO v_target_installment
            FROM loan_installments
            WHERE loan_id = v_tx.loan_id
            ORDER BY due_date DESC
            LIMIT 1;
        END IF;

        IF v_target_installment IS NOT NULL THEN
            UPDATE loan_installments 
            SET penalties_due = GREATEST(0, penalties_due - v_tx.amount)
            WHERE id = v_target_installment;
        END IF;

        -- c) Update loan remaining penalties
        UPDATE loans 
        SET remaining_penalties = COALESCE(
            (SELECT SUM(GREATEST(0, penalties_due - penalties_paid))
             FROM loan_installments
             WHERE loan_id = v_tx.loan_id), 0
        )
        WHERE id = v_tx.loan_id;

    END LOOP;
END;
$$ LANGUAGE plpgsql;
