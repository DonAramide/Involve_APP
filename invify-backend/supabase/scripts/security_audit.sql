-- =============================================================================
-- Invify Supabase Security Audit (one-shot)
-- Project: invify-staging (rpcjelhacmkhzguljdgi)
--
-- Run in Supabase Dashboard → SQL Editor (before AND after hardening migration).
-- Expected after fix: sections 1, 2, 4 return 0 rows; section 6 all PASS;
-- section 9 (security definer views) returns 0 rows.
-- =============================================================================

-- ── 1. PUBLIC TABLES WITHOUT RLS (rls_disabled_in_public) ───────────────────
SELECT
  '1_tables_without_rls' AS section,
  c.relname AS table_name,
  'CRITICAL: RLS disabled' AS issue
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND c.relname NOT LIKE 'pg_%'
ORDER BY c.relname;

-- ── 2. OPEN RLS POLICIES — USING(true) or WITH CHECK(true) ─────────────────
SELECT
  '2_open_policies' AS section,
  tablename,
  policyname,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- ── 3. ANON / AUTHENTICATED GRANTS ON SENSITIVE TABLES ─────────────────────
SELECT
  '3_sensitive_table_grants' AS section,
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  AND table_name IN (
    'users', 'tenant_staff', 'configuration_values', 'configuration_values_history',
    'provider_secret_versions', 'provider_secret_audit', 'provider_secret_rotation_jobs',
    'queue_messages', 'webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets',
    'pos_transaction_attempts', 'card_settlement_batches', 'card_settlement_matches'
  )
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

-- ── 4. SENSITIVE COLUMN GRANTS (users.mfa_secret, bank accounts, etc.) ─────
SELECT
  '4_sensitive_column_grants' AS section,
  grantee,
  table_name,
  column_name,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  AND (
    (table_name = 'users' AND column_name IN ('mfa_secret', 'password', 'password_hash'))
    OR (table_name = 'tenant_staff' AND column_name IN (
      'account_number', 'bank_code', 'bank_name', 'virtual_account_number'
    ))
    OR (table_name = 'configuration_values' AND column_name = 'value')
    OR (table_name = 'pos_transaction_attempts' AND column_name IN (
      'raw_request', 'raw_response', 'masked_pan', 'auth_code'
    ))
    OR (table_name = 'provider_secret_versions' AND column_name = 'vault_key_reference')
  )
ORDER BY table_name, column_name, grantee;

-- ── 5. KNOWN SENSITIVE TABLES — RLS + POLICY COUNT ─────────────────────────
WITH sensitive AS (
  SELECT unnest(ARRAY[
    'users', 'tenants', 'tenant_staff', 'configuration_values',
    'configuration_definitions', 'configuration_providers',
    'provider_secret_versions', 'provider_secret_audit', 'queue_messages',
    'webhook_dead_letters', 'ledgers', 'ledger_entries', 'wallets',
    'pos_transaction_attempts', 'items', 'invoices',
    'school_payment_events', 'payment_disputes'
  ]) AS table_name
)
SELECT
  '5_sensitive_table_status' AS section,
  s.table_name,
  COALESCE(c.relrowsecurity, false) AS rls_enabled,
  COUNT(p.policyname)::int AS policy_count,
  CASE
    WHEN NOT COALESCE(c.relrowsecurity, false) THEN 'FAIL: no RLS'
    WHEN COUNT(p.policyname) = 0 THEN 'WARN: RLS on, no policies'
    ELSE 'OK'
  END AS status
FROM sensitive s
LEFT JOIN pg_class c
  ON c.relname = s.table_name
 AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LEFT JOIN pg_policies p
  ON p.schemaname = 'public' AND p.tablename = s.table_name
GROUP BY s.table_name, c.relrowsecurity
ORDER BY status, s.table_name;

-- ── 6. SUMMARY SCORECARD ───────────────────────────────────────────────────
WITH checks AS (
  SELECT 'tables_without_rls' AS check_id, COUNT(*)::int AS failing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
  UNION ALL
  SELECT 'open_policies_true', COUNT(*)::int
  FROM pg_policies
  WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true')
  UNION ALL
  SELECT 'users_mfa_secret_granted', COUNT(*)::int
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    AND table_name = 'users' AND column_name = 'mfa_secret'
)
SELECT
  '6_scorecard' AS section,
  check_id,
  failing,
  CASE WHEN failing = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_id;

-- ── 7. RLS enabled but zero policies (backend-only lockdown — usually OK) ──
-- After 20260811210000 migration, this should return 0 rows (explicit service_role policies added).
-- Remaining rows are OK if they only have service_role + optional tenant SELECT policies.
SELECT
  '7_rls_no_policies' AS section,
  c.relname AS table_name,
  'RLS on, no policies — deny all except service_role (secure for backend-only tables)' AS note
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
GROUP BY c.relname
HAVING COUNT(p.policyname) = 0
ORDER BY c.relname;

-- ── 8. CLIENT-FACING TABLES — should have tenant or scoped SELECT ───────────
SELECT
  '8_client_access_check' AS section,
  t.table_name,
  (
    SELECT COUNT(*)::int FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.table_name
      AND p.cmd IN ('SELECT', 'ALL')
      AND 'authenticated' = ANY (p.roles)
  ) AS authenticated_select_policies,
  CASE
    WHEN t.table_name = 'financial_events' AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.policyname = 'financial_events_select_tenant'
    ) THEN 'WARN: add financial_events_select_tenant for Flutter Realtime'
    WHEN t.table_name = 'wallets' AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.policyname = 'wallets_select_tenant'
    ) THEN 'WARN: add wallets_select_tenant for Flutter Realtime'
    WHEN t.table_name = 'user_devices' AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.policyname = 'user_sees_own_devices'
    ) THEN 'WARN: add user_sees_own_devices policy'
    WHEN t.table_name = 'banks' THEN 'INFO: banks reference read optional'
    ELSE 'OK'
  END AS status
FROM (
  SELECT unnest(ARRAY['financial_events', 'wallets', 'user_devices', 'customers', 'students', 'banks']) AS table_name
) t
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND tables.table_name = t.table_name
)
ORDER BY status, t.table_name;

-- ── 9. SECURITY DEFINER VIEWS (Splinter 0010) ───────────────────────────────
-- Dashboard views should use security_invoker and have no anon/authenticated grants.
SELECT
  '9_security_definer_views' AS section,
  v.viewname AS view_name,
  c.reloptions AS view_options,
  COALESCE(
    (
      SELECT string_agg(DISTINCT grantee, ', ' ORDER BY grantee)
      FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public'
        AND g.table_name = v.viewname
        AND g.grantee IN ('anon', 'authenticated', 'PUBLIC')
    ),
    '(none)'
  ) AS public_api_grants
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public'
  AND (
    c.reloptions IS NULL
    OR NOT (
      'security_invoker=true' = ANY (c.reloptions)
      OR 'security_invoker=on' = ANY (c.reloptions)
    )
  )
ORDER BY v.viewname;
