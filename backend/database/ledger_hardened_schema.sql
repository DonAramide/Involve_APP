-- Invify Hardened Finance Core Schema
-- Refines the ledger into an idempotent, monotonic state machine.

-- 1. Organizations / Tenants (Mapping for reconciliation)
CREATE TABLE IF NOT EXISTS invify_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    quaser_tenant_id UUID UNIQUE,
    webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Transaction Read Model (Status Authority)
-- This table tracks the high-level status of a transaction for a tenant.
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    reference TEXT NOT NULL, -- The provider's reference (e.g. Quaser Ref)
    provider_used TEXT NOT NULL, -- 'quaser', 'manual'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed'
    amount DECIMAL(18, 4) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, reference)
);

-- 3. Idempotent Ledger Entries
-- Source of truth for all balances. Every money movement is recorded here.
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'paystack', 'flutterwave', 'manual'
    type TEXT NOT NULL, -- 'credit', 'debit'
    amount DECIMAL(18, 4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed'
    source TEXT NOT NULL, -- 'quaser', 'manual'
    idempotency_key TEXT NOT NULL, -- Formula: ${provider}:${reference}:${type}
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, idempotency_key)
);

-- 4. Reconciliation Engine Logs
CREATE TABLE IF NOT EXISTS reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    issue_type TEXT NOT NULL, -- 'missing', 'mismatch'
    resolved BOOLEAN DEFAULT FALSE,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_idempotency ON ledger_entries(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_status_tenant ON ledger_entries(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_ref ON transactions(tenant_id, reference);

-- Drop old experimental tables (Pivoting to hardened spec)
DROP TABLE IF EXISTS financial_transactions CASCADE;
-- Note: 'ledger_entries' name is reused, but schema redefined.
