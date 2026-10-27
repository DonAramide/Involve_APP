# School ID cards — staging runbook

Verdict: **BLOCKED for another execution and for API activation**. On 2026-10-27 the SQL Editor on project `rpcjelhacmkhzguljdgi` reported success through `COMMIT`. Do not run this file again. The editor returned only the last preflight grid, so the catalog is not yet reconciled. Leave `SCHOOL_ID_CARD_SQL` unset until the single-result query in the deployment checklist matches.

## 1. Migration file and checksum

- File: `invify-backend/supabase/migrations/20261026233000_school_id_cards_and_entry_exit.sql`
- SHA-256: `77C4947E88556ECDB70731F31BED251603CDB82FFCCC6F6D4C2BB377A374F567`
- Branch: `feature/platform-durable-entitlement`
- HEAD: `419e3159c7df5d29a390b217fcea1b46cee08032`
- The file header still says proposed and not applied. This runbook does not authorise execution by itself.

Recompute the checksum on the machine that will run the SQL and stop if it differs.

## 2. Staging target

The documented staging database is `https://rpcjelhacmkhzguljdgi.supabase.co`. That host is the staging project, not production.

Before opening the SQL editor, confirm the project reference in the browser is exactly `rpcjelhacmkhzguljdgi`. If it is any other project, stop. Do not run this file against production.

## 3. Why the last attempt failed

`school_gate_sha256_hex` used an unqualified `digest(...)` call while its `search_path` was `public`. Supabase installs `pgcrypto` in the `extensions` schema, so creation failed with:

`function digest(bytea, unknown) does not exist`

The function in this checksummed file no longer does that. It calls `extensions.digest` through dynamic SQL, casts the algorithm with `$2::text`, and falls back to `public.digest` only when the extensions schema or function is absent. Creating the function no longer requires `digest` to be visible at parse time.

A disposable Postgres 16 container applied this exact file in three layouts. The container was removed afterward. Identity tables and `auth.role()` were local stubs, not staging data.

| Layout | Where `digest` was found before the call | Result |
| --- | --- | --- |
| `ext_layout` | `extensions` only. `public.digest` was absent. | Migration committed. `school_gate_sha256_hex('abc')` returned `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`. |
| `public_layout` | Migration installed `pgcrypto` in `public`. The `extensions` schema was absent. | Same hash through the fallback. |
| `mixed_layout` | `extensions` schema existed, but `digest` was only in `public`. | Same hash through the `undefined_function` fallback. |

Blank and null inputs returned null. The hash of a trimmed value matched the trimmed text. A hash of an identity value was rejected. The function is not security definer, its `search_path` is `public`, `anon` and `authenticated` cannot execute it, and `service_role` can. All eight school tables were created. No attendance table was created.

## 4. Preflight

Run these reads in the staging SQL editor. Do not run the migration in the same editor tab until every check matches.

```sql
SELECT current_database() AS database_name;

SELECT extname, n.nspname AS extension_schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'pgcrypto';

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE 'school\_gate\_%' ESCAPE '\';

SELECT n.nspname, c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    c.relname LIKE 'school\_id\_card%' ESCAPE '\'
    OR c.relname LIKE 'school\_entry\_exit%' ESCAPE '\'
    OR c.relname LIKE 'school\_gate%' ESCAPE '\'
    OR c.relname LIKE 'school\_staff\_email%' ESCAPE '\'
  )
ORDER BY c.relname;

SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename LIKE 'school\_%' ESCAPE '\'
    OR indexname LIKE 'uq\_school\_%' ESCAPE '\'
    OR indexname LIKE 'ix\_school\_%' ESCAPE '\'
  )
ORDER BY 2, 3;

SELECT n.nspname, c.relname, t.tgname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND (c.relname LIKE 'school\_%' ESCAPE '\' OR t.tgname LIKE 'trg\_school\_%' ESCAPE '\')
ORDER BY 2, 3;

SELECT n.nspname, c.relname, p.polname
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'school\_%' ESCAPE '\'
ORDER BY 2, 3;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name LIKE 'school\_%' ESCAPE '\'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY 1, 2, 3;

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20261026233000'
   OR name ILIKE '%school_id_card%'
   OR name ILIKE '%school_gate%'
   OR name ILIKE '%entry_exit%';
```

Required before execution:

- `pgcrypto` exists. On this staging project its schema is expected to be `extensions`. `public` is also acceptable because of the fallback.
- The function, table, index, trigger, and policy queries return no rows. The grant query returns no rows for `anon`, `authenticated`, or `PUBLIC`.
- The migration-history query returns no row for this file. If `supabase_migrations` does not exist, stop and report that error instead of continuing.
- If any school-gate function, table, index, trigger, policy, or grant is present, stop. Do not drop it and do not run the migration. Send the returned names for a cleanup review.
- `attendance_records` and `student_attendance` are not targets of this migration. Leave them untouched.
- Take a staging backup or point-in-time recovery marker in the Supabase dashboard before the migration. Recovery must be possible without restoring production.

The migration depends on existing `public.tenants`, `public.users`, `public.students`, and `public.tenant_staff`. It does not add columns to them. It expects Supabase roles `anon`, `authenticated`, and `service_role`, and `auth.role()`, for its policies and grants. Those are platform objects. Do not create them by hand.

The migration does not `INSERT`, `UPDATE`, or `ALTER` classroom attendance tables. Those names appear only in comments.

## 5. Execution procedure

1. Confirm the checksum and the staging project reference again.
2. Open a new SQL editor query. Paste the full migration file. Do not paste a selection that starts in the middle.
3. Run it once. The file is one transaction: `BEGIN` through `COMMIT`. A failure rolls that transaction back.
4. If it fails, stop. Do not retry a partial selection. Read the error, then run the preflight again before any retry.

## 6. Post-migration verification

```sql
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'school\_%' ESCAPE '\'
ORDER BY 1;

SELECT tgname, c.relname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'school\_%' ESCAPE '\'
  AND NOT t.tgisinternal
ORDER BY 2, 1;

SELECT polname, c.relname
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'school\_%' ESCAPE '\';

SELECT public.school_gate_sha256_hex('staging-probe') IS NOT NULL AS hash_works;

SELECT count(*) AS card_rows FROM public.school_id_cards;
SELECT count(*) AS attendance_rows_unchanged
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('attendance_records', 'student_attendance');
```

Expect eight school tables, row level security enabled, policies limited to `auth.role() = 'service_role'`, grants revoked from `PUBLIC`, `anon`, and `authenticated`, and `hash_works` true. `card_rows` must be 0. The attendance table count must be the same as the preflight.

Also confirm `trg_school_id_cards_guard` and the deferred trigger `trg_school_id_cards_audit` exist on `school_id_cards`. The API probe requires both, plus `school_gate_sha256_hex(text)`. There is no trigger named `trg_school_gate_audit_required`.

## 7. API persistence activation

Leave `SCHOOL_ID_CARD_SQL` unset until section 6 passes. Unset is the fail-closed default: card mutations return `SCHOOL_GATE_SCHEMA_UNAPPLIED` and do not open a database connection. Real requests never use the in-memory store.

After section 6 passes, set `SCHOOL_ID_CARD_SQL=on` only on the staging backend process whose database is this staging project. Settings, eligible people, card list, preview, issue, replacement, revocation, and batch printing then call `getClient()` from `src/db/pg.ts` and run the schema probe first. Issue, replacement, revocation, and settings each use one `BEGIN`/`COMMIT`. A batch uses one transaction for every card and its audit row. `dbQuery` is not used, because it logs SQL text. If the probe does not find the tables, triggers, and hash function, the request returns `SCHOOL_GATE_SCHEMA_UNAPPLIED`. The tenant id comes from the signed-in user, not from the request body or `X-Tenant-ID`. With the flag unset, those routes do not open a connection and do not use in-memory storage.

Do not point that flag at production.

## 8. Rollback

Roll back if the migration commits but section 6 fails, if a school table is unexpectedly non-empty, or if an attendance table definition changed. Do not roll back because a card preview failed in the browser.

Use the rollback already recorded in `docs/school/20261026233000_school_id_cards_and_entry_exit_REVIEW.md`. It drops the eight school tables and the `school_gate_` functions, in that order, inside one transaction. It does not drop `students`, `tenant_staff`, `users`, `tenants`, `attendance_records`, `student_attendance`, or `pgcrypto`.

Run rollback only on staging project `rpcjelhacmkhzguljdgi`, and only after confirming no application is depending on the new tables. Then unset `SCHOOL_ID_CARD_SQL`.

## 9. Staging test plan

After activation, use an owner or tenant administrator of one staging school. Do not use a platform role.

- Settings: save templates, paper size, and disclaimer. A second save with a failed audit must not leave a partial settings row. `teacher` and `tenant_operator` receive 403.
- Issue a student card. The printed code is the admission number. The response contains the barcode once. A list response does not contain the raw token or the SHA-256 hash.
- Issue a staff card. The printed code is `staff_id`, or `STAFF` when that value is empty. It is never `tenant_staff.id`.
- Issue an administrator card. The printed code is `ADMIN`. The card does not show the user id or email.
- Replace the student card. The old barcode no longer resolves. The previous card stays `active` if the replacement transaction fails.
- Revoke with a reason of at least 5 characters. The card remains in the table with status `revoked`.
- Send another tenant id in the body and `X-Tenant-ID`. The card still belongs to the signed-in tenant.
- Print preview: six templates, front paired with that person's back, manual two-pass and duplex labels, initials when no photograph exists. Do not record this as physical printer certification.
- Confirm no new row appears in `attendance_records`, `student_attendance`, or `school_entry_exit_sessions`.

Scanning, entry/exit sessions, and notification delivery are not part of this test.
