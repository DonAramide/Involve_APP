/*
=============================================================================
Migration: p20_payment_idempotency_constraints
Description: Database-level uniqueness for payment idempotency keys.

Design notes:
  - Phase 2 stores client idempotency keys in transactions_log.metadata->>'idempotency_key'
  - Uniqueness is scoped by tenant_id so the same key may exist across tenants
  - NULL / missing keys are excluded (partial index) so legacy rows remain valid
  - A dedicated payment_idempotency_keys table supports IdempotencyRegistry
    with (tenant_id, operation, idempotency_key) uniqueness
=============================================================================
*/

BEGIN;

-- 1) Partial unique index on transactions_log metadata idempotency key (tenant-scoped)
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_log_tenant_idempotency_key
  ON public.transactions_log (tenant_id, (metadata->>'idempotency_key'))
  WHERE
    metadata ? 'idempotency_key'
    AND NULLIF(TRIM(metadata->>'idempotency_key'), '') IS NOT NULL;

-- 2) Dedicated registry table for payment / financial HTTP idempotency
CREATE TABLE IF NOT EXISTS public.payment_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    operation VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(128) NULL,
    response_status INTEGER NULL,
    response_body JSONB NULL,
    result_reference VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_idempotency_tenant_op_key
      UNIQUE (tenant_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_keys_expires
  ON public.payment_idempotency_keys (expires_at);

ALTER TABLE public.payment_idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_payment_idempotency_keys" ON public.payment_idempotency_keys;
CREATE POLICY "service_role_all_payment_idempotency_keys"
  ON public.payment_idempotency_keys
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
