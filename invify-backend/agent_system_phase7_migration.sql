-- Phase 7: Agent Motivation & Incentive Management System Migration

-- Check if enums exist first to avoid errors on rerun
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

-- 1. Merchant Categories
CREATE TABLE IF NOT EXISTS merchant_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Commission Programs & Versions
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
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, DEPRECATED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, version_number)
);

CREATE TABLE IF NOT EXISTS commission_program_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id) ON DELETE CASCADE,
    tenant_onboarding_bonus NUMERIC(15,2) DEFAULT 0,
    tenant_activation_bonus NUMERIC(15,2) DEFAULT 0,
    card_rev_share_pct NUMERIC(5,2) DEFAULT 0,
    transfer_rev_share_pct NUMERIC(5,2) DEFAULT 0,
    ussd_rev_share_pct NUMERIC(5,2) DEFAULT 0,
    va_rev_share_pct NUMERIC(5,2) DEFAULT 0,
    bill_rev_share_pct NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS merchant_category_commission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES merchant_categories(id) ON DELETE CASCADE,
    tenant_onboarding_bonus NUMERIC(15,2),
    tenant_activation_bonus NUMERIC(15,2),
    card_rev_share_pct NUMERIC(5,2),
    transfer_rev_share_pct NUMERIC(5,2),
    ussd_rev_share_pct NUMERIC(5,2),
    va_rev_share_pct NUMERIC(5,2),
    bill_rev_share_pct NUMERIC(5,2),
    retention_bonus NUMERIC(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_version_id, category_id)
);

-- 3. Wallets & Progress
CREATE TABLE IF NOT EXISTS agent_commission_wallets (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    pending_balance NUMERIC(15,2) DEFAULT 0,
    approved_balance NUMERIC(15,2) DEFAULT 0,
    paid_balance NUMERIC(15,2) DEFAULT 0,
    reversed_balance NUMERIC(15,2) DEFAULT 0,
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
    tenants_onboarded_count INTEGER DEFAULT 0,
    terminals_deployed_count INTEGER DEFAULT 0,
    revenue_generated NUMERIC(15,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, plan_version_id)
);

-- 4. Campaigns & Budgets
CREATE TABLE IF NOT EXISTS commission_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    used_amount NUMERIC(15,2) DEFAULT 0,
    remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - used_amount) STORED,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    reward_value NUMERIC(15,2) NOT NULL,
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

-- 5. Targets
CREATE TABLE IF NOT EXISTS performance_target_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_version_id UUID NOT NULL REFERENCES commission_plan_versions(id) ON DELETE CASCADE,
    tier_level INTEGER NOT NULL,
    tenant_threshold INTEGER NOT NULL,
    bonus_amount NUMERIC(15,2) NOT NULL,
    card_rev_share_pct NUMERIC(5,2) NOT NULL,
    validity_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_version_id, tier_level)
);

CREATE TABLE IF NOT EXISTS terminal_target_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frequency VARCHAR(50) NOT NULL, -- WEEKLY, MONTHLY
    terminal_target INTEGER NOT NULL,
    reward_type reward_type NOT NULL,
    reward_value NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Events & Clawbacks
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
    amount NUMERIC(15,2) NOT NULL,
    status approval_state DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_clawbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    amount NUMERIC(15,2) NOT NULL,
    reason clawback_reason NOT NULL,
    reference_id UUID NOT NULL, 
    justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
