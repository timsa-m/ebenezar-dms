-- ============================================================
-- Migration: Add Race Condition Protection to process_loan_repayment
-- Date: 2026-06-08
-- Why: The existing RPC function reads loan_installments in a cursor
--      without locking the rows, making concurrent repayments for
--      the same loan able to read stale data and double-allocate.
--
-- Fixes applied:
--   1. SELECT ... FOR UPDATE on the loans row — exclusive row lock
--      acquired at the start so any second concurrent call BLOCKS
--      until the first transaction commits.
--   2. SELECT ... FOR UPDATE on the installments cursor — prevents
--      other transactions from reading or modifying these rows
--      while allocation is in progress.
--   3. Explicit amount > 0 guard remains.
--   4. PostgreSQL plpgsql functions run inside their own implicit
--      transaction, so all writes are atomic — the lock is released
--      on commit/rollback.
-- ============================================================

CREATE OR REPLACE FUNCTION process_loan_repayment(
    p_loan_id          UUID,
    p_payment_amount   NUMERIC(20, 4),
    p_payment_method   TEXT,
    p_reference_id     TEXT,
    p_applied_by       TEXT,
    p_date             TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
    v_remaining_payment NUMERIC(20, 4) := p_payment_amount;
    v_inst              RECORD;
    v_loan              RECORD;
    v_tx_id             UUID;
    v_client_id         UUID;

    -- Allocation accumulators
    v_alloc_fees          NUMERIC(20, 4) := 0;
    v_alloc_penalties     NUMERIC(20, 4) := 0;
    v_alloc_overdue_int   NUMERIC(20, 4) := 0;
    v_alloc_curr_int      NUMERIC(20, 4) := 0;
    v_alloc_overdue_prin  NUMERIC(20, 4) := 0;
    v_alloc_curr_prin     NUMERIC(20, 4) := 0;
    v_alloc_wallet        NUMERIC(20, 4) := 0;

    v_deduct    NUMERIC(20, 4);
    v_is_overdue BOOLEAN;
BEGIN
    -- ── Guard: reject zero/negative amounts ────────────────────────────────────
    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Repayment amount must be strictly greater than zero.';
    END IF;

    -- ── STEP 0: Acquire an exclusive row lock on the loan ──────────────────────
    -- This is the critical race-condition fix.
    -- Any concurrent call to process_loan_repayment for the SAME loan_id will
    -- block here until this transaction commits or rolls back.
    -- If the loan doesn't exist, raise immediately.
    SELECT id, client_id
    INTO   v_loan
    FROM   loans
    WHERE  id = p_loan_id
    FOR UPDATE;  -- <-- exclusive lock acquired here

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan % not found.', p_loan_id;
    END IF;

    v_client_id := v_loan.client_id;

    -- ── STEP 1-4: Waterfall allocation across installments ─────────────────────
    -- FOR UPDATE on the cursor locks each installment row as it is read,
    -- preventing a parallel transaction from modifying the same row.
    FOR v_inst IN
        SELECT *, (due_date < CURRENT_TIMESTAMP) AS overdue_flag
        FROM   loan_installments
        WHERE  loan_id = p_loan_id
          AND  is_settled = FALSE
        ORDER  BY due_date ASC, installment_number ASC
        FOR UPDATE  -- <-- locks each installment row during iteration
    LOOP
        EXIT WHEN v_remaining_payment <= 0;
        v_is_overdue := v_inst.overdue_flag;

        -- 1: Fees
        IF (v_inst.fees_due - v_inst.fees_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.fees_due - v_inst.fees_paid));
            UPDATE loan_installments SET fees_paid = fees_paid + v_deduct WHERE id = v_inst.id;
            v_alloc_fees        := v_alloc_fees + v_deduct;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- 2: Penalties (with 3-day grace period)
        IF v_remaining_payment > 0 AND (v_inst.penalties_due - v_inst.penalties_paid) > 0 THEN
            IF (v_inst.due_date + INTERVAL '3 days') >= CURRENT_TIMESTAMP THEN
                NULL; -- within grace period, skip penalty deduction
            ELSE
                v_deduct := LEAST(v_remaining_payment, (v_inst.penalties_due - v_inst.penalties_paid));
                UPDATE loan_installments SET penalties_paid = penalties_paid + v_deduct WHERE id = v_inst.id;
                v_alloc_penalties   := v_alloc_penalties + v_deduct;
                v_remaining_payment := v_remaining_payment - v_deduct;
            END IF;
        END IF;

        -- 3: Interest
        IF v_remaining_payment > 0 AND (v_inst.interest_due - v_inst.interest_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.interest_due - v_inst.interest_paid));
            UPDATE loan_installments SET interest_paid = interest_paid + v_deduct WHERE id = v_inst.id;
            IF v_is_overdue THEN
                v_alloc_overdue_int := v_alloc_overdue_int + v_deduct;
            ELSE
                v_alloc_curr_int    := v_alloc_curr_int + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- 4: Principal
        IF v_remaining_payment > 0 AND (v_inst.principal_due - v_inst.principal_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.principal_due - v_inst.principal_paid));
            UPDATE loan_installments SET principal_paid = principal_paid + v_deduct WHERE id = v_inst.id;
            IF v_is_overdue THEN
                v_alloc_overdue_prin := v_alloc_overdue_prin + v_deduct;
            ELSE
                v_alloc_curr_prin    := v_alloc_curr_prin + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- Sync legacy UI status column
        UPDATE loan_installments
        SET
            status    = CASE WHEN is_settled THEN 'Paid' ELSE status END,
            paid_date = CASE WHEN is_settled THEN p_date ELSE NULL END
        WHERE id = v_inst.id;
    END LOOP;

    -- ── STEP 5: Wallet buffer ──────────────────────────────────────────────────
    IF v_remaining_payment > 0 THEN
        v_alloc_wallet := v_remaining_payment;
    END IF;

    -- ── STEP 6: Insert immutable transaction record ────────────────────────────
    INSERT INTO loan_transactions (
        loan_id, client_id, amount, type,
        payment_method, reference_id, applied_by, date,
        allocated_fees, allocated_penalties,
        allocated_overdue_interest, allocated_current_interest,
        allocated_overdue_principal, allocated_current_principal,
        allocated_to_wallet
    ) VALUES (
        p_loan_id, v_client_id, p_payment_amount, 'Repayment',
        p_payment_method, p_reference_id, p_applied_by, p_date,
        v_alloc_fees, v_alloc_penalties,
        v_alloc_overdue_int, v_alloc_curr_int,
        v_alloc_overdue_prin, v_alloc_curr_prin,
        v_alloc_wallet
    ) RETURNING id INTO v_tx_id;

    -- ── STEP 7: Recalculate aggregate loan balances ────────────────────────────
    -- The loans row is already locked (Step 0), so this UPDATE is safe.
    UPDATE loans l
    SET
        remaining_principal  = (SELECT COALESCE(SUM(principal_due  - principal_paid),  0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_interest   = (SELECT COALESCE(SUM(interest_due   - interest_paid),   0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_penalties  = (SELECT COALESCE(SUM(penalties_due  - penalties_paid),  0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_fees       = (SELECT COALESCE(SUM(fees_due       - fees_paid),       0) FROM loan_installments WHERE loan_id = p_loan_id),
        total_paid_principal = total_paid_principal + v_alloc_overdue_prin + v_alloc_curr_prin,
        status = CASE
            WHEN (SELECT COUNT(*) FROM loan_installments WHERE loan_id = p_loan_id AND is_settled = FALSE) = 0
            THEN 'Fully Paid'::loan_status_type
            ELSE l.status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE l.id = p_loan_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
