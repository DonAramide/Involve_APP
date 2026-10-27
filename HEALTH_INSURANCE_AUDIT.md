# HEALTH_INSURANCE_AUDIT.md — Phase 0 (read-only)

Date: 2026-10-14. Scope: bounded audit of `c:\dev\Involve_APP`. No source, DB, env or deployment changes were made. Only this file was added.
Legend: **[V]** verified by inspection, **[A]** assumption / not yet verified.

## 1. Repository map [V]

| Area | Path | Stack |
|---|---|---|
| Production backend | `invify-backend/` | Node/Express 4, TypeScript (`src/app.ts`), Jest + ts-jest + supertest, `pg`, `@supabase/supabase-js`, `jose`, `@iips/quasar-sdk`, pdfkit, xlsx, socket.io |
| Tenant / super-admin portal | `invify-admin/` | Vue 3 + Vite (JS/TS mix), domain folders `src/domains/tenant/*`, `TenantLayout.vue` |
| Quasar app | `invify-quasar-app/` | Quasar/Vue, eslint, Playwright |
| Mobile / POS | `lib/` (Flutter), `android/` | Dart; `android/mpossdk` |
| Legacy backend | `backend/` | Plain JS + `database/schema.sql` (old school schema). Not the production path. [A] |
| Infra / docs | `infrastructure/`, `docs/`, many `PHASE_*` reports | k8s, CI |

Working tree is **already dirty** (about 20+ modified files in android, invify-admin). Health work must be on a separate branch and must not touch those files.

## 2. Backend architecture [V]

- Routing in `src/app.ts`: `app.use('/api/v1/<x>', authenticate, <routes>)`. Route files are in `src/routes/*.routes.ts`, controllers in `src/controllers`, services in `src/services`, feature modules in `src/modules/*`.
- Auth: `src/middleware/auth.middleware.ts` verifies Supabase JWT (HS256 shared secret or ES256 via JWKS; verified JWT required in staging/prod). It builds `req.user {role, tenant_id/tenantId, is_active}`. Tenant comes from JWT claims or the `users` row.
- RBAC: `src/middleware/rbac.middleware.ts` `checkRole([...])`. `super_admin` bypasses everything. There are platform roles (`admin_finance`, `admin_ops`, ...) and tenant roles (`owner`, `tenant_admin`, `staff`, `finance_staff`, `cashier`).
- Tenant helpers: `src/utils/finance-tenant.ts` (`resolveAuthoritativeTenantId`, `assertTransactionTenantAccess`) and `src/utils/resolve-tenant-scope.ts`. **Reuse these.**
- DTO validation: `src/middleware/dto.middleware.ts`. Idempotency: `src/modules/idempotency`. Queue/workers: `src/modules/queue`, `src/workers`.
- Feature flags: env-based and ad hoc (`FEATURE_REAL_MONEY_PAYOUTS` in `src/config/build-variant.ts:276`, `ENABLE_*`). There is no flag registry, so a new `FEATURE_HEALTH_INSURANCE_ENABLED` follows the env pattern (default false).
- Notifications: `notification.service.ts`, `whatsapp-notification.service.ts`, `email.service.ts`, `sms.service.ts`.
- Audit: `audit.service.ts`, `gov-audit.service.ts`, table `audit_logs` (`20260618030000_p05c_audit_logs.sql`).
- Secrets: `integration-vault.service.ts`, `credential-resolver.service.ts`, `docs/SECRETS_MANAGEMENT.md`.

## 3. Database [V unless noted]

- Migrations: `invify-backend/supabase/migrations/*.sql`, 80 files, baseline `20260601000000_phase32c2r3_production_baseline.sql`, latest `20261006140000_tenant_billing_atomic_rpcs.sql`. Naming `YYYYMMDDHHMMSS_<slug>.sql`, idempotent (`IF NOT EXISTS`). 165 `ENABLE ROW LEVEL SECURITY` statements, so RLS is common practice. A stray `src/db/migrations/*.sql` set also exists (legacy).
- `tenants` (uuid PK, `type`, `status`, `settings jsonb`, ...) is the tenant root. `users` has `role`, **`tenant_id varchar`** (not uuid, so casts are needed), `is_active`.
- `students`: `id uuid, school_id uuid, tenant_id uuid, first_name, last_name, admission_number, current_class, running_balance, virtual_account_*`. There is **no guardian/parent link, no academic session and no date of birth** in the production schema.
- Staff: the `tenant_staff` table is created lazily in `staff.controller.ts` (roles `ADMIN|FINANCE|STAFF`). No teacher / non-teaching staff categorisation or HR role. [V]
- `customers` (varchar id, `tenant_id`, name/phone/email, VA): Retail-style contacts.
- Ledger: `ledgers`, `ledger_entries` (`tenant_id`, `account`, CREDIT/DEBIT, `amount BIGINT` in kobo, `currency`), `wallets` (projection, one per tenant). `wallet_ledger`, `financial_events`, `financial_event_state_history`, `webhook_dead_letters`, `incoming_webhook_logs`, `reconciliation_cases`, `invoices`/`invoice_items` (`20260803000002`).
- **`fee_structures` is not in the production migrations.** It exists only in legacy `backend/database/schema.sql`, with references in `backend/src/services/allocation.service.js` and `invify-backend/src/controllers/defaulters.controller.ts`. Health tables must not reference it. Whether prod has it is [A] (it needs a live schema check, read-only).
- Money convention: integer kobo (`BIGINT`), plus migration `fee_kobo_precision`.

## 4. Payments and Quasar [V/A]

- `src/integrations/quasar/*` (clients, webhook service, tenant key environment), `payment.service.ts`, `webhook.controller.ts`, `webhook-handlers.ts`, `quasar-event-gateway.service.ts`, `ledger.service.ts`, `reconciliation.service.ts`, `invoice-application.service.ts`, `school-payments.controller.ts`.
- Real-money payouts gated by `FEATURE_REAL_MONEY_PAYOUTS` and prod variant. Health must not touch this gate.
- [A] Exact webhook signature scheme and the idempotency key format need a line-level read in Phase 1 (`quasar-webhook.service.ts`, `webhook.controller.ts`).

## 5. Existing health / insurance code

None. No `health_*` or `insurance` references in `invify-backend/src`. Note the name `health.controller.ts` and `provider_health_*` tables are **service-health** items, so avoid name collisions (use the `health_ins_` or `hw_` prefix, not just `health_`).

## 6. Test and build baseline

| Check | Command (in `invify-backend`) | Result |
|---|---|---|
| Type-check | `npx tsc --noEmit -p .` | **FAIL, 1 pre-existing error**: `src/controllers/device.controller.ts(123,11) TS2322` (missing `plan_expires_at`, `owner_email` in select). Not caused by this work. |
| Unit/integration | `npx jest --runInBand --silent` | **PENDING** at time of writing (long running); result to be appended below |
| Frontend lint/build, Quasar e2e, Flutter | not run | not yet run |

Existing relevant tests (in `invify-backend/tests`): `phase4.tenant.isolation.test.ts`, `invoice-*`, `fee-*`, `payout-ledger-safety`, `hardening`, `commission.security`, `mfa.*`. These are the regression and pattern suites.

## 7. Risks and findings

1. **Tenant spoofing precedent (pre-existing, High):** `defaulters.controller.ts:11` and `student.controller.ts:23,65` take `tenantId` from the `x-tenant-id` header before the JWT user. Health code must **never** copy this pattern. These should be reported and fixed separately (out of scope here).
2. **`checkRole` logs every request** with roles (`console.log` in `rbac.middleware.ts`). Fine for roles but health routes must not log PII.
3. **`super_admin` bypasses all `checkRole`**. This conflicts with "no default access to clinical data". Health routes need a dedicated permission guard that does not auto-bypass and that audits platform access.
4. **No guardian/parent model, no staff categories, no DOB, no academic session.** Student-to-guardian linking, "guardian sees only linked children" and the per-session filters need new link tables (`health_ins_guardian_links`), or an agreement on the source of truth. **Business decision needed** (see §9).
5. `users.tenant_id` is varchar while others are uuid, so RLS policies need explicit casts.
6. Tracked-secret hygiene: `git ls-files` shows no tracked `.env`, but untracked secrets exist on disk at the root (`.env`, `firebase-staging-service-account.json`, `ssh`). They must remain untracked; do not commit them.
7. Dirty working tree and parallel work: branch isolation required.
8. Legacy `backend/` and `src/db/migrations` can mislead schema discovery. Use `supabase/migrations` as the source of truth, plus a live read-only schema check against staging.
9. No real insurer, so only a labelled sandbox adapter is possible. Clinical data is out of scope (membership/eligibility only).

## 8. Proposed design (summary; full design is Phase 1)

New tables (prefix `hw_`, all with `tenant_id uuid NOT NULL REFERENCES tenants(id)`, RLS on, `FORCE` for service role usage reviewed; amounts `BIGINT` kobo):
`hw_providers` (platform-level, no tenant), `hw_plans`, `hw_plan_versions` (immutable terms), `hw_members` (links to `students.id` / `tenant_staff` / `customers.id` by typed nullable FK + CHECK exactly one), `hw_guardian_links`, `hw_dependants`, `hw_enrolments` (UNIQUE tenant+member+plan_version+period; status state machine), `hw_policies` (insurer ref; activation only from verified events), `hw_premium_invoices` (separate from `invoices`/fees), `hw_payment_allocations` (UNIQUE payment_ref+invoice), `hw_provider_events` (UNIQUE provider+event_id; signature verified), `hw_facilities`, `hw_claim_status_records`, `hw_notifications` (dedupe key), `hw_audit_events` (append-only).
Ledger: post premium receipts through existing `ledger.service.ts` with a distinct account/reference namespace (`HEALTH_PREMIUM`); no change to existing accounts. Payment state and policy state are separate columns/machines.
Backend: `src/modules/health-insurance/{routes,controllers,services,adapters,policies,dto}`, mounted at `/api/v1/health-insurance` behind `authenticate` plus a flag guard plus a health permission guard (no blanket super_admin bypass). Tenant always from `resolveAuthoritativeTenantId`.
Frontend: `invify-admin/src/domains/tenant/health-insurance/*` and a parent/staff portal view, with nav entries gated by the flag from a backend capability endpoint.

## 9. Blocking or decision items

1. Guardian/parent data source: does a parent model exist outside this repo (e.g. mobile app local data, `customers`)? Staging schema inspection is needed to confirm.
2. Staff categorisation (teaching / non-teaching / HR role) and who counts as "Staff/HR Administrator".
3. Is `fee_structures` live in the production DB? (read-only query, needs staging access/approval)
4. Insurer: no API docs or credentials. Only the sandbox adapter is possible.
5. Legal and NDPR review before any non-membership health data.
6. Which environment may receive migrations (assume a staging/local Supabase only; no production).

## 10. Phased plan with expected file changes

- **Phase 1 (docs only):** `docs/health-insurance/{ARCHITECTURE,SCHEMA,API_CONTRACT,THREAT_MODEL}.md`.
- **Phase 2:** new `supabase/migrations/2026xxxxxxxxxx_hw_*.sql` (several, additive only, no ALTER of existing tables), `src/modules/health-insurance/**`, one `app.use` line in `src/app.ts`, an env entry in `src/config/env.ts`, an `.env.staging.example` line (default `false`), `tests/health-*.test.ts`.
- **Phase 3:** `invify-admin/src/domains/tenant/health-insurance/**`, routes and `TenantLayout.vue` nav (this file is currently modified by others, so merge carefully).
- **Phase 4:** sandbox adapter (`NODE_ENV!=production` only), webhook route, ledger posting adapter.
- **Phase 5/6:** full test run and regression comparison to the baseline here, then `HEALTH_INSURANCE_RELEASE_READINESS.md`.

## 11. Jest baseline result

Command: `npx jest --runInBand --silent` in `invify-backend` (run on the dirty working tree, before any health changes).

**Result [V]:** Test Suites: 18 failed, 1 skipped, 85 passed (103 of 104). Tests: 39 failed, 20 skipped, 710 passed (769).

Failing suites (pre-existing): commission.security, hardening, invoice-payment-method, payout-ledger-safety, terminal-activation-delivery, pos-secrets.r7-mask-preservation, phase6s6.hardening, api.integration, quasar/08.webhook-signature-integration, observability, mfa.rate-limit, phase3.environment, phase2.security.lockdown, platform-fee-profiles.admin, device-license-upgrade, terminal-inventory, subscription, activation.

Causes were not investigated (likely env/secrets or the dirty tree). Several are finance/security suites (payout-ledger-safety, webhook signature, invoice-payment-method), so they are weak regression guards until triaged. Later phases must compare against this exact failing set, not just "all green".
