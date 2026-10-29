ALTER TABLE public.company_settings ADD COLUMN minimum_deposit_percentage numeric DEFAULT 40;
ALTER TABLE public.company_settings ADD COLUMN late_payment_penalty_percentage numeric DEFAULT 20;
ALTER TABLE public.company_settings ADD COLUMN grace_period_days integer DEFAULT 3;