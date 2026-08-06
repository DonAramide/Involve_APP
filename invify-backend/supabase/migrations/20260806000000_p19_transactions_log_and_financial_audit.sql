/*
=============================================================================
Migration: p19_transactions_log_and_financial_audit
Description: Creates missing payment audit tables used by Quasar webhooks,
             PaymentService, GatewayService, and AuditService.

tables:
  - public.transactions_log
  - public.financial_audit_logs
=============================================================================
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.transactions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    wallet_id UUID NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    type VARCHAR(50) NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'quasar',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_transactions_log_reference UNIQUE (reference)
);

CREATE INDEX IF NOT EXISTS idx_transactions_log_tenant_cursor
    ON public.transactions_log (tenant_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_transactions_log_tenant_status
    ON public.transactions_log (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_transactions_log_tenant_type
    ON public.transactions_log (tenant_id, type);

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    reference VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_tenant_created
    ON public.financial_audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_reference
    ON public.financial_audit_logs (reference);

-- Backend (service_role) owns all mutations; tenants may read their own rows.
ALTER TABLE public.transactions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_transactions_log" ON public.transactions_log;
CREATE POLICY "service_role_all_transactions_log"
  ON public.transactions_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_financial_audit_logs" ON public.financial_audit_logs;
CREATE POLICY "service_role_all_financial_audit_logs"
  ON public.financial_audit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "tenant_reads_own_transactions_log" ON public.transactions_log;
CREATE POLICY "tenant_reads_own_transactions_log"
  ON public.transactions_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND (
          users.role IN ('super_admin', 'internal_staff', 'admin_ops')
          OR users.tenant_id::text = transactions_log.tenant_id::text
        )
    )
  );

DROP POLICY IF EXISTS "tenant_reads_own_financial_audit_logs" ON public.financial_audit_logs;
CREATE POLICY "tenant_reads_own_financial_audit_logs"
  ON public.financial_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND (
          users.role IN ('super_admin', 'internal_staff', 'admin_ops')
          OR users.tenant_id::text = financial_audit_logs.tenant_id::text
        )
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
