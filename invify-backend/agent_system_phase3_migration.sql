-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 3 MIGRATION
-- Supabase PostgreSQL Schema: Commissions & Wallets
-- ==========================================

-- 0. CLEANUP (For Dev)
DROP TABLE IF EXISTS public.finance_settings CASCADE;
DROP TABLE IF EXISTS public.wallet_daily_snapshots CASCADE;
DROP TABLE IF EXISTS public.withdrawal_audit_logs CASCADE;
DROP TABLE IF EXISTS public.agent_withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.wallet_ledger CASCADE;
DROP TABLE IF EXISTS public.commission_notes CASCADE;
DROP TABLE IF EXISTS public.commission_adjustments CASCADE;
DROP TABLE IF EXISTS public.commission_events CASCADE;
DROP TABLE IF EXISTS public.agent_wallets CASCADE;
DROP TABLE IF EXISTS public.commission_plans CASCADE;

-- 1. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status_enum') THEN
        CREATE TYPE withdrawal_status_enum AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_type_enum') THEN
        CREATE TYPE ledger_type_enum AS ENUM ('CREDIT_PENDING', 'CREDIT_AVAILABLE', 'DEBIT_WITHDRAWAL', 'DEBIT_CLAWBACK', 'ADJUSTMENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_event_status_enum') THEN
        CREATE TYPE commission_event_status_enum AS ENUM ('PENDING_RELEASE', 'RELEASED', 'CLAWED_BACK', 'CANCELLED');
    END IF;
END$$;

-- 1A. FINANCE SETTINGS
CREATE TABLE IF NOT EXISTS public.finance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_withdrawal_amount NUMERIC(15,2) DEFAULT 5000.00 CHECK (min_withdrawal_amount >= 0),
    max_withdrawal_amount NUMERIC(15,2) DEFAULT 5000000.00 CHECK (max_withdrawal_amount >= 0),
    withdrawal_fee NUMERIC(15,2) DEFAULT 0.00 CHECK (withdrawal_fee >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- 2. COMMISSION PLANS (Versioned)
CREATE TABLE IF NOT EXISTS public.commission_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) DEFAULT 'ACTIVATION',
    base_bounty NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (base_bounty >= 0),
    holding_period_days INTEGER NOT NULL DEFAULT 30 CHECK (holding_period_days >= 0),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AGENT WALLETS
CREATE TABLE IF NOT EXISTS public.agent_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
    pending_balance NUMERIC(15,2) DEFAULT 0.00,
    available_balance NUMERIC(15,2) DEFAULT 0.00,
    total_earned NUMERIC(15,2) DEFAULT 0.00,
    total_withdrawn NUMERIC(15,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMMISSION EVENTS
CREATE TABLE IF NOT EXISTS public.commission_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    tenant_activation_log_id UUID NOT NULL REFERENCES public.tenant_activation_logs(id) ON DELETE RESTRICT UNIQUE,
    plan_id UUID NOT NULL REFERENCES public.commission_plans(id),
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    status commission_event_status_enum DEFAULT 'PENDING_RELEASE',
    release_date TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4A. COMMISSION NOTES
CREATE TABLE IF NOT EXISTS public.commission_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_event_id UUID NOT NULL REFERENCES public.commission_events(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WALLET LEDGER (Source of Truth)
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    commission_event_id UUID REFERENCES public.commission_events(id) ON DELETE SET NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    transaction_type ledger_type_enum NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMMISSION ADJUSTMENTS (Clawbacks)
CREATE TABLE IF NOT EXISTS public.commission_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    commission_event_id UUID NOT NULL REFERENCES public.commission_events(id) ON DELETE RESTRICT UNIQUE, -- Unique prevents double clawback
    adjustment_amount NUMERIC(15,2) NOT NULL CHECK (adjustment_amount > 0),
    reason TEXT NOT NULL,
    admin_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WITHDRAWAL REQUESTS
CREATE TABLE IF NOT EXISTS public.agent_withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    status withdrawal_status_enum DEFAULT 'REQUESTED',
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    rejection_reason TEXT,
    processed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WITHDRAWAL AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.withdrawal_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    withdrawal_id UUID NOT NULL REFERENCES public.agent_withdrawal_requests(id) ON DELETE CASCADE,
    old_status withdrawal_status_enum,
    new_status withdrawal_status_enum NOT NULL,
    changed_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WALLET DAILY SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.wallet_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    pending_balance NUMERIC(15,2) NOT NULL,
    available_balance NUMERIC(15,2) NOT NULL,
    total_earned NUMERIC(15,2) NOT NULL,
    total_withdrawn NUMERIC(15,2) NOT NULL,
    UNIQUE(agent_id, snapshot_date)
);

-- ==========================================
-- INDEXES & RLS
-- ==========================================
CREATE INDEX idx_commission_events_release ON public.commission_events(release_date);
CREATE INDEX idx_wallet_ledger_agent ON public.wallet_ledger(agent_id);

ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own wallet" ON public.agent_wallets FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own ledger" ON public.wallet_ledger FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents manage own withdrawals" ON public.agent_withdrawal_requests FOR ALL USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin Full Wallet" ON public.agent_wallets USING (is_admin_or_service());
CREATE POLICY "Admin Full Ledger" ON public.wallet_ledger USING (is_admin_or_service());
CREATE POLICY "Admin Full Adjustments" ON public.commission_adjustments USING (is_admin_or_service());
CREATE POLICY "Admin Full Withdrawals" ON public.agent_withdrawal_requests USING (is_admin_or_service());

CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.agent_wallets FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.agent_withdrawal_requests FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
