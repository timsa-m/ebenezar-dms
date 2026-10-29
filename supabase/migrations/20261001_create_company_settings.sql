-- Migration: Create company_settings table for Admin configuration

CREATE TABLE IF NOT EXISTS public.company_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name text NOT NULL DEFAULT 'EBENEZAR ENTERPRISES CAR BAZAAR',
    kra_pin text,
    physical_address text,
    primary_phone text,
    email_address text,
    mpesa_paybill text,
    mpesa_account text,
    bank_name text,
    bank_account text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_single_row_idx ON public.company_settings((true));

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access" ON public.company_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin full access" ON public.company_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
        )
    );

-- Insert default row if none exists
INSERT INTO public.company_settings (company_name, kra_pin, physical_address, primary_phone, email_address)
VALUES (
    'EBENEZAR ENTERPRISES CAR BAZAAR',
    'P051642988V',
    'Patel''s, Ondiek Hwy, Kisumu, Kenya',
    '+254 722 263 192',
    'ebenezerenterprisesltd@gmail.com'
) ON CONFLICT DO NOTHING;

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION update_company_settings_updated_at();
