-- ============================================================
-- Migration: Disbursement Notification Template + Enhanced
--            OVERDUE_NOTICE with multi-line body (dollar-quoting)
-- ============================================================

-- 1. Insert LOAN_DISBURSEMENT template
--    Uses $$ dollar-quoting so the body can span natural lines.
INSERT INTO notification_templates (name, subject_template, body_template, channels)
VALUES (
  'LOAN_DISBURSEMENT',
  'Funds Disbursed – {{company_name}}',
  $$Dear {{client_name}},

Your loan has been approved and funds of {{disbursed_amount}} have been disbursed to you.

Loan summary:
• Amount Applied : {{amount_applied}}
• Amount Disbursed: {{disbursed_amount}}
• Outstanding Difference: {{undisbursed_remainder}}
• First Installment : {{installment_amount}} due {{due_date}}

Please ensure timely repayments to avoid penalties.

{{company_name}} | Accounts Team$$,
  '{SMS, EMAIL}'
)
ON CONFLICT (name) DO NOTHING;


-- 2. Upsert OVERDUE_NOTICE with a modern multi-line body
UPDATE notification_templates
SET
  subject_template = 'URGENT: Overdue Loan Payment – {{company_name}}',
  body_template = $$Dear {{client_name}},

Your loan payment is OVERDUE.

Loan Details:
• Principal Disbursed : {{disbursed_amount}}
• Total Amount Due    : {{outstanding_balance}}
• Days Past Due       : {{days_past_due}} day(s)
• Original Due Date   : {{due_date}}

Immediate action is required to avoid further penalties and legal proceedings.

Please contact us or make payment now.

{{company_name}} | Credit & Collections
Tel: +254 700 000 000$$,
  updated_at = NOW()
WHERE name = 'OVERDUE_NOTICE';
