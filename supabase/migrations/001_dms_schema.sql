-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE vehicle_cost_type AS ENUM ('mechanical', 'bodywork', 'tracking', 'detailing', 'legal', 'import_duty', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_interest_type AS ENUM ('hire_purchase', 'cash_purchase', 'trade_in', 'general_inquiry');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'test_drive_scheduled', 'converted', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter Existing Tables (Add missing columns)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email text, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE vehicles 
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS mileage integer,
  ADD COLUMN IF NOT EXISTS engine_capacity text,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS features text[],
  ADD COLUMN IF NOT EXISTS images text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE financing_agreements
  ADD COLUMN IF NOT EXISTS deposit_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS principal_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE repayments
  ADD COLUMN IF NOT EXISTS allocated_penalties numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allocated_overdue_interest numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allocated_principal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_no text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Create Missing Tables
CREATE TABLE IF NOT EXISTS vehicle_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  cost_type vehicle_cost_type NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  receipt_url text,
  vendor_name text,
  incurred_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  national_id text,
  interest_type lead_interest_type NOT NULL,
  proposed_deposit numeric,
  monthly_budget numeric,
  status lead_status NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Re-apply Row Level Security (RLS)
ALTER TABLE vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access - vehicle_costs" on vehicle_costs;
DROP POLICY IF EXISTS "Service role full access - crm_leads" on crm_leads;

CREATE POLICY "Service role full access - vehicle_costs" ON vehicle_costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - crm_leads" ON crm_leads FOR ALL USING (true) WITH CHECK (true);
