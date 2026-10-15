# Invify Health & Wellness — Phase 1 Architecture

Status: **DESIGN ONLY — nothing here is implemented, applied or deployed.**
Branch: `feature/health-insurance-phase1` (git worktree `C:\dev\Involve_APP_health`, from `e7ce9dfb`). The main working tree and its uncommitted Android / `invify-admin` changes were not touched.
Legend: **[V]** verified in repo or staging metadata, **[A]** assumption, **[D]** decision made in this design (reviewable).

## 1. Verified ground truth (inputs to the design)

| Topic | Finding | Source |
|---|---|---|
| Staging has `fee_structures` | **No** (absent). Also absent: `guardians`, `parents`, `academic_sessions`, `academic_terms`, `classes`, `invites`, `notifications` | staging PostgREST OpenAPI metadata, table/column names only [V] |
| Parents today | Only as JSON blobs in `school_entities` (`entity_type='parent'`, `sync_id`, `payload jsonb`), synced from the POS/Flutter app. No login identity, no student link | `school-sync.controller.ts`, `parent-broadcast.controller.ts`, staging metadata [V] |
| Students | `students(id uuid PK, school_id uuid, tenant_id uuid NULL-able, first_name, last_name, admission_number, current_class text, ...)`. Class is free text; no session | staging [V] |
| Staff | `tenant_staff(id uuid, tenant_id **text**, name, staff_id, phone, role in ADMIN/FINANCE/STAFF, is_active, bank columns...)`. Created lazily at runtime by `staff.controller.ts` via `execute_sql`, **not** by a migration. No employment category | code + staging [V] |
| Users | `users(id uuid, email, role varchar, tenant_id **varchar**, is_active, mfa_*)` | staging [V] |
| `authenticate` | Sets `req.user {id, role, tenantId, is_active}`; `tenantId` may be `null` for non-admin users; disabled users get 403 | `auth.middleware.ts` [V] |
| JWT claim fallback | Tenant/role may be read from `app_metadata` **and `user_metadata`** (user-writable in Supabase) when a profile row is not used | `auth.middleware.ts:161-195` [V] — see threat T3 |
| RBAC | `checkRole`: `super_admin` always passes | `rbac.middleware.ts` [V] |
| Ledger | `LedgerService.createDoubleEntry({idempotencyKey, tenantId, reference, entries[{account,type,amount(int kobo)}]})`; accounts are a fixed list; **only the `USER_WALLET` account changes the `wallets` projection** | `ledger.service.ts`, `p10_*` migrations [V] |
| Invoices | `invoices.*_amount` are `numeric` (not kobo) | staging [V] → health uses its own bigint-minor invoices |
| Webhook crypto | Quasar: HMAC-SHA256 hex of raw body, `x-quasar-signature`, timing-safe compare | `quasar-webhook.service.ts` [V] |
| Audit | `financial_audit_logs` (event_type typed to payment events), `audit_logs` | [V] — health gets its own append-only table |
| Tenant types | `tenants.type` exists (varchar) [V]; values assumed `school`/`retail`/`services` **[A — verify values with a read-only SELECT of DISTINCT type in the next staging approval]** |

## 2. Principles

1. Additive only: new `hw_*` tables, a new module directory, one route mount. No ALTER of existing tables, no change to `fee_structures`/`invoices`/`wallets`/existing ledger accounts.
2. Backend decides authorization. Frontend visibility is cosmetic. RLS is defence-in-depth only, because the backend uses the service role (which bypasses RLS).
3. Tenant and permissions come from **server-side tables**, never from request bodies, headers, or JWT `user_metadata`.
4. Payment state, enrolment state and policy (insurer) state are three independent machines.
5. Health premiums are pass-through money owed to an insurer, not tenant revenue and not tuition: they never touch `USER_WALLET`, `invoices`, `students.running_balance`.
6. Data minimisation: no diagnoses/clinical notes anywhere. Claims store only provider status and reference.

## 3. Module layout (Phase 2 target)

```
invify-backend/src/modules/health-insurance/
  routes/health.routes.ts            mounted once: app.use('/api/v1/health-insurance', authenticate, healthFlagGuard, healthRoutes)
  guards/health-permission.guard.ts  requireHealthPermission(perm, {scope})  (no super_admin bypass)
  guards/health-flag.guard.ts        env flag + hw_tenant_settings.enabled
  guards/guardian-access.guard.ts    object-level: caller must hold a verified, permitted link
  services/ (members, guardians, staff-profiles, plans, enrolments, policies, billing, payments, reconciliation, reports, exports, imports, notifications, audit)
  adapters/ provider-adapter.ts (interface), sandbox.adapter.ts (non-production only)
  state/ enrolment.machine.ts, policy.machine.ts, payment.machine.ts, invoice.machine.ts, guardian-link.machine.ts
  dto/ (validation schemas)
  repositories/ (the only place that queries hw_* tables; every function takes TenantContext)
```
`TenantContext {tenantId, userId, permissions[], principalKind}` is produced only by `health-permission.guard` and is a required argument of every repository function, so an un-scoped query cannot be written by accident (enforced by a lint/test that greps repositories for `.from('hw_` outside the repositories folder).

## 4. Authorization model

### 4.1 Principals
| Kind | How established | Tenant source |
|---|---|---|
| `tenant_user` | `authenticate` user with `users.tenant_id` and `is_active` | `users` row (loaded by guard), cross-checked against `req.user.tenantId`; mismatch ⇒ 403 |
| `guardian` | `authenticate` user (may have `tenantId=null`) | **per object**: tenant of the `hw_guardian_links` row, status `verified`, with the specific permission flag |
| `staff_member` | user whose email/id matches a staff profile via `hw_staff_profiles.user_id` | the profile's tenant |
| `platform_operator` | `hw_platform_grants` row (not `users.role`) | explicit `target tenant` in each call + reason + audit |
| `provider_integration` | per-provider API key / HMAC, no user | provider scope only; can write only `hw_provider_events` |

### 4.2 Permission guard (requirement 4)
`requireHealthPermission(permission)` ignores `req.user.role === 'super_admin'` entirely. Algorithm:
1. Reject if flag off (`503 HEALTH_MODULE_DISABLED`, no detail) or user inactive.
2. Resolve `tenantId` from `users` DB row (service role). Never from `x-tenant-id`, body, query, or JWT metadata. Platform operators pass `tenantId` only via the `/platform/tenants/:tenantId/...` namespace and need a `hw_platform_grants` permission with non-expired `expires_at` and a mandatory `reason` header; this writes an audit event with `via_platform_access=true`.
3. Load active grants from `hw_permission_grants` for `(tenant_id, user_id)`; check the required permission.
4. Attach `TenantContext`. Failure ⇒ `403 FORBIDDEN` plus a denied-access audit event (rate-limited).
Existing roles map to **no** health permissions automatically. A tenant `owner`/`tenant_admin` gets a default seed grant set only at tenant enablement (explicit rows, revocable, audited), except `health.hr_admin`, which is never seeded.

### 4.3 Permissions (see `04_PERMISSIONS_MATRIX.md`)
`health.settings.manage`, `health.plans.manage`, `health.members.read`, `health.members.manage`, `health.students.access` (any student-linked data), `health.staff.access` (own-tenant staff coverage view, no HR detail), `health.hr_admin` (create/edit staff profiles, staff enrolments, staff dependants), `health.enrolments.manage`, `health.enrolments.verify`, `health.guardians.manage`, `health.billing.read`, `health.billing.manage`, `health.reports.read`, `health.exports.run`, `health.audit.read`, `health.claims.read`. Platform: `platform.providers.manage`, `platform.plans.manage`, `platform.tenants.onboard`, `platform.integration.health`, `platform.tenant_access` (time-boxed, audited).
HR separation: staff-category records (`hw_staff_profiles`, members of type `staff`, staff dependants) require `health.hr_admin`; student records require `health.students.access`. Holding one does not imply the other; finance (`health.billing.*`) implies neither.

## 5. Guardian & staff model (decisions 1 and 2)

### 5.1 Guardians [D]
- Do not copy students or users. `hw_guardian_links` references `students(id)` and (after acceptance) `users(id)`.
- Pre-existing parent blobs in `school_entities` can be **sources** of invitation candidates: the link/invitation stores `source_entity_sync_id` (a reference, not a copy of the phone number/name). Contact data for an invitation lives in `hw_guardian_invitations.contact_value`, is used once, and is nulled on accept/expiry (a scheduled purge).
- Many-to-many: unique key `(tenant_id, student_id, guardian_user_id)` for live links; a student may have several guardians; a user may link to children in several tenants.
- Link lifecycle: `invited → pending_verification → verified`, side exits `rejected`, `revoked`, `expired`.
- Relationship verification: acceptance of an invitation proves control of the contact channel only. It does **not** prove parenthood. A link becomes `verified` only when a user holding `health.guardians.manage` verifies it (method recorded: `school_record_check`, `document_sighted`, `in_person`), never self-verified, never automatic. Unverified links give zero access to coverage data.
- Explicit access flags per link (all default false): `can_view_coverage`, `can_view_premiums`, `can_pay_premiums`, `can_manage_enrolment`. Granted/changed by the school administrator, audited. `can_pay_premiums` requires `verified`.
- Object-level rule: every guardian endpoint takes `studentId`; the guard fetches the link `(student_id, guardian_user_id=req.user.id, status='verified', required_flag=true)` and derives the tenant from the link. Unknown student and unlinked student return the same `404`.
- Guardian principal has no health permission grants and no tenant-wide listing capability.
- [A] Guardians authenticate as ordinary Supabase users with `users.role='guardian'` (value, not schema change) and `tenant_id NULL`. **Unresolved dependency U2**: confirm the Supabase auth/onboarding flow can create such users without breaking the "tenant users require a tenant association" rule (this role is explicitly *not* a tenant user and is rejected by every non-health route through `checkRole` because it is in no allow-list). A guardian-account creation flow does not exist today.

### 5.2 Staff [D]
- `hw_staff_profiles(tenant_id, tenant_staff_id → tenant_staff.id, user_id NULL → users.id, employment_category in ('teaching','non_teaching'), department, status)`. Category is data about the person; it grants nothing.
- `tenant_staff.role` (ADMIN/FINANCE/STAFF) is never read as an authorization input by the health module.
- `tenant_staff` is created by runtime DDL. Migration `hw_10` fails fast with a clear message if the table is missing (it exists in staging) and does not create it **[U3]**: recommend a separate, reviewed migration to codify it.
- `tenant_staff.tenant_id` is `text` and `hw_*.tenant_id` is `uuid`: tenant equality is enforced by a trigger (`hw_assert_same_tenant`), not a composite FK.
- Staff member self-service: `hw_staff_profiles.user_id` links a login to a profile; "my coverage" endpoint reads only profiles with `user_id = req.user.id`.

## 6. Domain mapping by mode

| Concept | School [MVP] | Retail [gated] | Services [gated] |
|---|---|---|---|
| Member (principal) | `students` row or staff profile | staff profile (business employee) or owner | `customers` row [A] |
| Payer | school, guardian, staff member, or shared | business or employee | organisation or member |
| Relationship | `hw_guardian_links` | n/a | n/a |
| Dependant | staff dependants only (if plan allows) | employee dependants | per plan |
| Filters | class (free text today), department | department | org unit |
| Academic session | **no table exists** → `coverage_period` (start/end date) and optional free-text `cohort_label` on the enrolment; no FK to sessions **[U4]** | n/a | n/a |
`hw_tenant_settings.mode` and per-mode flags `school_enabled / retail_enabled / services_enabled` (default false) gate the modes. `hw_members` has exactly one of `student_id / staff_profile_id / customer_id / dependant_id` (CHECK).

## 7. State machines

### 7.1 Enrolment (`hw_enrolments.status`)
`draft → enrolment_pending → awaiting_verification → awaiting_premium_payment → awaiting_insurer_activation → active`; `active ↔ suspended`; `active → expired`; any non-terminal → `cancelled`; `awaiting_verification | enrolment_pending → rejected`. Terminal: `expired`, `cancelled`, `rejected`.
Forward-only except `suspended → active` (reinstatement by verified insurer event only) and correction of `rejected`/`draft` by creating a **new** enrolment row (no reopen).
| Transition | Actor |
|---|---|
| draft→enrolment_pending | member principal (guardian w/ `can_manage_enrolment`, staff self, HR admin, `health.enrolments.manage`) |
| enrolment_pending→awaiting_verification | system, when mandatory fields complete |
| awaiting_verification→awaiting_premium_payment | `health.enrolments.verify` (or auto if plan `requires_verification=false`) |
| →rejected | `health.enrolments.verify` with reason code |
| awaiting_premium_payment→awaiting_insurer_activation | **system only** when the invoice is `paid` **or** plan funding rules say premium is waived/billed-later (`plan_version.activation_requires_payment` false); payment alone never sets `active` |
| awaiting_insurer_activation→active | **verified provider event** `policy.activated` (signature OK, `hw_policies.status` becomes `active` in the same transaction) |
| active→suspended / →expired / →cancelled | verified provider event; `cancelled` also by authorised user request (recorded, forwarded to provider) |
| →expired (fallback) | scheduled job only when `period_end` passed **and** provider status is unknown for > N days: marks `provider_status_stale`, **does not** change coverage. Stale reconciliation never suspends coverage (spec §4E). |
DB enforcement: a `BEFORE UPDATE` trigger validates the transition against an allow-list table; `status='active'` additionally requires an `hw_policies.status='active'` row with an `activation_event_id`.

### 7.2 Policy (`hw_policies.status`)
`pending → active → (suspended ↔ active) → expired | cancelled`; plus `rejected_by_provider`. Written only by the provider-event processor or the sandbox adapter (non-production).

### 7.3 Premium invoice (`hw_premium_invoices.status`)
`draft → issued → partially_paid → paid`; `issued|partially_paid → void` (no payments confirmed) ; `paid|partially_paid → refunded` (via refund records, partial refund tracked in `amount_refunded_minor`). `overdue` is derived (due_date < now and not paid), never stored.

### 7.4 Payment (`hw_payments.status`)
`initiated → pending → successful | failed`; `successful → reversed | refunded`; `failed` terminal. `successful` requires `verified_at` and `quasar_reference`; only the backend webhook/verification path can write it (DB CHECK + trigger blocks transition when `verified_at IS NULL`). `reconciled` is a separate boolean/timestamp (`reconciled_at`) with the ledger id, not a status, so it cannot regress payment state.

### 7.5 Guardian link — see 5.1. Invitation: `sent → accepted | expired | revoked`.

## 8. Payment boundary

```
Guardian/Staff/Admin ── POST /premium-invoices/:id/pay ──► Invify backend (guard + invoice lookup, amount from DB, never client)
        backend: create hw_payments(initiated, idempotency_key) ──► Quasar (server-side only, via existing quasar-payments.client)
        Quasar webhook (existing signature verification, raw body HMAC) ──► health payment handler
           1. verify signature; dedupe on (provider, event_id) → hw_provider_events-like unique
           2. fetch authoritative status from Quasar server-side (never trust the webhook body alone)
           3. TX: payment→successful(verified_at), allocation row (unique payment_id+invoice_id), invoice amount_paid, ledger posting, audit
           4. enrolment: awaiting_premium_payment → awaiting_insurer_activation, queue provider enrolment submission
```
Ledger posting [D] — **needs approval U5**: `createDoubleEntry` with `reference='HW:<payment_id>'`, idempotency key `hw:pay:<payment_id>`, entries `QUASAR_CLEARING DEBIT` / `SETTLEMENTS CREDIT` (insurer premium payable), metadata `{domain:'health_premium', invoiceId, planVersionId}`. **Never `USER_WALLET`**, so the tenant wallet projection is unchanged. Whether `SETTLEMENTS` semantics fit, or a new `HEALTH_PREMIUM_PAYABLE` account is needed (requires editing the fixed account list and possibly the `p10`/guarded-posting SQL functions → modifies existing financial code), is an open decision. Phase 2 will not ship ledger posting until decided; until then payments are recorded in `hw_payments`/`hw_payment_allocations` only and reported as "not ledgered".
Real money: premium payment stays behind `FEATURE_HEALTH_INSURANCE_ENABLED` **and** the existing sandbox/real-money gates; this feature adds no new gate bypass and is tested only against sandbox.
Funding models: `school`, `employer`, `member`, `shared`. `shared` creates multiple invoices (one per payer, `payer_type`, sum equals premium; DB check via deferred constraint trigger).
Refunds/reversals: separate `hw_payments` rows of kind `refund`; the original is never mutated except status; invoice `amount_refunded_minor` increments.

## 9. Provider integration boundary

Adapter interface (TypeScript) — each method optional; `capabilities()` states which are supported; unsupported = UI shows "not available".
```
interface HealthProviderAdapter {
  capabilities(): { plans, enrolmentSubmit, enrolmentStatus, eligibility, facilities, claims, renewals };
  syncPlans?(ctx); submitEnrolment?(ctx, enrolmentPayload); getEnrolmentStatus?(ctx, ref);
  verifyEligibility?(ctx, memberRef); syncFacilities?(ctx); getClaimStatus?(ctx, ref);
  verifyWebhook(rawBody, headers): {ok, providerId, eventId}; parseEvent(raw): NormalizedEvent;
}
```
- Credentials: referenced by `hw_providers.secret_ref` into the existing vault (`integration-vault.service`); never in tables, never in logs.
- Webhooks: `POST /api/v1/health-insurance/provider-webhooks/:providerCode`, raw-body HMAC (constant-time), `INSERT … ON CONFLICT (provider_id, event_id) DO NOTHING` first; duplicates ack 200 and skip; out-of-order events compared by `provider_sequence` / `occurred_at` vs `hw_policies.last_event_at` and `ignored_out_of_order`; failures retried with backoff then dead-lettered; payload stored redacted by default (`raw_payload_encrypted` only if the provider is flagged `retain_raw=true`, with `retention_until`).
- `sandbox.adapter` is registered only when `BUILD_VARIANT !== 'prod'`, its provider row is `integration_status='sandbox'`, and UI labels it "TEST ADAPTER". It must never mark production policies active (checked in the processor and by test).
- No live insurer is assumed; **no live integration exists** [U1].

## 10. Reports & metric definitions (Phase 2 will implement as SQL views/RPC + tests)
- *Eligible*: members (students or staff) in the tenant with an active `hw_tenant_plan_offers` whose `member_categories` include their category and whose eligibility rules pass. Computed, snapshot-labelled.
- *Enrolled*: members with an enrolment past `enrolment_pending` and not `rejected/cancelled/expired`.
- *Paid*: enrolment whose invoice is `paid`.
- *Pending activation*: `awaiting_insurer_activation`.
- *Active*: enrolment `active` **and** `hw_policies.status='active'` with `activation_event_id`.
- *Expired*: enrolment `expired` (by provider event).
- *Incomplete*: `draft` / `enrolment_pending`.
- Coverage rate = Active / Eligible. Premiums billed = Σ issued invoice amounts; collected = Σ successful payments; reconciled = those with `reconciled_at`; outstanding = billed − collected + refunded handled explicitly.
Every report response carries `{generated_at, data_freshness: {last_provider_sync_at}, is_snapshot}`.

## 11. Feature flags and release safety
- `FEATURE_HEALTH_INSURANCE_ENABLED` (env, default absent = off) read via a new helper in `src/config/build-variant.ts` style, plus per-tenant `hw_tenant_settings.enabled` (default false) and per-mode flags. All three must be on. Neither can bypass permission checks.
- Safe failure mode: provider outage ⇒ enrolment submission queued with retry; UI shows "provider unavailable"; no coverage state changes; dashboards show staleness.
- Rollback: migrations are additive; forward-recovery = flag off + leave tables. Optional `DROP` script in `proposed-migrations/rollback/` requires explicit approval (destructive).

## 12. Open items summary → see `07_PHASE1_REVIEW.md`.
