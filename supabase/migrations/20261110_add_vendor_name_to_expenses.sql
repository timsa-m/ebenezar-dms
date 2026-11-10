-- Migration: Add vendor_name to public.expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor_name text;

