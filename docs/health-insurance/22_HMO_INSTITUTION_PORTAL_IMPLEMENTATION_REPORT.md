# INVIFY HEALTH INSURANCE — HMO-AWARE INSTITUTION PORTAL IMPLEMENTATION REPORT

**Project:** Invify Health Insurance Management Platform  
**Repository:** `C:\dev\Involve_APP_health`  
**Branch:** `feature/health-insurance-phase1`  
**Status:** COMPLETE & VERIFIED  

---

## 1. Architecture Summary

The Invify Institution Portal (`/institute/dashboard` and `/institute/*`) has been extended to support **institution-type-aware classification and rendering** while preserving 100% of existing Bank / Aggregator functionality:

1. **Authoritative Backend Classification (`InstitutionClassificationService`)**:
   - Inspects authenticated identity against `public.hw_hmo_user_memberships`, `public.institutions`, `public.hw_providers`, and `public.agents`.
   - Never trusts client-supplied `institution_type` headers, query params, or local storage overrides.
   - Resolves canonical classification:
     - `portalMode = 'BANK'` for verified `BANK`, `AGGREGATOR`, and `PAYMENT_PROVIDER` institutions.
     - `portalMode = 'HMO'` for approved and verified `HMO` institutions (`approvalStatus = 'ACTIVE'`, `kycStatus = 'VERIFIED'`, `FEATURE_HEALTH_INSURANCE_HMO_PORTAL != 'false'`).
     - `portalMode = 'RESTRICTED'` for pending/suspended HMOs, hospitals, or unclassified records.

2. **Strict Route & API Boundary Guards (`hmo-institution.guard.ts`)**:
   - `requireHmoInstitution(requiredPermission?)`: Protects all `/api/v1/health-insurance/hmo-portal/*` and `/api/agent/hmo/*` endpoints. Blocks Bank/Aggregator accounts (`403 INSTITUTION_NOT_HMO`), unapproved HMOs (`403 HMO_PORTAL_RESTRICTED`), and cross-HMO `hmo_provider_id` spoofing (`403 CROSS_HMO_ACCESS_DENIED`).
   - `requireBankOrAggregatorInstitution`: Blocks HMO and Hospital accounts (`403 BANK_INSTITUTION_ONLY`) from invoking bank/POS hardware assignment or sync actions.

3. **Shared Frontend Portal (`AgentDashboardPage.vue`, `AgentLayout.vue`, `HmoInstitutionPortalView.vue`)**:
   - When `portalMode === 'BANK'`, the existing Bank/Agent dashboard (`overview`, `tenants`, `deployments`, `finance`, `analytics`, `profile`, `support`, `developer`) renders untouched.
   - When `portalMode === 'HMO'`, `HmoInstitutionPortalView.vue` renders the 10-module HMO Health Insurance Management Portal (`MHMO` ready out of the box).
   - When `portalMode === 'RESTRICTED'`, a clear onboarding/compliance pending screen is displayed.
   - `AgentLayout.vue` displays an `HMO INSTITUTION PORTAL` badge for HMO accounts and redirects HMO users away from bank-only routes (`/institute/leads`, `/institute/portfolio`, `/institute/wallet`, `/institute/reputation`, `/institute/certifications`, `/institute/training`) back to `/institute/dashboard`.

---

## 2. Additive Database Migration

**File:** `invify-backend/supabase/migrations/20261022000000_hw_60_hmo_institution_portal.sql`

### Key Schema Additions:
- **Extended `public.hw_providers`**: Preserves `licence_reference` (defined in `hw_00_foundation.sql`) and adds `institution_id` (FK to `public.institutions`), `legal_name`, `regulator_type` (`NHIA`, `NAICOM`, `STATE_HMO`, `OTHER`), `licence_expiry`, `contact_email`, `contact_phone`, `support_email`, `claims_email`, `head_office_address`, `state`, `lga`, `website_url`, and `logo_url`.
- **`public.hw_hmo_user_memberships`**: Links users/agents to specific `hw_providers` with 7 granular HMO RBAC roles:
  - `HMO_ADMIN`, `ENROLLMENT_OFFICER`, `PROVIDER_NETWORK_MANAGER`, `CLAIMS_OFFICER`, `AUTHORIZATION_OFFICER`, `FINANCE_OFFICER`, `AUDITOR`.
- **`public.hw_hmo_school_links`**: Tracks school/employer institutional partnerships, assigned plans, academic sessions, and enrolment windows per HMO.
- **`public.hw_export_mappings`**: Configurable Excel/CSV column mapping templates, date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`), and required fields per HMO.
- **`public.hw_enrolment_batches` & `public.hw_enrolment_batch_items`**: Full 11-stage batch lifecycle (`DRAFT`, `READY_FOR_EXPORT`, `EXPORTED`, `AWAITING_HMO_RESPONSE`, `RESPONSE_UPLOADED`, `VALIDATING_RESPONSE`, `PARTIALLY_CONFIRMED`, `CONFIRMED`, `FAILED_VALIDATION`, `SUPERSEDED`, `ARCHIVED`) with row-level status tracking and external HMO member IDs.
- **`public.hw_import_jobs` & `public.hw_import_row_results`**: Tracks inbound HMO response sheet uploads and row-by-row reconciliation outcomes (`CONFIRMED`, `REJECTED_BY_HMO`, `NEEDS_CORRECTION`, `DUPLICATE`, `UNMATCHED`, `VALIDATION_ERROR`).
- **`public.hw_hmo_tasks`**: Operational queue for pending enrolments, response imports, claims, and compliance alerts.
- **Row-Level Security (RLS)**: Enabled across all new tables using `public.hw_current_hmo_provider_ids()` and `public.is_hw_platform_admin()`.
- **Idempotent MHMO Seed**:
  - Ensures `MHMO` exists in `public.institutions` with `institution_type = 'HMO'`, `status = 'ACTIVE'`, `kyc_status = 'VERIFIED'`.
  - Enables `HEALTH_INSURANCE` in `public.institution_services` for `MHMO`.
  - Links `MHMO` in `public.hw_providers` (`code = 'MHMO'`) and seeds default `MHMO Standard Enrolment Sheet` mapping in `public.hw_export_mappings`.

---

## 3. Backend Modules & Endpoints

| File | Responsibility |
| :--- | :--- |
| `src/modules/health-insurance/services/institution-classification.service.ts` | Authoritative resolution of `institutionType`, `portalMode`, `hmoProviderId`, `hmoRole`, and `hmoPermissions`. |
| `src/modules/health-insurance/guards/hmo-institution.guard.ts` | `requireHmoInstitution` and `requireBankOrAggregatorInstitution` middleware. |
| `src/modules/health-insurance/services/hmo-excel-exchange.service.ts` | Formula-injection sanitization (`=`, `+`, `-`, `@`, `\t`, `\r`), configurable CSV export generation, and idempotent inbound response reconciliation. |
| `src/modules/health-insurance/services/hmo-portal.service.ts` | Implements all 10 HMO Portal functional areas (12 KPIs, Profile, Schools, Plans, Enrollments, Excel/CSV Batches, Provider Network, Pre-Auth & Claims, Billing & Profit Share, RBAC & Audit Logs). |
| `src/modules/health-insurance/controllers/hmo-portal.controller.ts` | Express handlers for all HMO Portal routes. |
| `src/modules/health-insurance/register-routes.ts` | Mounts HMO portal routes at `/api/v1/health-insurance/hmo-portal` and `/api/agent/hmo`. |

---

## 4. Verification & Automated Tests

- **HMO Institution Portal Suite (`test/hmo-institution-portal.test.ts`)**: 12/12 passing tests covering:
  - Authoritative classification for `BANK`, approved `HMO` (`MHMO`), pending `HMO` (`RESTRICTED`), and `HOSPITAL` (`RESTRICTED`).
  - Route guards blocking Bank accounts from HMO endpoints, blocking Cross-HMO spoofing (`hmo_provider_id`), enforcing granular RBAC permissions, and blocking HMO accounts from Bank/POS hardware endpoints.
  - Spreadsheet formula-injection sanitization (`=CMD(...)`, `+SUM(...)`, `-2+3`, `@IMPORTXML(...)`), configurable column mapping & `DD/MM/YYYY` formatting, and idempotent response sheet reconciliation (confirmed, rejected, duplicate, unmatched, cross-HMO isolation).
- **Core Health Insurance Suite (`test/health-insurance.test.ts`)**: Verified with zero regressions.

---

## 5. Phase 3 Controlled Live Staging Verification (`rpcjelhacmkhzguljdgi`)

- **Target Staging Supabase Project**: `rpcjelhacmkhzguljdgi` (`invify-staging`)
- **Verified MHMO Institution**: `00000000-0000-0000-0000-000000000060` (`institution_code = 'MHMO'`, `institution_type = 'HMO'`, `status = 'ACTIVE'`, `kyc_status = 'VERIFIED'`)
- **Verified MHMO Provider**: `4defe06c-d164-40f2-b762-0bed58dffaf4` (`code = 'mhmo'`, `licence_reference = 'NHIA/HMO/060'`, `regulator_type = 'NHIA'`, `integration_status = 'verified'`)
- **Disposable Test Account**: `agent_code = 'MHMO-STG-286841'`, `hmo_role = 'ENROLLMENT_OFFICER'` (least-privilege role per DB `CHECK` constraint).
- **End-to-End Verification Results**:
  - `POST /api/agent/login` -> `200 OK` (`institutionType = 'HMO'`, `portalMode = 'HMO'`, `hmoRole = 'ENROLLMENT_OFFICER'`, 11 permissions).
  - `GET /api/agent/dashboard` -> `200 OK` (12 HMO KPIs returned; Bank regression account `P73-STG-B` returned `institutionType = 'BANK'`, `portalMode = 'BANK'`).
  - `GET /api/agent/profile` -> `200 OK` (`institutionType = 'HMO'`, `portalMode = 'HMO'`, `hmoRole = 'ENROLLMENT_OFFICER'`).
  - Granular RBAC & Security Boundaries:
    - Authorized endpoints (`/overview`, `/profile`, `/schools`, `/plans`, `/enrollments`, `/excel/mappings`, `/excel/batches`) -> `200 OK`.
    - Restricted endpoints for `ENROLLMENT_OFFICER` (`/facilities`, `/claims`, `/billing`, `PATCH /profile`) -> `403 HMO_INSUFFICIENT_PERMISSION`.
    - Cross-HMO spoofing (`?hmo_provider_id=84028351-a2f6-42e4-9e9e-0ee93bdbf73f`) -> `403 CROSS_HMO_ACCESS_DENIED`.
    - Bank/POS endpoints (`/api/agent/hardware/assign`, `/api/agent/hardware/sync`, `/api/agent/merchant/terminal/assign`) -> `403`.
    - Bank account calling `/api/agent/hmo/overview` -> `403 INSTITUTION_TYPE_MISMATCH`.
    - Feature flag disabled (`FEATURE_HEALTH_INSURANCE_HMO_PORTAL = 'false'`) -> `403 HMO_PORTAL_RESTRICTED`.
  - Synthetic Enrollment Exchange:
    - Batch creation (`BATCH-MHMO-372001`), CSV export with `MHMO Standard Enrollment Exchange v1` headers, preview reconciliation (`mode = 'PREVIEW'`), commit reconciliation (`mode = 'COMMITTED'`, job `950206e1-d686-4c10-93d6-cfae884e7be2`), and idempotent replay (`mode = 'IDEMPOTENT_REPLAY'`) all succeeded (`200/201`).
  - Post-Test Cleanup:
    - Disposable membership revoked (`status = 'REVOKED'`), agent suspended (`status = 'SUSPENDED'`), sessions revoked, auth user banned, synthetic batch cancelled (`status = 'cancelled'`), and post-cleanup login verified blocked (`401`).

