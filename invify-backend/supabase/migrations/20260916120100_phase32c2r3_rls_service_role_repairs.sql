/*
=============================================================================
Phase 32C.2R.3 FORWARD RLS repairs.

Idempotent repairs for environments that already applied unsafe PUBLIC ALL
policies (e.g. staging). Greenfield production also gets correct policies from
edited 20260903000000 / hardening migrations; this file remains safe to re-run.

Does NOT create deferred services_* tables.
Preserves legitimate banks public-read reference-data policy.
=============================================================================
*/

-- Financial disputes (maker-checker) — privileged backend only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='financial_disputes') THEN
    EXECUTE 'DROP POLICY IF EXISTS financial_disputes_service_all ON public.financial_disputes';
    EXECUTE $p$
      CREATE POLICY financial_disputes_service_all
        ON public.financial_disputes
        FOR ALL
        TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='financial_dispute_events') THEN
    EXECUTE 'DROP POLICY IF EXISTS financial_dispute_events_service_all ON public.financial_dispute_events';
    EXECUTE $p$
      CREATE POLICY financial_dispute_events_service_all
        ON public.financial_dispute_events
        FOR ALL
        TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- items / categories: drop legacy unrestricted ALL if still present; ensure service_role policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations for items" ON public.items';
    EXECUTE 'DROP POLICY IF EXISTS tenant_items_select ON public.items';
    EXECUTE 'DROP POLICY IF EXISTS items_service_role_all ON public.items';
    EXECUTE $p$
      CREATE POLICY items_service_role_all ON public.items
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations for categories" ON public.categories';
    EXECUTE 'DROP POLICY IF EXISTS tenant_categories_select ON public.categories';
    EXECUTE 'DROP POLICY IF EXISTS categories_service_role_all ON public.categories';
    EXECUTE $p$
      CREATE POLICY categories_service_role_all ON public.categories
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- Deferred services_* : repair policies only if tables already exist (do not create tables)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services_customers') THEN
    EXECUTE 'DROP POLICY IF EXISTS services_customers_service_all ON public.services_customers';
    EXECUTE $p$
      CREATE POLICY services_customers_service_all ON public.services_customers
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services_jobs') THEN
    EXECUTE 'DROP POLICY IF EXISTS services_jobs_service_all ON public.services_jobs';
    EXECUTE $p$
      CREATE POLICY services_jobs_service_all ON public.services_jobs
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services_payments') THEN
    EXECUTE 'DROP POLICY IF EXISTS services_payments_service_all ON public.services_payments';
    EXECUTE $p$
      CREATE POLICY services_payments_service_all ON public.services_payments
        FOR ALL TO service_role
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;
