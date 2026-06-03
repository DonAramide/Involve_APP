-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 5 MIGRATION
-- Supabase PostgreSQL Schema: Reputation & Gamification
-- ==========================================

-- 0. CLEANUP (For Dev)
DROP TABLE IF EXISTS public.reputation_adjustments CASCADE;
DROP TABLE IF EXISTS public.achievement_audit_logs CASCADE;
DROP TABLE IF EXISTS public.agent_performance_snapshots CASCADE;
DROP TABLE IF EXISTS public.merchant_feedback_scores CASCADE;
DROP TABLE IF EXISTS public.reputation_audit_logs CASCADE;
DROP TABLE IF EXISTS public.agent_achievements CASCADE;
DROP TABLE IF EXISTS public.achievement_rules CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.agent_performance_metrics CASCADE;
DROP TABLE IF EXISTS public.agent_reputations CASCADE;

-- 1. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reputation_tier_enum') THEN
        CREATE TYPE reputation_tier_enum AS ENUM ('NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reputation_event_type_enum') THEN
        CREATE TYPE reputation_event_type_enum AS ENUM ('TENANT_ACTIVATED', 'CERTIFICATION_EARNED', 'SUPPORT_TICKET_SLA_BREACH', 'CLAWBACK_PENALTY', 'MANUAL_ADJUSTMENT', 'MERCHANT_FEEDBACK', 'REPUTATION_DECAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_category_enum') THEN
        CREATE TYPE achievement_category_enum AS ENUM ('ONBOARDING', 'TRAINING', 'SUPPORT', 'FINANCE', 'REPUTATION', 'PERFORMANCE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leaderboard_window_enum') THEN
        CREATE TYPE leaderboard_window_enum AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ALL_TIME');
    END IF;
END$$;

-- ==========================================
-- A. REPUTATION ENGINE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agent_reputations (
    agent_id UUID PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
    tier reputation_tier_enum NOT NULL DEFAULT 'NOVICE',
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    last_decay_applied_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reputation_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    event_type reputation_event_type_enum NOT NULL,
    reference_id UUID, 
    points_delta INTEGER NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reputation_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL,
    points_delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- B. PERFORMANCE SCORING & ANALYTICS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.agent_performance_metrics (
    agent_id UUID PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
    total_tenants_onboarded INTEGER DEFAULT 0,
    active_tenants INTEGER DEFAULT 0,
    tenant_retention_rate NUMERIC(5,2) DEFAULT 0.00,
    support_tickets_raised INTEGER DEFAULT 0,
    training_completion_rate NUMERIC(5,2) DEFAULT 0.00,
    total_clawbacks INTEGER DEFAULT 0,
    average_merchant_rating NUMERIC(3,2) DEFAULT 0.00,
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    snapshot_period leaderboard_window_enum NOT NULL,
    snapshot_date DATE NOT NULL,
    score INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, snapshot_period, snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.merchant_feedback_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, agent_id)
);

-- ==========================================
-- C. ACHIEVEMENTS FRAMEWORK
-- ==========================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category achievement_category_enum NOT NULL,
    icon_url TEXT,
    points_reward INTEGER DEFAULT 0 CHECK (points_reward >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.achievement_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    target_value NUMERIC NOT NULL CHECK (target_value > 0),
    time_bound_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.achievement_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_achievement_id UUID NOT NULL REFERENCES public.agent_achievements(id) ON DELETE CASCADE,
    trigger_reference_id UUID NOT NULL, -- The specific M1-M4 event that pushed them over the threshold
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES & RLS
-- ==========================================
CREATE INDEX idx_reputation_score ON public.agent_reputations(score DESC);
CREATE INDEX idx_reputation_audit_agent ON public.reputation_audit_logs(agent_id);
CREATE INDEX idx_snapshots_agent_period ON public.agent_performance_snapshots(agent_id, snapshot_period);
CREATE INDEX idx_merchant_feedback_agent ON public.merchant_feedback_scores(agent_id);
CREATE INDEX idx_achievement_audit ON public.achievement_audit_logs(agent_achievement_id);

-- Enforce Triggers
CREATE TRIGGER trg_agent_reputations_updated BEFORE UPDATE ON public.agent_reputations FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();
CREATE TRIGGER trg_agent_performance_metrics_updated BEFORE UPDATE ON public.agent_performance_metrics FOR EACH ROW EXECUTE PROCEDURE update_timestamp_trigger();

-- RLS
ALTER TABLE public.agent_reputations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_feedback_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own reputation" ON public.agent_reputations FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view global leaderboards" ON public.agent_reputations FOR SELECT USING (TRUE);
CREATE POLICY "Agents view own audit logs" ON public.reputation_audit_logs FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own metrics" ON public.agent_performance_metrics FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own snapshots" ON public.agent_performance_snapshots FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own feedback" ON public.merchant_feedback_scores FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Everyone views achievements" ON public.achievements FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Everyone views rules" ON public.achievement_rules FOR SELECT USING (TRUE);
CREATE POLICY "Agents view own earned achievements" ON public.agent_achievements FOR SELECT USING (agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid()));
CREATE POLICY "Agents view own achievement logs" ON public.achievement_audit_logs FOR SELECT USING (agent_achievement_id IN (SELECT id FROM public.agent_achievements WHERE agent_id = (SELECT id FROM public.agents WHERE auth_user_id = auth.uid())));

CREATE POLICY "Admin Full Access" ON public.agent_reputations USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.reputation_audit_logs USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.reputation_adjustments USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.agent_performance_metrics USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.agent_performance_snapshots USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.merchant_feedback_scores USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.achievements USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.achievement_rules USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.agent_achievements USING (is_admin_or_service());
CREATE POLICY "Admin Full Access" ON public.achievement_audit_logs USING (is_admin_or_service());
