-- backend/database/invify_saas_schema.sql
-- Senior Backend Engineer: Invify Multi-Tenant SaaS Platform
-- Standardized schema for Schools, Retail, and Service businesses.

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants (Organizations/Businesses)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('school', 'retail', 'service')),
    plan TEXT NOT NULL DEFAULT 'free', -- e.g. 'free', 'basic', 'premium', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- e.g. 'active', 'suspended', 'cancelled'
    quaser_api_key TEXT, -- Encrypted key for payment provider integration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- Must match auth.users.id
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL, -- e.g. 'owner', 'admin', 'bursar', 'teacher', 'registrar'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Financial Layer: Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Financial Layer: Ledger Entries (Source of Truth)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL, -- Idempotency key
    amount NUMERIC(15, 2) NOT NULL, -- (+) Credit, (-) Debit
    type TEXT NOT NULL, -- e.g. 'payment', 'charge', 'payout', 'reversal'
    status TEXT NOT NULL DEFAULT 'completed', -- e.g. 'pending', 'completed', 'failed'
    provider TEXT NOT NULL DEFAULT 'system', -- e.g. 'quaser', 'monnify', 'system'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Financial Layer: Payments (Transaction Records)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL, -- Provider reference
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- e.g. 'pending', 'successful', 'failed'
    provider TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Education Layer: Curriculum Topics
CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    class_level TEXT NOT NULL,
    term TEXT NOT NULL,
    week INTEGER NOT NULL,
    topic TEXT NOT NULL,
    subtopics JSONB, -- Array of strings or structured data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Education Layer: Lesson Notes (Layered Caching)
CREATE TABLE IF NOT EXISTS lesson_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL means global/public cache
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    class_level TEXT NOT NULL,
    term TEXT NOT NULL,
    week INTEGER NOT NULL,
    content JSONB NOT NULL,
    cache_key TEXT NOT NULL, -- Hash of (subject+topic+class+term+week)
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, cache_key)
);

-- 8. Analytics & Billing: AI Usage
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL, -- e.g. 'lesson_note', 'quiz_gen', 'report_card'
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost NUMERIC(10, 5) NOT NULL DEFAULT 0.00000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Billing Layer: Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan TEXT NOT NULL, -- e.g. 'basic_school', 'premium_retail'
    status TEXT NOT NULL, -- e.g. 'active', 'past_due', 'canceled'
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Performance: Indexes
CREATE INDEX idx_tenants_type ON tenants(type);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_ref ON ledger_entries(reference);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_ref ON payments(reference);
CREATE INDEX idx_notes_cache ON lesson_notes(cache_key);
CREATE INDEX idx_usage_tenant ON ai_usage(tenant_id);

-- 11. Security: Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;
https://api.quaser.io/v1

-- Trigger to auto-update wallet on ledger entry
CREATE TRIGGER tr_update_wallet_on_ledger
AFTER INSERT ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();
