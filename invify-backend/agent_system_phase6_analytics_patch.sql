-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 6 PATCH
-- Creates missing Materialized Views & Refresh Logic
-- ==========================================

-- 1. CLEANUP (Safely drop regardless of type)
DO $$ BEGIN DROP VIEW IF EXISTS public.mv_agent_performance CASCADE; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN DROP MATERIALIZED VIEW IF EXISTS public.mv_agent_performance CASCADE; EXCEPTION WHEN OTHERS THEN END $$;

DO $$ BEGIN DROP VIEW IF EXISTS public.mv_reputation_analytics CASCADE; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN DROP MATERIALIZED VIEW IF EXISTS public.mv_reputation_analytics CASCADE; EXCEPTION WHEN OTHERS THEN END $$;

-- 2. MATERIALIZED VIEW: mv_agent_performance
CREATE MATERIALIZED VIEW public.mv_agent_performance AS
SELECT 
    agent_id,
    SUM(total_tenants_onboarded) AS lifetime_tenants_onboarded,
    SUM(active_tenants) AS current_active_tenants,
    AVG(tenant_retention_rate) AS avg_retention_rate,
    SUM(support_tickets_raised) AS total_support_tickets_raised,
    AVG(training_completion_rate) AS avg_training_completion,
    SUM(total_clawbacks) AS total_clawbacks_incurred,
    AVG(average_merchant_rating) AS network_merchant_rating
FROM public.agent_performance_metrics
GROUP BY agent_id;

CREATE UNIQUE INDEX idx_mv_agent_perf_id ON public.mv_agent_performance(agent_id);

-- 3. MATERIALIZED VIEW: mv_reputation_analytics
CREATE MATERIALIZED VIEW public.mv_reputation_analytics AS
SELECT 
    tier AS reputation_tier,
    COUNT(agent_id) AS agent_count,
    AVG(score) AS average_tier_score,
    MIN(score) AS lowest_tier_score,
    MAX(score) AS highest_tier_score
FROM public.agent_reputations
GROUP BY tier;

CREATE UNIQUE INDEX idx_mv_rep_tier ON public.mv_reputation_analytics(reputation_tier);

-- 4. REFRESH LOGIC (PostgreSQL Function)
CREATE OR REPLACE FUNCTION public.refresh_analytics_mvs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh existing M6 views
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_territory_intelligence;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_operational_risk_signals;
    
    -- Refresh newly created M6 views
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_agent_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_reputation_analytics;
END;
$$;
