-- Phase 32C.2R.3: create v_dashboard_kpis after p10 ledger_entries exists.
-- Avoids ledger_entries.status (not in p10 DDL).

CREATE OR REPLACE VIEW public.v_dashboard_kpis
WITH (security_invoker = on) AS
SELECT
    (SELECT COUNT(*) FROM public.tenants WHERE status = 'active') AS active_tenants,
    (SELECT COUNT(*) FROM public.ledger_entries) AS total_transactions,
    (SELECT COUNT(*) FROM public.reconciliation_cases WHERE status NOT IN ('RESOLVED', 'CLOSED')) AS open_incidents,
    100.00::numeric AS platform_health_score,
    99.98 AS system_uptime,
    CASE
        WHEN (SELECT COUNT(*) FROM public.reconciliation_cases WHERE status NOT IN ('RESOLVED', 'CLOSED')) < 2 THEN 'A+'
        WHEN (SELECT COUNT(*) FROM public.reconciliation_cases WHERE status NOT IN ('RESOLVED', 'CLOSED')) < 5 THEN 'B'
        ELSE 'C'
    END AS security_posture;