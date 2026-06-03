-- ==========================================
-- INVIFY AGENT PORTAL - MILESTONE 6 MIGRATION
-- Operations Intelligence Layer (Final Review)
-- ==========================================

-- 1. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_health_enum') THEN
        CREATE TYPE merchant_health_enum AS ENUM ('HEALTHY', 'WATCHLIST', 'AT_RISK', 'CRITICAL', 'CHURNED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_category_enum') THEN
        CREATE TYPE risk_category_enum AS ENUM ('SLA_BREACH_RISK', 'CLAWBACK_EXPOSURE', 'AGENT_DECLINE_RISK', 'MERCHANT_CHURN_RISK', 'COMPLIANCE_RISK', 'FINANCIAL_EXPOSURE_RISK');
    END IF;
END$$;

-- ==========================================
-- A. MERCHANT HEALTH ENGINE (Time-Series)
-- ==========================================
-- Snapshot table isolating the deterministic health state of merchants
CREATE TABLE IF NOT EXISTS public.merchant_health_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL, 
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    health_status merchant_health_enum NOT NULL,
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    risk_factors JSONB, 
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, snapshot_date)
);

-- ==========================================
-- B. EXECUTIVE METRIC SNAPSHOTS (Time-Series)
-- ==========================================
-- Retains point-in-time organization aggregates
CREATE TABLE IF NOT EXISTS public.executive_kpi_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_active_tenants INTEGER NOT NULL,
    trailing_30d_activations INTEGER NOT NULL,
    total_outstanding_commissions NUMERIC(15,2) NOT NULL,
    trailing_30d_clawback_volume NUMERIC(15,2) NOT NULL,
    active_agent_count INTEGER NOT NULL,
    average_network_reputation INTEGER NOT NULL,
    -- Expanded Metrics:
    support_backlog INTEGER NOT NULL DEFAULT 0,
    sla_breach_count INTEGER NOT NULL DEFAULT 0,
    wallet_liability NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    active_certifications INTEGER NOT NULL DEFAULT 0,
    training_compliance_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snapshot_date)
);

-- ==========================================
-- C. MATERIALIZED VIEWS (Territory Intelligence)
-- ==========================================
-- Refreshed concurrently via pg_cron to prevent DB locks
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_territory_intelligence AS
SELECT 
    t.location_state AS territory,
    COUNT(DISTINCT t.id) AS total_tenants,
    COUNT(DISTINCT t.agent_id) AS total_agents,
    AVG(r.score) AS avg_reputation_score,
    COUNT(s.id) AS open_support_tickets,
    SUM(CASE WHEN t.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_tenants,
    SUM(CASE WHEN t.status = 'CHURNED' THEN 1 ELSE 0 END) AS churned_tenants,
    -- Expanded Territory Intelligence Fields:
    0 AS territory_score, -- To be dynamically computed via application or trigger scoring matrix
    0.00 AS territory_growth_rate, -- To be computed via MoM snapshot delta comparison
    '{}'::JSONB AS merchant_health_distribution -- Aggregated JSON payload mapping health tiers in region
FROM 
    public.agent_tenants t
LEFT JOIN 
    public.agent_reputations r ON t.agent_id = r.agent_id
LEFT JOIN 
    public.support_tickets s ON t.id = s.tenant_id AND s.status NOT IN ('RESOLVED', 'CLOSED')
GROUP BY 
    t.location_state;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_territory_state ON public.mv_territory_intelligence(territory);

-- ==========================================
-- D. MATERIALIZED VIEWS (Operational Risk Signals)
-- ==========================================
-- Dynamically aggregates current risks. No stateful 'resolved' tracking.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_operational_risk_signals AS
-- 1. SLA Breach Risk (Tickets approaching SLA limits)
SELECT 
    'SLA_BREACH_RISK'::risk_category_enum AS risk_category,
    id AS reference_id,
    'support_tickets' AS reference_type,
    'Ticket ' || subject || ' is within 2 hours of SLA Breach' AS description,
    9 AS severity_score
FROM public.support_tickets 
WHERE status NOT IN ('RESOLVED', 'CLOSED') 
  AND resolution_due_at < (NOW() + INTERVAL '2 hours')

UNION ALL

-- 2. Clawback Exposure Risk (Critical Health Merchants with recent activations)
SELECT 
    'CLAWBACK_EXPOSURE'::risk_category_enum AS risk_category,
    m.tenant_id AS reference_id,
    'agent_tenants' AS reference_type,
    'Tenant ' || t.business_name || ' is critically unhealthy. Potential clawback risk.' AS description,
    8 AS severity_score
FROM public.merchant_health_snapshots m
JOIN public.agent_tenants t ON m.tenant_id = t.id
WHERE m.snapshot_date = CURRENT_DATE 
  AND m.health_status = 'CRITICAL'
  AND t.activation_completed_at > (NOW() - INTERVAL '30 days');

-- Note: The other risk variants (AGENT_DECLINE_RISK, MERCHANT_CHURN_RISK, COMPLIANCE_RISK, FINANCIAL_EXPOSURE_RISK) 
-- will be dynamically integrated into this MV via similar UNION ALL select statements linking M1-M5 tables.

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_risk_signals ON public.mv_operational_risk_signals(risk_category, reference_id);

-- ==========================================
-- INDEXES & RLS
-- ==========================================
CREATE INDEX idx_merchant_health_snapshot_date ON public.merchant_health_snapshots(snapshot_date);
CREATE INDEX idx_merchant_health_tenant ON public.merchant_health_snapshots(tenant_id);

-- RLS (Strictly Admin Only for M6)
ALTER TABLE public.merchant_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin Full Access Health" ON public.merchant_health_snapshots USING (is_admin_or_service());
CREATE POLICY "Admin Full Access KPIs" ON public.executive_kpi_snapshots USING (is_admin_or_service());
