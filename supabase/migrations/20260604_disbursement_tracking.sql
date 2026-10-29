-- ============================================================
-- Migration: Disbursement Tracking
-- Separates the applied amount from the actual disbursed amount,
-- enabling renegotiated disbursals and multi-step approval flows.
-- ============================================================

-- 1. Add new columns to loans table
ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS amount_applied      NUMERIC(20, 4),
  ADD COLUMN IF NOT EXISTS principal_disbursed NUMERIC(20, 4),
  ADD COLUMN IF NOT EXISTS disbursed_at        TIMESTAMPTZ;

-- 2. Back-fill: for existing loans, amount_applied = principal_amount
--    principal_disbursed is left NULL for Pending loans (not yet disbursed)
--    and set = principal_amount for Active / post-disbursement loans
UPDATE loans
SET
  amount_applied      = principal_amount,
  principal_disbursed = CASE
    WHEN status NOT IN ('Pending', 'Denied') THEN principal_amount
    ELSE NULL
  END,
  disbursed_at = CASE
    WHEN status NOT IN ('Pending', 'Denied') THEN start_date
    ELSE NULL
  END
WHERE amount_applied IS NULL;

-- 3. Comments for documentation
COMMENT ON COLUMN loans.amount_applied IS
  'The principal amount the client originally applied for. Set once at loan creation and never modified.';
COMMENT ON COLUMN loans.principal_disbursed IS
  'The actual amount disbursed to the client. May differ from amount_applied after negotiation. Set at disbursement time.';
COMMENT ON COLUMN loans.disbursed_at IS
  'Exact timestamp when funds were disbursed to the client.';
