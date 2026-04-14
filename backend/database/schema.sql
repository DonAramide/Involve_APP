-- Fintech-Grade SFOS Schema (Production Ready)

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations / Schools
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Academic calendar
CREATE TABLE academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. '2025/2026'
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Term 1'
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    admission_number TEXT NOT NULL,
    current_class TEXT,
    running_balance DECIMAL(15, 2) DEFAULT 0, -- Cache for quick lookups, but ledgers are the source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, admission_number)
);

-- 4. Virtual Accounts
CREATE TABLE virtual_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
    account_number TEXT NOT NULL UNIQUE,
    bank_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    reference TEXT UNIQUE NOT NULL, -- Provider mapping ref
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Fee Configuration
CREATE TABLE fee_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 1, -- Lower number = higher priority for allocation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
    fee_category_id UUID REFERENCES fee_categories(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    applicable_to_class TEXT, -- NULL if global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Central Ledger (Source of Truth)
CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL, -- (+) Credit/Payment, (-) Debit/Charge
    balance_after DECIMAL(15, 2) NOT NULL, -- Running balance per student
    transaction_type TEXT NOT NULL, -- 'payment', 'charge', 'reversal', 'refund'
    channel TEXT NOT NULL, -- 'webhook', 'cash', 'pos', 'system'
    reference TEXT UNIQUE NOT NULL, -- Idempotency key
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Payment Allocation
CREATE TABLE fee_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE, -- The payment entry
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE, -- What was being paid
    amount_allocated DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Webhook Queuing & Idempotency
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    external_reference TEXT UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
    error_log TEXT,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Audit Trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    user_id UUID, -- Admin UID
    action TEXT NOT NULL, -- 'EDIT_FEE', 'RECORD_CASH', 'MANUAL_REVERSAL'
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ledger_student_created ON ledgers(student_id, created_at DESC);
CREATE INDEX idx_fee_structure_term ON fee_structures(term_id);
CREATE INDEX idx_webhook_status ON webhook_logs(status);

-- RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;

-- Note: In production, policies would use `auth.uid()` mapped to `school_id`.
