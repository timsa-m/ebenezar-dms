-- Fix: Allow file_url to be NULL in client_documents
-- We now use signed URLs generated on-demand, not stored public URLs.
-- This migration makes the column nullable so the DB insert no longer fails.

ALTER TABLE client_documents ALTER COLUMN file_url DROP NOT NULL;

-- Also add RLS policy for client_documents if missing
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access - client_documents" ON client_documents;
CREATE POLICY "Service role full access - client_documents"
  ON client_documents FOR ALL
  USING (true)
  WITH CHECK (true);
