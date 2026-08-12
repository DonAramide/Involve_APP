/*
=============================================================================
Migration: rls_service_role_policies_and_client_access
Description: Section-7 follow-up for invify-staging.

Tables with RLS enabled but zero policies are NOT a Supabase linter failure —
they deny anon/authenticated (secure). service_role (backend) still works.

This migration:
  1. Adds explicit service_role policies to all RLS/no-policy tables (audit clarity)
  2. Adds tenant-scoped SELECT for Flutter Supabase Realtime (financial_events, wallets)
  3. Restores user_devices client policies
  4. Allows public read on banks reference list (if table exists)
=============================================================================
*/

BEGIN;

-- ── 1. Explicit service_role policy on every RLS table with no policies ───

DO $$
DECLARE
  r RECORD;
  pol_name TEXT;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policies p
      ON p.schemaname = 'public' AND p.tablename = c.relname
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    GROUP BY c.relname
    HAVING COUNT(p.policyname) = 0
  LOOP
    pol_name := left(r.tablename || '_service_role_all', 63);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
      pol_name,
      r.tablename
    );
    RAISE NOTICE 'Added service_role policy on public.%', r.tablename;
  END LOOP;
END $$;

-- ── 2. Flutter Realtime — tenant-scoped SELECT (runs after step 1) ─────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'financial_events'
  ) THEN
    DROP POLICY IF EXISTS financial_events_select_tenant ON public.financial_events;
    CREATE POLICY financial_events_select_tenant
      ON public.financial_events FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wallets'
  ) THEN
    DROP POLICY IF EXISTS wallets_select_tenant ON public.wallets;
    CREATE POLICY wallets_select_tenant
      ON public.wallets FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
  END IF;
END $$;

-- ── 3. Restore user_devices policies (client device management) ─────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_devices'
  ) THEN
    DROP POLICY IF EXISTS user_devices_service_role_all ON public.user_devices;
    DROP POLICY IF EXISTS user_sees_own_devices ON public.user_devices;
    DROP POLICY IF EXISTS admin_sees_all_devices ON public.user_devices;

    CREATE POLICY user_sees_own_devices
      ON public.user_devices FOR SELECT TO authenticated
      USING (user_id::text = auth.uid()::text);

    CREATE POLICY admin_sees_all_devices
      ON public.user_devices FOR SELECT TO authenticated
      USING (public.is_platform_staff());

    CREATE POLICY user_devices_service_role_all
      ON public.user_devices FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 4. Banks reference list — read-only for onboarding / transfers ──────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'banks'
  ) THEN
    DROP POLICY IF EXISTS banks_service_role_all ON public.banks;
    DROP POLICY IF EXISTS banks_public_read ON public.banks;

    CREATE POLICY banks_public_read
      ON public.banks FOR SELECT
      USING (true);

    CREATE POLICY banks_service_role_all
      ON public.banks FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
