-- Invify Finance Core & Admin Schema extension
-- Version: 1.0.0

-- 1. Multi-Tenant Mapping
CREATE TABLE IF NOT EXISTS invify_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    quaser_tenant_id UUID UNIQUE, -- Link to Quaser infrastructure
    status TEXT DEFAULT 'active', -- active, suspended, closed
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enhanced User System (RBAC)
CREATE TABLE IF NOT EXISTS invify_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SCHOOL_ADMIN', -- SUPER_ADMIN, SCHOOL_ADMIN
    full_name TEXT,
    totp_secret TEXT, -- For 2FA
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Immutable Financial Transaction Log
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES invify_tenants(id),
    source TEXT NOT NULL, -- 'quaser', 'manual_cash', 'manual_pos', 'transfer'
    external_reference TEXT UNIQUE, -- e.g. Quaser reference
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'NGN',
    type TEXT NOT NULL, -- 'payment', 'payout', 'charge'
    status TEXT DEFAULT 'success', -- success, failed, pending
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Double-Entry Ledger System
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL, -- 'wallet_main', 'revenue_fees', 'cash_drawer'
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    balance_after DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enhanced Audit Log System
ALTER TABLE IF EXISTS audit_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES invify_users(id),
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS is_master_mode BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_tenant ON financial_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON invify_users(tenant_id);
