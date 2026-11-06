-- Migration: 20261106_enterprise_security_module.sql
-- Description: Creates enterprise security audit logs, single-use action verification grants, and configurable security policies.

-- 1. Create security_audit_logs table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'DENIED', 'REVOKED')),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying of security audits
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_resource ON public.security_audit_logs(resource_type, resource_id);

-- 2. Create security_verifications table for single-use, action-scoped authorization
CREATE TABLE IF NOT EXISTS public.security_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_verifications_token ON public.security_verifications(token);
CREATE INDEX IF NOT EXISTS idx_security_verifications_lookup ON public.security_verifications(user_id, action, resource_id);

-- 3. Create security_policies table for configurable settings
CREATE TABLE IF NOT EXISTS public.security_policies (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed default enterprise security policies
INSERT INTO public.security_policies (key, value)
VALUES 
    ('reauth_window_minutes', '10'::jsonb),
    ('max_failed_attempts', '5'::jsonb),
    ('lockout_minutes', '15'::jsonb),
    ('require_reauth_financial_reports', 'true'::jsonb),
    ('require_reauth_destructive_actions', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies
-- Audit logs: Service role has full access; normal users cannot insert/update/delete.
DROP POLICY IF EXISTS "Service role full access - security_audit_logs" ON public.security_audit_logs;
CREATE POLICY "Service role full access - security_audit_logs"
    ON public.security_audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verifications: Service role has full access; users can only read their own unconsumed tokens.
DROP POLICY IF EXISTS "Service role full access - security_verifications" ON public.security_verifications;
CREATE POLICY "Service role full access - security_verifications"
    ON public.security_verifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own verifications" ON public.security_verifications;
CREATE POLICY "Users can read own verifications"
    ON public.security_verifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policies: Authenticated users can read policy configurations; only service-role can modify.
DROP POLICY IF EXISTS "Service role full access - security_policies" ON public.security_policies;
CREATE POLICY "Service role full access - security_policies"
    ON public.security_policies
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read security_policies" ON public.security_policies;
CREATE POLICY "Authenticated users can read security_policies"
    ON public.security_policies
    FOR SELECT
    TO authenticated
    USING (true);
