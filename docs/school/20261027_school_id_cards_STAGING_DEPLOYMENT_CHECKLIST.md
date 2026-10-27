# School ID cards — staging deployment checklist

Do not deploy from this document. It records what must be true before the owner approves a staging deployment.

## Environment

- Staging project reference: `rpcjelhacmkhzguljdgi`
- Staging API host: `https://rpcjelhacmkhzguljdgi.supabase.co`
- Project name shown in the dashboard: `invify-staging`
- The SQL Editor badge `main` / `PRODUCTION` is Supabase's label for that project's primary branch. It is not a separate production project. Stop if the URL project reference is anything other than `rpcjelhacmkhzguljdgi`.
- Do not set production Supabase variables for this deployment.
- `FEATURE_REAL_MONEY_PAYOUTS` stays false.
- `SCHOOL_ID_CARD_SQL` stays unset until the catalog query below returns `"schema_match": true`.

## Catalog query

Run this as one statement on project `rpcjelhacmkhzguljdgi`. It does not change the database. The SQL Editor shows one result grid, so this returns one JSON document.

```sql
SELECT jsonb_build_object(
  'database_name', current_database(),
  'pgcrypto_schema', (
    SELECT n.nspname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto'
  ),
  'hash_works', to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL
    AND public.school_gate_sha256_hex('abc') = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'tables', (
    SELECT coalesce(jsonb_agg(c.relname ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN (
        'school_id_card_settings','school_id_cards',
        'school_entry_exit_guardian_contacts','school_staff_email_verifications',
        'school_entry_exit_sessions','school_entry_exit_events',
        'school_gate_audit_events','school_entry_exit_notifications'
      )
  ),
  'missing_tables', (
    SELECT coalesce(jsonb_agg(expected.name ORDER BY expected.name), '[]'::jsonb)
    FROM (VALUES
      ('school_id_card_settings'),('school_id_cards'),
      ('school_entry_exit_guardian_contacts'),('school_staff_email_verifications'),
      ('school_entry_exit_sessions'),('school_entry_exit_events'),
      ('school_gate_audit_events'),('school_entry_exit_notifications')
    ) AS expected(name)
    WHERE to_regclass('public.' || expected.name) IS NULL
  ),
  'card_rows', (SELECT count(*) FROM public.school_id_cards),
  'rls', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'enabled', c.relrowsecurity, 'forced', c.relforcerowsecurity
    ) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'school\_%' ESCAPE '\'
      AND c.relname <> 'school_entities'
  ),
  'policies', (
    SELECT coalesce(jsonb_agg(c.relname || ':' || p.polname ORDER BY c.relname), '[]'::jsonb)
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname LIKE 'school\_%' ESCAPE '\'
      AND c.relname <> 'school_entities'
  ),
  'anon_grants_on_gate_tables', (
    SELECT coalesce(jsonb_agg(DISTINCT table_name ORDER BY table_name), '[]'::jsonb)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
      AND table_name IN (
        'school_id_card_settings','school_id_cards',
        'school_entry_exit_guardian_contacts','school_staff_email_verifications',
        'school_entry_exit_sessions','school_entry_exit_events',
        'school_gate_audit_events','school_entry_exit_notifications'
      )
  ),
  'probe_ready', (
    to_regclass('public.school_id_cards') IS NOT NULL
    AND to_regclass('public.school_id_card_settings') IS NOT NULL
    AND to_regclass('public.school_gate_audit_events') IS NOT NULL
    AND to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL
    AND (
      SELECT count(*)
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'school_id_cards' AND NOT t.tgisinternal
        AND (
          (t.tgname = 'trg_school_id_cards_guard' AND NOT t.tgdeferrable)
          OR (t.tgname = 'trg_school_id_cards_audit' AND t.tgdeferrable AND t.tginitdeferred)
        )
    ) = 2
  ),
  'attendance_tables', (
    SELECT coalesce(jsonb_agg(table_name ORDER BY table_name), '[]'::jsonb)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('attendance_records', 'student_attendance')
  ),
  'migration_history', (
    SELECT coalesce(jsonb_agg(version ORDER BY version), '[]'::jsonb)
    FROM supabase_migrations.schema_migrations
    WHERE version = '20261026233000'
       OR name ILIKE '%school_id_card%'
       OR name ILIKE '%school_gate%'
       OR name ILIKE '%entry_exit%'
  )
) AS reconciliation;
```

`schema_match` is not computed inside the query. Treat the result as a match only when all of these are true:

- `missing_tables` is `[]`
- `hash_works` is true
- `pgcrypto_schema` is `extensions` or `public`
- `card_rows` is `0` before any test card is issued
- `anon_grants_on_gate_tables` is `[]`
- `probe_ready` is true
- every returned RLS row has `enabled: true`
- `attendance_tables` is `[]` or is the same list already known before this migration
- `school_entities` grants are ignored. That table belongs to school sync and is not part of this migration.

If `school_id_cards` does not exist, the `card_rows` subquery will fail. That result means the migration did not leave the table, so stop and return the error text. Do not rerun the migration until that error is reviewed.

## Owner reconciliation on 2026-10-27

Project `rpcjelhacmkhzguljdgi` returned: eight tables present, RLS enabled, eight service-role policies, empty `missing_tables`, `hash_works` true, `probe_ready` true, `card_rows` 0, no `anon` or `authenticated` grants on the gate tables, `pgcrypto` in `extensions`, empty migration history, and no `attendance_records` or `student_attendance` in `public`.

That does not include the function body, foreign keys, or partial unique indexes. Run the following read-only statement and return the JSON before activation. Do not rerun the migration.

```sql
SELECT jsonb_build_object(
  'sha256', (
    SELECT jsonb_build_object(
      'security_definer', p.prosecdef,
      'config', p.proconfig,
      'uses_extensions_digest', position('extensions.digest' in p.prosrc) > 0,
      'uses_unqualified_digest', position('encode(digest(' in p.prosrc) > 0
    )
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'school_gate_sha256_hex'
  ),
  'card_triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname,
      'deferrable', t.tgdeferrable,
      'initially_deferred', t.tginitdeferred
    ) ORDER BY t.tgname), '[]'::jsonb)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'school_id_cards'
      AND NOT t.tgisinternal
      AND t.tgname IN ('trg_school_id_cards_guard', 'trg_school_id_cards_audit')
  ),
  'unique_indexes', (
    SELECT coalesce(jsonb_agg(indexname ORDER BY indexname), '[]'::jsonb)
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'uq_school_id_cards_token',
        'uq_school_id_cards_active_student',
        'uq_school_id_cards_active_staff',
        'uq_school_id_cards_active_admin',
        'uq_school_id_cards_pending_student',
        'uq_school_id_cards_pending_staff',
        'uq_school_id_cards_pending_admin'
      )
  ),
  'card_foreign_keys', (
    SELECT coalesce(jsonb_agg(pg_get_constraintdef(oid) ORDER BY oid::text), '[]'::jsonb)
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'public.school_id_cards'::regclass
  ),
  'function_acl', (
    SELECT p.proacl::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'school_gate_sha256_hex'
  )
) AS definition_check;
```

Accept the definition check only when `uses_extensions_digest` is true, `uses_unqualified_digest` is false, `security_definer` is false, `config` contains `search_path=public`, both card triggers are present with the guard not deferred and the audit trigger initially deferred, all seven `uq_school_id_cards_` indexes are listed, and the foreign keys reference `tenants`, `users`, `students`, and `tenant_staff`. `function_acl` must grant execute to `service_role` and must not grant it to `anon`, `authenticated`, or `PUBLIC`.

## Application deployment, after the definition check and owner approval

1. Deploy the current school-gate code to the staging backend and admin app only.
2. Point that backend at `https://rpcjelhacmkhzguljdgi.supabase.co` and its existing staging database connection. Do not print or rotate secrets in the checklist.
3. Use `getClient()` for card transactions. Do not send card SQL through `dbQuery`, because that helper logs statement text.
4. Set `SCHOOL_ID_CARD_SQL=on` only on that staging process after `probe_ready` is true.
5. Health check: an authenticated owner request to `GET /api/school/id-cards/templates` returns six template keys. A request without the flag, or with a failed probe, returns `SCHOOL_GATE_SCHEMA_UNAPPLIED` and does not write memory state.
6. Logs must not contain a raw barcode or a `token_sha256` value.
7. Signature upload stays `SIGNATURE_STORAGE_UNCONFIGURED`.

## Application rollback

Unset `SCHOOL_ID_CARD_SQL` and restart the staging backend. Card routes return `SCHOOL_GATE_SCHEMA_UNAPPLIED`. Do not drop the school-gate tables as an application rollback. Table rollback remains the reviewed SQL in `docs/school/20261026233000_school_id_cards_and_entry_exit_REVIEW.md`, and only after a separate owner approval.

## Smoke tests after the flag is on

Use an existing staging owner or tenant administrator and existing student and staff rows. Do not create people, guardians, attendance marks, entry sessions, or notification messages.

- Save settings, reload, and confirm one settings row and one `settings_saved` audit row.
- Issue one student card and one staff card. List results omit the raw barcode and the hash.
- Replace the student card. The old row becomes `revoked` with `revoke_kind = replaced` only if the new row is `active`.
- Revoke the staff card with a reason of at least 5 characters.
- A teacher or tenant operator receives 403.
- A tenant id in the body or `X-Tenant-ID` does not change the card's tenant.
- Print preview shows six templates, front with that person's back, and the manual two-pass instruction.
- `attendance_records`, `student_attendance`, and `school_entry_exit_sessions` gain no rows.
