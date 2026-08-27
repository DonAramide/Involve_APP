# PHASE 4 — Staging Acceptance Report

**Date:** 2026-08-15  
**Phase status:** **PARTIAL PASS — NOT COMPLETE** (external Quasar refund dependency + client interactive hostname binding remain)  
**Production traffic:** OFF  
**Live payment providers:** OFF  
**FEATURE_REAL_MONEY_PAYOUTS:** `false` (unchanged)  
**API image:** `invify:58b5e459-p4-fin2`  
**References:** `PHASE_4_AUTH_UAT_REPORT.md`, `PHASE_4_TENANT_ISOLATION_UAT_REPORT.md`, `PHASE_4_FINANCIAL_SANDBOX_UAT_REPORT.md`

---

## Safety posture (verified this run)

| Control | Value |
|---|---|
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` |
| `ENABLE_INPROCESS_FINANCIAL_WORKERS` | `false` |
| `QUASAR_BASE_URL` in staging container | **empty** |
| `BUILD_VARIANT` | `STAGING` |
| Production DB / credentials / traffic | **NOT USED** |
| Live money / real payouts | **DISABLED** |

---

## Part 1 — Quasar provider-confirmed refund SUCCESS

### Required configuration (staging)

| Variable | Purpose |
|---|---|
| `STAGING_QUASAR_BASE_URL` → compose `QUASAR_BASE_URL` | Approved **staging/sandbox** Quasar API base |
| `QUASAR_API_KEY` (or tenant-provisioned `sk_test_*`) | Sandbox secret key for payments/refunds client |
| `QUASAR_WEBHOOK_SIGNING_SECRET` | Already present for signed webhook UAT |

### Availability check

| Check | Result |
|---|---|
| `STAGING_QUASAR_BASE_URL` in staging secret plane | **NOT SET** (empty in `.env.staging.example` and host config) |
| Host `.env` `QUASAR_BASE_URL` | Points at `api-quasar.iips.app` — treated as **production Quasar**; **NOT used** |
| Host `QUASAR_API_KEY` looks like `sk_test_*` | **NO** |
| Staging compose injects Quasar URL | Empty by design |

**Action taken:** STOP subtest. Did **not** invent an endpoint, did **not** enable production Quasar, did **not** fake provider success.

### Verdict

```text
REFUND PROVIDER SUCCESS = BLOCKED BY EXTERNAL DEPENDENCY
```

Fail-closed refund path remains verified (HTTP **502**, no false SUCCESS) in financial sandbox UAT.

---

## Staging Environment

| Item | Value |
|---|---|
| Staging API | `http://127.0.0.1:3000` (Docker Compose) |
| Staging Supabase | `rpcjelhacmkhzguljdgi.supabase.co` |
| Dev Supabase | `iyqmqcohoduofotfjutm.supabase.co` (isolated) |
| Redis | Healthy, internal only |
| Replica count | **1** API container |

---

## Infrastructure

| Component | Status |
|---|---|
| Docker / Compose staging stack | Healthy |
| `/livez` `/readyz` `/health` | **200** |
| Idempotency DB constraint | Applied & verified (tenant-scoped `23505`) |

---

## Authentication

| Suite | Result |
|---|---|
| Phase 4 Auth UAT (`_p4_auth_rerun.txt`) | **18 PASS / 0 FAIL** |
| ES256/JWKS + JWT rejection + mock rejection | PASS (prior + rerun) |
| Offline/mock auth | Disabled |

---

## Authorization / Tenant Isolation

| Suite | Result |
|---|---|
| Phase 4 Tenant Isolation UAT (`_p4_tenant_rerun.txt`) | **79 PASS / 0 FAIL** |
| IDOR areas (users, tenant details, admin payments, admin ledger) | PASS |

---

## Financial Sandbox

| Suite | Result |
|---|---|
| Financial Sandbox UAT | **37 PASS / 0 FAIL** |
| Invoice / payment success & failure / idempotency / webhooks | PASS |
| Refund authz / over-amount / cross-tenant / fail-closed | PASS |
| Provider-confirmed refund SUCCESS | **BLOCKED BY EXTERNAL DEPENDENCY** |

---

## Admin Staging UAT

| Item | Result |
|---|---|
| Build | `vite build --mode staging` **PASS** |
| `VITE_BUILD_VARIANT` | `STAGING` |
| `VITE_APP_ENV` | `staging` |
| Embedded API base | `http://staging-api.invify.local:3000` (non-localhost hostname) |
| Localhost/LAN/ngrok/prod API base in runtime config | **not embedded** as API base |
| API authorization UAT (`_p4_admin_uat_results4.txt`) | **25 PASS / 0 FAIL** |
| Portal rejects tenant creds | PASS (403) |
| IDOR users / details / payments / ledger | PASS |
| Real-money withdraw | PASS (403) |
| Interactive browser against Docker without hosts alias | **LIMITED** — requires operator hosts entry for `staging-api.invify.local` |

**High (non-blocking for API authz):** Developer Portal example still contains `http://localhost:3001/webhooks/quasar` in docs snippet (`DeveloperPortalPage.vue`). Not used as API baseURL.

---

## Mobile Staging UAT

| Item | Result |
|---|---|
| Flutter web release build | **PASS** (`APP_ENV=staging`) |
| `API_BASE_URL` | `http://staging-api.invify.local:3000` |
| Staging Supabase host embedded | `rpcjelhacmkhzguljdgi` |
| Dev/prod API hosts | **absent** |
| `localhost` / `127.0.0.1` as API base URL | **absent** |
| Backend service-role / `sk_live_` | **absent** |
| Supabase **anon** JWT in client | Expected for mobile (not a backend secret) |
| Residual strings | Safety guards / error copy mentioning ngrok; UI placeholders `192.168.1.100` |
| Interactive device flows vs local Docker | **LIMITED** without hosts alias; API-level auth/finance/device isolation covered by Phase 4 suites |

---

## Workers

| Job | Result | Notes |
|---|---|---|
| In-process financial timers | **OFF** | Safe single-replica mitigation |
| Manual reconciliation (`POST /admin/reconciliation/run-job`) | **PASS** (200) | Quasar empty → controlled empty/fail path |
| Duplicate manual trigger | Executed | **No distributed lock** — documented limitation |
| Audit archive trigger | PASS (200) | |
| Settlement via Quasar connector | Dependency empty | Non-blocking for this gate |
| Worker UAT script | **12 PASS / 0 FAIL** | `_p4_worker_uat_results2.txt` |

**Production risk (documented):** enabling `ENABLE_INPROCESS_FINANCIAL_WORKERS=true` on multiple replicas can duplicate financial jobs. Keep disabled until durable workers/locks exist.

---

## Full Staging Smoke

| Area | Result |
|---|---|
| Infrastructure health | PASS |
| Authentication | PASS (18/0) |
| Tenant isolation | PASS (79/0) |
| Invoice / payment / failure / idempotency / webhook | PASS (financial 37/0) |
| Refund fail-closed | PASS |
| Ledger / audit (scoped) | PASS |
| Workers (safe config) | PASS w/ limitation documented |
| Admin API UAT + staging build | PASS |
| Mobile staging build + artifact scan | PASS (interactive limited) |
| Provider refund SUCCESS | **BLOCKED** |

---

## Security / Environment Regression

| Suite | Result |
|---|---|
| Phase 2 security lockdown + commission | **38 PASS / 0 FAIL** |
| Phase 3 environment/idempotency/health | **12 PASS / 0 FAIL** |
| Phase 4 auth UAT | **18 PASS / 0 FAIL** |
| Phase 4 tenant isolation UAT | **79 PASS / 0 FAIL** |
| Phase 4 financial sandbox UAT | **37 PASS / 0 FAIL** |
| Phase 4 tenant unit (`phase4.tenant.isolation.test.ts`) | **4 PASS / 0 FAIL** |
| `test/hardening.test.ts` | **6 FAIL / 2 PASS** — onboarding register mock/`supabase.from` undefined in unit harness (not part of prior 50/50 gate); track as High |

Combined prior gate suites (38+12) remain green. Live Phase 4 UAT suites remain green.

---

## Remaining findings

### Critical
1. **Provider-confirmed refund SUCCESS** blocked — no approved `STAGING_QUASAR_BASE_URL` / sandbox `sk_test_*` provisioning path configured. Do not use production Quasar.

### High
1. **No distributed lock** on reconciliation / in-process financial timers — single-replica + workers-off mitigates staging only.
2. **`hardening.test.ts` 6 failures** in local Jest harness (onboarding register path).
3. Admin Developer Portal **docs example** still shows `localhost:3001` webhook URL.
4. Client interactive UAT needs hosts (or public staging API hostname) for `staging-api.invify.local`.

### Medium
1. Mobile bundle retains ngrok **header/error-string** remnants (not API base).
2. TLS/FCM/vault warnings may still appear in logs depending on host env.

---

## External dependencies

| Dependency | Status |
|---|---|
| Approved staging/sandbox Quasar endpoint + `sk_test_*` | **MISSING** — blocks refund SUCCESS |
| Operator hosts / public staging API DNS for Admin/Mobile UI | **MISSING** for interactive local Docker UI |
| Durable worker lock infrastructure | **NOT IMPLEMENTED** (documented) |

---

## Gate checklist (Phase 4 COMPLETE?)

| Requirement | Status |
|---|---|
| Admin staging UAT passes | **PASS** (API 25/0 + staging build) |
| Mobile staging UAT passes | **PARTIAL** (build+scan PASS; interactive limited) |
| Worker staging validation | **PASS** with documented non-blocking lock limitation |
| Full staging smoke | **PASS** (provider refund SUCCESS excluded as blocked) |
| Critical security regressions green | **PASS** (38+12 + Phase 4 live UATs) |
| Refund SUCCESS verified **or** blocked by external dependency | **BLOCKED BY EXTERNAL DEPENDENCY** |

**Phase 4 overall: NOT COMPLETE / PARTIAL PASS**

---

## Recommendation

1. Obtain an **approved staging/sandbox Quasar base URL** + `sk_test_*` key; set only via `STAGING_QUASAR_BASE_URL` / staging secrets — never production Quasar.  
2. Re-run **one** provider-confirmed refund SUCCESS + duplicate refund protection.  
3. Bind `staging-api.invify.local` (or publish a staging API hostname) for Admin/Mobile interactive UAT.  
4. Keep `FEATURE_REAL_MONEY_PAYOUTS=false` and in-process financial workers **off**.  
5. Fix `hardening.test.ts` harness / onboarding register mock.  
6. Remove localhost webhook example from Admin Developer Portal docs.

**STOP.** Do not begin production infrastructure until explicit approval.

---

## Scoreboard (this continuation)

```text
Admin UAT:                 PASS (25/0 API) + staging build PASS
Mobile UAT:                PARTIAL PASS (build/scan PASS; interactive limited)
Worker validation:         PASS (12/0) with lock limitation documented
Full smoke:                PASS (provider refund SUCCESS blocked)
Regression:                Phase2 lockdown+commission 38/0; Phase3 12/0;
                           Auth 18/0; Tenant 79/0; Financial 37/0;
                           hardening.test.ts 6 FAIL (tracked)
Provider refund SUCCESS:   BLOCKED BY EXTERNAL DEPENDENCY
Phase 4 overall:           NOT COMPLETE / PARTIAL PASS
Critical remaining:        Approved staging Quasar for refund SUCCESS
High remaining:            Worker locks; hardening Jest; Admin localhost docs; hosts/DNS for UI
External dependencies:     Staging Quasar + client hostname/DNS
Recommendation:            Configure sandbox Quasar only after approval; STOP before production
```
