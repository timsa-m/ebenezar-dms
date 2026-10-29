CREATE TABLE IF NOT EXISTS public.penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.financing_agreements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  penalty_type VARCHAR(100) NOT NULL,
  comment TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  date_applied TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access - penalties" ON public.penalties;
CREATE POLICY "Service role full access - penalties" ON public.penalties FOR ALL USING (true) WITH CHECK (true);
