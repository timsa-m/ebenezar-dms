-- ============================================================
-- Migration: Daily Report Performance Indexes
-- Optimises the two new daily-report queries:
--   1. Loans with installments due within the current ISO week
--   2. Overdue/Substandard/Loss loans for the alert blast
-- ============================================================

-- 1. Index for "Due This Week" query
--    Targets installments in the date range (current ISO week)
CREATE INDEX IF NOT EXISTS idx_installments_due_week
  ON loan_installments(due_date)
  WHERE is_settled = FALSE;

-- 2. Index for overdue loan dashboard query
--    Covers loans by status and days_past_due for quick filtering
CREATE INDEX IF NOT EXISTS idx_loans_overdue_report
  ON loans(status, days_past_due)
  WHERE status IN ('Overdue', 'Substandard', 'Loss');

-- 3. Index to quickly look up disbursed_at for reporting
CREATE INDEX IF NOT EXISTS idx_loans_disbursed_at
  ON loans(disbursed_at)
  WHERE disbursed_at IS NOT NULL;
