# QUASAR–Invify Staging Build & Tenant API-Key Isolation

**Phase:** 2D — Investigation + controlled Invify-only remediation  
**Date:** 2026-10-31  
**Branch:** `feature/va-institution-provider-routing`  
**Baseline HEAD (pre-implementation tip):** `7b5bbcf674b5b8ac58605d6f2348983c14653502`  
**Prior UUID audit:** `docs/QUASAR_INVIFY_UUID_REMEDIATION_INDEPENDENT_AUDIT.md` (CONDITIONAL PASS)  
**QUASAR:** not modified (`de4c33aa8287d38b98938cee2feedbbd0e2c7c8c`)

**STOP:** Local implementation and verification only. No push, merge, deploy, migrations, or live VA creates.

---

## 1. Objective A — Stale build root cause

### What `dist-from-image/` is

| Attribute | Finding |
|---|---|
| Path | `invify-backend/dist-from-image/` |
| Approx. mtime | **2026-10-29** |
| Nature | Compiled JS/DTS/map tree (~2k files), also present in git history |
| Generation | **Not** `npm run build` on this feature tip. Historical **container `/app` extract** (same pattern as staging runbook: “extract `/app` from a pinned image digest”) |
| Consumption | Local comparison / older candidate reference. Official deploy path uses **`npm run build` → `dist/`** or a **fresh** pinned-image extract — **not** this folder |
| Sentinel | Still contains **7** `platform-admin-owner-id` hits in admin/customer/lead compiled controllers |

### Why the sentinel remains

UUID ownership remediation (`d83efe01`) updated **TypeScript under `src/`** only. `dist-from-image/` was **intentionally not overwritten** (prior HMO/staging work preserved it as a stale snapshot). It was never regenerated from remediations source, so compiled controllers still embed the old sentinel.

### Does staging/deployment use it?

| Path | Used for live staging? |
|---|---|
| `invify-backend/dist/` from `npm run build` | **Yes** — intended candidate (`docs/STAGING_DEPLOY_RUNBOOK.md`) |
| Fresh `_build_candidates/...` packs | **Yes** — used in recent HMO overlays |
| `invify-backend/dist-from-image/` | **No** — docs already mark it “do not deploy”; still a footgun if someone packs it by mistake |

### Preservation action (no overwrite of compiled tree)

- Left the existing `dist-from-image/**` JS/DTS **unchanged**.
- Added `invify-backend/dist-from-image/DO_NOT_DEPLOY.md` explaining provenance and the clean-build path.

---

## 2. Reproducible clean build

From `invify-backend` on this feature branch (or the approved SHA after commit):

```powershell
cd invify-backend
npm ci
if (Test-Path dist) { Remove-Item -Recurse -Force dist }
npm run build
# → invify-backend/dist/  (gitignored via **/dist/)
```

Verify VA outputs have no obsolete sentinel:

```powershell
Select-String -Path `
  dist\controllers\admin.controller.js,`
  dist\controllers\customer.controller.js,`
  dist\controllers\student.controller.js,`
  dist\modules\agent-portal\controllers\lead.controller.js,`
  dist\services\student.service.js `
  -Pattern 'platform-admin-owner-id'
# expect: no matches
```

### Verification performed this session

| Check | Result |
|---|---|
| `npm run build` (clean `dist/`) | **PASS** (exit 0) |
| Sentinel in clean VA controller outputs | **NONE** |
| `getQuasarServiceForTenantVa` present in clean dist VA controllers | **15** matches |
| `dist-from-image` sentinel count (unchanged archival) | **7** (expected stale) |

Promote **`dist/`** (or a dated copy under `_build_candidates/`), never `dist-from-image/`.

---

## 3. Objective B — API-key resolution

### Trace of `getQuasarService(tenantId)`

1. Optional `{ tenantIntegrationOnly: true }` → **only** `quasar_integrations` row for Invify tenant (decrypt SK); validate test/live vs build variant; **no** vault/env/demo.
2. Else (default):
   - Prefer `QuasarIntegrationStore` for tenant
   - May prefer tenant Integration Vault `apiKeySecret` when live upgrades a test key
   - If still empty → **`process.env.QUASAR_API_KEY` / `QUASER_API_KEY`** (silent platform/env fallback)
   - Else throw missing key

### Intended credential ownership after this phase

| Operation | Credential ownership | Mechanism |
|---|---|---|
| Staff VA | Tenant `quasar_integrations` | `getQuasarServiceForTenantVa(tenantId)` |
| Customer VA (happy path) | Tenant integration | `getQuasarServiceForTenantVa(tenantId)` |
| Admin tenant operating VA | Tenant integration | `getQuasarServiceForTenantVa(tenant.id)` |
| Admin student VA (offline + Supabase) | Tenant integration | `getQuasarServiceForTenantVa(...)` |
| Admin customer VA (offline + Supabase) | Tenant integration | `getQuasarServiceForTenantVa(...)` |
| Lead conversion VA | Tenant integration | `getQuasarServiceForTenantVa(tenant.id)` (non-blocking catch if missing) |
| Student / parent VA + recover | Tenant integration | `getQuasarServiceForTenantVa(...)` |
| Payments / POS / payouts | Tenant-first; **env fallback allowed** | default `getQuasarService(tenantId)` |

Missing tenant integration on VA paths → **`QUASAR_TENANT_INTEGRATION_MISSING`** (fail closed). Env platform keys are **not** used for VA mint/recover.

---

## 4. Changes made and files affected

| File | Change |
|---|---|
| `invify-backend/src/integrations/quasar/factory.ts` | Added `getQuasarServiceForTenantVa`; clarified docs for fail-closed vs default fallback |
| `invify-backend/src/controllers/admin.controller.ts` | All five admin VA creates → `getQuasarServiceForTenantVa` |
| `invify-backend/src/controllers/customer.controller.ts` | Customer + staff VA → fail-closed helper |
| `invify-backend/src/controllers/student.controller.ts` | Create + recover → fail-closed helper |
| `invify-backend/src/services/student.service.ts` | Student VA → fail-closed helper |
| `invify-backend/src/modules/agent-portal/controllers/lead.controller.ts` | Lead VA → fail-closed helper |
| `invify-backend/test/quasar/provision-va-key.test.ts` | Env-ignore + platform-fallback retention + source contracts |
| `invify-backend/test/va-institution-code.test.ts` | Assert VA paths use fail-closed helper |
| `invify-backend/dist-from-image/DO_NOT_DEPLOY.md` | Archival warning (compiled tree not overwritten) |
| `docs/QUASAR_INVIFY_STAGING_BUILD_AND_API_KEY_ISOLATION_REPORT.md` | This report |

Unrelated dirty files and SMTP hotfix: **untouched**. Quasar repo: **untouched**.

---

## 5. Test results (actual)

```text
npx jest test/va-institution-code.test.ts test/quasar/provision-va-key.test.ts --runInBand --no-coverage

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
Time:        42.521 s
```

Coverage intent:

- Tenant VA uses `quasar_integrations` SK only (`getQuasarServiceForTenantVa` / `tenantIntegrationOnly`).
- Missing integration **does not** call QuasarService even when `QUASAR_API_KEY` is set.
- Default `getQuasarService` **may** still use env (payment/platform-style ops).
- Source contracts: all VA create controllers/services use the fail-closed helper; payment service does not.

TypeScript build: **`npm run build` PASS**.

No virtual accounts created.

---

## 6. Remaining risks

1. **Staging process must load the new `dist/`** (or overlay compiled from this tip). Current remote candidate may still be older until approved deploy/restart.
2. **`dist-from-image/` remains stale** by design — operators must not pack it.
3. Tenants **without** `quasar_integrations` rows will fail VA create (including lead convert VA, which stays non-blocking). Provision merchant / issue live-or-test key before VA minting.
4. Default factory env fallback remains for payments/POS/payouts — intentional; not VA.
5. Work is **uncommitted** at report time (await approval).

---

## 7. Git status and HEAD SHA

**HEAD (commits tip, uncommitted Phase 2D edits on top):**  
`7b5bbcf674b5b8ac58605d6f2348983c14653502`

**Phase 2D modified / added (scoped):**

```text
 M invify-backend/src/controllers/admin.controller.ts
 M invify-backend/src/controllers/customer.controller.ts
 M invify-backend/src/controllers/student.controller.ts
 M invify-backend/src/integrations/quasar/factory.ts
 M invify-backend/src/modules/agent-portal/controllers/lead.controller.ts
 M invify-backend/src/services/student.service.ts
 M invify-backend/test/quasar/provision-va-key.test.ts
 M invify-backend/test/va-institution-code.test.ts
?? invify-backend/dist-from-image/DO_NOT_DEPLOY.md
?? docs/QUASAR_INVIFY_STAGING_BUILD_AND_API_KEY_ISOLATION_REPORT.md
```

Unrelated dirty/untracked worktree entries remain as before Phase 2D.

---

## 8. Verdict (local)

**CONDITIONAL PASS cleared for code/build:**

- Stale artifact explained and labeled; clean `dist/` verified sentinel-free for VA paths.
- Tenant VA API-key isolation fail-closed; platform/env fallback preserved only on non-VA default factory use.
- Tests + TypeScript build green.

**Still requires approval before:** commit, staging pack/overlay, process restart, or any live VA exercise.

---

**STOP. Awaiting approval.**
