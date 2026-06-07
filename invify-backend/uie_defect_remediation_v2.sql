-- ==========================================
-- UIE REMEDIATION SPRINT C - V2
-- Fixes trigger constraint & restores MV
-- ==========================================

-- 1. FIX APPROVAL STATUS CHANGE TRIGGER
CREATE OR REPLACE FUNCTION trg_audit_approval_queue_change()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Resolve exact lineage plan from the originating event
        SELECT plan_id INTO v_plan_id
        FROM public.commission_events
        WHERE reference_id = NEW.id
        ORDER BY created_at ASC
        LIMIT 1;

        -- If no plan exists, we cannot insert without violating the FK.
        -- Assuming a seed exists.
        IF v_plan_id IS NOT NULL THEN
            INSERT INTO commission_events (agent_id, plan_id, event_type, amount, previous_state, new_state, reference_id)
            VALUES (NEW.agent_id, v_plan_id, 'APPROVAL_STATUS_CHANGE', NEW.amount, OLD.status, NEW.status, NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2. RESTORE MISSING MATERIALIZED VIEW
DROP VIEW IF EXISTS public.mv_operational_risk_signals CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_operational_risk_signals CASCADE;

CREATE MATERIALIZED VIEW public.mv_operational_risk_signals AS
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_risk_signals ON public.mv_operational_risk_signals(risk_category, reference_id);
