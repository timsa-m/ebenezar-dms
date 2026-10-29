-- ============================================================
-- Add missing PENALTY_APPLIED notification template
-- ============================================================
-- The PENALTY_APPLIED template was never seeded, causing penalty
-- notifications to fail silently with "Template not found".
-- ============================================================

INSERT INTO notification_templates (name, subject_template, body_template, channels, is_active)
VALUES (
  'PENALTY_APPLIED',
  'Penalty Applied — {{company_name}}',
  'Dear {{client_name}}, a penalty of {{penalty_amount}} has been applied to your loan account. Your current outstanding balance is {{outstanding_balance}}. Please contact us if you have any questions. — {{company_name}}',
  '{SMS, EMAIL, WHATSAPP}',
  true
)
ON CONFLICT (name) DO UPDATE
  SET
    subject_template = EXCLUDED.subject_template,
    body_template    = EXCLUDED.body_template,
    channels         = EXCLUDED.channels,
    is_active        = true,
    updated_at       = now();
