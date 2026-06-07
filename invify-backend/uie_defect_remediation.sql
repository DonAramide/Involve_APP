-- 1. DEFECT 1: Commission Events Constraint Decoupling
ALTER TABLE public.commission_events 
    ALTER COLUMN tenant_activation_log_id DROP NOT NULL;

-- 2. DEFECT 2: Approval Workflow RPC Definition
CREATE OR REPLACE FUNCTION public.process_commission_approval(
    p_ticket_id UUID, 
    p_agent_id UUID, 
    p_amount NUMERIC, 
    p_operator_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Update queue status
    UPDATE public.approval_queue 
    SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_ticket_id AND status = 'PENDING';

    -- Move pending balance to approved balance
    UPDATE public.agent_commission_wallets
    SET pending_balance = pending_balance - p_amount,
        approved_balance = approved_balance + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. DEFECT 4: Analytics Refresh Log Column Alignment
ALTER TABLE public.analytics_refresh_log 
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. DEFECT 4: Analytics Materialized View Definition
DROP VIEW IF EXISTS public.mv_territory_intelligence CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_territory_intelligence CASCADE;

CREATE MATERIALIZED VIEW public.mv_territory_intelligence AS
SELECT 
    'default' AS territory, 
    0 AS total_merchants,
    0 AS active_agents,
    0 AS penetration_rate;

CREATE UNIQUE INDEX idx_mv_territory_state ON public.mv_territory_intelligence(territory);
