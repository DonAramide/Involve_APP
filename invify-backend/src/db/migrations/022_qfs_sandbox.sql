-- ============================================================
-- Migration: 022_qfs_sandbox.sql
-- Purpose: Quasar Financial Sandbox (QFS) tables:
--   - qfs_api_keys         : sk_test_* keys per tenant
--   - qfs_sandbox_accounts : virtual test accounts (900-prefix)
--   - qfs_sandbox_ledger   : credit/debit entries
--   - qfs_sandbox_transfers: transfer simulations
--   - qfs_sandbox_webhooks : outbound webhook delivery log
--   - qfs_sandbox_config   : per-tenant webhook config + chaos mode
-- ============================================================

-- ── API Keys ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_api_keys (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash         TEXT        NOT NULL UNIQUE,   -- SHA-256 of sk_test_...
  key_prefix       VARCHAR(20) NOT NULL,           -- first 12 chars for display
  environment      VARCHAR(8)  NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'live')),
  scopes           TEXT[]      NOT NULL DEFAULT ARRAY['sandbox:read','sandbox:write'],
  label            TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qfs_api_keys_tenant ON qfs_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qfs_api_keys_hash   ON qfs_api_keys(key_hash);

-- ── Per-tenant sandbox config ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_sandbox_config (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_url          TEXT,
  socket_channel       TEXT,
  webhook_secret_enc   TEXT,       -- AES-256-GCM encrypted HMAC secret
  chaos_mode           JSONB       NOT NULL DEFAULT '{"enabled":false,"failureRatePercent":0,"delayMsMin":0,"delayMsMax":0}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Virtual sandbox accounts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_sandbox_accounts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_number   VARCHAR(20) NOT NULL UNIQUE,  -- 900-prefix
  account_name     TEXT        NOT NULL,
  bank_code        VARCHAR(10) NOT NULL DEFAULT '999',
  bank_name        TEXT        NOT NULL DEFAULT 'Quasar Test Bank',
  currency         VARCHAR(3)  NOT NULL DEFAULT 'NGN',
  balance_kobo     BIGINT      NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qfs_accounts_tenant ON qfs_sandbox_accounts(tenant_id);

-- ── Ledger entries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_sandbox_ledger (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID        NOT NULL REFERENCES qfs_sandbox_accounts(id) ON DELETE CASCADE,
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  direction        VARCHAR(6)  NOT NULL CHECK (direction IN ('credit','debit')),
  amount_kobo      BIGINT      NOT NULL CHECK (amount_kobo > 0),
  balance_after    BIGINT      NOT NULL,
  currency         VARCHAR(3)  NOT NULL DEFAULT 'NGN',
  reason           TEXT,
  reference        TEXT        NOT NULL DEFAULT ('SBX-' || gen_random_uuid()::text),
  transfer_id      UUID,
  correlation_id   UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qfs_ledger_account    ON qfs_sandbox_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_qfs_ledger_tenant     ON qfs_sandbox_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qfs_ledger_correlation ON qfs_sandbox_ledger(correlation_id);

-- ── Transfers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_sandbox_transfers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_account_id  UUID        REFERENCES qfs_sandbox_accounts(id),
  to_account_id    UUID        REFERENCES qfs_sandbox_accounts(id),
  amount_kobo      BIGINT      NOT NULL CHECK (amount_kobo > 0),
  currency         VARCHAR(3)  NOT NULL DEFAULT 'NGN',
  reference        TEXT        NOT NULL DEFAULT ('SBX-' || gen_random_uuid()::text),
  narration        TEXT,
  status           VARCHAR(16) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','success','failed','reversed','rejected')),
  provider         VARCHAR(20) NOT NULL DEFAULT 'QUASAR',
  profile_id       TEXT,
  correlation_id   UUID        DEFAULT gen_random_uuid(),
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qfs_transfers_tenant      ON qfs_sandbox_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qfs_transfers_correlation ON qfs_sandbox_transfers(correlation_id);

-- ── Webhook delivery log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_sandbox_webhooks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type        TEXT        NOT NULL,
  correlation_id    UUID,
  transfer_id       UUID        REFERENCES qfs_sandbox_transfers(id),
  payload           JSONB       NOT NULL,
  delivery_url      TEXT,
  http_status       INT,
  delivered_at      TIMESTAMPTZ,
  attempts          INT         NOT NULL DEFAULT 0,
  next_retry_at     TIMESTAMPTZ,
  status            VARCHAR(16) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','delivered','failed','dead')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qfs_webhooks_tenant      ON qfs_sandbox_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qfs_webhooks_correlation ON qfs_sandbox_webhooks(correlation_id);
CREATE INDEX IF NOT EXISTS idx_qfs_webhooks_status      ON qfs_sandbox_webhooks(status);

-- ── Balance snapshots ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_balance_snapshots (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID        NOT NULL REFERENCES qfs_sandbox_accounts(id) ON DELETE CASCADE,
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance_kobo     BIGINT      NOT NULL,
  snapshot_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qfs_snapshots_account ON qfs_balance_snapshots(account_id);

-- ── Audit log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qfs_sandbox_audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  actor       TEXT,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_qfs_audit_tenant ON qfs_sandbox_audit_logs(tenant_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE qfs_api_keys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_sandbox_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_sandbox_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_sandbox_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_sandbox_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_sandbox_webhooks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_balance_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE qfs_sandbox_audit_logs    ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['qfs_api_keys','qfs_sandbox_config','qfs_sandbox_accounts',
    'qfs_sandbox_ledger','qfs_sandbox_transfers','qfs_sandbox_webhooks',
    'qfs_balance_snapshots','qfs_sandbox_audit_logs'])
  LOOP
    EXECUTE format('CREATE POLICY %I_service_policy ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

COMMENT ON TABLE qfs_api_keys           IS 'QFS sandbox API keys (sk_test_*). key_hash is SHA-256. Never store plaintext.';
COMMENT ON TABLE qfs_sandbox_accounts   IS 'Virtual test accounts with 900-prefix account numbers.';
COMMENT ON TABLE qfs_sandbox_ledger     IS 'Double-entry ledger for sandbox account credits and debits.';
COMMENT ON TABLE qfs_sandbox_transfers  IS 'Transfer simulations (approve/reject/reverse lifecycle).';
COMMENT ON TABLE qfs_sandbox_webhooks   IS 'Outbound webhook delivery log with retry tracking.';
