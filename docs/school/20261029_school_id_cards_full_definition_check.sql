-- Read-only. Run in the Supabase SQL editor on project rpcjelhacmkhzguljdgi (staging) only.
-- It only reads pg_catalog. It does not create, alter, grant, or insert anything.
-- Return the single JSON value. Every key under "pass" must be true before SCHOOL_ID_CARD_SQL is approved.

WITH
expected_tables(t) AS (
  VALUES ('school_id_card_settings'), ('school_id_cards'), ('school_entry_exit_guardian_contacts'),
         ('school_staff_email_verifications'), ('school_entry_exit_sessions'), ('school_entry_exit_events'),
         ('school_gate_audit_events'), ('school_entry_exit_notifications')
),
expected_functions(f) AS (
  VALUES ('school_gate_role_allowed'), ('school_gate_assert_server_time'), ('school_gate_sha256_hex'),
         ('school_gate_reject_predictable_token'), ('school_gate_assert_school_admin'),
         ('school_gate_assert_scan_operator'), ('school_gate_assert_student'), ('school_gate_assert_staff'),
         ('school_gate_assert_admin_subject'), ('school_gate_append_only'), ('school_gate_settings_guard'),
         ('school_gate_active_card_id'), ('school_gate_card_guard'), ('school_gate_card_commit'),
         ('school_gate_guardian_guard'), ('school_gate_staff_email_guard'), ('school_gate_session_guard'),
         ('school_gate_event_guard'), ('school_gate_session_event_required'), ('school_gate_audit_guard'),
         ('school_gate_audit_required'), ('school_gate_notification_guard')
),
expected_triggers(tbl, trg, deferred) AS (
  VALUES
    ('school_id_card_settings', 'trg_school_id_card_settings_guard', false),
    ('school_id_card_settings', 'trg_school_id_card_settings_no_delete', false),
    ('school_id_card_settings', 'trg_school_id_card_settings_no_truncate', false),
    ('school_id_card_settings', 'trg_school_id_card_settings_audit', true),
    ('school_id_cards', 'trg_school_id_cards_guard', false),
    ('school_id_cards', 'trg_school_id_cards_no_delete', false),
    ('school_id_cards', 'trg_school_id_cards_no_truncate', false),
    ('school_id_cards', 'trg_school_id_cards_commit', true),
    ('school_id_cards', 'trg_school_id_cards_audit', true),
    ('school_entry_exit_guardian_contacts', 'trg_school_entry_exit_guardian_guard', false),
    ('school_entry_exit_guardian_contacts', 'trg_school_entry_exit_guardian_no_delete', false),
    ('school_entry_exit_guardian_contacts', 'trg_school_entry_exit_guardian_no_truncate', false),
    ('school_entry_exit_guardian_contacts', 'trg_school_entry_exit_guardian_audit', true),
    ('school_staff_email_verifications', 'trg_school_staff_email_guard', false),
    ('school_staff_email_verifications', 'trg_school_staff_email_no_delete', false),
    ('school_staff_email_verifications', 'trg_school_staff_email_no_truncate', false),
    ('school_staff_email_verifications', 'trg_school_staff_email_audit', true),
    ('school_entry_exit_sessions', 'trg_school_entry_exit_session_guard', false),
    ('school_entry_exit_sessions', 'trg_school_entry_exit_session_no_delete', false),
    ('school_entry_exit_sessions', 'trg_school_entry_exit_session_no_truncate', false),
    ('school_entry_exit_sessions', 'trg_school_entry_exit_session_event_required', true),
    ('school_entry_exit_sessions', 'trg_school_entry_exit_session_audit', true),
    ('school_entry_exit_events', 'trg_school_entry_exit_event_guard', false),
    ('school_entry_exit_events', 'trg_school_entry_exit_event_no_update', false),
    ('school_entry_exit_events', 'trg_school_entry_exit_event_no_truncate', false),
    ('school_gate_audit_events', 'trg_school_gate_audit_guard', false),
    ('school_gate_audit_events', 'trg_school_gate_audit_no_update', false),
    ('school_gate_audit_events', 'trg_school_gate_audit_no_truncate', false),
    ('school_entry_exit_notifications', 'trg_school_entry_exit_notification_guard', false),
    ('school_entry_exit_notifications', 'trg_school_entry_exit_notification_no_delete', false),
    ('school_entry_exit_notifications', 'trg_school_entry_exit_notification_no_truncate', false)
),
expected_indexes(i) AS (
  VALUES ('uq_school_id_cards_token'), ('uq_school_id_cards_active_student'), ('uq_school_id_cards_active_staff'),
         ('uq_school_id_cards_active_admin'), ('uq_school_id_cards_pending_student'),
         ('uq_school_id_cards_pending_staff'), ('uq_school_id_cards_pending_admin'),
         ('ix_school_id_cards_tenant_status'), ('ix_school_id_cards_replaces'),
         ('uq_school_entry_exit_guardian_live_email'), ('uq_school_entry_exit_guardian_primary'),
         ('ix_school_entry_exit_guardian_student'), ('uq_school_staff_email_live'), ('ix_school_staff_email_staff'),
         ('uq_school_entry_exit_one_open_student'), ('uq_school_entry_exit_one_open_staff'),
         ('uq_school_entry_exit_one_open_admin'), ('ix_school_entry_exit_sessions_tenant_opened'),
         ('ix_school_entry_exit_sessions_card'), ('uq_school_entry_exit_one_opening_event'),
         ('uq_school_entry_exit_one_closing_event'), ('uq_school_entry_exit_one_void_event'),
         ('ix_school_entry_exit_events_tenant_time'), ('ix_school_entry_exit_events_session'),
         ('ix_school_gate_audit_tenant'), ('ix_school_entry_exit_notifications_tenant'),
         ('ix_school_entry_exit_notifications_session')
),
fn AS (
  SELECT p.oid, p.proname, p.prosecdef, p.proconfig, p.prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'school_gate\_%' ESCAPE '\'
),
fn_check AS (
  SELECT
    e.f,
    count(fn.oid) AS present,
    bool_and(NOT fn.prosecdef) AS invoker,
    bool_and(coalesce('search_path=public' = ANY (fn.proconfig), false)) AS search_path_public,
    bool_and(has_function_privilege('service_role', fn.oid, 'EXECUTE')) AS service_role_exec,
    bool_and(NOT has_function_privilege('anon', fn.oid, 'EXECUTE')) AS anon_denied,
    bool_and(NOT has_function_privilege('authenticated', fn.oid, 'EXECUTE')) AS authenticated_denied,
    bool_and(NOT coalesce(
      (SELECT bool_or(a.grantee = 0 AND a.privilege_type = 'EXECUTE')
       FROM pg_proc p2, aclexplode(coalesce(p2.proacl, acldefault('f', p2.proowner))) a
       WHERE p2.oid = fn.oid), false)) AS public_denied
  FROM expected_functions e
  LEFT JOIN fn ON fn.proname = e.f
  GROUP BY e.f
),
trg AS (
  SELECT c.relname AS tbl, t.tgname AS trg, t.tgdeferrable, t.tginitdeferred, t.tgenabled
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND NOT t.tgisinternal
),
trg_check AS (
  SELECT e.tbl, e.trg, e.deferred AS expect_deferred,
         trg.trg IS NOT NULL AS present,
         coalesce(trg.tgdeferrable = e.deferred AND trg.tginitdeferred = e.deferred, false) AS deferral_ok,
         coalesce(trg.tgenabled <> 'D', false) AS enabled
  FROM expected_triggers e
  LEFT JOIN trg ON trg.tbl = e.tbl AND trg.trg = e.trg
),
tbl_check AS (
  SELECT e.t,
         c.oid IS NOT NULL AS present,
         coalesce(c.relrowsecurity, false) AS rls,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = e.t
            AND p.policyname = e.t || '_service_role_all') AS service_policy,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = e.t) AS policies_total,
         CASE WHEN c.oid IS NULL THEN false ELSE NOT (
           has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
           OR has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         ) END AS client_roles_denied,
         CASE WHEN c.oid IS NULL THEN false
              ELSE has_table_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE') END AS service_role_rw
  FROM expected_tables e
  LEFT JOIN pg_class c ON c.relname = e.t AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
),
fk AS (
  SELECT cl.relname AS tbl, ref.relname AS references_table
  FROM pg_constraint co
  JOIN pg_class cl ON cl.oid = co.conrelid
  JOIN pg_class ref ON ref.oid = co.confrelid
  WHERE co.contype = 'f' AND cl.relnamespace = 'public'::regnamespace
    AND cl.relname IN (SELECT t FROM expected_tables)
),
idx_check AS (
  SELECT e.i, EXISTS (SELECT 1 FROM pg_indexes x WHERE x.schemaname = 'public' AND x.indexname = e.i) AS present
  FROM expected_indexes e
),
sha AS (
  SELECT position('extensions.digest' in prosrc) > 0 AS uses_extensions_digest,
         position('encode(digest(' in prosrc) > 0 AS uses_unqualified_digest
  FROM fn WHERE proname = 'school_gate_sha256_hex'
),
probe AS (
  SELECT (
    to_regclass('public.school_id_cards') IS NOT NULL
    AND to_regclass('public.school_id_card_settings') IS NOT NULL
    AND to_regclass('public.school_gate_audit_events') IS NOT NULL
    AND to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL
    AND (SELECT count(*) FROM trg WHERE tbl = 'school_id_cards' AND (
          (trg = 'trg_school_id_cards_guard' AND NOT tgdeferrable)
          OR (trg = 'trg_school_id_cards_audit' AND tgdeferrable AND tginitdeferred))) = 2
  ) AS ready
)
SELECT jsonb_build_object(
  'project_check', 'run on rpcjelhacmkhzguljdgi only',
  'pass', jsonb_build_object(
    'tables_present', (SELECT bool_and(present) FROM tbl_check),
    'rls_enabled', (SELECT bool_and(rls) FROM tbl_check),
    'service_role_policy_each_table', (SELECT bool_and(service_policy = 1) FROM tbl_check),
    'anon_and_authenticated_have_no_table_rights', (SELECT bool_and(client_roles_denied) FROM tbl_check),
    'service_role_can_read_write', (SELECT bool_and(service_role_rw) FROM tbl_check),
    'functions_present_22', (SELECT count(*) FILTER (WHERE present = 1) = 22 FROM fn_check),
    'functions_security_invoker', (SELECT bool_and(coalesce(invoker, false)) FROM fn_check),
    'functions_search_path_public', (SELECT bool_and(coalesce(search_path_public, false)) FROM fn_check),
    'functions_execute_service_role_only', (SELECT bool_and(coalesce(service_role_exec AND anon_denied AND authenticated_denied AND public_denied, false)) FROM fn_check),
    'sha256_uses_extensions_digest', (SELECT coalesce(bool_and(uses_extensions_digest AND NOT uses_unqualified_digest), false) FROM sha),
    'triggers_present_30', (SELECT count(*) FILTER (WHERE present) = 30 FROM trg_check),
    'trigger_deferral_correct', (SELECT bool_and(deferral_ok) FROM trg_check),
    'triggers_enabled', (SELECT bool_and(enabled) FROM trg_check),
    'indexes_present_27', (SELECT count(*) FILTER (WHERE present) = 27 FROM idx_check),
    'card_fks_tenants_users_students_staff_self', (
      SELECT count(DISTINCT references_table) FILTER (WHERE references_table IN ('tenants','users','students','tenant_staff','school_id_cards')) = 5
      FROM fk WHERE tbl = 'school_id_cards'),
    'backend_probe_ready', (SELECT ready FROM probe),
    'no_cards_yet', (SELECT count(*) = 0 FROM public.school_id_cards)
  ),
  'detail', jsonb_build_object(
    'missing_functions', (SELECT coalesce(jsonb_agg(f ORDER BY f), '[]') FROM fn_check WHERE present = 0),
    'functions_failing_rules', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'fn', f, 'invoker', invoker, 'search_path_public', search_path_public,
        'service_role_exec', service_role_exec, 'anon_denied', anon_denied,
        'authenticated_denied', authenticated_denied, 'public_denied', public_denied) ORDER BY f), '[]')
      FROM fn_check WHERE present = 1 AND NOT (invoker AND search_path_public AND service_role_exec AND anon_denied AND authenticated_denied AND public_denied)),
    'missing_or_wrong_triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'table', tbl, 'trigger', trg, 'present', present, 'expect_deferred', expect_deferred,
        'deferral_ok', deferral_ok, 'enabled', enabled) ORDER BY tbl, trg), '[]')
      FROM trg_check WHERE NOT (present AND deferral_ok AND enabled)),
    'missing_indexes', (SELECT coalesce(jsonb_agg(i ORDER BY i), '[]') FROM idx_check WHERE NOT present),
    'tables', (SELECT jsonb_agg(jsonb_build_object(
        't', t, 'present', present, 'rls', rls, 'service_policy', service_policy,
        'policies_total', policies_total, 'client_roles_denied', client_roles_denied) ORDER BY t) FROM tbl_check),
    'foreign_keys', (SELECT coalesce(jsonb_agg(jsonb_build_object('table', tbl, 'references', references_table)
        ORDER BY tbl, references_table), '[]') FROM fk)
  )
) AS school_gate_definition_check;
