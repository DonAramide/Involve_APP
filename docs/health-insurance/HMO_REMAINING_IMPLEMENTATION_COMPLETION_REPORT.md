# HMO Remaining Implementation Completion Report

**Branch:** `feature/hmo-management-platform`  
**Date:** 2026-10-30  
**Scope:** Close genuine functional gaps after Provider Governance, without redeploying or applying migrations.

Related prior report: `HMO_PROVIDER_MANAGEMENT_IMPLEMENTATION_REPORT.md`

---

## 1. Modules inspected

| Module | Key locations | Verdict before this work |
|--------|---------------|--------------------------|
| Provider governance | `health-provider-governance.service.ts`, `/hmo/registry` | **COMPLETE** (local); migration unapplied |
| Institution HMO portal | `/api/agent/hmo/*`, `HmoInstitutionPortalView.vue` | **MOSTLY COMPLETE** — facilities, plans, batches, claim adjudicate, billing |
| Tenant health dashboard | `HealthInsuranceDashboardPage.vue`, `/api/v1/health-insurance/*` | **PARTIAL** — enrolment/billing/claims read; weak plan eligibility; no affiliation request |
| Catalogue / plans | `health-plan-governance`, `invify-catalogue`, `/hmo/plans`, `/hmo/catalogue` | **COMPLETE** for platform draft→publish→activate |
| Bank offerings | `BankHmoDistributionService`, `/api/agent/hmo-distribution/*`, bank agent UI | **COMPLETE** for banks; **missing** Super Admin oversight |
| Claims | `hw_claim_status_records`, HMO portal adjudicate; tenant list/lookup | **PARTIAL** — no tenant submit; approve/settle conflated; no history table |
| Finance / profit-sharing | `HealthFinanceService` + controller | **IMPLEMENTED but UNWIRED** in `register-routes.ts` |
| Super Admin workspace | `HmoWorkspacePage.vue` | **PARTIAL** — registry/plans/catalogue live; claims/reports weak |
| Notifications | `NotificationService` | **MISSING** for HMO workflows |

---

## 2. Existing functionality reused (not rebuilt)

- `hw_providers` / provider governance vertical slice  
- HMO portal claim list + adjudicate endpoint  
- Bank distribution activate/deactivate + enrolment bank gate  
- Plan catalogue draft/publish/activate/retire  
- `HealthFinanceService` KPI + agreement/statement/settlement logic  
- `NotificationService.sendToUser` / `sendToFleet`  
- Platform grant model (`platform.integration.health` for new read oversight)

---

## 3. Missing functionality discovered → changes implemented

### Institution / tenant
- **Enrolment eligibility:** `HealthEnrolmentService.assertPlanVersionEnrolable` — requires published version, active plan, verified provider, effective dates.  
- **Affiliation request:** `HealthAffiliationService` + `GET/POST /affiliations`, `GET /eligible-providers`; tenant UI on Plans tab. Institutions cannot create global providers.

### Catalogue
- No duplicate catalogue built. Enrolment now refuses inactive/expired/unpublished versions (gap closed in enrolment path).

### Bank offerings
- Super Admin read: `GET /platform/bank-offerings` + Reports table in HMO workspace.

### Claims
- Tenant submit + separate approve / reject / settle APIs.  
- Reject requires reason; settle only from `approved`.  
- Audit + soft notifications.  
- HMO portal adjudicate hardened to same transition rules.  
- History table **proposed** (`DO_NOT_APPLY_hw_claims_workflow.sql`).

### Finance
- Wired existing `HealthFinanceController` under `/platform/finance/*`.  
- Frontend clients + Reports “Profitability overview”.  
- Reads use `platform.integration.health` so they work with current grant CHECK.  
- Grant CHECK expansion for dedicated finance permissions **proposed**.  
- Settlement reconcile remains non-custodial; payouts/fee posting untouched.

### Super Admin coherence
- Claims section: aggregate oversight (no clinical inbox).  
- Reports: coverage + profitability + bank offerings.  
- Registry remains the single provider governance surface.

### Notifications
- `HealthNotificationService` wraps existing NotificationService.  
- Fired (soft-fail) on provider lifecycle, affiliation, enrolment create, claim transitions.

---

## 4. Database migration proposals (unapplied)

| File | Purpose |
|------|---------|
| `proposals/DO_NOT_APPLY_hw_provider_governance.sql` | `rejected` status + profile columns (prior) |
| `proposals/DO_NOT_APPLY_hw_claims_workflow.sql` | `hw_claim_status_events` append-only history |
| `proposals/DO_NOT_APPLY_hw_platform_finance_grants.sql` | Expand grant permission CHECK for finance maker-checker |

Do **not** apply to staging/production without change control.

---

## 5. API changes (summary)

**New / wired**

- `/platform/finance/overview|drilldown|hmo-performance|plan-profitability|trends|agreements|statements|settlements…`  
- `/platform/bank-offerings`  
- `/platform/claims-overview`  
- `POST /claims`, `POST /claims/:id/approve|reject|settle`, `GET /claims/:id/history`  
- `GET/POST /affiliations`, `GET /eligible-providers`  

**Behaviour changes**

- Enrolment blocked for non-enrolable plans/providers  
- HMO claim adjudicate: approve ≠ settle; reject reason required  

---

## 6. Frontend changes

- `healthInsuranceApi.js` — finance, bank offerings, claims lifecycle, affiliation  
- `HmoWorkspacePage.vue` — claims aggregates; reports profitability + bank offerings  
- `HealthInsuranceDashboardPage.vue` — affiliation request against verified providers  
- Provider management panel preserved  

---

## 7. Permission / RLS decisions

- New platform reads: `platform.integration.health` (works with current grant enum).  
- Finance maker-checker named permissions exist in profit-sharing RLS but cannot be granted until finance-grants proposal is applied.  
- Claim history RLS: no broad public policies; service role only.  
- Tenant affiliation limited to verified providers.  

---

## 8. Automated test results

| Suite | Result |
|-------|--------|
| `test/health-remaining-completion.test.ts` + `health-provider-governance.test.ts` | **20 passed** |
| `tests/hmo-workspace.test.ts` + `provider-lifecycle.test.ts` | **27 passed** |

External FCM not required for unit tests (notification soft-fail / mocked). Provider governance tests log FCM warnings when NotificationService initializes without credentials; primary mutations still succeed.

---

## 9. Status matrix

| Capability | Status |
|------------|--------|
| Global provider governance | **COMPLETE** (code); reject status **PROPOSED** |
| Institution–provider management | **COMPLETE** (affiliation + portal school links) |
| Plan / catalogue management | **COMPLETE** |
| Enrolment inactive-plan guard | **COMPLETE** |
| Bank offering management | **COMPLETE** (banks); Super Admin oversight **COMPLETE** (read) |
| Claims workflow | **PARTIALLY COMPLETE** — submit/approve/reject/settle/audit done; document vault & live insurer sync **BLOCKED**/out of scope; history table **PROPOSED** |
| Finance reporting / profit-sharing | **COMPLETE** (wired); dedicated finance grants **PROPOSED**; payouts **DISABLED** by design |
| Super Admin governance coherence | **COMPLETE** for implemented surfaces |
| Notifications | **PARTIALLY COMPLETE** — hooks added; delivery depends on FCM/tokens |
| Migrations applied | **BLOCKED** (policy) |
| Staging/prod deploy / UAT | **BLOCKED** (separate tasks) |

---

## 10. Outstanding blockers & next tasks

1. Apply governance + claims-history + finance-grants SQL under change control.  
2. UAT: affiliation approve path in HMO portal (`PATCH /schools/:tenantId`).  
3. UAT: claim submit → approve → settle without treating settle as payout.  
4. Configure FCM for real notification delivery.  
5. Deployment stabilisation remains a **separate** workstream.  

**Honest bottom line:** Implementation gaps that were blocking “HMO app complete” for institution affiliation, enrolment safety, claims lifecycle separation, finance route wiring, Super Admin oversight, and notification hooks are closed in code. Clinical claim documentation vaults, live insurer claim APIs, and real-money settlement remain intentionally out of scope / blocked.
