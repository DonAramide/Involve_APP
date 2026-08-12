/*
=============================================================================
Migration: supabase_security_hardening
Description: Resolves Supabase linter alerts (rls_disabled_in_public,
             sensitive_columns_exposed) for invify-staging.

Strategy:
  - Backend (service_role) retains full access via bypass RLS.
  - anon role is blocked from sensitive / backend-owned tables.
  - authenticated users get tenant-scoped SELECT where client access is needed.
  - users.mfa_secret is excluded from authenticated column grants.
=============================================================================
*/

BEGIN;

-- ── Helper functions (SECURITY DEFINER for stable RLS checks) ───────────────

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'internal_staff', 'admin_ops', 'support', 'admin_deploy')
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_tenant_id_text()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.tenant_id::text
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_uuid(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_staff()
    OR (
      p_tenant_id IS NOT NULL
      AND public.auth_user_tenant_id_text() = p_tenant_id::text
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_text(p_tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_staff()
    OR (
      p_tenant_id IS NOT NULL
      AND public.auth_user_tenant_id_text() = p_tenant_id
    );
$$;

-- ── 1. USERS — protect mfa_secret & lock down API exposure ─────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON public.users FROM anon;

    -- Strip broad grants; re-grant only safe profile columns to authenticated.
    REVOKE ALL ON public.users FROM authenticated;
    GRANT SELECT (
      id,
      email,
      name,
      role,
      tenant_id,
      mfa_enabled,
      created_at,
      updated_at
    ) ON public.users TO authenticated;

    DROP POLICY IF EXISTS users_select_own ON public.users;
    CREATE POLICY users_select_own
      ON public.users FOR SELECT TO authenticated
      USING (id = auth.uid());

    DROP POLICY IF EXISTS users_select_platform_staff ON public.users;
    CREATE POLICY users_select_platform_staff
      ON public.users FOR SELECT TO authenticated
      USING (public.is_platform_staff());

    DROP POLICY IF EXISTS users_service_role_all ON public.users;
    CREATE POLICY users_service_role_all
      ON public.users FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 2. TENANTS ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenants'
  ) THEN
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON public.tenants FROM anon;

    DROP POLICY IF EXISTS tenants_select_scoped ON public.tenants;
    CREATE POLICY tenants_select_scoped
      ON public.tenants FOR SELECT TO authenticated
      USING (
        public.is_platform_staff()
        OR public.auth_user_tenant_id_text() = id::text
      );

    DROP POLICY IF EXISTS tenants_service_role_all ON public.tenants;
    CREATE POLICY tenants_service_role_all
      ON public.tenants FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 3. TENANT_STAFF — bank / VA PII (backend-only) ─────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_staff'
  ) THEN
    ALTER TABLE public.tenant_staff ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.tenant_staff FROM anon, authenticated;

    DROP POLICY IF EXISTS tenant_staff_service_role_all ON public.tenant_staff;
    CREATE POLICY tenant_staff_service_role_all
      ON public.tenant_staff FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 4. FINANCIAL LEDGER / WALLETS (backend-only) ───────────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ledgers', 'ledger_entries', 'wallets']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_service_role_all', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
        tbl || '_service_role_all',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── 5. POS TRANSACTION ATTEMPTS (card data) ────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pos_transaction_attempts'
  ) THEN
    ALTER TABLE public.pos_transaction_attempts ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.pos_transaction_attempts FROM anon;

    DROP POLICY IF EXISTS "Enable read access for tenant admins" ON public.pos_transaction_attempts;
    DROP POLICY IF EXISTS pos_attempts_select_tenant ON public.pos_transaction_attempts;
    CREATE POLICY pos_attempts_select_tenant
      ON public.pos_transaction_attempts FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));

    DROP POLICY IF EXISTS pos_attempts_service_role_all ON public.pos_transaction_attempts;
    CREATE POLICY pos_attempts_service_role_all
      ON public.pos_transaction_attempts FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 6. CONFIGURATION / SECRETS (backend-only) ─────────────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'configuration_providers',
    'configuration_definitions',
    'configuration_values',
    'configuration_values_history'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_service_role_all', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
        tbl || '_service_role_all',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── 7. PROVIDER SECRETS / QUEUES — replace USING(true) ─────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'queue_messages',
    'provider_secret_versions',
    'provider_secret_audit',
    'provider_secret_rotation_jobs',
    'webhook_dead_letters'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Internal Services Full Access - ' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_service_role_all', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
        tbl || '_service_role_all',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── 8. CARD SETTLEMENT TABLES (ensure locked — idempotent) ─────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['card_settlement_batches', 'card_settlement_matches']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'service_role_all_' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'service_role_all_card_settlement_batches', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'service_role_all_card_settlement_matches', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
        tbl || '_service_role_all',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── 9. Replace USING(true) tenant tables with scoped policies ─────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'items') THEN
    DROP POLICY IF EXISTS tenant_items_select ON public.items;
    CREATE POLICY tenant_items_select ON public.items
      FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
    DROP POLICY IF EXISTS items_service_role_all ON public.items;
    CREATE POLICY items_service_role_all ON public.items
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    DROP POLICY IF EXISTS tenant_categories_select ON public.categories;
    CREATE POLICY tenant_categories_select ON public.categories
      FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
    DROP POLICY IF EXISTS categories_service_role_all ON public.categories;
    CREATE POLICY categories_service_role_all ON public.categories
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    DROP POLICY IF EXISTS tenant_invoices_select ON public.invoices;
    CREATE POLICY tenant_invoices_select ON public.invoices
      FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
    DROP POLICY IF EXISTS invoices_service_role_all ON public.invoices;
    CREATE POLICY invoices_service_role_all ON public.invoices
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') THEN
    DROP POLICY IF EXISTS tenant_invoice_items_select ON public.invoice_items;
    CREATE POLICY tenant_invoice_items_select ON public.invoice_items
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.invoices i
          WHERE i.id = invoice_items.invoice_id
            AND public.can_access_tenant_uuid(i.tenant_id)
        )
      );
    DROP POLICY IF EXISTS invoice_items_service_role_all ON public.invoice_items;
    CREATE POLICY invoice_items_service_role_all ON public.invoice_items
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_payment_events') THEN
    DROP POLICY IF EXISTS school_payment_events_select ON public.school_payment_events;
    CREATE POLICY school_payment_events_select ON public.school_payment_events
      FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
    DROP POLICY IF EXISTS school_payment_events_service_role_all ON public.school_payment_events;
    CREATE POLICY school_payment_events_service_role_all ON public.school_payment_events
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_disputes') THEN
    DROP POLICY IF EXISTS payment_disputes_select ON public.payment_disputes;
    CREATE POLICY payment_disputes_select ON public.payment_disputes
      FOR SELECT TO authenticated
      USING (public.can_access_tenant_uuid(tenant_id));
    DROP POLICY IF EXISTS payment_disputes_service_role_all ON public.payment_disputes;
    CREATE POLICY payment_disputes_service_role_all ON public.payment_disputes
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- stock movements
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['stock_increments', 'stock_returns', 'suppliers']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_tenant', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_access_tenant_uuid(tenant_id))',
        tbl || '_select_tenant',
        tbl
      );

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_service_role_all', tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
        tbl || '_service_role_all',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── 10. Catch-all: enable RLS on any remaining public tables without it ──
--     (deny-by-default once RLS is on and no permissive policy exists)

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'Enabled RLS on public.%', r.tablename;
  END LOOP;
END $$;

COMMIT;
