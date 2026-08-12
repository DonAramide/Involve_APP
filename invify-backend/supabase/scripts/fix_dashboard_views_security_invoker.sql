-- Quick fix: Security Advisor "Security Definer View" on dashboard views
-- Run in Supabase SQL Editor on invify-staging, then Refresh Security Advisor.

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
      RAISE NOTICE 'Fixed %', v_name;
    ELSE
      RAISE NOTICE 'Skipped missing view %', v_name;
    END IF;
  END LOOP;
END $$;

-- Verify (expect 0 rows):
SELECT viewname, reloptions
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public'
  AND v.viewname LIKE 'v_dashboard%'
  AND (
    c.reloptions IS NULL
    OR NOT (
      'security_invoker=true' = ANY (c.reloptions)
      OR 'security_invoker=on' = ANY (c.reloptions)
    )
  );
