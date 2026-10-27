# School ID cards and entry/exit — schema review

**Status:** PROPOSED — NOT APPLIED  
**Migration:** `invify-backend/supabase/migrations/20261026233000_school_id_cards_and_entry_exit.sql`  
**Date:** 2026-10-26  
**Branch inspected:** `feature/platform-durable-entitlement`

This file was not executed against staging or production. It does not change classroom attendance. Phase 2 (APIs, templates, printing, scanner, mail worker) should wait until the approval items at the end are accepted.

## What was inspected

- `public.students`: `id uuid`, nullable `tenant_id uuid` referencing `tenants`, nullable `school_id uuid` referencing `schools`, `first_name`, `last_name`, `admission_number`, `current_class`. No photo column and no reliable status column in the production baseline. Unique pair is `(school_id, admission_number)`.
- `public.tenant_staff`: `id uuid`, `tenant_id text` with no foreign key to `tenants`, `name`, `staff_id`, `role`, `phone`, `is_active`. No email and no user link.
- `public.users`: `id uuid`, required `email`, `role`, `tenant_id varchar`, `is_active`, `name`.
- `public.tenants`: `id uuid`, `name`, address and support contact columns. No timezone column was verified.
- Classroom attendance is implemented by `AttendanceService` against `attendance_records` and `student_attendance`. Those tables are not in `supabase/migrations`. Routes remain under `/attendance/*`. This migration does not reference them.
- `hw_guardian_links` is health-coverage access. It has no email column. It is not referenced.
- Parent emails synced into `school_entities` and mirrored onto `customers` are payment and roster data. `customers` is not referenced.
- `checkTenantPermission` lets `super_admin`, `owner`, and `tenant_admin` pass every permission string. `resolveTenantScope` lets platform roles, and users with no tenant, select another tenant from a header or query parameter. Neither behaviour is a school-gate permission grant.

## Separation

Classroom attendance and school entry/exit do not share tables, foreign keys, triggers, or status values.

A gate scan writes `school_entry_exit_sessions` and `school_entry_exit_events` only. A class mark continues to write `student_attendance` only. Issuing a card writes `school_id_cards` and an audit row. It does not open a session and it does not mark a student present.

## Tables

| Table | Role |
|---|---|
| `school_id_card_settings` | One row per tenant. Six template keys, paper and card size, disclaimer, signature pointer, lost-card contact, four notification switches, admin tracking switch, duplicate-scan window |
| `school_id_cards` | One issued card for an existing student, `tenant_staff` member, or school-admin user. Stores SHA-256 of the barcode secret, never the secret |
| `school_entry_exit_guardian_contacts` | Guardian name, relationship, email, consent, verifier, and revocation. School entry/exit mail only |
| `school_staff_email_verifications` | Verified staff mailbox and an acceptance flag. Required because `tenant_staff` has no email |
| `school_entry_exit_sessions` | One arrival, optional departure or void |
| `school_entry_exit_events` | Append-only scan, rejection, and correction events |
| `school_gate_audit_events` | Append-only audit for settings, card issue and revocation, contact verification, and corrections |
| `school_entry_exit_notifications` | One delivery attempt row per session, direction, and recipient |

No rows are inserted. Notification switches and administrator tracking default to off.

Template keys are `classic_school`, `modern_corporate`, `minimal_white`, `academic_blue`, `premium_identity`, and `compact_barcode`. Students, staff, and administrators each have a default key. The category stored on a card is generated: `STUDENT`, `STAFF`, or `ADMIN`.

## Identity and foreign keys

- Student cards and sessions reference `students(id)`. The student `tenant_id` must equal the card tenant. A student whose only link is `school_id` is rejected. `school_id` is a different table from `tenants`.
- Staff cards reference `tenant_staff(id)`. The staff `tenant_id` text must equal the tenant uuid text. Inactive staff cannot receive a new card or open a session.
- Administrator cards reference `users(id)`. The user must be active, in the same tenant, and every comma-separated role token must be `owner` or `tenant_admin`. The platform role `admin` is rejected.
- Printed name, code, and detail are overwritten from the identity row at issue. A client cannot label one person with another person's name. Later renames do not rewrite the snapshot. Printed codes are the admission number, `tenant_staff.staff_id`, or the literals `ADMIN` and `STAFF`. They are not user ids, staff ids, tokens, or token hashes.
- All new foreign keys use `ON DELETE RESTRICT`. Gate history blocks deletion of the student, staff member, user, or tenant while a gate row still points at them. `students.tenant_id` itself is `ON DELETE CASCADE` from `tenants` in the baseline, so a tenant delete that reaches students will stop on these new foreign keys rather than erase gate history.
- Replacement runs in one transaction: insert the new card as `pending` while the current card is active, revoke the current card with `revoke_kind = 'replaced'`, then activate the pending card. A commit without the active successor rolls back the revoke.

## Session and event consistency

Open sessions are enforced by partial unique indexes on `(tenant_id, student_id)`, `(tenant_id, staff_id)`, and `(tenant_id, admin_user_id)` where the session is not closed and not voided. Two concurrent clock-ins cannot both commit. The database does not insert the losing attempt's event. Phase 2 must catch unique violation `23505`, roll back to a savepoint, and then write a `duplicate_open` event for the session that won.

The only session updates are close and void. Arrival time, person, card, and tenant cannot change. A closed or voided session cannot be reopened. A mistaken clock-out stays closed. The correction is another event, not a rewrite. A voided mistaken clock-in can be followed by a new clock-in.

`opened_at`, `closed_at`, `voided_at`, and event times are overwritten with the database transaction time. A client-supplied timestamp more than two seconds away is rejected. `now()` is stable for the whole transaction, so the session time and its event time match when they are written together.

A deferred constraint requires, before commit:

- a scan session has exactly one `arrival_accepted` event
- a correction session has exactly one `correction_arrival` event and a `session_corrected` audit row
- a scan close has exactly one `departure_accepted` event
- a correction close has exactly one `correction_departure` event and audit
- a void has exactly one `session_voided` event and audit

A notification row is not required for the session to commit. Mail failure cannot roll the arrival back.

Successful scans are audited on `school_entry_exit_events`. Settings, cards, contacts, and corrections are audited on `school_gate_audit_events`. Both are append-only. Delete and truncate are rejected on every new table. A later retention purge needs its own approved migration.

The duplicate-scan window is stored on settings (5 to 300 seconds, default 45). It does not create a second session. Phase 2 uses it to decide whether a repeat of the same successful action becomes a `duplicate_window` event. The unique open-session index is what prevents a second session even inside that window.

A revoked or expired card cannot open a session and cannot authorize a clock-out scan. An `owner` or `tenant_admin` closes or voids the already open session with `close_source = 'correction'` or a void. That writes the actor, the server timestamp, a reason of at least five characters, a `correction_departure` or `session_voided` event, and a `session_corrected` audit row. It does not change the card back to `active`.

## Notification idempotency

`idempotency_key` is `session_id:direction:contact_id`, or `session_id:direction:none` when the attempt is skipped. The unique key makes a second insert fail. A retry updates the same row and must increase `attempt_count`. The cap is 8. `sent` and `skipped` cannot be changed.

Directions are `arrival` and `departure`. Those words are not classroom `present`, `absent`, or `late`.

On insert, the trigger copies `recipient_email` from the verified contact. The client cannot substitute another address. A student attempt can use only a guardian contact for that student, with consent still true and `revoked_at` null. A staff attempt can use only that staff member's live verification with `accepts_entry_exit_email` true. An administrator session can only be skipped as `no_verified_recipient`. There is no administrator mailbox table, and `users.email` is not read for delivery.

If the matching settings switch is off, the only legal row is `skipped` / `notifications_disabled`. If it is on and no eligible contact exists, the row is `skipped` with `no_verified_recipient`, `no_consent`, or `invalid_recipient`. The session remains.

`sent` means `provider_accepted_at` was set by the database when the worker recorded SMTP acceptance. It does not mean the mailbox confirmed delivery. There is no `delivered` status. Provider errors must be mapped to `smtp_unavailable`, `smtp_rejected`, `recipient_rejected`, or `unknown`. The SMTP transcript is not a column.

A contact revoked after queue cannot be retried or marked sent. The failure update is still allowed. The original session is not deleted.

## Row-level security and authorization

Row-level security is enabled. `PUBLIC`, `anon`, and `authenticated` have no privileges and no policies. `service_role` is granted table access and function execution. In Supabase, `service_role` bypasses row-level security, so these policies do not separate tenants from each other. Phase 2 must take the tenant from the signed-in school user and ignore `tenantId` in the body, header, and query.

`school_gate_active_card_id(tenant, hash)` is the supported lookup. It returns an id only when that tenant has an active, unexpired card for the hash. Any other hash returns null, including a card that belongs to another school. It returns no name, email, or raw token. Phase 2 must not look up a hash without the tenant predicate.

The raw barcode value is never a column. The stored value is 64 lowercase hex characters. The trigger rejects a hash of the person id, admission number, name, staff id, staff role, administrator email, or administrator role. Phase 2 still has to generate 32 random bytes itself and hash them. The database cannot see the raw secret to prove the bytes were random.

Scan operators and school administrators are different allow-lists, stated in the Phase 1.5 matrix. `teacher` and `tenant_operator` can scan. They cannot issue cards, verify contacts, export, or correct sessions. Platform roles cannot do either, including when mixed into a comma-separated role string.

`checkTenantPermission` must not be the only control. Its owner and super-admin bypasses would skip the new capability names. `resolveTenantScope` must not be used to let a platform user pick a school for this module.

## What this migration does not do

- It does not add columns to `attendance_records`, `student_attendance`, `students`, `tenant_staff`, `users`, or `customers`.
- It does not import `hw_guardian_links`, synced parent payloads, or customer emails.
- It does not store photographs or signature bytes. The signature column is a URL plus the signatory's name and designation, or all three are empty. A `data:` URL is rejected. Phase 2 must only store a file the school uploaded. The schema cannot prove the image is that person's signature.
- It does not decide lateness or early departure. No timetable or timezone is read.
- It does not send mail and it does not create a worker.
- It does not register permission strings.
- It does not seed settings or cards.

## Rollback

Use this only when application of this migration has been separately authorised and no application depends on the tables. Do not drop `students`, `tenant_staff`, `users`, `tenants`, `attendance_records`, `student_attendance`, `hw_guardian_links`, or `customers`. Do not drop `pgcrypto`.

```sql
BEGIN;

DROP TABLE IF EXISTS public.school_entry_exit_notifications;
DROP TABLE IF EXISTS public.school_entry_exit_events;
DROP TABLE IF EXISTS public.school_gate_audit_events;
DROP TABLE IF EXISTS public.school_entry_exit_sessions;
DROP TABLE IF EXISTS public.school_entry_exit_guardian_contacts;
DROP TABLE IF EXISTS public.school_staff_email_verifications;
DROP TABLE IF EXISTS public.school_id_cards;
DROP TABLE IF EXISTS public.school_id_card_settings;

DROP FUNCTION IF EXISTS public.school_gate_notification_guard();
DROP FUNCTION IF EXISTS public.school_gate_audit_required();
DROP FUNCTION IF EXISTS public.school_gate_audit_guard();
DROP FUNCTION IF EXISTS public.school_gate_session_event_required();
DROP FUNCTION IF EXISTS public.school_gate_event_guard();
DROP FUNCTION IF EXISTS public.school_gate_session_guard();
DROP FUNCTION IF EXISTS public.school_gate_staff_email_guard();
DROP FUNCTION IF EXISTS public.school_gate_guardian_guard();
DROP FUNCTION IF EXISTS public.school_gate_card_commit();
DROP FUNCTION IF EXISTS public.school_gate_card_guard();
DROP FUNCTION IF EXISTS public.school_gate_active_card_id(uuid, text);
DROP FUNCTION IF EXISTS public.school_gate_settings_guard();
DROP FUNCTION IF EXISTS public.school_gate_append_only();
DROP FUNCTION IF EXISTS public.school_gate_assert_admin_subject(uuid, uuid);
DROP FUNCTION IF EXISTS public.school_gate_assert_staff(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.school_gate_assert_student(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.school_gate_assert_scan_operator(uuid, uuid);
DROP FUNCTION IF EXISTS public.school_gate_assert_school_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.school_gate_reject_predictable_token(text, text[]);
DROP FUNCTION IF EXISTS public.school_gate_sha256_hex(text);
DROP FUNCTION IF EXISTS public.school_gate_assert_server_time(timestamptz);
DROP FUNCTION IF EXISTS public.school_gate_role_allowed(text, text[]);

COMMIT;
```

## Phase 1.5 review gate

Reviewed on 2026-10-27 against branch `feature/platform-durable-entitlement`, HEAD `419e3159c7df5d29a390b217fcea1b46cee08032`. The migration file remains unapplied. Staging and production were not contacted.

### Schema compatibility

The migration's identity references match the repository:

| Reference | Verified definition | Result |
|---|---|---|
| `students.id`, `tenant_id`, `first_name`, `last_name`, `admission_number`, `current_class` | Baseline `20260601000000`. No later migration adds a photo, email, or status column | Compatible. A null `tenant_id` is rejected. `school_id` is not accepted as a substitute |
| `students.school_id` → `schools`, `students.tenant_id` → `tenants` | Baseline foreign keys. Tenant delete cascades toward students and then stops on the new `ON DELETE RESTRICT` links | Compatible |
| `tenant_staff.id`, `tenant_id text`, `name`, `staff_id`, `role`, `is_active` | `20260811180000`. No email column was added later | Compatible. Text tenant id is compared with the tenant uuid text |
| `users.id`, `email`, `role`, `tenant_id varchar`, `is_active`, `name` | Baseline, plus MFA columns in `20260714205659` | Compatible. No public staff number exists |
| `tenants.id` | Baseline | Compatible |
| `attendance_records`, `student_attendance` | Used by `AttendanceService`. Not created by a file in `supabase/migrations` | Not referenced |
| `hw_guardian_links`, `customers` | Health coverage and payment identity | Not referenced |
| `pgcrypto`, `auth.role()`, roles `anon`, `authenticated`, `service_role` | Supabase platform. Not created by this repository except `CREATE EXTENSION IF NOT EXISTS pgcrypto` | Required on the target database. The local proof created them in an empty instance |

No new enum types are introduced. Constraints and indexes are created in this file. `20261026220000_hw_bank_hmo_offerings.sql` is an earlier unapplied file and is not a dependency. This migration does not need to run before or after it.

Classroom attendance routes and `AttendanceService` were not modified.

### Transaction and audit integrity

Settings, card issue, card revocation, guardian verification, staff-email verification, and session correction each have a deferred constraint. The business row and its audit row commit together, or neither does. A failed audit insert aborts the transaction.

Replacement is the same rule. `revoke_kind = 'replaced'` cannot commit unless the successor is `active` in that transaction. A `pending` card cannot commit. Revoking a card as `retired` is a separate completed action and does not pretend a replacement was issued.

Notification idempotency is the generated unique key `session:direction:contact`. A second insert fails. A retry updates the same row and must increase `attempt_count`, with a cap of 8. Concurrent clock-ins collide on the partial unique index of one open session. The losing transaction rolls back. It does not create a second session. Phase 2 records `duplicate_open` only after that rollback, in a new transaction.

A session does not require a notification row. A missing or unverified contact does not block the session. The optional notification is `skipped`.

### Role-to-capability matrix

These are the existing backend roles used by `checkRole` and `users.role`. `super_admin` and `admin` are platform roles and are not granted here. `checkTenantPermission` lets `owner` and `tenant_admin` pass every permission string, and `resolveTenantScope` lets a platform user select another tenant. Phase 2 must not use either behaviour for this module. The signed-in user's own tenant is the only tenant.

| Capability | owner | tenant_admin | tenant_operator | teacher |
|---|---|---|---|---|
| View ID cards | Yes | Yes | No | No |
| Issue and reprint cards | Yes | Yes | No | No |
| Revoke or replace cards | Yes | Yes | No | No |
| Manage templates and card settings | Yes | Yes | No | No |
| Scan student and staff cards | Yes | Yes | Yes | Yes |
| View entry/exit history | Yes | Yes | No | No |
| Correct or void an open session | Yes | Yes | No | No |
| Export entry/exit records | Yes | Yes | No | No |
| Verify or revoke guardian contacts | Yes | Yes | No | No |
| Verify or revoke staff email | Yes | Yes | No | No |
| Manage notification switches | Yes | Yes | No | No |

`tenant_operator` is the default value of `users.role`. A scan operator does not receive issue, verification, export, or correction. The SQL write checks enforce that split. View and export are not separate table privileges because the backend uses `service_role`, which bypasses row-level security. Phase 2 must enforce those two rows of the matrix in the API.

Templates and notification switches are columns of one settings row. The database cannot grant one without the other. Both stay with `owner` and `tenant_admin`.

`cashier`, `finance_staff`, `staff`, and `manager` appear on finance routes. They are not given school-gate capabilities.

### Identity and verified contacts

- A student card requires `students.tenant_id` equal to the card tenant. `school_id` alone is not a tenant association.
- A staff card requires `tenant_staff` for that same tenant. A person who exists only as a `users` row is not a staff card. If that user is `owner` or `tenant_admin`, the card type is `admin`, not `staff`. A teacher payload in `school_entities` is a sync document, not an identity row. The supported workflow is to onboard that person into `tenant_staff` before a staff card is issued. This migration does not create a second staff table and does not copy the payload.
- Guardian mail requires a row in `school_entry_exit_guardian_contacts` for that student, with consent still true and `revoked_at` null. The address is copied from that row.
- Staff mail requires `school_staff_email_verifications` for that staff member, still accepted and not revoked.
- `customers.email` and `hw_guardian_links` are not read and are not treated as consent.
- No verified contact is required to commit a session.

### Revoked card and open session

A scan of a revoked or expired card cannot clock in and cannot clock out. The open session remains open. `owner` or `tenant_admin` closes it with a correction or voids it. The card stays revoked. Historical sessions continue to reference the card that opened them after a replacement. The replacement card does not inherit or alter those sessions.

### Administrator printed identifier

`users` has no tenant-scoped public number. Generating one would be a new identifier with its own collisions and lifecycle, so none is generated. An administrator card prints the person's name, the code `ADMIN`, and the designation `School administrator`. It does not print `users.id`, `users.email`, the barcode secret, or the token hash. A staff card prints `staff_id` when that column is present, otherwise the literal `STAFF`, never `tenant_staff.id`.

### Retention

No statute or school policy in this repository sets a retention period for these records. None is invented here.

Until an owner sets a period, the tables reject `DELETE` and `TRUNCATE`. That is a hold, not a legal retention schedule. A later approved migration can archive or delete by age. It should not weaken the classroom attendance tables. The periods still to be chosen are:

- Issued and revoked cards, including the token hash.
- Entry/exit sessions.
- Scan events and audit events.
- Notification attempts and the short error code. Provider transcripts are not stored.
- Guardian contacts, consent, and staff-email verification, including revoked rows.

Revocation of consent is already a new row state, not a silent delete. The old consent row remains until a retention migration says otherwise.

### Owner decisions recorded for approval

1. Accept `owner` and `tenant_admin` as the only card, contact, correction, export, and settings roles, and `tenant_operator` plus `teacher` as scan-only roles.
2. Accept that a staff card requires `tenant_staff`, and that a synced teacher payload or a plain user account is not a staff card.
3. Accept that student cards require `students.tenant_id`.
4. Accept that guardian and staff addresses are entered again and are not copied from health guardians or payment customers.
5. Accept `ADMIN` and `STAFF` as the printed codes when no public number exists.
6. Accept that no retention period is encoded until the owner sets one.
7. Accept that notification switches default off, `sent` means SMTP acceptance, and a missing contact does not block the session.

### Local proof

Commands, against a throwaway Postgres 16 container named `school-gate-sql-check`. Stub identity tables were created in that container only. Staging was not used. The container was removed after the rollback.

```text
docker run -d --name school-gate-sql-check -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
docker exec school-gate-sql-check psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/migration.sql
docker exec school-gate-sql-check psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/phase15.sql
```

The first script stopped at a skipped arrival that used `no_verified_recipient` while the notification switch was off. The database rejected it with `this notification switch is off`, which is the intended rule. The duplicate-key check was then run with `notifications_disabled`.

| Check | Result |
|---|---|
| Migration file applies on Postgres 16 | Commit succeeded |
| Atomic replacement: pending insert, `replaced` revoke, activate | Old card `revoked`, new card `active`, printed code `ADM-1`, no session created |
| Commit a `replaced` revoke with no successor | `replacement revoke requires the new card to be active in the same transaction`. Staff card stayed `active` |
| Commit a `pending` card with no activation | `a replacement card was not activated in the same transaction`. No pending row remained |
| Issue a card with no audit row | `card_issued requires an audit event in the same transaction`. The card row was not left behind |
| Teacher issues a card | `role teacher is not allowed for this action` |
| `tenant_operator` voids a session | `role tenant_operator is not allowed for this action`. `still_open` stayed true |
| Session with no notification row | Commit succeeded. Notification count was 0 |
| Second notification with the same idempotency key | `uq_school_entry_exit_notification_key` unique violation |
| Revoked card clock-out scan | `a revoked or expired card cannot authorize a clock-out scan` |
| Administrator correction close after that revoke | Session `closed_at` set. Card status stayed `revoked` |
| Administrator printed code supplied as the user uuid | Stored code was `ADMIN`, designation `School administrator` |
| Staff card with no `staff_id` | Stored code was `STAFF`, not the staff uuid |
| Two overlapping transactions clock in the same student | Second failed on `uq_school_entry_exit_one_open_student`. One open session remained |
| Rollback in the review | `students` still present. `school_id_cards` and `attendance_records` absent |

`attendance_records` was absent because this empty database never had the classroom module. The migration did not create it.

## Verdict

`READY FOR OWNER APPROVAL`

The technical defects found in this review were corrected in the unapplied migration: replacement is atomic, a revoked card cannot scan out, invented role names were removed, and internal uuids are not printed. Phase 2 does not start until the owner accepts the decisions above.

## Approval required before apply and before Phase 2

The owner decisions in the Phase 1.5 section are the approval list. Applying the migration and starting Phase 2 both wait on that acceptance. Do not apply this file to staging or production as part of the review.

## Phase 2 implementation note (2026-10-27)

Phase 2 is implemented locally against this unapplied schema. The migration file was not edited and was not applied. No shared, staging, or production database was opened.

The six template keys, paper sizes, optional fields, disclaimer, and signature URL already fit `school_id_card_settings`. No additional migration is required for the card designs.

Issuance, replacement, revocation, and settings changes are implemented as one in-memory transaction with the same order as the database contract: insert the replacement as pending, write `card_issued`, revoke the current card with `revoke_kind = replaced`, write `card_revoked`, then activate the pending card. A failed audit or a replaced revoke without an active successor leaves the previous card active. The HTTP service wired in `app.ts` does not open a database connection. Until `20261026233000` is applied and an explicit transaction runner is connected, those routes return `SCHOOL_GATE_SCHEMA_UNAPPLIED`. Template names are still returned to an owner or tenant administrator.

Barcode values are 32 random bytes encoded as base64url and drawn as Code 128 subset B. Only the SHA-256 hash is retained. Reprinting is a replacement. The raw value is returned only on the issue, replace, or batch response.

There is no photograph column on `students` or `tenant_staff`, so cards use initials. Signature bytes can be validated as PNG, JPEG, or WebP up to 2MB, but only when a private uploader is injected. The live route has no uploader. The Contabo helper is not used because it accepts an external address unchanged and can publish a public object. A typed URL or a `data:` URL is not stored as the signature. Saving an approved HTTPS signature address still requires the `settings_saved` audit in the same settings transaction.

## Phase 2.1 persistence prerequisite

Live card mutations still return `SCHOOL_GATE_SCHEMA_UNAPPLIED`. The SQL adapter in `school-card.sql.ts` can run issue, replacement, revocation, and settings changes as one `BEGIN`/`COMMIT` transaction, and it sends `ROLLBACK` when a statement fails. It is not connected to the HTTP service. It does not import `src/db/pg.ts` and it does not read `DATABASE_URL`.

Activation requires all of the following:

1. Apply `20261026233000_school_id_cards_and_entry_exit.sql` to the target database and confirm the school ID card tables and deferred audit triggers are present.
2. Pass a transaction-capable Postgres client for that database into `executeCardIssue`, `executeCardReplacement`, `executeCardRevoke`, or `executeSettingsSave`.
3. Do not use the process-wide `src/db/pg.ts` pool for this module. That module opens `DATABASE_URL` on import and logs query text.

Until those steps are done and the adapter has been run against the applied schema, persistence is not operational. In-memory storage remains test-only.

Classroom attendance routes, `AttendanceService`, `attendance_records`, and `student_attendance` were not modified. Card issuance and replacement do not create entry/exit sessions. The scanner, session engine, and notification delivery are not part of this phase.

## Staging migration gate (2026-10-27)

`BLOCKED` for staging execution. A Supabase SQL run failed at `school_gate_sha256_hex` because `digest` is not visible when `search_path` is `public`. Supabase keeps `pgcrypto` in the `extensions` schema. The function now resolves `extensions.digest` at runtime, with `public.digest` as the fallback, and casts the algorithm to `text`. On 2026-10-27 the exact file passed on a disposable local Postgres 16 database with `pgcrypto` only in `extensions`, and again with `pgcrypto` only in `public`. `school_gate_sha256_hex('abc')` returned `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`. No staging catalog session was available from this workspace, so leftover objects from the failed editor run were unknown at that time. The runbook is `docs/school/20261027_school_id_cards_STAGING_RUNBOOK.md`.

## Phase 2.4 (2026-10-27)

The owner later ran the migration once in the SQL Editor on project `rpcjelhacmkhzguljdgi` and reported that the eight tables, RLS, service-role policies, hash output, and the API probe all match. `supabase_migrations.schema_migrations` has no row for this file because the editor executed it directly. Do not rerun the file and do not insert a history row by hand.

`SCHOOL_ID_CARD_SQL` stays unset. The HTTP routes call the transaction adapter only when that flag is on. The flag was not set because the function body, foreign keys, and partial unique indexes were not returned, and this workspace has no confirmed staging `DATABASE_URL`. `dbQuery` still logs SQL text, so card statements must keep using `getClient()`.
