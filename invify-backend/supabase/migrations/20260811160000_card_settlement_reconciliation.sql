/*
=============================================================================
Migration: card_settlement_reconciliation
Description: Processor settlement file uploads to confirm Quasar pull-account
             settlement for approved card transactions (beyond auth code 00).
=============================================================================
*/

BEGIN;

-- Extend POS attempts with settlement lifecycle
ALTER TABLE public.pos_transaction_attempts
  ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(20) NOT NULL DEFAULT 'unsettled',
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS settlement_batch_id UUID NULL,
  ADD COLUMN IF NOT EXISTS settlement_processor VARCHAR(80) NULL;

CREATE INDEX IF NOT EXISTS idx_pos_attempts_settlement_status
  ON public.pos_transaction_attempts (tenant_id, settlement_status, status);

CREATE INDEX IF NOT EXISTS idx_pos_attempts_rrn_stan_terminal
  ON public.pos_transaction_attempts (tenant_id, rrn, stan, terminal_id);

-- Settlement upload batches (one file upload session)
CREATE TABLE IF NOT EXISTS public.card_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  template_type VARCHAR(80) NOT NULL,
  file_name VARCHAR(512) NOT NULL,
  file_sha256 VARCHAR(64) NOT NULL,
  uploaded_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_by_email VARCHAR(255) NULL,
  mfa_verified BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  total_rows INT NOT NULL DEFAULT 0,
  matched_count INT NOT NULL DEFAULT 0,
  unmatched_file_rows INT NOT NULL DEFAULT 0,
  already_settled_count INT NOT NULL DEFAULT 0,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_settlement_batches_created
  ON public.card_settlement_batches (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_card_settlement_batches_tenant
  ON public.card_settlement_batches (tenant_id, created_at DESC);

-- Per-row match outcomes for audit
CREATE TABLE IF NOT EXISTS public.card_settlement_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.card_settlement_batches(id) ON DELETE CASCADE,
  pos_attempt_id UUID NULL REFERENCES public.pos_transaction_attempts(id) ON DELETE SET NULL,
  match_status VARCHAR(30) NOT NULL,
  template_type VARCHAR(80) NOT NULL,
  row_index INT NOT NULL,
  rrn VARCHAR(50) NULL,
  stan VARCHAR(20) NULL,
  terminal_id VARCHAR(50) NULL,
  amount NUMERIC(12, 2) NULL,
  auth_code VARCHAR(50) NULL,
  settlement_date TIMESTAMPTZ NULL,
  raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_reason VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_settlement_matches_batch
  ON public.card_settlement_matches (batch_id);

ALTER TABLE public.pos_transaction_attempts
  ADD CONSTRAINT fk_pos_attempts_settlement_batch
  FOREIGN KEY (settlement_batch_id) REFERENCES public.card_settlement_batches(id)
  ON DELETE SET NULL;

ALTER TABLE public.card_settlement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_settlement_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_card_settlement_batches" ON public.card_settlement_batches;
CREATE POLICY "service_role_all_card_settlement_batches"
  ON public.card_settlement_batches FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_card_settlement_matches" ON public.card_settlement_matches;
CREATE POLICY "service_role_all_card_settlement_matches"
  ON public.card_settlement_matches FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
