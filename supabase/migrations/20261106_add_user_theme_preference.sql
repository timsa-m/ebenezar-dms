-- Migration: 20261106_add_user_theme_preference.sql
-- Description: Adds user appearance theme preference to public.users table.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'theme_preference'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN theme_preference TEXT DEFAULT 'system' 
        CHECK (theme_preference IN ('light', 'dark', 'system'));
    END IF;
END $$;

