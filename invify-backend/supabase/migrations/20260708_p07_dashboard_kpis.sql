-- 20260708_p07_dashboard_kpis.sql
-- Creates the v_dashboard_kpis view for live platform metrics

CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT 
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'active') as active_tenants,
    (SELECT COUNT(*) FROM public.ledger_entries) as total_transactions,
    (SELECT COUNT(*) FROM public.reconciliation_cases WHERE status NOT IN ('RESOLVED', 'CLOSED')) as open_incidents,
    
    -- Calculate health score based on transaction success rate (if 0 tx, default to 100%)
    COALESCE(
        ROUND(
            (100.0 - (
                (SELECT COUNT(*)::numeric FROM public.ledger_entries WHERE status IN ('failed', 'error')) / 
                NULLIF((SELECT COUNT(*)::numeric FROM public.ledger_entries), 0) * 100.0
            )), 2
        ), 100.00
    ) as platform_health_score,
    
    -- For system uptime, we can return a static 99.98% from the DB, but we will override it in Node using os.uptime()
    99.98 as system_uptime,

    -- Security posture: 'A+' if < 2 incidents, 'B' if < 5, else 'C'
    CASE 
        WHEN (SELECT COUNT(*) FROM public.reconciliation_cases WHERE status NOT IN ('RESOLVED', 'CLOSED')) < 2 THEN 'A+'
        WHEN (SELECT COUNT(*) FROM public.reconciliation_cases WHERE status NOT IN ('RESOLVED', 'CLOSED')) < 5 THEN 'B'
        ELSE 'C'
    END as security_posture;
