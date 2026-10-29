-- =============================================================================
-- Migration: Vehicle Handover, Inspection & Clearance Management System
-- Ebenezar Enterprises LTD — DMS
-- =============================================================================
-- This migration is fully idempotent (safe to run multiple times).

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2. vehicle_handover_records (master record per handover event)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_handover_records (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle & Transaction Links
  vehicle_id                uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  -- Reference to vehicle_purchases (for incoming) or financing_agreements (for outgoing)
  acquisition_ref           uuid,   -- vehicle_purchases.id (incoming)
  sale_ref                  uuid,   -- financing_agreements.id (outgoing)
  client_id                 uuid REFERENCES public.clients(id),  -- for outgoing

  -- Handover Type & Status
  handover_type             handover_type NOT NULL,
  incoming_status           incoming_handover_status,
  outgoing_status           outgoing_handover_status,

  -- Acquisition Details (for incoming)
  acquisition_date          timestamptz,
  previous_owner            text,
  received_by_user_id       uuid REFERENCES public.users(id),
  received_by_name          text,
  handed_over_by            text,     -- person physically delivering the vehicle
  odometer_km               numeric,
  fuel_level                text,     -- e.g. "Full", "3/4", "Half", "1/4", "Empty"
  storage_location          text,

  -- Sale/Client Details (for outgoing)
  collection_date           timestamptz,
  releasing_user_id         uuid REFERENCES public.users(id),
  releasing_user_name       text,
  authorized_recipient      text,    -- if someone other than buyer collects
  customer_acknowledged     boolean  DEFAULT false,
  acknowledgment_notes      text,

  -- Financial Clearance (outgoing)
  financial_clearance_status  text  DEFAULT 'uncleared',  -- 'uncleared' | 'cleared' | 'exception_approved'
  exception_approved_by       uuid REFERENCES public.users(id),
  exception_approved_by_name  text,
  exception_reason            text,
  exception_approved_at       timestamptz,

  -- Overall Condition Summary
  overall_condition           text,
  outstanding_issues          text,

  -- Workflow Control
  workflow_step               int DEFAULT 1,  -- UI step tracker
  submitted_at                timestamptz,
  completed_at                timestamptz,

  -- Soft Cancellation
  is_cancelled                boolean DEFAULT false,
  cancelled_by                uuid REFERENCES public.users(id),
  cancelled_at                timestamptz,
  cancellation_reason         text,

  -- Audit
  created_by_user_id          uuid REFERENCES public.users(id),
  created_by_name             text,
  updated_by_user_id          uuid REFERENCES public.users(id),
  updated_by_name             text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate active incoming handovers for the same vehicle
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_incoming_active
  ON public.vehicle_handover_records (vehicle_id)
  WHERE handover_type = 'incoming' AND is_cancelled = false;

-- Prevent duplicate active outgoing handovers for the same vehicle
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_outgoing_active
  ON public.vehicle_handover_records (vehicle_id)
  WHERE handover_type = 'outgoing' AND is_cancelled = false;

CREATE INDEX IF NOT EXISTS idx_handover_vehicle_id ON public.vehicle_handover_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_handover_client_id  ON public.vehicle_handover_records(client_id);
CREATE INDEX IF NOT EXISTS idx_handover_type       ON public.vehicle_handover_records(handover_type);

-- ---------------------------------------------------------------------------
-- 3. vehicle_accessory_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_accessory_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  handover_type   handover_type NOT NULL,

  -- Accessory Identity
  accessory_name  text NOT NULL,  -- 'spare_tire' | 'jack' | 'wheel_spanner' | 'logbook'
  accessory_label text NOT NULL,  -- Human-readable label

  -- Status & Condition
  status          accessory_status NOT NULL DEFAULT 'pending_verification',
  condition_notes text,
  reason_if_missing text,         -- Required when status is missing/defective/pending

  -- Logbook-specific fields
  is_original_document  boolean,
  document_verified     boolean DEFAULT false,
  received_from_name    text,
  ownership_discrepancy text,

  -- Evidence
  photo_urls            text[],

  -- Audit
  recorded_by_user_id   uuid REFERENCES public.users(id),
  recorded_by_name      text,
  recorded_at           timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accessory_handover_id ON public.vehicle_accessory_records(handover_id);
CREATE INDEX IF NOT EXISTS idx_accessory_vehicle_id  ON public.vehicle_accessory_records(vehicle_id);

-- ---------------------------------------------------------------------------
-- 4. vehicle_condition_inspections (one row per inspection item per handover)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_condition_inspections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  handover_type   handover_type NOT NULL,

  -- Inspection Category & Item
  category        text NOT NULL,  -- 'exterior' | 'interior' | 'mechanical' | 'other'
  item_key        text NOT NULL,  -- 'front_bumper' | 'engine' | 'seats' etc.
  item_label      text NOT NULL,

  -- Assessment
  rating          condition_rating NOT NULL DEFAULT 'not_inspected',
  notes           text,
  photo_urls      text[],

  -- Audit
  inspected_by_user_id  uuid REFERENCES public.users(id),
  inspected_by_name     text,
  inspected_at          timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_condition_handover_id ON public.vehicle_condition_inspections(handover_id);
CREATE INDEX IF NOT EXISTS idx_condition_vehicle_id  ON public.vehicle_condition_inspections(vehicle_id);

-- ---------------------------------------------------------------------------
-- 5. vehicle_logbook_transfers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_logbook_transfers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id                 uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id                  uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,

  -- Parties
  current_registered_owner    text,
  intended_new_owner          text,
  document_reference          text,

  -- Transfer Progress
  status                      logbook_transfer_status NOT NULL DEFAULT 'not_received',
  transfer_initiated_date     timestamptz,
  transfer_reference_no       text,
  handling_user_id            uuid REFERENCES public.users(id),
  handling_user_name          text,
  supporting_doc_urls         text[],
  notes                       text,
  delay_reason                text,

  -- Completion
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

-- View: vehicles with pending logbook transfers (for management dashboard)
CREATE OR REPLACE VIEW public.v_pending_logbook_transfers AS
  SELECT
    lt.id            AS transfer_id,
    lt.vehicle_id,
    v.registration_no,
    v.make_model,
    lt.status        AS transfer_status,
    lt.current_registered_owner,
    lt.intended_new_owner,
    lt.transfer_initiated_date,
    lt.handling_user_name,
    lt.notes,
    lt.created_at
  FROM public.vehicle_logbook_transfers lt
  JOIN public.vehicles v ON v.id = lt.vehicle_id
  WHERE lt.status NOT IN ('ownership_confirmed', 'document_released_to_client')
  ORDER BY lt.transfer_initiated_date ASC NULLS LAST;

-- ---------------------------------------------------------------------------
-- 6. vehicle_handover_discrepancies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_handover_discrepancies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id           uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id            uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,

  -- What is the discrepancy about?
  discrepancy_type      text NOT NULL,  -- 'accessory_missing' | 'condition_change' | 'logbook' | 'other'
  item_reference        text,           -- e.g. 'spare_tire' or inspection item key
  description           text NOT NULL,
  severity              text DEFAULT 'medium',  -- 'low' | 'medium' | 'high' | 'critical'

  -- Resolution
  status                discrepancy_status NOT NULL DEFAULT 'open',
  resolution_notes      text,
  resolved_by_user_id   uuid REFERENCES public.users(id),
  resolved_by_name      text,
  resolved_at           timestamptz,
  supporting_doc_urls   text[],

  -- Audit (immutable — never delete, only append resolution)
  raised_by_user_id     uuid REFERENCES public.users(id),
  raised_by_name        text,
  raised_at             timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_handover_id ON public.vehicle_handover_discrepancies(handover_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_vehicle_id  ON public.vehicle_handover_discrepancies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_open        ON public.vehicle_handover_discrepancies(vehicle_id) WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- 7. vehicle_handover_audit_logs (append-only, immutable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_handover_audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id     uuid NOT NULL REFERENCES public.vehicle_handover_records(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,

  -- Event
  event_type      text NOT NULL,    -- 'handover_created' | 'inspection_completed' | 'item_missing' | etc.
  event_data      jsonb,            -- Structured event payload
  description     text NOT NULL,

  -- Who & When
  performed_by_user_id  uuid REFERENCES public.users(id),
  performed_by_name     text,
  performed_at          timestamptz NOT NULL DEFAULT now()
  -- Note: NO updated_at — this table is append-only
);

CREATE INDEX IF NOT EXISTS idx_handover_audit_handover_id ON public.vehicle_handover_audit_logs(handover_id);
CREATE INDEX IF NOT EXISTS idx_handover_audit_vehicle_id  ON public.vehicle_handover_audit_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_handover_audit_performed_at ON public.vehicle_handover_audit_logs(performed_at DESC);

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicle_handover_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_accessory_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_condition_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_logbook_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_handover_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_handover_audit_logs   ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by all server actions via createAdminClient)
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

-- ---------------------------------------------------------------------------
-- 9. HELPER: updated_at auto-trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_handover_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vehicle_handover_records',
    'vehicle_accessory_records',
    'vehicle_condition_inspections',
    'vehicle_logbook_transfers',
    'vehicle_handover_discrepancies'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_set_updated_at_%1$s ON public.%1$s;
      CREATE TRIGGER trg_set_updated_at_%1$s
        BEFORE UPDATE ON public.%1$s
        FOR EACH ROW EXECUTE FUNCTION public.set_handover_updated_at();
    ', t);
  END LOOP;
END;
$$;
