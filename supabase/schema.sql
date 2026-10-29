-- ============================================================
-- Ebenezar DMS — Supabase Schema (Airtight Core Engine)
-- ============================================================

-- ⚠️ NON-DESTRUCTIVE MIGRATION ⚠️
-- This schema is fully idempotent. You can safely paste it multiple times 
-- to update functions and structures without losing any existing data.
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE loan_status_type AS ENUM ('Pending', 'Active', 'Substandard', 'Loss', 'Fully Paid', 'Written Off', 'Denied', 'Overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_lifecycle_type AS ENUM ('Standard', 'Restructured', 'Rollover');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('Repayment', 'Disbursement', 'Manual Penalty', 'Restructure Adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. USERS & CLIENTS
-- ──────────────────────────────────────────────────────────────
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid unique references auth.users(id) on delete cascade,
  email           text not null unique,
  first_name      text not null,
  last_name       text not null,
  role            text not null default 'STAFF',   -- ADMIN | MANAGER | STAFF
  user_status     text not null default 'active',
  created_at      timestamptz not null default now()
);

create table if not exists clients (
  id                  uuid primary key default gen_random_uuid(),
  first_name          text not null,
  last_name           text not null,
  national_id         text not null,
  email               text,
  phone               text not null,
  address             text,
  total_borrowed      numeric not null default 0,
  outstanding_balance numeric not null default 0,
  created_at          timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. LOANS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    
    -- Original Contract
    principal_amount NUMERIC(20, 4) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(5, 4) NOT NULL CHECK (interest_rate >= 0),
    duration_in_months INT NOT NULL CHECK (duration_in_months > 0),
    interest_type text not null default 'Flat',
    total_payable numeric not null default 0,
    total_interest numeric not null default 0,
    
    -- Current Outstanding Balances (Source of truth)
    remaining_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_penalties NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_fees NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    -- Computed field for backward compatibility
    balance NUMERIC(20, 4) GENERATED ALWAYS AS (remaining_principal + remaining_interest + remaining_penalties + remaining_fees) STORED,
    
    -- State and Logic Control
    status loan_status_type NOT NULL DEFAULT 'Pending',
    lifecycle_state loan_lifecycle_type NOT NULL DEFAULT 'Standard',
    is_accruing BOOLEAN NOT NULL DEFAULT TRUE,
    days_past_due INT NOT NULL DEFAULT 0 CHECK (days_past_due >= 0),
    
    -- Graduation Tracking
    total_paid_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    -- Metadata and UI
    loan_type text,
    securities text,
    guarantor_name text,
    guarantor_phone text,
    guarantor_id text,
    document_url text,
    created_by uuid references users(id),
    is_high_risk boolean not null default false,
    
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_status_dpd ON loans(status, days_past_due) WHERE status NOT IN ('Fully Paid', 'Pending', 'Denied');
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id);

-- ──────────────────────────────────────────────────────────────
-- 4. INSTALLMENTS SCHEDULE
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    installment_number INT NOT NULL CHECK (installment_number > 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Breakdowns per installment
    principal_due NUMERIC(20, 4) NOT NULL CHECK (principal_due >= 0),
    interest_due NUMERIC(20, 4) NOT NULL CHECK (interest_due >= 0),
    fees_due NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (fees_due >= 0),
    penalties_due NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (penalties_due >= 0),
    
    -- Amount paid specifically against this installment
    principal_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    interest_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    fees_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    penalties_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    is_settled BOOLEAN GENERATED ALWAYS AS (
        (principal_paid >= principal_due) AND 
        (interest_paid >= interest_due) AND 
        (fees_paid >= fees_due) AND 
        (penalties_paid >= penalties_due)
    ) STORED,
    
    -- Backward compatibility for UI
    amount_due NUMERIC(20, 4) GENERATED ALWAYS AS (principal_due + interest_due + fees_due + penalties_due) STORED,
    amount_paid NUMERIC(20, 4) GENERATED ALWAYS AS (principal_paid + interest_paid + fees_paid + penalties_paid) STORED,
    status text NOT NULL DEFAULT 'Pending',
    paid_date timestamptz,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(loan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installments_unpaid ON loan_installments(loan_id, due_date) WHERE is_settled = FALSE;

-- ──────────────────────────────────────────────────────────────
-- 5. LOAN TRANSACTIONS (Consolidates Repayments & Penalties)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    
    -- Metadata (covers repayment method and penalty types)
    payment_method text,
    reference_id text,
    comment text,
    applied_by text,
    status text not null default 'Active',
    
    -- Allocation tracking details for historical transparency
    allocated_fees NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_penalties NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_overdue_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_current_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_overdue_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_current_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_to_wallet NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON loan_transactions(loan_id);

-- ──────────────────────────────────────────────────────────────
-- 6. AUDIT LOGS
-- ──────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  loan_id         uuid references loans(id) ON DELETE CASCADE,
  entity_type     text,
  action          text not null,
  performed_by    text not null,
  description     text,
  previous_value  text,
  new_value       text,
  timestamp       timestamptz not null default now(),
  user_id         text,
  created_at      timestamptz not null default now()
);


-- ──────────────────────────────────────────────────────────────
-- 7. PL/PGSQL PROCEDURES & FUNCTIONS
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_loan_repayment(
    p_loan_id UUID,
    p_payment_amount NUMERIC(20, 4),
    p_payment_method TEXT,
    p_reference_id TEXT,
    p_applied_by TEXT,
    p_date TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
    v_remaining_payment NUMERIC(20, 4) := p_payment_amount;
    v_inst RECORD;
    v_tx_id UUID;
    v_client_id UUID;
    
    -- Transaction Allocation Accumulators
    v_alloc_fees NUMERIC(20, 4) := 0;
    v_alloc_penalties NUMERIC(20, 4) := 0;
    v_alloc_overdue_int NUMERIC(20, 4) := 0;
    v_alloc_curr_int NUMERIC(20, 4) := 0;
    v_alloc_overdue_prin NUMERIC(20, 4) := 0;
    v_alloc_curr_prin NUMERIC(20, 4) := 0;
    v_alloc_wallet NUMERIC(20, 4) := 0;
    
    v_deduct NUMERIC(20, 4);
    v_is_overdue BOOLEAN;
BEGIN
    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Repayment amount must be strictly greater than zero.';
    END IF;

    -- ── STEP 0: Acquire an exclusive row lock on the loan ──────────────────────
    SELECT client_id INTO v_client_id 
    FROM loans 
    WHERE id = p_loan_id 
    FOR UPDATE;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Loan % not found.', p_loan_id;
    END IF;

    -- ── STEP 1-4: Waterfall allocation across installments ─────────────────────
    FOR v_inst IN 
        SELECT *, (due_date < CURRENT_TIMESTAMP) AS overdue_flag
        FROM loan_installments 
        WHERE loan_id = p_loan_id AND is_settled = FALSE
        ORDER BY due_date ASC, installment_number ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining_payment <= 0;
        v_is_overdue := v_inst.overdue_flag;

        -- 1: Fees Allocation
        IF (v_inst.fees_due - v_inst.fees_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.fees_due - v_inst.fees_paid));
            UPDATE loan_installments SET fees_paid = fees_paid + v_deduct WHERE id = v_inst.id;
            v_alloc_fees := v_alloc_fees + v_deduct;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- 2: Penalties Allocation
        IF v_remaining_payment > 0 AND (v_inst.penalties_due - v_inst.penalties_paid) > 0 THEN
            IF (v_inst.due_date + INTERVAL '3 days') >= CURRENT_TIMESTAMP THEN
                NULL;
            ELSE
                v_deduct := LEAST(v_remaining_payment, (v_inst.penalties_due - v_inst.penalties_paid));
                UPDATE loan_installments SET penalties_paid = penalties_paid + v_deduct WHERE id = v_inst.id;
                v_alloc_penalties := v_alloc_penalties + v_deduct;
                v_remaining_payment := v_remaining_payment - v_deduct;
            END IF;
        END IF;

        -- 3: Interest Allocation
        IF v_remaining_payment > 0 AND (v_inst.interest_due - v_inst.interest_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.interest_due - v_inst.interest_paid));
            UPDATE loan_installments SET interest_paid = interest_paid + v_deduct WHERE id = v_inst.id;
            
            IF v_is_overdue THEN
                v_alloc_overdue_int := v_alloc_overdue_int + v_deduct;
            ELSE
                v_alloc_curr_int := v_alloc_curr_int + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- 4: Principal Allocation
        IF v_remaining_payment > 0 AND (v_inst.principal_due - v_inst.principal_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.principal_due - v_inst.principal_paid));
            UPDATE loan_installments SET principal_paid = principal_paid + v_deduct WHERE id = v_inst.id;
            
            IF v_is_overdue THEN
                v_alloc_overdue_prin := v_alloc_overdue_prin + v_deduct;
            ELSE
                v_alloc_curr_prin := v_alloc_curr_prin + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;
        
        -- Sync legacy UI statuses
        UPDATE loan_installments 
        SET 
            status = CASE WHEN is_settled THEN 'Paid' ELSE status END,
            paid_date = CASE WHEN is_settled THEN p_date ELSE NULL END
        WHERE id = v_inst.id;
    END LOOP;

    -- 5: Wallet buffer
    IF v_remaining_payment > 0 THEN
        v_alloc_wallet := v_remaining_payment;
    END IF;

    -- Permanent Entry
    INSERT INTO loan_transactions (
        loan_id, client_id, amount, type, payment_method, reference_id, applied_by, date,
        allocated_fees, allocated_penalties, allocated_overdue_interest, allocated_current_interest,
        allocated_overdue_principal, allocated_current_principal, allocated_to_wallet
    ) VALUES (
        p_loan_id, v_client_id, p_payment_amount, 'Repayment', p_payment_method, p_reference_id, p_applied_by, p_date,
        v_alloc_fees, v_alloc_penalties, v_alloc_overdue_int, v_alloc_curr_int, 
        v_alloc_overdue_prin, v_alloc_curr_prin, v_alloc_wallet
    ) RETURNING id INTO v_tx_id;

    -- Synchronize Aggregates
    UPDATE loans l
    SET 
        remaining_principal = (SELECT COALESCE(SUM(principal_due - principal_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_interest  = (SELECT COALESCE(SUM(interest_due - interest_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_penalties = (SELECT COALESCE(SUM(penalties_due - penalties_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_fees      = (SELECT COALESCE(SUM(fees_due - fees_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        total_paid_principal = total_paid_principal + v_alloc_overdue_prin + v_alloc_curr_prin,
        status = CASE 
            WHEN (SELECT COUNT(*) FROM loan_installments WHERE loan_id = p_loan_id AND is_settled = FALSE) = 0 THEN 'Fully Paid'::loan_status_type
            ELSE l.status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE l.id = p_loan_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop the old function version if it exists, since we are changing it to a PROCEDURE
DROP FUNCTION IF EXISTS perform_daily_credit_administration_job();

CREATE OR REPLACE PROCEDURE perform_daily_credit_administration_job() AS $$
BEGIN
    -- 1. Calculate and update Days Past Due (DPD) for active loans based on oldest unpaid installment
    UPDATE public.loans l
    SET days_past_due = COALESCE(
        (SELECT GREATEST(0, (CURRENT_DATE - due_date::DATE))
         FROM public.loan_installments
         WHERE loan_id = l.id AND is_settled = FALSE
         ORDER BY due_date ASC LIMIT 1), 0
    )
    WHERE l.status IN ('Active', 'Substandard', 'Loss');

    -- 2. Transition Overdue Installments
    UPDATE loan_installments
    SET status = 'Overdue'
    WHERE status = 'Pending' AND due_date < CURRENT_TIMESTAMP;

    -- 3. Transition Substandard (PAR 30)
    UPDATE loans 
    SET status = 'Substandard' 
    WHERE days_past_due >= 30 AND days_past_due < 90 AND status = 'Active';

    -- 4. Transition Loss (PAR 90)
    UPDATE loans 
    SET status = 'Loss', is_accruing = FALSE 
    WHERE days_past_due >= 90 AND status IN ('Active', 'Substandard');
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────
alter table users               enable row level security;
alter table clients             enable row level security;
alter table loans               enable row level security;
alter table loan_installments   enable row level security;
alter table loan_transactions   enable row level security;
alter table audit_logs          enable row level security;

DROP POLICY IF EXISTS "Service role full access - users"             on users;
DROP POLICY IF EXISTS "Service role full access - clients"           on clients;
DROP POLICY IF EXISTS "Service role full access - loans"             on loans;
DROP POLICY IF EXISTS "Service role full access - loan_installments" on loan_installments;
DROP POLICY IF EXISTS "Service role full access - loan_transactions" on loan_transactions;
DROP POLICY IF EXISTS "Service role full access - audit_logs"        on audit_logs;

create policy "Service role full access - users"             on users             for all using (true) with check (true);
create policy "Service role full access - clients"           on clients           for all using (true) with check (true);
create policy "Service role full access - loans"             on loans             for all using (true) with check (true);
create policy "Service role full access - loan_installments" on loan_installments for all using (true) with check (true);
create policy "Service role full access - loan_transactions" on loan_transactions for all using (true) with check (true);
create policy "Service role full access - audit_logs"        on audit_logs        for all using (true) with check (true);

-- ──────────────────────────────────────────────────────────────
-- 8. WEBSITE INTEGRATION
-- ──────────────────────────────────────────────────────────────
-- 1. Add missing vehicle fields (Note: vehicles table is defined elsewhere or implicitly)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS hire_price NUMERIC(20, 4),
ADD COLUMN IF NOT EXISTS hire_price_weekly NUMERIC(20, 4),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS for_hire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chassis_no TEXT,
ADD COLUMN IF NOT EXISTS engine_no TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Create website_messages
CREATE TABLE IF NOT EXISTS website_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create hire_requests
CREATE TABLE IF NOT EXISTS hire_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create trade_in_requests
CREATE TABLE IF NOT EXISTS trade_in_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make_model TEXT NOT NULL,
    year INT NOT NULL,
    mileage INT NOT NULL,
    condition TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE website_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access - website_messages" ON website_messages;
DROP POLICY IF EXISTS "Service role full access - hire_requests" ON hire_requests;
DROP POLICY IF EXISTS "Service role full access - trade_in_requests" ON trade_in_requests;

CREATE POLICY "Service role full access - website_messages" ON website_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - hire_requests" ON hire_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - trade_in_requests" ON trade_in_requests FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- VEHICLE HANDOVER, INSPECTION & CLEARANCE SYSTEM
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE incoming_handover_status AS ENUM (
    'draft',
    'inspection_in_progress',
    'received_with_discrepancies',
    'received_and_verified',
    'under_management_review',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE outgoing_handover_status AS ENUM (
    'draft',
    'awaiting_financial_clearance',
    'awaiting_inspection',
    'awaiting_approval',
    'ready_for_handover',
    'vehicle_released',
    'logbook_transfer_pending',
    'ownership_transfer_confirmed',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE handover_type AS ENUM ('incoming', 'outgoing');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE accessory_status AS ENUM (
    'received_and_verified',
    'missing',
    'received_but_defective',
    'pending_verification',
    'not_applicable'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE condition_rating AS ENUM (
    'good',
    'fair',
    'poor',
    'defective',
    'not_inspected'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE logbook_transfer_status AS ENUM (
    'not_received',
    'received',
    'verified',
    'transfer_initiated',
    'documents_submitted',
    'transfer_pending',
    'ownership_confirmed',
    'document_released_to_client'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE discrepancy_status AS ENUM (
    'open',
    'under_review',
    'resolved',
    'escalated'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. vehicle_handover_records (master record per handover event)
CREATE TABLE IF NOT EXISTS public.vehicle_handover_records (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  acquisition_ref           uuid,
  sale_ref                  uuid,
  client_id                 uuid REFERENCES public.clients(id),
  handover_type             handover_type NOT NULL,
  incoming_status           incoming_handover_status,
  outgoing_status           outgoing_handover_status,
  acquisition_date          timestamptz,
  previous_owner            text,
  received_by_user_id       uuid REFERENCES public.users(id),
  received_by_name          text,
  handed_over_by            text,
  odometer_km               numeric,
  fuel_level                text,
  storage_location          text,
  collection_date           timestamptz,
  releasing_user_id         uuid REFERENCES public.users(id),
  releasing_user_name       text,
  authorized_recipient      text,
  customer_acknowledged     boolean  DEFAULT false,
  acknowledgment_notes      text,
  financial_clearance_status  text  DEFAULT 'uncleared',
  exception_approved_by       uuid REFERENCES public.users(id),
  exception_approved_by_name  text,
  exception_reason            text,
  exception_approved_at       timestamptz,
  overall_condition           text,
  outstanding_issues          text,
  workflow_step               int DEFAULT 1,
  submitted_at                timestamptz,
  completed_at                timestamptz,
  is_cancelled                boolean DEFAULT false,
  cancelled_by                uuid REFERENCES public.users(id),
  cancelled_at                timestamptz,
  cancellation_reason         text,
  created_by_user_id          uuid REFERENCES public.users(id),
  created_by_name             text,
  updated_by_user_id          uuid REFERENCES public.users(id),
  updated_by_name             text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_incoming_active
  ON public.vehicle_handover_records (vehicle_id)
  WHERE handover_type = 'incoming' AND is_cancelled = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_outgoing_active
  ON public.vehicle_handover_records (vehicle_id)
  WHERE handover_type = 'outgoing' AND is_cancelled = false;

CREATE INDEX IF NOT EXISTS idx_handover_vehicle_id ON public.vehicle_handover_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_handover_client_id  ON public.vehicle_handover_records(client_id);
CREATE INDEX IF NOT EXISTS idx_handover_type       ON public.vehicle_handover_records(handover_type);

-- 3. vehicle_accessory_records
CREATE TABLE IF NOT EXISTS public.vehicle_accessory_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  handover_type   handover_type NOT NULL,
  accessory_name  text NOT NULL,
  accessory_label text NOT NULL,
  status          accessory_status NOT NULL DEFAULT 'pending_verification',
  condition_notes text,
  reason_if_missing text,
  is_original_document  boolean,
  document_verified     boolean DEFAULT false,
  received_from_name    text,
  ownership_discrepancy text,
  photo_urls            text[],
  recorded_by_user_id   uuid REFERENCES public.users(id),
  recorded_by_name      text,
  recorded_at           timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accessory_handover_id ON public.vehicle_accessory_records(handover_id);
CREATE INDEX IF NOT EXISTS idx_accessory_vehicle_id  ON public.vehicle_accessory_records(vehicle_id);

-- 4. vehicle_condition_inspections
CREATE TABLE IF NOT EXISTS public.vehicle_condition_inspections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  handover_type   handover_type NOT NULL,
  category        text NOT NULL,
  item_key        text NOT NULL,
  item_label      text NOT NULL,
  rating          condition_rating NOT NULL DEFAULT 'not_inspected',
  notes           text,
  photo_urls      text[],
  inspected_by_user_id  uuid REFERENCES public.users(id),
  inspected_by_name     text,
  inspected_at          timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_condition_handover_id ON public.vehicle_condition_inspections(handover_id);
CREATE INDEX IF NOT EXISTS idx_condition_vehicle_id  ON public.vehicle_condition_inspections(vehicle_id);

-- 5. vehicle_logbook_transfers
CREATE TABLE IF NOT EXISTS public.vehicle_logbook_transfers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id                 uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id                  uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  current_registered_owner    text,
  intended_new_owner          text,
  document_reference          text,
  status                      logbook_transfer_status NOT NULL DEFAULT 'not_received',
  transfer_initiated_date     timestamptz,
  transfer_reference_no       text,
  handling_user_id            uuid REFERENCES public.users(id),
  handling_user_name          text,
  supporting_doc_urls         text[],
  notes                       text,
  delay_reason                text,
  ownership_confirmed_date    timestamptz,
  confirmed_by_user_id        uuid REFERENCES public.users(id),
  confirmed_by_name           text,
  document_released_to_client_date  timestamptz,
  releasing_user_id           uuid REFERENCES public.users(id),
  releasing_user_name         text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logbook_handover_id ON public.vehicle_logbook_transfers(handover_id);
CREATE INDEX IF NOT EXISTS idx_logbook_vehicle_id  ON public.vehicle_logbook_transfers(vehicle_id);

-- 6. vehicle_handover_discrepancies
CREATE TABLE IF NOT EXISTS public.vehicle_handover_discrepancies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id           uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id            uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  discrepancy_type      text NOT NULL,
  item_reference        text,
  description           text NOT NULL,
  severity              text DEFAULT 'medium',
  status                discrepancy_status NOT NULL DEFAULT 'open',
  resolution_notes      text,
  resolved_by_user_id   uuid REFERENCES public.users(id),
  resolved_by_name      text,
  resolved_at           timestamptz,
  supporting_doc_urls   text[],
  raised_by_user_id     uuid REFERENCES public.users(id),
  raised_by_name        text,
  raised_at             timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_handover_id ON public.vehicle_handover_discrepancies(handover_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_vehicle_id  ON public.vehicle_handover_discrepancies(vehicle_id);

-- 7. vehicle_handover_audit_logs (append-only)
CREATE TABLE IF NOT EXISTS public.vehicle_handover_audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  event_type      text NOT NULL,
  event_data      jsonb,
  description     text NOT NULL,
  performed_by_user_id  uuid REFERENCES public.users(id),
  performed_by_name     text,
  performed_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handover_audit_handover_id ON public.vehicle_handover_audit_logs(handover_id);
CREATE INDEX IF NOT EXISTS idx_handover_audit_vehicle_id  ON public.vehicle_handover_audit_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_handover_audit_performed_at ON public.vehicle_handover_audit_logs(performed_at DESC);

-- 8. RLS
ALTER TABLE public.vehicle_handover_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_accessory_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_condition_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_logbook_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_handover_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_handover_audit_logs   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access - vehicle_handover_records"       ON public.vehicle_handover_records;
DROP POLICY IF EXISTS "Service role full access - vehicle_accessory_records"      ON public.vehicle_accessory_records;
DROP POLICY IF EXISTS "Service role full access - vehicle_condition_inspections"  ON public.vehicle_condition_inspections;
DROP POLICY IF EXISTS "Service role full access - vehicle_logbook_transfers"      ON public.vehicle_logbook_transfers;
DROP POLICY IF EXISTS "Service role full access - vehicle_handover_discrepancies" ON public.vehicle_handover_discrepancies;
DROP POLICY IF EXISTS "Service role full access - vehicle_handover_audit_logs"    ON public.vehicle_handover_audit_logs;

CREATE POLICY "Service role full access - vehicle_handover_records"       ON public.vehicle_handover_records       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - vehicle_accessory_records"      ON public.vehicle_accessory_records      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - vehicle_condition_inspections"  ON public.vehicle_condition_inspections  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - vehicle_logbook_transfers"      ON public.vehicle_logbook_transfers      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - vehicle_handover_discrepancies" ON public.vehicle_handover_discrepancies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - vehicle_handover_audit_logs"    ON public.vehicle_handover_audit_logs    FOR ALL USING (true) WITH CHECK (true);

