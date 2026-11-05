# HMO & School Implementation — Commit & Test Report

**Date:** 2026-10-30  
**Branch:** `feature/hmo-management-platform`  
**Committed baseline:** `ddf7e192c447aafa8ecf861af31b27f9292286f4`  
**Parent HEAD:** `9773c0fa4e84b043b68d79ddb22e98d1a7e0a573`  
**Author message:** Add HMO provider governance, claims/finance auth remediation, and School ID-card ops materials.

**Restrictions observed:** Production untouched. No `DO_NOT_APPLY_*` migrations applied. No Nginx config edits. `FEATURE_REAL_MONEY_PAYOUTS` / `SCHOOL_ID_CARD_SQL` left unchanged. `dist-from-image/` not overwritten. Flutter APK not rebuilt.

---

## Staging readiness verdict

### STAGING DEPLOY COMPLETE (`ddf7e192`)

| Area | Status |
|------|--------|
| Approved commit | **Done** (`ddf7e192`) |
| Fresh backend + admin build | **Done** (not from `dist-from-image/`) |
| Admin static files | **Live** (`index-CAl0tQdQ.js`, sha256 `ddb8e5e4…`) |
| Backend process | **Restarted** 2026-10-30 14:32:47 CET (PID 305703) |
| Staging `/livez` `/readyz` (port 3004) | **200** / ready `STAGING` |
| Production `/livez` (port 3005) | **200** unchanged |
| `/api/school/id-cards` | **401** (auth enforced) |
| `/api/v1/health-insurance/platform/my-grant-status` | **401** (auth enforced) |
| Remediaton markers on disk | `health.claims.manage`, `platform.finance.manage`, governance service present |
| DB migrations | **Not applied** (separate approval) |
| Feature flags | `SCHOOL_ID_CARD_SQL` / real payouts unchanged |

**Release:** `20261030T1328Z-ddf7e192`  
**Archive:** `/srv/invify/releases/staging-20261030T1328Z-ddf7e192`

Operator restart completed successfully. No journal `Error:` / protected-flag refusal in the restart window.

---

## School ID-card contract failure — resolution

### Failed test (pre-fix)

`school ID cards › the replacement contract is one transaction and does not touch attendance or sessions`

### Root cause

**Implementation was correct; the static assertion was too broad.**

- `REPLACEMENT_SQL` in `school-card.transaction.ts` is a single `BEGIN`…`COMMIT` transaction that only touches `school_id_cards` and `school_gate_audit_events`.
- `replacementSqlTouchesAttendanceOrSessions(REPLACEMENT_SQL)` correctly returns `false` (no `attendance_records`, `student_attendance`, `school_entry_exit_sessions`, or `school_entry_exit_events`).
- Gate Clock `school-gate.scan.ts` **legitimately** inserts/updates/reads `school_entry_exit_sessions` for entry/exit scanning. That is required behaviour, covered by `school-gate-scan.test.ts`.
- The failing assertion scanned **all** `school-gate` sources except `school-card.transaction.ts`, so Gate Clock session SQL falsely failed the replacement contract.

### Behaviour verified (unchanged implementation)

| Guarantee | Result |
|-----------|--------|
| Replacement runs as one DB transaction | **Yes** (`BEGIN` … `COMMIT`) |
| Replacement does not update/delete attendance | **Yes** |
| Replacement does not modify Gate Clock sessions | **Yes** |
| Gate Clock scanning uses session operations | **Yes** (`school-gate.scan.ts`) |
| Student identity / card ownership association | **Preserved** (card rows + `replaces_card_id` revoke path) |
| Existing entry/exit history | **Preserved** (sessions not touched by replacement SQL) |

### Fix applied

**Changed file (only):** `invify-backend/test/school-id-cards.test.ts`

- Narrowed the static assertion to `REPLACEMENT_SQL` contents + `school-card.*.ts` modules (excluding the transaction helper that names forbidden tables in its checker).
- Explicitly asserts replacement SQL does not reference attendance or session tables, and does reference `school_id_cards` / `school_gate_audit_events`.
- Preserves bans on `AttendanceService`, `checkTenantPermission`, and `resolveTenantScope` in card modules.
- Leaves Gate Clock session coverage to `school-gate-scan.test.ts` (still green).
- **No production/source implementation changes.** Safety assertions were narrowed, not removed.

### Changed files summary

| File | Change |
|------|--------|
| `invify-backend/test/school-id-cards.test.ts` | Narrowed replacement contract assertion |
| `docs/health-insurance/HMO_AND_SCHOOL_IMPLEMENTATION_TEST_REPORT.md` | This report update |

Uncommitted fix remains local until an explicit commit is requested.

---

## 1. Commit verification (baseline)

| Check | Result |
|-------|--------|
| Files in commit `ddf7e192` | **2194** (`+129929 / −148`) |
| Unstaged preserved | `android/app/build.gradle.kts`; Flutter dashboard ID CARD merge (3 files) |
| Untracked left alone | `_build_candidates/`; prior regression report; test JSON artifact |
| `git add -A` | **Not used** |

---

## 2. Fresh deployment candidate (do not use dist-from-image)

| Item | Value |
|------|--------|
| Path | `_build_candidates/backend-from-source-ddf7e192` |
| Files | **2166** |
| `dist-from-image/` | **Not overwritten** (mtime still 2026-10-29) |

**Deploy instruction:** Rebuild from TypeScript at ship time; never promote `invify-backend/dist-from-image/` as the live candidate for this release.

---

## 3. Build results

| Build | Result |
|-------|--------|
| Backend `tsc --noEmit` | **PASS** (prior post-commit run; no source changes in this fix) |
| Backend fresh outDir candidate | **PASS** (prior; still valid — test-only fix) |
| Admin Vite production build | **PASS** (prior; no admin source changes) |

TypeScript / Vite were **not** re-run for this fix because only a Jest test file changed.

---

## 4. Regression verification (post-fix)

### Backend suites (this resolution run)

```text
PASS test/school-id-cards.test.ts
PASS test/school-gate-scan.test.ts
PASS test/health-auth-remediation.test.ts
PASS test/health-remaining-completion.test.ts
PASS test/health-provider-governance.test.ts
PASS test/health-platform-visibility-routes.test.ts
PASS test/health-insurance.test.ts
PASS test/health-institution-context.test.ts
PASS test/health-plan-draft.test.ts
PASS test/invify-catalogue-auth.test.ts
PASS test/invify-catalogue-routes.test.ts
PASS test/bank-hmo-distribution.test.ts
PASS test/hmo-institution-portal.test.ts
Test Suites: 13 passed, 13 total
Tests:       146 passed, 146 total
exit_code: 0
```

| Metric | Count |
|--------|------:|
| Suites passed | **13** |
| Suites failed | **0** |
| Tests passed | **146** |
| Tests failed | **0** |

### Admin suites (this resolution run)

```text
PASS tests/school-id-cards.test.ts
PASS tests/hmo-workspace.test.ts
PASS tests/provider-lifecycle.test.ts
Test Suites: 3 passed, 3 total
Tests:       31 passed, 31 total
exit_code: 0
```

---

## 5. Flutter results (scoped)

| Item | Result |
|------|--------|
| Dashboard single **ID CARD** tile merge | **Uncommitted** — excluded by design |
| `flutter analyze` on committed ID-card pages | **No issues found** (prior run) |
| Full Flutter suite | Not re-run in this resolution pass |

---

## 6. Integration workflow matrix

Legend: **U** = unit / static · **M** = mocked service/route integration · **DB/Browser** = live DB or UI E2E (not run here)

| # | Workflow | Evidence | Class | Verdict |
|---|----------|----------|-------|---------|
| 1 | Register HMO → approve → institution sees verified | `health-provider-governance` | M | **PASS (mocked)** |
| 2 | Suspend → assignments/enrolments blocked | governance + enrolment | M | **PASS (mocked)** |
| 3 | Affiliation request → HMO approve | affiliation + portal | M / code | **PASS (mocked)** |
| 4 | Publish plan → enrol | `health-plan-draft` | M | **PASS (mocked)** |
| 5 | Claim submit → approve → settle | claims + auth remediation | M | **PASS (mocked)** |
| 6 | Reject with mandatory reason | claim reject + portal UI | M / code | **PASS (mocked)** |
| 7 | Finance maker → checker approve | auth remediation | M | **PASS (mocked)** |
| 8 | Read-only finance cannot mutate | negative guards | U/M | **PASS** |
| 9 | Claims read cannot mutate | negative guards | U/M | **PASS** |
| 10 | School ID-card create → issue → retrieve | `school-id-cards` (all green) + admin Jest | M | **PASS** |
| 11 | Entry/exit associated with student | `school-gate-scan` | M | **PASS (mocked)** |
| 12 | Tenant A ↛ Tenant B | claim tenant scoping | M | **PASS (mocked)** |

**No live staging database or browser automation was executed.**

---

## 7. Remaining migration dependencies (still DO NOT APPLY without approval)

- `DO_NOT_APPLY_hw_platform_finance_grants.sql` — required to *insert* finance grants  
- `DO_NOT_APPLY_hw_claims_workflow.sql` — claim history table + `health.claims.manage` CHECK expand  
- `DO_NOT_APPLY_hw_provider_governance.sql` — provider `rejected` status  

School ID-card migration `20261026233000_school_id_cards_and_entry_exit.sql` is already in repo history; feature still gated by `SCHOOL_ID_CARD_SQL` env (do not enable without acceptance plan).

---

## 8. Security notes

- Finance profitability mutations are **not** behind `platform.integration.health` in committed source / fresh build.  
- Claim mutations require `health.claims.manage`.  
- Maker-checker self-approve blocked in service.  
- Settlement/reconcile remain non-payout.  
- Replacement contract still forbids attendance and session table writes in `REPLACEMENT_SQL` and `school-card.*` modules.

---

## 9. Working tree after resolution

```text
Baseline commit: ddf7e192…
Unstaged / local: android/app/build.gradle.kts; Flutter ID CARD dashboard merge (3 files);
                  invify-backend/test/school-id-cards.test.ts (contract fix);
                  docs/.../HMO_AND_SCHOOL_IMPLEMENTATION_TEST_REPORT.md (this file)
Untracked: _build_candidates/; prior regression report; test JSON artifact
```

---

*End of report. No deployment performed. Stop before deployment.*
