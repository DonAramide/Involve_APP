/*
=============================================================================
Migration: dashboard_views_security_invoker
Description: Resolves Supabase Security Advisor "Security Definer View"
             errors (Splinter 0010) on platform dashboard views.

These views are queried only by the Node backend via service_role
(DashboardService). They must not be exposed to anon/authenticated PostgREST.
=============================================================================
*/

BEGIN;

DO $$
DECLARE
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'v_dashboard_kpis',
    'v_dashboard_alerts',
    'v_dashboard_governance',
    'v_dashboard_tenant_intelligence'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_name)) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v_name);
      EXECUTE format(
        'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',
        v_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
