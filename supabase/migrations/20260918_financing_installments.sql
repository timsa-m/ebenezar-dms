CREATE TABLE IF NOT EXISTS public.financing_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.financing_agreements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_due NUMERIC(15, 2) NOT NULL DEFAULT 0,
  interest_due NUMERIC(15, 2) NOT NULL DEFAULT 0,
  fees_due NUMERIC(15, 2) NOT NULL DEFAULT 0,
  penalties_due NUMERIC(15, 2) NOT NULL DEFAULT 0,
  principal_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  interest_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  fees_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  penalties_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(15, 2) GENERATED ALWAYS AS (principal_due + interest_due + fees_due + penalties_due) STORED,
  amount_paid NUMERIC(15, 2) GENERATED ALWAYS AS (principal_paid + interest_paid + fees_paid + penalties_paid) STORED,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(agreement_id, installment_number)
);

CREATE INDEX idx_financing_installments_agreement ON public.financing_installments(agreement_id);
CREATE INDEX idx_financing_installments_client ON public.financing_installments(client_id);
CREATE INDEX idx_financing_installments_status ON public.financing_installments(status);
