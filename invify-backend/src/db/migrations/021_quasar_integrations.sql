-- ============================================================
-- Migration: 021_quasar_integrations.sql
-- Purpose:   Dedicated table for per-tenant Quasar platform
--            integration credentials and metadata.
--
-- Security:
--   - quasar_sk_secret_enc and quasar_webhook_signing_secret_enc
--     are stored as AES-256-GCM ciphertext (JSON-encoded EncryptedPayload).
--   - Never store plaintext secrets. Vault key lives in VAULT_MASTER_KEY env.
--
-- Do NOT add quasar columns to the tenants table. This table is the
-- single source of truth for the Quasar integration layer.
-- ============================================================

CREATE TABLE IF NOT EXISTS quasar_integrations (
  id                                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invify side
  invify_tenant_id                  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Quasar side (returned from provisioning API)
  quasar_tenant_id                  VARCHAR(64)  NOT NULL,
  quasar_tenant_slug                VARCHAR(128) NOT NULL,
  quasar_tenant_code                VARCHAR(32)  NOT NULL,
  quasar_vertical                   VARCHAR(32)  NOT NULL
                                      CHECK (quasar_vertical IN ('invify_retail', 'invify_school', 'invify_services')),

  -- API Key (issued sk_* for MPOS/financial calls)
  quasar_public_key                 TEXT,                          -- pk_test_* or pk_live_* — non-secret, safe to store plaintext
  quasar_sk_secret_enc              TEXT        NOT NULL,          -- AES-256-GCM JSON: { encryptedValue, iv, authTag, keyVersion }
  quasar_environment                VARCHAR(8)  NOT NULL DEFAULT 'test'
                                      CHECK (quasar_environment IN ('test', 'live')),

  -- Webhook registration
  quasar_webhook_endpoint_id        VARCHAR(64),
  quasar_webhook_signing_secret_enc TEXT,                          -- AES-256-GCM JSON — returned ONCE by Quasar

  -- Lifecycle
  status                            VARCHAR(16) NOT NULL DEFAULT 'provisioned'
                                      CHECK (status IN ('provisioned', 'active', 'suspended', 'error')),
  quasar_provisioned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quasar_webhook_registered_at      TIMESTAMPTZ,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary lookup: Invify tenant → Quasar integration
CREATE UNIQUE INDEX IF NOT EXISTS idx_quasar_integrations_invify_tenant
  ON quasar_integrations (invify_tenant_id);

-- Reverse lookup: Quasar tenant → Invify tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_quasar_integrations_quasar_tenant
  ON quasar_integrations (quasar_tenant_id);

-- Health dashboard: list by vertical / status
CREATE INDEX IF NOT EXISTS idx_quasar_integrations_vertical_status
  ON quasar_integrations (quasar_vertical, status);

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_quasar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quasar_integrations_updated_at ON quasar_integrations;
CREATE TRIGGER trg_quasar_integrations_updated_at
  BEFORE UPDATE ON quasar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_quasar_integrations_updated_at();

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
-- This table is accessed ONLY by the Invify backend service role.
-- No tenant-level JWT should ever read it directly.

ALTER TABLE quasar_integrations ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by Invify backend)
CREATE POLICY quasar_integrations_service_policy
  ON quasar_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE quasar_integrations IS
  'Per-tenant Quasar platform integration credentials. All sk_* and signing secrets are AES-256-GCM encrypted. Read/write via Invify backend service role only.';

COMMENT ON COLUMN quasar_integrations.quasar_sk_secret_enc IS
  'AES-256-GCM encrypted JSON: { encryptedValue, iv, authTag, keyVersion }. Decrypt using VaultEncryptionUtil.';
COMMENT ON COLUMN quasar_integrations.quasar_webhook_signing_secret_enc IS
  'AES-256-GCM encrypted JSON: { encryptedValue, iv, authTag, keyVersion }. Returned once by Quasar /webhooks/endpoints. Decrypt using VaultEncryptionUtil.';
