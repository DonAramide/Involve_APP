-- P0-5C Migration: audit_logs table
-- Purpose: Replace gov_audit_db.json filesystem persistence.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
    module       TEXT        NOT NULL, -- 'TERMINAL' | 'FINANCIAL' | 'DEVICE' | 'AUTH' | 'GOVERNANCE' | etc.
    action       TEXT        NOT NULL, 
    user_email   TEXT        NOT NULL, 
    user_name    TEXT        NULL,     
    ip_address   TEXT        NULL,
    location     TEXT        NULL,
    target       TEXT        NULL,     
    status       TEXT        NOT NULL, 
    metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    tenant_id    UUID        NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
    tenant_code  VARCHAR(20) NULL -- Denormalized business identifier for quick lookups and third-party tools
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_code ON public.audit_logs(tenant_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Block direct writes from clients
CREATE POLICY "no_direct_client_writes"
  ON public.audit_logs AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);

-- Super admin access
CREATE POLICY "super_admin_reads_all"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'internal_staff', 'admin_ops')
    )
  );

-- Tenant owner access
CREATE POLICY "tenant_owner_reads_own"
  ON public.audit_logs FOR SELECT
  USING (
    tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.tenant_id::text = audit_logs.tenant_id::text
      AND users.role IN ('owner', 'admin')
    )
  );
