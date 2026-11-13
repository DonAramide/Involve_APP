# Invify HMO — Pre-Commit Integrity Review

**Review date:** 2026-10-30  
**Branch:** `feature/hmo-management-platform`  
**HEAD:** `9773c0fa4e84b043b68d79ddb22e98d1a7e0a573`  
**Reference:** `docs/health-insurance/HMO_CRITICAL_REMEDIATION_AND_STAGING_READINESS.md`  
**Mode:** Read-only integrity review — **no commit, push, deploy, migration apply, or service restart**

---

## Verdict

### SAFE TO COMMIT — WITH CURATED FILE SET

Critical remediation + related HMO platform WIP are present and security wiring checks out.  
**Do not** `git add -A`. Exclude the unrelated / artifactual paths listed in §4.

Index is empty (`git diff --cached` empty). Nothing is staged yet.

---

## 1. Git inspection

| Command | Result |
|---------|--------|
| `git rev-parse --abbrev-ref HEAD` | `feature/hmo-management-platform` |
| `git rev-parse HEAD` | `9773c0fa4e84b043b68d79ddb22e98d1a7e0a573` |
| `git status --short` | 21 modified + many untracked (see inventory) |
| `git diff --stat` | 21 files, **+2227 / −149** |
| `git diff --check` | **Clean** (LF/CRLF warnings only; no conflict markers / whitespace errors reported) |
| `git diff --cached` | **Empty** (nothing staged) |

---

## 2. Complete changed-file inventory

### Modified (tracked)

| Path | Role |
|------|------|
| `android/gradle.properties` | **UNRELATED** — local Gradle caching toggle |
| `invify-admin/src/api/healthInsuranceApi.js` | Remediation — claims clients; `syncClaimStatus` removed |
| `invify-admin/src/domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue` | Remediation — tenant claims UI |
| `invify-admin/src/layouts/MainLayout.vue` | HMO nav copy (Registry / Provider Network) |
| `invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue` | Remediation — finance grant permission options |
| `invify-admin/src/pages/agent/components/HmoInstitutionPortalView.vue` | Remediation — reject/settle + school approve/reject |
| `invify-admin/src/pages/hmo/HmoWorkspacePage.vue` | HMO workspace WIP (registry/finance surfaces) |
| `invify-admin/tests/hmo-workspace.test.ts` | HMO admin tests |
| `invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts` | HMO platform controller expansions |
| `invify-backend/src/modules/health-insurance/controllers/health.controller.ts` | Claims mutation/history controllers |
| `invify-backend/src/modules/health-insurance/register-routes.ts` | **Critical** finance + claims permission split |
| `invify-backend/src/modules/health-insurance/services/health-claim.service.ts` | Claims lifecycle + tenant scope |
| `invify-backend/src/modules/health-insurance/services/health-enrolment.service.ts` | Enrolment eligibility / related HMO |
| `invify-backend/src/modules/health-insurance/services/health-institution-context.ts` | Institution context helpers |
| `invify-backend/src/modules/health-insurance/services/health-plan.service.ts` | Minor plan service change |
| `invify-backend/src/modules/health-insurance/services/health-platform.service.ts` | Grant allow-list + platform APIs |
| `invify-backend/src/modules/health-insurance/services/hmo-portal.service.ts` | HMO portal claim/school flows |
| `invify-backend/src/modules/health-insurance/types/index.ts` | `health.claims.manage` + grantable finance perms |
| `invify-backend/test/health-institution-context.test.ts` | Tests |
| `invify-backend/test/health-insurance.test.ts` | Tests |
| `invify-backend/test/health-platform-visibility-routes.test.ts` | Tests |

### Untracked — include in HMO commit scope

| Path | Role |
|------|------|
| `docs/health-insurance/HMO_CRITICAL_REMEDIATION_AND_STAGING_READINESS.md` | Remediation readiness report |
| `docs/health-insurance/HMO_FINAL_INTEGRATION_REGRESSION_AUDIT.md` | Audit reference |
| `docs/health-insurance/HMO_PROVIDER_MANAGEMENT_IMPLEMENTATION_REPORT.md` | Provider governance report |
| `docs/health-insurance/HMO_REMAINING_IMPLEMENTATION_COMPLETION_REPORT.md` | Prior completion report |
| `docs/health-insurance/HMO_PRE_COMMIT_REVIEW.md` | This review |
| `invify-backend/proposals/DO_NOT_APPLY_hw_claims_workflow.sql` | Proposed only — not applied |
| `invify-backend/proposals/DO_NOT_APPLY_hw_platform_finance_grants.sql` | Proposed only — not applied |
| `invify-backend/proposals/DO_NOT_APPLY_hw_provider_governance.sql` | Proposed only — not applied |
| `invify-backend/src/modules/health-insurance/services/health-affiliation.service.ts` | Affiliation service |
| `invify-backend/src/modules/health-insurance/services/health-notification.service.ts` | Notification soft-fail / recipients |
| `invify-backend/src/modules/health-insurance/services/health-provider-governance.service.ts` | **Provider governance preserved** |
| `invify-admin/src/hmo/providerLifecycle.js` | **Provider governance preserved** |
| `invify-admin/src/pages/hmo/HmoProviderManagementPanel.vue` | **Provider governance preserved** |
| `invify-admin/tests/provider-lifecycle.test.ts` | Provider lifecycle tests |
| `invify-backend/test/health-auth-remediation.test.ts` | Auth remediation tests |
| `invify-backend/test/health-provider-governance.test.ts` | Governance tests |
| `invify-backend/test/health-remaining-completion.test.ts` | Completion / route permission tests |

### Untracked — exclude from this commit

| Path | Reason |
|------|--------|
| `android/gradle.properties` (also modified) | Unrelated local Android Gradle setting (`caching=true` → `false`) |
| `docs/school/20261029_school_id_cards_ACCEPTANCE_TEST_PLAN.md` | School ID-card WIP — not HMO remediation |
| `docs/school/20261029_school_id_cards_full_definition_check.sql` | School ID-card WIP — not HMO remediation |
| `docs/STAGING_DEPLOY_RUNBOOK.md` | Separate ops runbook; not part of critical remediation code |
| `invify-backend/dist-from-image/` | Build/image artifact directory — must not commit |
| `invify-backend/test-health-profit-sharing-agreements-staging.json` | Test-run artifact from maker-checker unit test — must not commit |

---

## 3. Scope verification

| Required item | Present? | Evidence |
|---------------|----------|----------|
| Finance permission remediation | **Yes** | `register-routes.ts` uses `platform.finance.*` / approve / reconcile; grant UI + `PLATFORM_GRANTABLE_PERMISSIONS` |
| Claims permission separation | **Yes** | Reads → `health.claims.read`; mutations → `health.claims.manage` |
| HMO claims reject + settle UI | **Yes** | `HmoInstitutionPortalView.vue` — `rejectionReason` dialog; “Mark Settled” |
| School affiliation approve/reject UI | **Yes** | `handleSchoolOnboarding` → `PATCH /api/agent/hmo/schools/:tenantId` |
| Tenant claims UI | **Yes** | `HealthInsuranceDashboardPage.vue` submit/list/detail/history; no HMO adjudication |
| Notification recipient correction | **Yes** | `health-notification.service.ts` (untracked new file) |
| Unsupported claims sync client removed | **Yes** | `syncClaimStatus` absent; `lookupClaimStatus` → `GET /claims/:reference` |
| Provider governance not lost | **Yes** | `health-provider-governance.service.ts`, `HmoProviderManagementPanel.vue`, `providerLifecycle.js`, governance tests/SQL proposal all present |
| Unrelated WIP accidentally included if `git add -A` | **Risk** | Android Gradle, school ID-card docs, `dist-from-image/`, test JSON, staging runbook |

---

## 4. Unrelated WIP identified and excluded

Recommend **excluding** from any authorised HMO commit:

1. `android/gradle.properties`
2. `docs/school/**` (ID-card materials)
3. `docs/STAGING_DEPLOY_RUNBOOK.md`
4. `invify-backend/dist-from-image/**`
5. `invify-backend/test-health-profit-sharing-agreements-staging.json`

Everything else in §2 (modified HMO paths + untracked HMO docs/services/tests/proposals) is in-scope for an HMO platform / remediation commit, subject to commit-message scope choice (single large HMO commit vs split PRs).

---

## 5. Security verification

| Control | Result | Notes |
|---------|--------|-------|
| `platform.integration.health` cannot authorize finance **profitability** mutations | **PASS** | Mutations use `platform.finance.manage`, `platform.agreements.approve`, `platform.statements.approve`, `platform.finance.reconcile` only |
| `platform.integration.health` cannot authorize finance profitability **reads** | **PASS** | Overview/agreements/statements/settlements lists use `platform.finance.view` |
| Premium cash snapshot still on integration.health | **Expected** | `/platform/finance` and `/platform/finance-command` remain non profit-sharing |
| `health.claims.read` cannot authorize claim mutations | **PASS** | POST submit/approve/reject/settle require `health.claims.manage` |
| Maker-checker still enforced | **PASS** | `HealthFinanceService.approveAgreement` / `approveStatement` reject same maker/checker identity/email |
| No payout / fee-posting enabled | **PASS** | Reconcile updates JSON settlement status + audit only; claim settle is administrative status; no payout/fee route wired by this work |
| Tenant isolation on claims | **PASS** | `listClaims`, submit validation, `requireTenantClaim`, and updates all `.eq('tenant_id', ctx.tenantId)` |

Route evidence (current working tree):

```text
POST /platform/finance/agreements          → platform.finance.manage
POST /platform/finance/agreements/:id/approve → platform.agreements.approve
POST /platform/finance/statements/:id/approve → platform.statements.approve
POST /platform/finance/settlements/:id/reconcile → platform.finance.reconcile
POST /claims* mutations                    → health.claims.manage
```

---

## 6. Test / build evidence

**Not re-run during this pre-commit review.** Counts below are as recorded in `HMO_CRITICAL_REMEDIATION_AND_STAGING_READINESS.md` from the prior remediation session:

| Check | Recorded result |
|-------|-----------------|
| Backend HMO (9 suites aggregate) | **106 passed**, 0 failed |
| Admin HMO (`provider-lifecycle` + `hmo-workspace`) | **27 passed**, 0 failed |
| Backend TypeScript (`tsc --noEmit`) | **Passed** |
| Admin Vite build | **Passed** (`✓ built in 1m 51s`) |

If a commit is authorised later, re-running the same suites before push is recommended but was **not** required for this review’s “confirm recorded results” clause.

---

## 7. Deployment safety

| Action | Occurred during remediation or this review? |
|--------|-----------------------------------------------|
| SQL migration applied | **No** — proposals remain `DO_NOT_APPLY_*` |
| Staging deployment | **No** |
| Production deployment / resource change | **No** |
| Service restart | **No** |
| Nginx configuration change | **No** |

Remaining migration **dependencies** (still unapplied by design):

- `DO_NOT_APPLY_hw_platform_finance_grants.sql` — needed to *insert* finance grants (routes already enforce)
- `DO_NOT_APPLY_hw_claims_workflow.sql` — claim history table + optional `health.claims.manage` CHECK
- `DO_NOT_APPLY_hw_provider_governance.sql` — provider `rejected` status support

---

## 8. Commit readiness recommendation

| Question | Answer |
|----------|--------|
| Is the working tree safe to commit? | **Yes, if curated** — include HMO remediation + preserved provider-governance WIP; exclude §4 paths |
| Is `git add -A` safe? | **No** |
| Is anything staged? | **No** |
| Should commit/push happen now? | **Only after explicit user approval** (this review does not authorise it) |

Suggested staging approach when approved:

```text
# Include HMO docs, proposals, admin/backend HMO sources & tests
# Explicitly omit: android/gradle.properties, docs/school/*,
# docs/STAGING_DEPLOY_RUNBOOK.md, dist-from-image/, test-*.json
```

---

*End of pre-commit review. No commit, push, deploy, or migration was performed.*
