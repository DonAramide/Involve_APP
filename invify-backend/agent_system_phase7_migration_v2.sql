-- Phase 7 Migration V2: Agent Motivation & Incentive Management System (Remediated)

-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_state') THEN
        CREATE TYPE approval_state AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'REVERSED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clawback_reason') THEN
        CREATE TYPE clawback_reason AS ENUM ('MERCHANT_CLOSURE', 'FRAUD', 'CHARGEBACK', 'TERMINAL_RETRIEVAL', 'COMPLIANCE_VIOLATION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_target_type') THEN
        CREATE TYPE campaign_target_type AS ENUM ('MERCHANTS', 'TERMINALS', 'REVENUE', 'TRANSACTIONS');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
        CREATE TYPE reward_type AS ENUM ('CASH_BONUS', 'COMMISSION_MULTIPLIER', 'REPUTATION_POINTS', 'BADGE_UNLOCK');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('STANDARD', 'VOLUME_TIERED', 'TERMINAL_TARGET');
    END IF;
END $$;

-- 2. CORE TABLES (CATEGORIES & VERSIONS)
CREATE TABLE IF NOT EXISTS merchant_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_plan_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES commission_programs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, version_number)
);

CREATE TABLE IF NOT EXISTS commission_program_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id) ON DELETE CASCADE,
    tenant_onboarding_bonus NUMERIC(15,2) DEFAULT 0 CHECK (tenant_onboarding_bonus >= 0),
    tenant_activation_bonus NUMERIC(15,2) DEFAULT 0 CHECK (tenant_activation_bonus >= 0),
    card_rev_share_pct NUMERIC(5,2) DEFAULT 0 CHECK (card_rev_share_pct >= 0 AND card_rev_share_pct <= 100),
    transfer_rev_share_pct NUMERIC(5,2) DEFAULT 0 CHECK (transfer_rev_share_pct >= 0 AND transfer_rev_share_pct <= 100),
    ussd_rev_share_pct NUMERIC(5,2) DEFAULT 0 CHECK (ussd_rev_share_pct >= 0 AND ussd_rev_share_pct <= 100),
    va_rev_share_pct NUMERIC(5,2) DEFAULT 0 CHECK (va_rev_share_pct >= 0 AND va_rev_share_pct <= 100),
    bill_rev_share_pct NUMERIC(5,2) DEFAULT 0 CHECK (bill_rev_share_pct >= 0 AND bill_rev_share_pct <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS merchant_category_commission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES merchant_categories(id) ON DELETE CASCADE,
    tenant_onboarding_bonus NUMERIC(15,2) CHECK (tenant_onboarding_bonus >= 0),
    tenant_activation_bonus NUMERIC(15,2) CHECK (tenant_activation_bonus >= 0),
    card_rev_share_pct NUMERIC(5,2) CHECK (card_rev_share_pct >= 0 AND card_rev_share_pct <= 100),
    transfer_rev_share_pct NUMERIC(5,2) CHECK (transfer_rev_share_pct >= 0 AND transfer_rev_share_pct <= 100),
    ussd_rev_share_pct NUMERIC(5,2) CHECK (ussd_rev_share_pct >= 0 AND ussd_rev_share_pct <= 100),
    va_rev_share_pct NUMERIC(5,2) CHECK (va_rev_share_pct >= 0 AND va_rev_share_pct <= 100),
    bill_rev_share_pct NUMERIC(5,2) CHECK (bill_rev_share_pct >= 0 AND bill_rev_share_pct <= 100),
    retention_bonus NUMERIC(15,2) CHECK (retention_bonus >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_version_id, category_id)
);

-- 3. WALLETS & PROGRESS
CREATE TABLE IF NOT EXISTS agent_commission_wallets (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    pending_balance NUMERIC(15,2) DEFAULT 0 CHECK (pending_balance >= 0),
    approved_balance NUMERIC(15,2) DEFAULT 0 CHECK (approved_balance >= 0),
    paid_balance NUMERIC(15,2) DEFAULT 0 CHECK (paid_balance >= 0),
    reversed_balance NUMERIC(15,2) DEFAULT 0 CHECK (reversed_balance >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_commission_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    current_tier INTEGER DEFAULT 1,
    UNIQUE(agent_id, plan_version_id)
);

CREATE TABLE IF NOT EXISTS agent_commission_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id),
    tenants_onboarded_count INTEGER DEFAULT 0 CHECK (tenants_onboarded_count >= 0),
    terminals_deployed_count INTEGER DEFAULT 0 CHECK (terminals_deployed_count >= 0),
    revenue_generated NUMERIC(15,2) DEFAULT 0 CHECK (revenue_generated >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, plan_version_id)
);

-- 4. CAMPAIGNS & BUDGETS
CREATE TABLE IF NOT EXISTS commission_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    used_amount NUMERIC(15,2) DEFAULT 0 CHECK (used_amount >= 0),
    remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - used_amount) STORED,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (total_amount - used_amount >= 0)
);

CREATE TABLE IF NOT EXISTS commission_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES commission_budgets(id),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    target_type campaign_target_type NOT NULL,
    reward_type reward_type NOT NULL,
    reward_value NUMERIC(15,2) NOT NULL CHECK (reward_value >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_campaign_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES commission_campaigns(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    current_metric_value NUMERIC(15,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, agent_id)
);

-- 5. TARGETS
CREATE TABLE IF NOT EXISTS performance_target_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id) ON DELETE CASCADE,
    tier_level INTEGER NOT NULL,
    tenant_threshold INTEGER NOT NULL CHECK (tenant_threshold >= 0),
    bonus_amount NUMERIC(15,2) NOT NULL CHECK (bonus_amount >= 0),
    card_rev_share_pct NUMERIC(5,2) NOT NULL CHECK (card_rev_share_pct >= 0 AND card_rev_share_pct <= 100),
    validity_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_version_id, tier_level)
);

CREATE TABLE IF NOT EXISTS terminal_target_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frequency VARCHAR(50) NOT NULL,
    terminal_target INTEGER NOT NULL CHECK (terminal_target >= 0),
    reward_type reward_type NOT NULL,
    reward_value NUMERIC(15,2) NOT NULL CHECK (reward_value >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. EVENTS, LEDGERS & APPROVAL QUEUE
-- Modify existing commission_events table from Phase 3 to support Phase 7 audit requirements
ALTER TABLE IF EXISTS commission_events 
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT 'LEGACY', 
    ADD COLUMN IF NOT EXISTS previous_state approval_state,
    ADD COLUMN IF NOT EXISTS new_state approval_state,
    ADD COLUMN IF NOT EXISTS reference_id UUID,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- In case it doesn't exist at all, we create it
CREATE TABLE IF NOT EXISTS commission_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    event_type VARCHAR(100) NOT NULL, 
    amount NUMERIC(15,2) NOT NULL,
    previous_state approval_state,
    new_state approval_state,
    reference_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    source_type VARCHAR(50) NOT NULL, 
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    status approval_state DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- New Missing Tables
CREATE TABLE IF NOT EXISTS agent_revenue_share_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    transaction_id VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    platform_revenue NUMERIC(15,2) NOT NULL CHECK (platform_revenue >= 0),
    revenue_share_percentage NUMERIC(5,2) NOT NULL CHECK (revenue_share_percentage >= 0 AND revenue_share_percentage <= 100),
    calculated_commission NUMERIC(15,2) NOT NULL CHECK (calculated_commission >= 0),
    approval_state approval_state DEFAULT 'PENDING',
    approval_queue_id UUID REFERENCES approval_queue(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_bonus_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    reward_type reward_type NOT NULL,
    reward_source VARCHAR(100) NOT NULL,
    reward_amount NUMERIC(15,2) NOT NULL CHECK (reward_amount >= 0),
    approval_state approval_state DEFAULT 'PENDING',
    campaign_id UUID REFERENCES commission_campaigns(id),
    approval_queue_id UUID REFERENCES approval_queue(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_clawbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    reason clawback_reason NOT NULL,
    reference_id UUID NOT NULL REFERENCES approval_queue(id),
    justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_approval_queue_agent_id ON approval_queue(agent_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_commission_events_agent_id ON commission_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_ref_id ON commission_events(reference_id);
CREATE INDEX IF NOT EXISTS idx_agent_revenue_share_ledger_agent_id ON agent_revenue_share_ledger(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_bonus_rewards_agent_id ON agent_bonus_rewards(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commission_assignments_agent ON agent_commission_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_campaign_progress_campaign ON agent_campaign_progress(campaign_id);
CREATE INDEX IF NOT EXISTS idx_agent_campaign_progress_agent ON agent_campaign_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_clawbacks_ref ON commission_clawbacks(reference_id);

-- 8. AUTOMATION TRIGGERS

-- Trigger: Audit Commission Events on Approval Queue Status Change
CREATE OR REPLACE FUNCTION trg_audit_approval_queue_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO commission_events (agent_id, event_type, amount, previous_state, new_state, reference_id)
        VALUES (NEW.agent_id, 'APPROVAL_STATUS_CHANGE', NEW.amount, OLD.status, NEW.status, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_approval_queue ON approval_queue;
CREATE TRIGGER trigger_audit_approval_queue
AFTER UPDATE ON approval_queue
FOR EACH ROW EXECUTE FUNCTION trg_audit_approval_queue_change();

-- Trigger: Synchronize Wallet Balances from Approval Queue
CREATE OR REPLACE FUNCTION trg_sync_wallet_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if the status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Ensure wallet exists
        INSERT INTO agent_commission_wallets (agent_id) 
        VALUES (NEW.agent_id) 
        ON CONFLICT DO NOTHING;

        -- Remove amount from old state
        IF OLD.status = 'PENDING' THEN
            UPDATE agent_commission_wallets SET pending_balance = pending_balance - OLD.amount WHERE agent_id = OLD.agent_id;
        ELSIF OLD.status = 'APPROVED' THEN
            UPDATE agent_commission_wallets SET approved_balance = approved_balance - OLD.amount WHERE agent_id = OLD.agent_id;
        ELSIF OLD.status = 'PAID' THEN
            UPDATE agent_commission_wallets SET paid_balance = paid_balance - OLD.amount WHERE agent_id = OLD.agent_id;
        ELSIF OLD.status = 'REVERSED' THEN
            UPDATE agent_commission_wallets SET reversed_balance = reversed_balance - OLD.amount WHERE agent_id = OLD.agent_id;
        END IF;

        -- Add amount to new state
        IF NEW.status = 'PENDING' THEN
            UPDATE agent_commission_wallets SET pending_balance = pending_balance + NEW.amount WHERE agent_id = NEW.agent_id;
        ELSIF NEW.status = 'APPROVED' THEN
            UPDATE agent_commission_wallets SET approved_balance = approved_balance + NEW.amount WHERE agent_id = NEW.agent_id;
        ELSIF NEW.status = 'PAID' THEN
            UPDATE agent_commission_wallets SET paid_balance = paid_balance + NEW.amount WHERE agent_id = NEW.agent_id;
        ELSIF NEW.status = 'REVERSED' THEN
            UPDATE agent_commission_wallets SET reversed_balance = reversed_balance + NEW.amount WHERE agent_id = NEW.agent_id;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_wallet_balances ON approval_queue;
CREATE TRIGGER trigger_sync_wallet_balances
AFTER UPDATE ON approval_queue
FOR EACH ROW EXECUTE FUNCTION trg_sync_wallet_balances();

-- Trigger: Add initial pending balance on INSERT to approval_queue
CREATE OR REPLACE FUNCTION trg_sync_wallet_balances_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'PENDING' THEN
        INSERT INTO agent_commission_wallets (agent_id, pending_balance) 
        VALUES (NEW.agent_id, NEW.amount) 
        ON CONFLICT (agent_id) DO UPDATE 
        SET pending_balance = agent_commission_wallets.pending_balance + NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_wallet_balances_insert ON approval_queue;
CREATE TRIGGER trigger_sync_wallet_balances_insert
AFTER INSERT ON approval_queue
FOR EACH ROW EXECUTE FUNCTION trg_sync_wallet_balances_insert();

-- 9. COMMISSION CLAWBACK RPC
CREATE OR REPLACE FUNCTION public.execute_commission_clawback(
    p_agent_id UUID,
    p_amount NUMERIC,
    p_reason VARCHAR,
    p_justification TEXT,
    p_operator_id UUID
) RETURNS VOID AS $$
DECLARE
    v_ticket_id UUID;
BEGIN
    -- 1. Create a ticket in the approval queue with status 'REVERSED'
    INSERT INTO public.approval_queue (agent_id, source_type, amount, status)
    VALUES (p_agent_id, 'CLAWBACK', p_amount, 'REVERSED')
    RETURNING id INTO v_ticket_id;

    -- 2. Create the clawback record
    INSERT INTO public.commission_clawbacks (agent_id, amount, reason, reference_id, justification)
    VALUES (p_agent_id, p_amount, p_reason::public.clawback_reason, v_ticket_id, p_justification);

    -- 3. Update the agent's wallet: deduct from paid_balance and add to reversed_balance
    UPDATE public.agent_commission_wallets
    SET paid_balance = paid_balance - p_amount,
        reversed_balance = reversed_balance + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE agent_id = p_agent_id;

    -- 4. Log audit event
    INSERT INTO public.commission_events (agent_id, event_type, amount, previous_state, new_state, reference_id, metadata)
    VALUES (
        p_agent_id,
        'COMMISSION_CLAWBACK',
        p_amount,
        'PAID',
        'REVERSED',
        v_ticket_id,
        jsonb_build_object('reason', p_reason, 'justification', p_justification, 'operator_id', p_operator_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

