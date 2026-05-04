-- Invify Hardened Finance Core Migration
-- Version: 2.0.0
-- Strategy: Transactional Backup & Clean Restart

BEGIN;

-- 1. Auditable Backups (Read-Only Archives)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'transactions') THEN
        ALTER TABLE transactions RENAME TO transactions_backup;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ledger_entries') THEN
        ALTER TABLE ledger_entries RENAME TO ledger_entries_backup;
    END IF;
END $$;

-- 2. New Transaction Read Model (Hardened)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    provider_used TEXT NOT NULL, 
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed
    amount DECIMAL(18, 4) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, reference)
);

-- 3. Idempotent Ledger Entries (Production Grade)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    entry_group_id UUID, -- For future double-entry grouping
    reference TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT NOT NULL, -- credit | debit
    amount DECIMAL(18, 4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed
    source TEXT NOT NULL, 
    idempotency_key TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, idempotency_key)
);

-- 4. Cash Session Tracking
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    opened_by UUID REFERENCES invify_users(id),
    closed_by UUID REFERENCES invify_users(id),
    status TEXT DEFAULT 'open', -- open, closed
    expected_amount DECIMAL(18, 4) DEFAULT 0,
    actual_amount DECIMAL(18, 4) DEFAULT 0,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- 5. Reconciliation Engine Logs (Hardened)
DROP TABLE IF EXISTS reconciliation_logs CASCADE;
CREATE TABLE reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    issue_type TEXT NOT NULL, -- missing, mismatch, provider_mismatch
    resolved BOOLEAN DEFAULT FALSE,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints & Enforcements
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_trans_status;
ALTER TABLE transactions ADD CONSTRAINT check_trans_status 
CHECK (status IN ('pending', 'processing', 'succeeded', 'failed'));

ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS check_ledger_status;
ALTER TABLE ledger_entries ADD CONSTRAINT check_ledger_status 
CHECK (status IN ('pending', 'processing', 'succeeded', 'failed'));

-- 6. Indices (Tiered Optimization)
CREATE INDEX IF NOT EXISTS idx_ledger_recon_tier ON ledger_entries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tier ON transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant ON cash_sessions(tenant_id, status);

COMMIT;
