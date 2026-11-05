# HMO Provider Management — Implementation Report

**Branch:** `feature/hmo-management-platform`  
**Date:** 2026-10-30  
**Scope:** Platform Super Admin HMO provider registration, lifecycle governance, and institution consumption of centrally governed `hw_providers` rows.

## 1. Phase 0 — Architecture discovered

### Canonical provider table

| Object | Role |
|--------|------|
| `public.hw_providers` | Global HMO organisations (platform-owned; no `tenant_id`) |
| `public.hw_facilities` | Hospitals/clinics owned by an HMO (`provider_id`) |
| `public.hw_plans` / `hw_plan_versions` | Catalogue plans per provider |
| `public.hw_hmo_school_links` / `hw_tenant_settings.assigned_provider_id` | Institution/tenant linkage |
| `public.hw_bank_hmo_offerings` | Bank distribution switches keyed by `agent_id` + `plan_version_id` |

Foundation migration: `invify-backend/supabase/migrations/20261015010000_hw_00_foundation.sql`  
Profile extensions: `20261022000000_hw_60_hmo_institution_portal.sql` (`legal_name`, contact fields, `logo_url`, `institution_id`, …)

### Existing `integration_status` (not invented)

`none` | `sandbox` | `pending_verification` | `verified` | `suspended`

Proposed product labels map onto these values (see §3). `rejected` is **not** in the live CHECK until the unapplied governance SQL is applied.

### What already existed

- Super Admin **HMO Registry** read: `GET /platform/providers` behind `platform.providers.manage`
- Super Admin **Provider Network** = facilities (`GET /platform/facilities`), not HMO org CRUD
- Institution HMO portal updates **its own** linked `hw_providers` profile and registers **facilities**
- Tenant `GET /providers` listed all statuses (gap: non-active selectable)
- Frontend `createProvider` pointed at a non-existent tenant `POST /providers`
- Audit via `HealthAuditService` / `hw_audit_events` (platform ops use sentinel tenant UUID)

### Genuine gaps filled

1. No platform register / update / approve / reject / suspend / reactivate APIs  
2. No provider statistics endpoint  
3. No provider detail aggregate (plans, links, bank offerings, audit)  
4. Registry UI was read-only  
5. Non-verified providers could still be listed for tenant selection and assigned  
6. No `rejected` status in schema (proposed only)

## 2. Functionality reused

- Table `hw_providers` (no duplicate provider table)
- Permission `platform.providers.manage` for mutations; `platform.integration.health` unchanged for facilities/health
- Logo upload helpers: `validateImageBase64` + `uploadBase64ToContabo` (same as facility logos)
- `collectProviderTenantCounts` for linked-tenant stats
- Existing Registry route `/hmo/registry` (management panel mounted there)
- Institution facility registration left intact

## 3. Lifecycle mapping

| Governance label | `integration_status` | New enrolments / assignment |
|------------------|----------------------|-----------------------------|
| DRAFT | `none` | No |
| PENDING_APPROVAL | `pending_verification` | No |
| ACTIVE | `verified` | Yes |
| REJECTED | `rejected`* | No |
| SUSPENDED | `suspended` | No |
| SANDBOX | `sandbox` | No (integration mode) |

\*Requires `proposals/DO_NOT_APPLY_hw_provider_governance.sql`.

**Rules implemented**

- Register → always `pending_verification` (never auto-active)
- Approve / reject / suspend / reactivate are dedicated endpoints (PATCH cannot change status)
- Reject and suspend require a reason (≥ 5 chars)
- Sensitive actions write `hw_audit_events` (`provider.registered|updated|approved|rejected|suspended|reactivated`)
- `HealthPlanService.listProviders` filters `verified` only
- `assignTenantProvider` returns `409 PROVIDER_NOT_ASSIGNABLE` unless verified
- No delete path for providers with history

## 4. Database changes proposed (unapplied)

File: `invify-backend/proposals/DO_NOT_APPLY_hw_provider_governance.sql`

- Add `rejected` to `integration_status` CHECK  
- Optional columns: `description`, `contact_person_*`, `status_reason`, `status_changed_at`, `status_changed_by`  
- Indexes on status and unique CI licence reference  
- **Not applied** to staging/production in this task  

Service falls back when optional columns are missing; reject returns `503 PROVIDER_REJECTED_STATUS_UNAVAILABLE` if the CHECK rejects `rejected`.

## 5. API endpoints added / updated

All under `/api/v1/health-insurance`, auth + `requireHealthPermission`.

| Method | Path | Permission |
|--------|------|------------|
| GET | `/platform/providers` | `platform.providers.manage` (legacy list; filtered list when query present) |
| GET | `/platform/providers/statistics` | `platform.providers.manage` |
| POST | `/platform/providers` | `platform.providers.manage` |
| GET | `/platform/providers/:providerId` | `platform.providers.manage` |
| PATCH | `/platform/providers/:providerId` | `platform.providers.manage` |
| POST | `/platform/providers/:providerId/approve` | `platform.providers.manage` |
| POST | `/platform/providers/:providerId/reject` | `platform.providers.manage` |
| POST | `/platform/providers/:providerId/suspend` | `platform.providers.manage` |
| POST | `/platform/providers/:providerId/reactivate` | `platform.providers.manage` |
| GET | `/platform/providers/:providerId/audit` | `platform.providers.manage` |
| GET | `/platform/providers/health` | `platform.integration.health` (unchanged; **registered before** `:providerId`) |
| GET | `/providers` | verified-only (behaviour change) |

## 6. Frontend routes and components

| Item | Notes |
|------|-------|
| `/hmo/registry` | Hosts `HmoProviderManagementPanel` |
| `HmoProviderManagementPanel.vue` | Stats, search/filter, register, detail tabs, lifecycle confirmations |
| `src/hmo/providerLifecycle.js` | Status labels / form defaults |
| `healthInsuranceApi.js` | Platform provider CRUD + lifecycle clients; `createProvider` redirected to platform POST |

Detail tabs implemented where data exists: Overview, Organisation, Contact, Documents (licence/logo), Plans, Linked institutions, Bank relationships (via plan join), Activity/audit.  
Full document vault beyond logo/licence is **not** claimed — dependency noted in UI.

## 7. RBAC / RLS decisions

- Mutations require active `platform.providers.manage` grant (server-side guard)
- No new broad RLS policies; service role continues for platform Nest writes
- Institution admins have no route to insert global `hw_providers`
- Tenant list/assign consume only verified providers
- Historical links remain readable after suspend/reject

## 8. Automated tests

Added/updated:

- `invify-backend/test/health-provider-governance.test.ts` — register, duplicate licence, approve, reject reason, suspend, reactivate guard, status-via-PATCH block, route/RBAC isolation assertions  
- `invify-admin/tests/provider-lifecycle.test.ts`  
- `invify-admin/tests/hmo-workspace.test.ts` — registry panel + API surface  

Local Jest (2026-10-30):

- `invify-backend`: `health-provider-governance.test.ts` + `health-platform-visibility-routes.test.ts` → **15 passed**
- `invify-backend`: `health-insurance.test.ts` “lists the HMO registry…” → **passed** (mock updated for `hw_tenant_plan_offers` tenant-count source)
- `invify-admin`: `hmo-workspace.test.ts` + `provider-lifecycle.test.ts` → **26 passed**

## 9. Outstanding dependencies

1. Apply `DO_NOT_APPLY_hw_provider_governance.sql` before relying on `rejected` or contact-person columns in staging/prod  
2. Platform audit sentinel tenant `00000000-0000-0000-0000-000000000000` must exist (or audits stay soft-fail as today)  
3. Contabo/logo upload credentials must be configured for logo persistence  
4. Dedicated document-storage for licensing packs is not part of this slice  
5. Unrelated WIP on the branch (catalogue/mail-identity/staging docs) preserved; not deployed  

## 10. Deployment considerations

- **Do not deploy** from this task without explicit approval  
- **Do not apply** the governance SQL to staging/production without change-control  
- Candidate builds only after review; preserve existing uncommitted non-provider work  
- Rollback: revert service/controller/UI commits; SQL rollback notes are in the proposal header  

## 11. Honest completion status

| Item | Status |
|------|--------|
| Super Admin register HMO provider | **COMPLETE** (code; needs env + grant to exercise) |
| Manage / govern provider records | **COMPLETE** |
| Lifecycle + authorization | **COMPLETE** (`rejected` **PROPOSED** pending migration) |
| Institution consumes governed list | **COMPLETE** (verified-only + assignment guard) |
| Existing institution facility workflows | **PRESERVED** |
| Backend ↔ frontend vertical slice | **COMPLETE** |
| Audit logging | **COMPLETE** (same soft-fail pattern as other platform events) |
| Automated tests | **COMPLETE** (local suite; see run log) |
| DB changes documented & unapplied | **COMPLETE** |
| Staging/prod deploy | **BLOCKED** (safety policy) |
| UAT on live grants + real logos + reject path | **REMAINS FOR UAT** |
