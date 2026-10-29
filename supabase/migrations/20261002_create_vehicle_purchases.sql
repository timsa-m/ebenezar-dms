-- Migration: Create vehicle_purchases table for Motor Vehicle Purchase Agreements
-- Allows Ebenezar Car Bazaar to record vehicle acquisitions from sellers/vendors,
-- store seller identity, and generate legal Purchase Agreements.

CREATE TABLE IF NOT EXISTS public.vehicle_purchases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    purchase_no text,
    
    -- Seller (Vendor) Details
    seller_name text NOT NULL,
    seller_id_number text NOT NULL,
    seller_phone text NOT NULL,
    seller_address text,
    seller_po_box text,
    seller_occupation text DEFAULT 'BUSINESS',
    
    -- Purchase & Payment Terms
    purchase_price numeric NOT NULL DEFAULT 0,
    amount_paid numeric NOT NULL DEFAULT 0,
    balance numeric NOT NULL DEFAULT 0,
    payment_method text DEFAULT 'Bank Transfer',
    purchase_date date DEFAULT CURRENT_DATE,
    
    -- Witness Details
    seller_witness_name text,
    seller_witness_id text,
    seller_witness_phone text,
    buyer_witness_name text DEFAULT 'GEORGE DOLA ANDERE',
    buyer_witness_id text DEFAULT '0722263192',
    buyer_witness_phone text DEFAULT '+254722263192',
    
    -- Legal & Handover Notes
    special_notes text,
    logbook_handed_over boolean DEFAULT true,
    transfer_form_signed boolean DEFAULT true,
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookup by vehicle
CREATE INDEX IF NOT EXISTS idx_vehicle_purchases_vehicle_id ON public.vehicle_purchases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_purchases_purchase_date ON public.vehicle_purchases(purchase_date);

-- Add seller columns on vehicles as well for fast denormalized access
ALTER TABLE public.vehicles
    ADD COLUMN IF NOT EXISTS seller_name text,
    ADD COLUMN IF NOT EXISTS seller_id_number text,
    ADD COLUMN IF NOT EXISTS seller_phone text,
    ADD COLUMN IF NOT EXISTS seller_address text,
    ADD COLUMN IF NOT EXISTS seller_po_box text,
    ADD COLUMN IF NOT EXISTS purchase_id uuid;

-- Enable RLS
ALTER TABLE public.vehicle_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to vehicle_purchases"
    ON public.vehicle_purchases FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert/update to vehicle_purchases"
    ON public.vehicle_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to vehicle_purchases"
    ON public.vehicle_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
