# Invify Health & Wellness — Phase 1 Architecture & Design Review

**Document:** `docs/health-insurance/07_PHASE1_REVIEW.md`  
**Phase:** 1 (Design & Architecture Review)  
**Date:** 2026-10-14  
**Branch / Worktree:** `feature/health-insurance-phase1` (`C:\dev\Involve_APP_health`)  
**Status:** READY FOR STAKEHOLDER REVIEW — Zero production modifications, zero migrations applied.  

---

## 1. Executive Summary

Phase 1 establishes the foundational domain model, database schema, API contracts, authorization guards, state machine specifications, threat model, and test verification strategy for **Invify Health & Wellness**.

All deliverables have been developed in an isolated git worktree (`C:\dev\Involve_APP_health`) on branch `feature/health-insurance-phase1`. All uncommitted modifications in the parent repository (Android SDK, `invify-admin` modified pages) remain 100% untouched and preserved.

---

## 2. Deliverables Summary

All Phase 1 documentation and design artifacts are located under `docs/health-insurance/`:

| Artifact | Location | Purpose |
|---|---|---|
| **Architecture Design** | [`01_ARCHITECTURE.md`](file:///c:/dev/Involve_APP_health/docs/health-insurance/01_ARCHITECTURE.md) | High-level system structure, multi-mode architecture, and payment/provider boundaries |
| **Schema Plan** | [`02_SCHEMA_PLAN.md`](file:///c:/dev/Involve_APP_health/docs/health-insurance/02_SCHEMA_PLAN.md) | Entity relationships, data dictionary, foreign key policies, and integrity constraints |
| **Proposed Migrations** | [`proposed-migrations/`](file:///c:/dev/Involve_APP_health/docs/health-insurance/proposed-migrations/) | Pure SQL migrations (additive, idempotent, unapplied) covering foundation, people, policies, billing, and RLS |
| **Rollback Plan** | [`proposed-migrations/rollback/hw_rollback.sql`](file:///c:/dev/Involve_APP_health/docs/health-insurance/proposed-migrations/rollback/hw_rollback.sql) | Clean, ordered reversal script for emergency rollback |
| **API Contract** | [`03_API_CONTRACT.md`](file:///c:/dev/Involve_APP_health/docs/health-insurance/03_API_CONTRACT.md) | Full REST endpoint specifications, request/response DTO schemas, and pagination contracts |
| **Permissions Matrix** | [`04_PERMISSIONS_MATRIX.md`](file:///c:/dev/Involve_APP_health/docs/health-insurance/04_PERMISSIONS_MATRIX.md) | Role-based permissions, explicit HR separation, finance isolation, and guardian context rules |
| **State Machines** | [`05_STATE_MACHINES.md`](file:///c:/dev/Involve_APP_health/docs/health-insurance/05_STATE_MACHINES.md) | Enrolment, policy, invoice, payment, and guardian link forward-only lifecycle models |
| **Threat Model** | [`06_THREAT_MODEL.md`](file:///c:/dev/Involve_APP_health/docs/health-insurance/06_THREAT_MODEL.md) | STRIDE analysis, tenant spoofing prevention, data minimisation, and NDPA compliance |

---

## 3. Staging Schema Discovery Findings

As authorized in Phase 1 directives, a strictly read-only, metadata probe was executed against the staging Supabase OpenAPI schema. No row data was accessed; only table and column definitions were inspected.

### Confirmed Findings:
1. **`fee_structures` is ABSENT**: Neither production baseline migrations nor staging PostgreSQL schemas contain a `fee_structures` table. It existed solely in legacy repository folders. Our design is 100% clean and isolated from fee structures.
2. **`guardians` and `parents` are ABSENT**: No relational parent/guardian tables exist. Parent contact data currently exists solely as unindexed JSON blobs within `school_entities` synced from POS. Our `hw_guardian_links` provides the first relational, verified guardian identity binding.
3. **`academic_sessions` and `academic_terms` are ABSENT**: No session table exists. Enrolments cleanly bind to ISO `period_start` and `period_end` date bounds with an optional free-text `cohort_label`.
4. **`tenant_staff` exists**: Confirmed table schema (`id`, `tenant_id`, `name`, `staff_id`, `role`, `is_active`). We link to this table via `hw_staff_profiles`, separating the person's employment category (`teaching`, `non_teaching`) from system permissions.

---

## 4. Full Platform Baseline Test Audit

A complete baseline execution was performed across all workspace packages prior to any code implementation:

| Package | Command | Result | Findings / Pre-existing Failures |
|---|---|---|---|
| `invify-backend` (Type-Check) | `npx tsc --noEmit` | **FAIL (1 error)** | `src/controllers/device.controller.ts:123:11 - error TS2322`: property mismatch on `tenants = retry.data` missing `plan_expires_at`, `owner_email`. |
| `invify-backend` (Unit Tests) | `npx jest --runInBand` | **18 Failed / 85 Passed** | 39 failed tests, 710 passed tests. Investigation revealed tests like `commission.security.test.ts` failed to run due to the ts-jest compile error in `device.controller.ts`. |
| `invify-admin` (Frontend Tests) | `npx jest --forceExit` | **5 Failed / 7 Passed** | 2 failed tests, 79 passed tests. Failures in `platform-fee-profiles` and workflow/SLA engines. |
| `invify-quasar-app` (Lint) | `npx eslint` | **Error** | ESM module loader resolution issue in local node environment. |
| Flutter / Mobile SDK (`lib`) | `flutter analyze` | **1176 issues** | Pre-existing lint and styling warnings. |
| Flutter / Mobile SDK (`test`) | `flutter test` | **2 Failed / 100 Passed** | Pre-existing failures in `withdrawal_confirmation_copy_test` and `placeholder_contact_test`. |

*Note: All new Health & Wellness tests in Phase 5 will be evaluated independently and must pass with 100% success rate without altering or weakening any of the above pre-existing suites.*

---

## 5. Architectural Decisions for Confirmation

Before proceeding to Phase 2 (Backend & Database Implementation), please review and confirm the following key architectural decisions:

1. **Permission Guard & Super Admin Isolation**:
   - `requireHealthPermission` replaces `checkRole` for all health routes.
   - Global `super_admin` role will have zero implicit access to student or staff health records.
   - Platform support personnel must acquire explicit, time-boxed records in `hw_platform_grants` with an audited reason.
2. **Guardian Link Verification Workflow**:
   - Invitation acceptance binds a guardian's user identity to a student record, but leaves the link in `pending_verification`.
   - Access to student health coverage or premium payment is blocked until a school administrator explicitly marks the link `verified` (`school_record_check` or `document_sighted`).
3. **Health Premium Invoicing Separation**:
   - Health premiums will be billed via `hw_premium_invoices`, not the existing generic `invoices` table or school fee ledgers.
   - Payments will be collected through Quasar via server-side invocation, credited to an isolated clearing reference, and never blended into `USER_WALLET` balances.
4. **Provider Sandbox Adapter**:
   - In the absence of live insurer API credentials, a fully functional sandbox provider adapter (`sandbox.adapter.ts`) will be implemented for non-production environments to demonstrate the complete lifecycle (enrolment submission, policy issuance, webhook activation, facility sync, and claim status lookup).

---

## 6. Phase 2 Readiness

Phase 1 design is complete. We are ready to begin **Phase 2 (Backend and Database Implementation)** upon your review and sign-off.
