-- ============================================================
-- Loan Agreements — Digital Signature & T&C Consent
-- ============================================================
-- Stores a record every time a client signs the loan agreement.
-- The signature is stored as an image URL in Supabase Storage.
-- One agreement per loan (unique constraint on loan_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_agreements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id          uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Snapshot of the T&C version that was signed (for immutable audit)
  terms_version    text NOT NULL DEFAULT 'v1.0',

  -- Signature image stored in Supabase Storage (client-assets bucket)
  signature_url    text NOT NULL,
  signature_path   text NOT NULL,

  -- Legal immutability: denormalize client name at time of signing
  signed_by_name   text NOT NULL,

  -- Audit metadata
  signed_at        timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- One agreement per loan
  UNIQUE(loan_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loan_agreements_loan_id   ON loan_agreements(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_client_id ON loan_agreements(client_id);

-- RLS
ALTER TABLE loan_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access - loan_agreements"
  ON loan_agreements FOR ALL USING (true) WITH CHECK (true);
