# Invify HMO — Critical Remediation & Staging Readiness

**Branch:** `feature/hmo-management-platform`  
**HEAD commit (last pushed/committed on branch):** `9773c0fa4e84b043b68d79ddb22e98d1a7e0a573`  
**Remediation status:** Implemented in the **local working tree** (not committed; no push).  
**Report date:** 2026-10-30  
**Mode:** No staging deploy, no migration apply, no Nginx/production changes, no real payouts.

---

## Final verdict

### CONDITIONAL — BLOCKED BY LISTED ITEMS

Critical and High **authorization / workflow defects from the audit are closed in code**. Staging deployment is blocked only by operational prerequisites below (uncommitted candidate, unapplied grant/CHECK migrations needed to *issue* finance permissions, and controlled schema dependencies).

Do **not** treat this as READY until the blockers section is cleared under an approved deploy window.

---

## 1. Security findings closed

| Audit finding | Severity | Remediation | Status |
|---------------|----------|-------------|--------|
| Finance mutations behind `platform.integration.health` | Critical | Route guards now require `platform.finance.view` / `manage` / `agreements.approve` / `statements.approve` / `finance.reconcile` | **CLOSED** |
| Claims mutations behind `health.claims.read` | High | Mutations require `health.claims.manage`; reads keep `health.claims.read` | **CLOSED** |
| Maker-checker bypass via shared integration grant | Critical | Separate approve permissions + existing service four-eyes checks | **CLOSED** |
| Settlement reconcile initiates payout / fee post | Critical (control) | Reconcile remains JSON status + audit only; no payout/fee APIs | **CLOSED** (verified) |
| HMO portal Reject without `rejectionReason` | High (UX/contract) | Dialog collects reason; sent as `rejectionReason` | **CLOSED** |
| HMO portal no Settle action | High | Settle control for `approved` claims (admin tracking only) | **CLOSED** |
| School network no Approve/Reject UI | High | Uses `PATCH /api/agent/hmo/schools/:tenantId` with reason on reject | **CLOSED** |
| Tenant claims APIs unwired | High | Tenant dashboard: submit, list, detail, history; **no** HMO adjudication | **CLOSED** |

---

## 2. What changed (working tree)

### Backend
- `register-routes.ts` — finance + claims permission split
- `types/index.ts` — `health.claims.manage` + `PLATFORM_GRANTABLE_PERMISSIONS`
- `health-platform.service.ts` — grant allow-list includes finance maker-checker perms
- `health-notification.service.ts` — recipient roles aligned to `users.role`; soft-fail never rethrows
- `proposals/DO_NOT_APPLY_hw_platform_finance_grants.sql` — comment corrected (routes already enforce finance perms)
- `proposals/DO_NOT_APPLY_hw_claims_workflow.sql` — adds proposed `health.claims.manage` to tenant grant CHECK
- `test/health-auth-remediation.test.ts` — positive/negative auth + maker-checker + history soft-fail
- `test/health-remaining-completion.test.ts` — asserts new permission wiring

### Frontend
- `HmoInstitutionPortalView.vue` — claim reject reason, settle, school approve/reject
- `HealthInsuranceDashboardPage.vue` — tenant claims submit/list/detail/history
- `healthInsuranceApi.js` — removed unsupported `syncClaimStatus` (`/claims/sync`); added `lookupClaimStatus`
- `HealthInsuranceGovernancePage.vue` — finance permissions selectable for grants (insert still needs DB CHECK migration)

---

## 3. Phase 1 — Authorization model (enforced)

### Finance (platform)
| Operation | Permission |
|-----------|------------|
| Overview / drilldown / trends / list agreements & statements & settlements | `platform.finance.view` |
| Create agreement / generate statement | `platform.finance.manage` |
| Approve agreement | `platform.agreements.approve` |
| Approve statement | `platform.statements.approve` |
| Reconcile settlement | `platform.finance.reconcile` |

Notes:
- `platform.integration.health` **no longer** authorizes finance profitability mutations or reads.
- Premium cash snapshot `/platform/finance` and `/platform/finance-command` remain on `platform.integration.health` (non profit-sharing).
- Maker cannot approve own agreement/statement (service-level).
- Reconcile records external reference only — **does not** call payout or fee posting.

### Claims (tenant)
| Operation | Permission |
|-----------|------------|
| List / history / lookup | `health.claims.read` |
| Submit / approve / reject / settle | `health.claims.manage` |

Notes:
- `owner` / `tenant_admin` auto-receive manage via guard (no DB row required).
- Explicit grants of `health.claims.manage` to non-admins need proposed CHECK expansion (`DO_NOT_APPLY_hw_claims_workflow.sql`).
- All claim load/update paths continue to scope by `ctx.tenantId`.

---

## 4. Phase 2 — UI remediation

### HMO portal claims
- Reject prompts for reason (≥5 chars) → `rejectionReason`
- Settle available only when status is `approved`
- Server invalid-transition messages surfaced in notify

### HMO school network
- Approve / Reject for pending affiliation
- Reject requires reason
- Refresh schools + overview after success
- Backend already gated by `hmo.schools.manage`

### Tenant claims dashboard
- Submit claim / pre-auth
- List + status badges
- Detail dialog + history (explicit note when history table absent)
- **No** approve / reject / settle for school users

---

## 5. Phase 3 — Medium corrections

| Item | Result |
|------|--------|
| `syncClaimStatus` / `/claims/sync` | Removed from client; use `GET /claims/:reference` via `lookupClaimStatus` |
| Notification recipients | Query `users` by `tenant_id` + roles `owner`, `admin`, `tenant_admin`, `finance_staff`, `school_admin` |
| Notification failures | Soft-fail only; cannot roll back claim/finance mutations |
| Claim history without table | Returns `{ events: [], note: '…DO_NOT_APPLY_hw_claims_workflow.sql…' }` |

---

## 6. Phase 4 — Migration compatibility (NOT applied)

| Proposal | Safe without apply? | Controlled behaviour if missing |
|----------|---------------------|----------------------------------|
| `DO_NOT_APPLY_hw_provider_governance.sql` | Yes for verify/suspend/pending paths | `rejected` status insert/transition blocked by CHECK until applied |
| `DO_NOT_APPLY_hw_claims_workflow.sql` | Yes for submit/approve/reject/settle on `hw_claim_status_records` | History empty + note; optional `health.claims.manage` grant inserts blocked until CHECK expanded |
| `DO_NOT_APPLY_hw_platform_finance_grants.sql` | Routes enforce finance perms **without** it | Operators cannot insert finance grants → finance profitability APIs **403** until migration + dual-admin grant issue |

**Do not apply these migrations in this task.** Schedule under an approved change window.

---

## 7. Phase 5 — Regression & security verification (actual results)

### Backend HMO suites (this session)

| Suite | Result |
|-------|--------|
| `health-auth-remediation.test.ts` | PASS (20 tests) |
| `health-remaining-completion.test.ts` | PASS |
| `health-provider-governance.test.ts` | PASS |
| `health-platform-visibility-routes.test.ts` | PASS |
| `health-insurance.test.ts` | PASS |
| `health-institution-context.test.ts` | PASS |
| `health-plan-draft.test.ts` | PASS |
| `invify-catalogue-auth.test.ts` | PASS |
| `invify-catalogue-routes.test.ts` | PASS |

**Single aggregate run (9 suites):** **106 passed, 0 failed**  
(`health-auth-remediation`, `health-remaining-completion`, `health-provider-governance`, `health-platform-visibility-routes`, `health-insurance`, `health-institution-context`, `health-plan-draft`, `invify-catalogue-auth`, `invify-catalogue-routes`)

Auth tests include real `requireHealthPermission` positive/negative assertions (integration.health does **not** satisfy finance.*; claims.read does **not** satisfy claims.manage). Guards were not mocked away.

### Admin HMO suites

| Suite | Result |
|-------|--------|
| `tests/provider-lifecycle.test.ts` | PASS (4) |
| `tests/hmo-workspace.test.ts` | PASS (23) |
| **Total** | **27 passed / 2 suites** |

### Builds
| Check | Result |
|-------|--------|
| Backend `tsc --noEmit` | **PASS** (exit 0) |
| Frontend `vite build` (`invify-admin`) | **PASS** (`✓ built in 1m 51s`) |

---

## 8. Phase 6 — Staging deployment preparation

### Exact identifiers
- **Branch:** `feature/hmo-management-platform`
- **Committed HEAD:** `9773c0fa4e84b043b68d79ddb22e98d1a7e0a573`
- **Deploy candidate:** HEAD **plus uncommitted remediation files** listed in §2 (requires explicit commit approval before ship)

### Database migration dependencies
- Existing applied HMO foundation / RLS / portal migrations (already on target envs per prior work)
- **Not** required to boot: three `DO_NOT_APPLY_*` proposals above
- **Required for finance grant issuance:** `DO_NOT_APPLY_hw_platform_finance_grants.sql` (after approval)
- **Required for claim history persistence / explicit claims.manage grants:** `DO_NOT_APPLY_hw_claims_workflow.sql` (after approval)
- **Required for provider `rejected`:** `DO_NOT_APPLY_hw_provider_governance.sql` (after approval)

### Required permissions / grants (post-migration)
Issue via dual-admin grant UI (no self-grant):
- Finance readers: `platform.finance.view`
- Finance makers: `platform.finance.manage`
- Independent checkers: `platform.agreements.approve`, `platform.statements.approve`
- Reconcilers: `platform.finance.reconcile`
- HMO portal: existing `hmo.*` institution permissions
- Tenant claim mutators: owner/tenant_admin (auto) or explicit `health.claims.manage` after CHECK expand

### Environment variables
- Existing Supabase / JWT / FCM vars for health module
- FCM optional: notification soft-fails if absent
- No new secrets introduced by this remediation
- **SCHOOL_ID_CARD / real payout / fee posting remain off** for this candidate

### Rollback plan
1. Do not apply any of the three `DO_NOT_APPLY_*` SQL files in a failed window (already unapplied).
2. Revert deploy artifact to previous known-good backend/admin images for this branch’s prior commit.
3. Finance JSON staging files (agreements/statements/settlements) are non-custodial tracking only; restore from backup if mutated during UAT.
4. No Nginx or production config changes were made; none to roll back.

---

## 9. Remaining blockers (must clear before READY)

1. **Commit + review approval** of working-tree remediation (no commit/push performed in this task).
2. **Approved apply** of `DO_NOT_APPLY_hw_platform_finance_grants.sql` **or** an equivalent CHECK change before finance profitability UAT (otherwise dedicated finance grants cannot be inserted → expected 403).
3. **Issue dual-admin finance grants** to designated makers/checkers (never the same principal for create+approve).
4. Optional for full claim history UX: apply `DO_NOT_APPLY_hw_claims_workflow.sql`.
5. Optional for provider reject status: apply `DO_NOT_APPLY_hw_provider_governance.sql`.
6. Staging deploy/restart still **out of scope** until operators authorize.

---

## 10. Security findings still open?

- **None of the audit Critical/High auth or workflow defects remain open in code.**
- Residual **operational** risk: finance endpoints correctly deny until grants exist — this is intentional least-privilege, not a bypass.

---

*End of readiness report. Verdict: **CONDITIONAL — BLOCKED BY LISTED ITEMS**.*
