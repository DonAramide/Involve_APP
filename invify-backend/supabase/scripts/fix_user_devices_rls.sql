-- Quick fix: run this in Supabase SQL Editor if 20260811210000 failed on user_devices.
-- Safe to re-run (uses IF EXISTS / DROP POLICY IF EXISTS).

BEGIN;

-- Step 3 only (user_devices uuid/text cast fix)
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

-- Step 2 (Flutter Realtime) — run if not applied yet
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

COMMIT;
