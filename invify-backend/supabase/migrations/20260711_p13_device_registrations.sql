-- Migration: P13 Device Registrations & Tenant Device Count
-- Purpose: 
--   1. Add device_count to tenants table to track how many devices a business has
--   2. Create device_registrations table to record each physical device per tenant
--   3. Add location column to tenants for geo-compliance

BEGIN;

-- 1. Add device_count to tenants if not present
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS device_count INTEGER NOT NULL DEFAULT 1;

-- 2. Add location to tenants if not present
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Create device_registrations table
CREATE TABLE IF NOT EXISTS public.device_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  agent_code    TEXT NOT NULL DEFAULT 'AAA000',
  location      TEXT,
  device_number INTEGER NOT NULL DEFAULT 1,
  owner_email   TEXT,
  owner_name    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  -- Prevent same device from registering twice for the same tenant
  UNIQUE(tenant_id, device_id)
);

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_device_registrations_tenant_id
  ON public.device_registrations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_device_registrations_device_id
  ON public.device_registrations(device_id);

-- 5. RLS: Only service role can write; authenticated users can read their own
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages device_registrations" ON public.device_registrations;
CREATE POLICY "Service role manages device_registrations"
  ON public.device_registrations
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Create device_link_tokens table for QR links
CREATE TABLE IF NOT EXISTS public.device_link_tokens (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token               TEXT NOT NULL UNIQUE,
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  issuer_device_id    TEXT,
  issuer_agent_code   TEXT DEFAULT 'AAA000',
  expires_at          TIMESTAMPTZ NOT NULL,
  used                BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.device_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages device_link_tokens" ON public.device_link_tokens;
CREATE POLICY "Service role manages device_link_tokens"
  ON public.device_link_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;

