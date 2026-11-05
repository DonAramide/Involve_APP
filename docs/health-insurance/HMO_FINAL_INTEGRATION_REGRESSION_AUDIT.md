# HMO Final Integration & Regression Audit

**Branch:** `feature/hmo-management-platform`  
**Audit date:** 2026-10-30  
**Mode:** Read-only (no code fixes, no migrations, no deploy)  
**Source of claims audited:** `docs/health-insurance/HMO_REMAINING_IMPLEMENTATION_COMPLETION_REPORT.md` (not taken as proof)

---

## 1. Executive summary

The HMO codebase contains a coherent **backend vertical slice** for provider governance, enrolment eligibility, affiliation request, claims lifecycle services, bank oversight reads, and finance route mounting. Automated unit/route tests for these areas **pass**.

However, several **end-to-end workflows are not closed in the UI**, and two **authorization gaps** are material:

1. **Finance mutations** (agreements / statement approve / settlement reconcile) are mounted behind `platform.integration.health`, not the intended finance maker-checker permissions — so dedicated finance permissions are effectively bypassable today.
2. **Claim mutations** (submit / approve / reject / settle) are mounted behind `health.claims.read` only.
3. **HMO portal claim Reject** UI no longer supplies a rejection reason, so reject from that screen will fail against the hardened backend.
4. **Affiliation approve/reject** exists in the HMO portal API (`PATCH /api/agent/hmo/schools/:tenantId`) but the school-network UI has **no action controls**.
5. **Tenant claim submit / lifecycle** APIs exist in `healthInsuranceApi.js` but are **not wired** into the tenant dashboard UI.
6. Unapplied SQL leaves provider `rejected`, claim status history, and finance grant CHECKs in **dependency** states.

**Final readiness verdict:** **NOT READY for staging UAT as a complete product surface.** Ready for a **controlled UAT of verified backend paths** after the critical/high defects below are fixed and proposed migrations are scheduled.

---

## 2. Verified module inventory

| Module | Trace result | Verdict |
|--------|--------------|---------|
| Super Admin provider governance | Routes → `HealthProviderGovernanceService` → `HmoProviderManagementPanel` / API | **VERIFIED WITH DEPENDENCY** (`rejected` needs governance SQL) |
| Catalogue / plans | Platform plan + Invify catalogue routes + `/hmo/plans` `/hmo/catalogue` | **VERIFIED** |
| Enrolment eligibility | `assertPlanVersionEnrolable` in `createEnrolment` + unit tests | **VERIFIED** |
| Institution affiliation request | `HealthAffiliationService` + tenant Plans UI + API | **VERIFIED** (request side) |
| Affiliation HMO approval | Backend `updateSchoolOnboarding`; **no UI actions** | **PARTIALLY VERIFIED** |
| Claims service lifecycle | `HealthClaimService` submit/approve/reject/settle + tenant scope | **VERIFIED** (service/API) |
| Claims HMO portal UI | Approve/Reject buttons; no reason; no Settle | **FAILED** (UI vs backend contract) |
| Claims tenant UI | Clients present; no page calls | **PARTIALLY VERIFIED** |
| Bank offerings (agent) | `/api/agent/hmo-distribution/*` + bank workspace | **VERIFIED** |
| Bank offerings (Super Admin read) | `GET /platform/bank-offerings` + Reports table | **VERIFIED** |
| Finance service + routes | `HealthFinanceController` mounted under `/platform/finance/*` | **VERIFIED** (wiring) |
| Finance Super Admin UI | Overview cards only; no agreement/statement mutation UI | **PARTIALLY VERIFIED** |
| Finance permission model | Mutations use `platform.integration.health` | **FAILED** vs intended maker-checker |
| Notifications | `HealthNotificationService` hooks; soft-fail; FCM/env dependent | **PARTIALLY VERIFIED** |
| Tenant isolation (claims/enrolment queries) | `eq('tenant_id', ctx.tenantId)` on claim ops | **VERIFIED** (code review) |
| Global provider create blocked for institutions | No tenant `POST /providers`; platform-only create | **VERIFIED** |

---

## 3. Workflow-by-workflow results

### 1. Provider registration → approval → institution visibility
- **Backend:** Register → `pending_verification`; approve → `verified`; `GET /providers` filters `verified` only.  
- **Frontend:** Super Admin Registry panel wired.  
- **Verdict:** **VERIFIED**

### 2. Provider suspension → assignment restrictions
- **Backend:** Suspend → `suspended`; `assignTenantProvider` returns `409 PROVIDER_NOT_ASSIGNABLE` unless `verified`; enrolment eligibility also checks verified provider.  
- **Verdict:** **VERIFIED**

### 3. Institution affiliation request → HMO approval → linkage
- **Request:** `POST /affiliations` creates/updates `hw_hmo_school_links` as `pending_approval`; tenant UI present.  
- **Approval:** `PATCH /api/agent/hmo/schools/:tenantId` implemented; school cards are display-only (no Approve/Reject).  
- **Verdict:** **PARTIALLY VERIFIED** — request OK; approval path **UI missing** (API exists)

### 4. Plan draft → publication → activation → enrolment eligibility
- Platform plan governance routes present; enrolment asserts published version, active plan, verified provider, effective dates.  
- **Verdict:** **VERIFIED** (unit-tested eligibility; full UI publish path previously covered by catalogue/plan workspace)

### 5. Enrolment creation → notification hook
- Audit `enrolment.created` + `HealthNotificationService.notifyTenantAdmins` after insert.  
- Delivery depends on `users.role`/`tenant_id` shape and FCM.  
- **Verdict:** **PARTIALLY VERIFIED** (hook present; delivery **NOT TESTED** end-to-end)

### 6. Claim submission → approval → settlement
- **Service:** Transitions enforced (`settle` only from `approved`).  
- **Tenant UI:** submit/approve/settle **not used**.  
- **HMO portal UI:** Approve only; **no Settle button**.  
- **Verdict:** **PARTIALLY VERIFIED**

### 7. Claim rejection → mandatory reason
- **Service:** reject requires ≥5 char reason (tenant + HMO portal service).  
- **HMO portal UI:** `handleAdjudicateClaim(id, 'rejected')` sends `{ status }` only → will **400** after hardening.  
- **Verdict:** **FAILED** (UI/backend mismatch)

### 8. Claim history and audit retrieval
- Audit writes to `hw_audit_events` on transitions.  
- History reads `hw_claim_status_events` (unapplied) and soft-returns empty with note.  
- **Verdict:** **VERIFIED WITH DEPENDENCY**

### 9. Bank offering activation/deactivation → Super Admin oversight
- Agent activate/deactivate via existing distribution service (tested).  
- Super Admin list/read wired to Reports.  
- **Verdict:** **VERIFIED**

### 10. Finance overview → profitability → statements → settlement reporting
- Routes mounted; overview loadable from Reports.  
- Frontend has GET clients for agreements/statements/settlements; **no mutation UI**.  
- Mutations callable with integration grant (see security).  
- **Verdict:** **PARTIALLY VERIFIED**

### 11. Lifecycle events → notification service
- Hooks on provider transitions, affiliation request, enrolment create, claim transitions.  
- Soft-fail; unit runs show FCM init warnings when credentials absent.  
- **Verdict:** **PARTIALLY VERIFIED**

---

## 4. Security and financial-control findings

| Control | Finding | Severity |
|---------|---------|----------|
| Tenant A ↛ Tenant B claims | Claim load/update scoped by `tenant_id` | **Pass** (code) |
| Institution cannot create global providers | No tenant create route; portal updates own linked provider only | **Pass** |
| Only verified providers assignable | Assignment + affiliation + enrolment checks | **Pass** |
| Only eligible plans enrolable | `assertPlanVersionEnrolable` | **Pass** |
| Settle before approve blocked | Service transition map | **Pass** |
| Reject reason required | Service yes; HMO portal UI no | **Fail (UX)** |
| Finance permissions not bypassable | **Fail** — mutations behind `platform.integration.health` | **Critical** |
| Claims mutations least privilege | **Fail** — mutations behind `health.claims.read` | **High** |
| Bank offering permissions | Agent routes remain agent-authenticated distribution paths; platform is read-only oversight | **Pass** (as designed for oversight) |
| Audit on sensitive ops | Provider, claim, affiliation, enrolment audits present | **Pass** (code; platform audit sentinel tenant caveat remains) |
| No real-money payout / fee post via HMO finance | Reconcile is reference tracking; no payout enablement found in HMO finance controller | **Pass** |
| Dead client | `syncClaimStatus` → `/claims/sync` has **no route** | **Medium** |

---

## 5. Migration dependency matrix

### A. `proposals/DO_NOT_APPLY_hw_provider_governance.sql`
| Item | Detail |
|------|--------|
| Schema | Adds `rejected` to `integration_status` CHECK; optional description/contact_person/status_* columns; licence unique index |
| Affected | Provider reject path; richer profile fields |
| Before | Reject returns `503 PROVIDER_REJECTED_STATUS_UNAVAILABLE` / constraint failure; profile columns fall back |
| After | Reject persists; profile columns writable |
| Safe without apply? | **Yes** for register/approve/suspend/list; **No** for full reject UX |
| Rollback | Drop new CHECK/columns/indexes; restore prior CHECK |

### B. `proposals/DO_NOT_APPLY_hw_claims_workflow.sql`
| Item | Detail |
|------|--------|
| Schema | `hw_claim_status_events` + index + RLS enable |
| Affected | Claim history API / portal history inserts |
| Before | History insert soft-fails; GET history returns empty + note |
| After | Append-only history available |
| Safe without apply? | **Yes** for claim status transitions |
| Rollback | Drop table |

### C. `proposals/DO_NOT_APPLY_hw_platform_finance_grants.sql`
| Item | Detail |
|------|--------|
| Schema | Expand `hw_platform_grants.permission` CHECK to include finance maker-checker values |
| Affected | Ability to **issue** `platform.finance.*` grants via grant API |
| Before | Those permissions cannot be granted; profit-sharing RLS may reference them; **routes currently do not require them** |
| After | Grants can be issued; **still need route guards updated** to enforce them (not done) |
| Safe without apply? | **Yes** for current wiring; **does not fix** the integration.health bypass by itself |
| Rollback | Restore prior CHECK (ensure no rows use new permissions first) |

---

## 6. Test results (actual runs)

| Suite | Result |
|-------|--------|
| `health-remaining-completion.test.ts` + `health-provider-governance.test.ts` + `health-platform-visibility-routes.test.ts` + `health-institution-context.test.ts` | **4 suites, 33 passed** |
| `health-insurance.test.ts` + `hmo-institution-portal.test.ts` + `bank-hmo-distribution.test.ts` | **3 suites, 56 passed** |
| Admin `hmo-workspace.test.ts` + `provider-lifecycle.test.ts` | **2 suites, 27 passed** |

**Combined this audit:** **89 tests passed**, 0 failed in the suites above.

**NOT TESTED (integration):** live DB, FCM delivery, Contabo logo upload, staging PostgREST/RLS with real JWTs, full browser E2E.

Note: provider-governance tests emit FCM console warnings/errors when notification soft-path runs without service account; assertions still pass.

---

## 7. Critical and high-priority defects

### Critical
1. **Finance maker-checker bypass:** `/platform/finance/agreements` POST, agreement/statement approve, and settlement reconcile are guarded only by `platform.integration.health`. Intended `platform.finance.*` permissions are not enforced on routes.

### High
2. **HMO portal claim Reject broken:** UI posts `{ status: 'rejected' }` without `rejectionReason`; backend now requires reason.  
3. **Affiliation approval not operable in UI:** schools network is read-only; pending requests cannot be approved/rejected from the portal screen.  
4. **Claim mutations under `health.claims.read`:** any read-capable principal can mutate claim status via API.  
5. **Tenant claim lifecycle UI absent:** APIs unused; Super Admin claims page is aggregates only.

### Medium
6. `healthInsuranceApi.syncClaimStatus` points at non-existent `/claims/sync`.  
7. HMO portal claims UI lacks Settle action despite service supporting settle-from-approved.  
8. Notification tenant-admin resolution assumes `users.tenant_id` + role set; may miss admins depending on schema.  
9. Finance grant SQL alone does not restore maker-checker until routes change.

---

## 8. Remaining staging UAT requirements

1. Fix critical/high defects above (next implementation pass — **not** done in this audit).  
2. Apply or explicitly waive proposed SQL under change control.  
3. UAT scripts:
   - Register → approve → tenant list visibility  
   - Suspend → assignment/enrolment blocked  
   - Affiliation request → HMO approve (after UI fix) → enrol  
   - Claim submit → approve → settle (and reject with reason)  
   - Bank offering toggle → Super Admin oversight row  
   - Finance overview numbers vs source tables  
4. Confirm FCM/service account and notification inbox behaviour.  
5. Confirm no payout/fee-post flags enabled in target env.

---

## 9. Final implementation readiness verdict

| Question | Answer |
|----------|--------|
| Backend core logic largely present? | **Yes** |
| Automated regression green for targeted suites? | **Yes (89 passed)** |
| End-to-end product workflows consistent UI↔API? | **No** (affiliation approval, claim reject/settle UI, tenant claims UI, finance mutation UI) |
| Security model for finance/claims mutations acceptable for staging? | **No** (critical/high auth findings) |
| Migrations required for full feature set? | **Yes** (reject status, claim history; finance grants optional until route guards fixed) |

**Overall:** **CONDITIONAL — NOT STAGING-READY** until critical/high defects are remediated.  
Use verdict taxonomy for tracked items above: mix of **VERIFIED**, **VERIFIED WITH DEPENDENCY**, **PARTIALLY VERIFIED**, and **FAILED**.

This audit intentionally **fixed nothing**. Evidence should drive the next implementation decisions.
