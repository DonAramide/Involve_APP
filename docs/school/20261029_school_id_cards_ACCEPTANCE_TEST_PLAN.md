# School ID cards — staging acceptance test plan

Status: prepared, not executed. Run it only after all of the following:

1. `docs/school/20261029_school_id_cards_full_definition_check.sql` returns every `pass` value as `true` on staging project `rpcjelhacmkhzguljdgi`.
2. The staging backend's `DATABASE_URL` is confirmed to point at `rpcjelhacmkhzguljdgi`. Confirm the project ref only; do not print the URL.
3. The project owner approves setting `SCHOOL_ID_CARD_SQL=on` on the staging backend only.

Production (`jjixrywfnaijvahmvcwj`, `api.invify.org`) is out of scope. `FEATURE_REAL_MONEY_PAYOUTS` stays `false`. `FEE_ORCHESTRATION_LIVE` is not set to `true`.

This plan extends section 9 of `20261027_school_id_cards_STAGING_RUNBOOK.md`. It adds gate scanning, the sessions list, and `/mine`.

## 0. Test data and cleanup policy

- The school tables are append-only. Cards, sessions and events cannot be deleted after the test. Revoke cards instead.
- Use one existing staging school tenant chosen by the owner. Use existing students and `tenant_staff` rows in that tenant. Do not create people, guardians, staff email verifications or notification deliveries.
- Before any scan, keep these settings `false`: `notifyStudentArrival`, `notifyStudentDeparture`, `notifyStaffArrival`, `notifyStaffDeparture`. A scan writes a `queued` notification row when one of them is on and a verified recipient exists. With all four off, every notification row must be `skipped`.
- Accounts needed in the chosen tenant:
  - one `owner` or `tenant_admin`, who manages cards;
  - one `teacher` or `tenant_operator`, who scans only.
- Do not record UUIDs, emails, raw barcodes or token hashes in test notes. Record HTTP status, `code`, `outcome` and counts only.
- The raw barcode is returned once, in the issue or replace response. Hold it only in memory or in a scratch scanner session for the scan tests, then discard it.

## 1. Preconditions (read-only)

| Check | Expected |
|---|---|
| `GET /livez`, `GET /readyz` | 200 |
| Flag unset: `GET /api/school/id-cards` (manager) | in-memory empty list; no DB connection |
| Flag unset: `POST /api/school/gate/scans` | `SCHOOL_GATE_SCHEMA_UNAPPLIED` |
| Row counts on the 8 school tables | 0 |
| Row counts on `attendance_records`, `student_attendance` | record the baseline |

## 2. Activation

Set `SCHOOL_ID_CARD_SQL=on` in the staging backend env and restart it. This step needs root on the VPS. Then repeat `/livez` and `/readyz`.

## 3. Settings

| # | Actor | Request | Expected |
|---|---|---|---|
| 3.1 | manager | `GET /api/school/id-cards/settings` | 200, defaults |
| 3.2 | manager | `PUT /api/school/id-cards/settings` with templates, paper size, disclaimer, all four `notify*` false, `trackAdminEntry` true, `duplicateScanWindowSeconds` 60 | 200; one settings row; one audit row |
| 3.3 | teacher | same `PUT` | 403 |
| 3.4 | manager | `PUT` with `tenantId` of another school in the body and `X-Tenant-ID` header | 200, saved on the signed-in tenant only |

## 4. Issue

| # | Actor | Request | Expected |
|---|---|---|---|
| 4.1 | manager | `GET /api/school/id-cards/eligible` | students and staff of this tenant only |
| 4.2 | manager | `GET /api/school/id-cards/preview?subjectType=student&subjectId=…` | 200 face; printed code is the admission number |
| 4.3 | manager | `POST /api/school/id-cards/issue` student | 201; barcode returned once; card `active` |
| 4.4 | manager | issue staff | 201; printed code is `staff_id` or `STAFF`, never `tenant_staff.id` |
| 4.5 | manager | issue admin (self) | 201; printed code `ADMIN`; no user id or email on the face |
| 4.6 | manager | issue the same student again | 409 `CARD_ALREADY_ACTIVE` |
| 4.7 | teacher | issue | 403 |
| 4.8 | manager | `GET /api/school/id-cards` | 3 cards; no raw token, no `token_sha256` in the body |
| 4.9 | manager | `POST /api/school/id-cards/batch` with 2 eligible people | 201; all or nothing (one transaction) |

## 5. Gate scans (teacher or tenant_operator)

Body: `{ "direction": "arrival" | "departure", "token": "<raw barcode>", "deviceLabel": "staging-test" }`.

| # | Scan | Expected status / `outcome` |
|---|---|---|
| 5.1 | student arrival | 200 `arrival_accepted`; `notificationStatus` `skipped` |
| 5.2 | same student arrival within the window | 409 `duplicate_window` |
| 5.3 | same student arrival after the window | 409 `duplicate_open` |
| 5.4 | student departure | 200 `departure_accepted`; session closed |
| 5.5 | staff departure with no open session | 409 `departure_without_session` |
| 5.6 | admin arrival with `trackAdminEntry` true | 200 `arrival_accepted`; notification `skipped` (`no_verified_recipient`) |
| 5.7 | random 32-char token | 409 `unknown_token`; an event row exists; no session |
| 5.8 | typed name or admission number as the token | 400 `INVALID_TOKEN` |
| 5.9 | missing `direction` | 400 `INVALID_DIRECTION` |
| 5.10 | manager scans | allowed (managers are scan operators) |
| 5.11 | a role outside owner, tenant_admin, teacher, tenant_operator | 403 |

## 6. Sessions list

| # | Actor | Request | Expected |
|---|---|---|---|
| 6.1 | manager | `GET /api/school/gate/sessions?state=all&limit=25` | sessions from section 5; tenant-scoped |
| 6.2 | manager | `?state=open` | only open sessions |
| 6.3 | teacher | `GET /api/school/gate/sessions` | 403 (managers only) |

## 7. Replace and revoke

| # | Actor | Request | Expected |
|---|---|---|---|
| 7.1 | manager | `POST /api/school/id-cards/:studentCardId/replace` | 201; old card `revoked` with `revokeKind` `replaced`; new card `active`; two audit rows |
| 7.2 | teacher | scan the old student barcode | 409 `revoked_card` |
| 7.3 | teacher | scan the new student barcode, arrival | 200 or a duplicate outcome if a session is open |
| 7.4 | manager | `POST /api/school/id-cards/:staffCardId/revoke` with reason shorter than 5 characters | 400 `INVALID_REASON` |
| 7.5 | manager | revoke with a valid reason | 200; card stays in the table as `revoked` with `revokeKind` `retired` |
| 7.6 | teacher | replace or revoke | 403 |

## 8. `/mine`

| # | Actor | Expected |
|---|---|---|
| 8.1 | manager who holds the admin card from 4.5 | 200; that card; `barcodeAvailable: false` |
| 8.2 | manager without a card | 200; `card: null`; `barcodeAvailable: false` |
| 8.3 | teacher, staff or student login | 403 today. Students and staff cannot see their card until the login linkage work is approved and built. |

## 9. Cross-cutting checks

- Tenant spoofing: repeat 4.3 and 5.1 with another tenant id in the body, the query and `X-Tenant-ID`. The data stays in the signed-in tenant.
- Logs: search the staging backend journal for the test window. There must be no raw barcode, no token hash, no email and no SQL text from the card module.
- Classroom attendance: `attendance_records` and `student_attendance` counts equal the baseline.
- Notifications: every `school_entry_exit_notifications` row from this test is `skipped`. No row is `queued`, and nothing is sent.
- Signature upload: `POST /api/school/id-cards/signature` returns 503 `SIGNATURE_STORAGE_UNCONFIGURED`. That is expected until a private uploader is approved.

## 10. Rollback check

Unset `SCHOOL_ID_CARD_SQL` and restart. Card mutations and scans must return `SCHOOL_GATE_SCHEMA_UNAPPLIED`. The test rows remain in the tables, and the live API no longer reads them.

## 11. Pass criteria

Every row in sections 3 to 9 matches. Any 500, any raw token in a response or log, any `queued` notification, or any change to classroom attendance fails the run. If the run fails, apply section 10 and report.
