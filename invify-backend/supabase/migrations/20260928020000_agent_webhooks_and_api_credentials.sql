/*
=============================================================================
Migration: agent_webhooks_and_api_credentials
Description: Additive Agent webhook outbox, Invify webhook signing keys,
             and separate Agent API credentials. No live fees, no payouts.

Rollback: supabase/rollbacks/20260928020000_agent_webhooks_and_api_credentials.sql
=============================================================================
*/

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.agents') IS NULL THEN
    RAISE EXCEPTION 'agent webhooks preflight failed: agents table missing';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_webhook_status AS ENUM ('ENABLED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_credential_status AS ENUM ('ACTIVE', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_webhook_event_status AS ENUM (
    'PENDING', 'RETRY', 'DELIVERED', 'FAILED', 'DEAD_LETTER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agent_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE RESTRICT,
  webhook_url TEXT,
  status public.agent_webhook_status NOT NULL DEFAULT 'DISABLED',
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_delivery_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_webhook_signing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  key_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status public.agent_credential_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_webhook_signing_keys_active_unique
  ON public.agent_webhook_signing_keys (agent_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.agent_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  key_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status public.agent_credential_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_api_credentials_active_unique
  ON public.agent_api_credentials (agent_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.agent_webhook_events (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  tenant_id UUID,
  assessment_id UUID,
  event_type TEXT NOT NULL,
  status public.agent_webhook_event_status NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  last_http_status INTEGER,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_webhook_events_agent_created_idx
  ON public.agent_webhook_events (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_webhook_events_due_idx
  ON public.agent_webhook_events (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS public.agent_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.agent_webhook_events(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  attempt_no INTEGER NOT NULL,
  status TEXT NOT NULL,
  http_status INTEGER,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_webhook_deliveries_event_attempt_unique UNIQUE (event_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS agent_webhook_deliveries_agent_idx
  ON public.agent_webhook_deliveries (agent_id, created_at DESC);

ALTER TABLE public.agent_webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_webhook_signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_client_write_agent_webhook_configs ON public.agent_webhook_configs AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY agent_reads_own_webhook_config ON public.agent_webhook_configs AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_webhook_configs.agent_id AND a.auth_user_id = auth.uid())
    OR public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_agent_webhook_signing_keys ON public.agent_webhook_signing_keys AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY agent_reads_own_webhook_signing_public ON public.agent_webhook_signing_keys AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_webhook_signing_keys.agent_id AND a.auth_user_id = auth.uid())
    OR public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_agent_api_credentials ON public.agent_api_credentials AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY agent_reads_own_api_credentials ON public.agent_api_credentials AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_api_credentials.agent_id AND a.auth_user_id = auth.uid())
    OR public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_agent_webhook_events ON public.agent_webhook_events AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY agent_reads_own_webhook_events ON public.agent_webhook_events AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_webhook_events.agent_id AND a.auth_user_id = auth.uid())
    OR public.is_admin_or_service() OR public.is_platform_staff());

CREATE POLICY no_client_write_agent_webhook_deliveries ON public.agent_webhook_deliveries AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY agent_reads_own_webhook_deliveries ON public.agent_webhook_deliveries AS PERMISSIVE FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_webhook_deliveries.agent_id AND a.auth_user_id = auth.uid())
    OR public.is_admin_or_service() OR public.is_platform_staff());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.agent_webhook_configs TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.agent_webhook_signing_keys TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.agent_api_credentials TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.agent_webhook_events TO service_role';
    EXECUTE 'GRANT SELECT, INSERT ON public.agent_webhook_deliveries TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public.agent_webhook_configs TO authenticated';
    EXECUTE 'GRANT SELECT (id, agent_id, key_id, public_key, fingerprint, status, created_at, rotated_at, revoked_at) ON public.agent_webhook_signing_keys TO authenticated';
    EXECUTE 'GRANT SELECT ON public.agent_api_credentials TO authenticated';
    EXECUTE 'GRANT SELECT ON public.agent_webhook_events TO authenticated';
    EXECUTE 'GRANT SELECT ON public.agent_webhook_deliveries TO authenticated';
  END IF;
END $$;

COMMIT;
