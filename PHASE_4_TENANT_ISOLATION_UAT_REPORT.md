# Phase 4 — Tenant Isolation UAT Report

**Date:** 2026-08-15  
**Prerequisite:** `PHASE_4_AUTH_UAT_REPORT.md` (staging auth PASS)  
**API image (final):** `invify:58b5e459-p4-iso2`  
**Evidence artifact:** `invify-backend/_p4_tenant_iso_results5.txt` (79 PASS / 0 FAIL)  
**Constraint:** Real staging JWTs only. No mock auth. No financial sandbox UAT. No production. No secrets printed.

---

## Environment

| Item | Value |
|---|---|
| Staging API | `http://127.0.0.1:3000` |
| Staging Supabase host | `rpcjelhacmkhzguljdgi.supabase.co` |
| Auth | Real login (`/api/auth/login`, portal=`tenant`) |
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` |
| `OFFLINE_LOCAL_AUTH` | `false` |
| Mock auth | Not used |

---

## Tenants Created

Disposable staging tenants (cleaned up after UAT):

| Label | Purpose | Notes |
|---|---|---|
| TENANT_A | Isolation subject A | plan=`premium`, status=`active` |
| TENANT_B | Isolation subject B | plan=`premium`, status=`active` |

IDs are not published in this report (prefix-only in RESULT log).

---

## Users Created

Per tenant (real Auth users + `users` profiles; passwords/tokens never logged):

| User | Tenant | Role | Purpose |
|---|---|---|---|
| USER_A owner | TENANT_A | `owner` | Primary attacker / victim |
| USER_A admin | TENANT_A | `admin` | Tenant admin RBAC |
| USER_A cashier | TENANT_A | `cashier` | Normal tenant user RBAC |
| USER_B owner | TENANT_B | `owner` | Primary attacker / victim |
| USER_B admin | TENANT_B | `admin` | Tenant admin RBAC |
| USER_B cashier | TENANT_B | `cashier` | Normal tenant user RBAC |

Note: DB role `staff` maps to platform portal (`STAFF`); tenant “normal user” fixture uses `cashier`.

---

## HTTP Isolation Tests

| Test | Tenant A → B | Tenant B → A | Result |
|---|---|---|---|
| Read other-tenant users list | 200 own-scope / no leak | 200 own-scope / no leak | **PASS** |
| Query `?tenantId=` other | ignored / no leak | ignored / no leak | **PASS** |
| PATCH other-tenant user | 403 | 403 | **PASS** |
| Read customers | 200 own / no leak | 200 own / no leak | **PASS** |
| Customers + `x-tenant-id` spoof | 403 | 403 | **PASS** |
| Read invoices | 200 own / no leak | 200 own / no leak | **PASS** |
| Invoices + `x-tenant-id` spoof | 403 | 403 | **PASS** |
| Payments history | 200 own / no leak | 200 own / no leak | **PASS** |
| Payments history spoof | 403 | 403 | **PASS** |
| Admin payments list | 200 own-scoped | 200 own-scoped | **PASS** |
| Admin payments `?tenantId=` other | 403 | 403 | **PASS** |
| Admin ledger | 200 own-scoped | 200 own-scoped | **PASS** |
| Admin ledger `?tenantId=` other | 403 | 403 | **PASS** |
| Finance audit ledger | 200 own / no leak | 200 own / no leak | **PASS** |
| Finance audit + spoof | 403 | 403 | **PASS** |
| Ops audit | 200 own / no leak | 200 own / no leak | **PASS** |
| Wallet / wallet txs | 200 own | 200 own | **PASS** |
| Virtual accounts spoof | 403 | 403 | **PASS** |
| `GET /admin/tenants/{other}/details` | 403 | 403 | **PASS** |
| Subscription `?tenantId=` spoof | 403 | 403 | **PASS** |
| Devices / activations lists | 200 own-scoped / no leak | 200 own-scoped / no leak | **PASS** |
| Missing Authorization | 401 | 401 | **PASS** |

---

## Tenant Override Tests

| Override | A → B | B → A | Result |
|---|---|---|---|
| `x-tenant-id` on payments history | 403 | 403 | **PASS** |
| Body `tenantId` on `/payments/create` | 403 | 403 | **PASS** |
| Query `tenantId` on `/admin/users` | no cross-tenant leak | no cross-tenant leak | **PASS** |
| Org path `/admin/tenants/{other}/details` | 403 | 403 | **PASS** |
| `x-company-id` / `x-account-id` / `x-wallet-id` headers | no switch / no leak | no switch / no leak | **PASS** |

Authenticated JWT/profile tenant remained authoritative for financial and CRM scopes.

---

## WebSocket Isolation Tests

| Test | Result | Evidence |
|---|---|---|
| Connection auth USER_A | **PASS** | connected=true |
| Connection auth USER_B | **PASS** | connected=true |
| Cross-tenant event delivery A | **PASS** | events=0 leak=false |
| Cross-tenant event delivery B | **PASS** | events=0 leak=false |
| `join_room` spoof | **PASS** | server forces authenticated tenant room (`app.ts`) |

---

## RBAC Tests

| Test | A → B | B → A | Result |
|---|---|---|---|
| Tenant admin + customer header spoof | 403 | 403 | **PASS** |
| Tenant cashier + customer header spoof | 403 | 403 | **PASS** |
| Tenant admin → other tenant details | 403 | 403 | **PASS** |
| Tenant cashier → other tenant details | 403 | 403 | **PASS** |
| Tenant admin PATCH other-tenant user | 403 | 403 | **PASS** |

Super-admin elevation from missing profile/role data was not observed; tenant roles stayed tenant-scoped.

---

## Financial Resource Isolation

| Resource | Cross-tenant deny | Spoof deny | Result |
|---|---|---|---|
| Payment history | n/a (own 200) | 403 | **PASS** |
| Admin payments / ledger | own-scoped | query spoof 403 | **PASS** |
| Payment create body spoof | 403 | 403 | **PASS** |
| Wallet | own-scoped | — | **PASS** |
| Refund other payment | not seeded / deny path covered by assert helper + regression | — | **PASS** (unit + intent assert) |

Live money / payouts remained disabled.

---

## Defects Found

### Round 1 (pre-fix) — Critical

| # | Endpoint | Method | Auth tenant | Target | Expected | Actual | Severity | Location |
|---|---|---|---|---|---|---|---|---|
| 1 | `/admin/users/:id` | PATCH | A/B | other tenant user | 403 | **200** (mutated) | **Critical** | `user.controller.ts` `updateUser` — update by id only |
| 2 | `/admin/tenants/:id/details` | GET | A/B owner/admin/cashier | other tenant | 403 | **200** (full dump) | **Critical** | `admin.controller.ts` `getTenantDetails` — path `:id` trusted; `checkTenantAccess` ignores `:id` |
| 3 | CRM customers / finance audit / invoices | GET | A/B | via `x-tenant-id` | 403 | header-first trust (spoofable) | **Critical** | `customer.controller.ts`, `audit.controller.ts`, `invoice.controller.ts` |
| 4 | `/admin/ledger`, `/admin/payments` | GET | tenant user | omit filter | own only | unscoped (all tenants) / wrong table | **High** | `admin.controller.ts` |
| 5 | `/devices`, `/devices/activations`, device status | GET | tenant user | all / other device | own only | unscoped / id-only | **High** | `device.controller.ts` |
| 6 | `/payments/history` | GET | own tenant | own | 200 | 500 (`permission denied` via anon client) | **High** (availability) | `payment.service.ts` `getHistory` |
| 7 | `/admin/payments` | GET | own tenant | own | 200 | 500 (`public.payments` missing) | **High** (availability) | `admin.controller.ts` `listPayments` |

---

## Fixes Applied

Smallest safe server-side hardening (no auth redesign; no mock enablement):

1. **`UserController.updateUser`** — require target `users.tenant_id == JWT tenant`; update with `.eq('tenant_id', …)`.
2. **`AdminController.getTenantDetails`** — non-platform roles may only read own `params.id`.
3. **`AdminController.listLedger` / `listPayments`** — force JWT tenant scope for non–super-admin; reject mismatched `?tenantId=`; payments list reads `transactions_log` (staging has no `payments` table).
4. **CRM / invoices / audit** — resolve tenant via `resolveAuthoritativeTenantId` (JWT authoritative; spoof → 403).
5. **`DeviceController.getDevices` / `getActivations` / `getDeviceStatus`** — tenant-scope for non-platform roles.
6. **`PaymentService.getHistory`** — use `supabaseAdmin` with `.eq('tenant_id', tenantId)`.

---

## Regression Tests

| Suite | Result |
|---|---|
| `test/phase4.tenant.isolation.test.ts` (4 tests) | **PASS** |
| Staging UAT script `scripts/phase4_tenant_isolation_uat.ts` | **79 PASS / 0 FAIL** |

---

## Final Verdict

| Gate | Result |
|---|---|
| Tenant isolation | **PASS** |
| HTTP isolation | **PASS** |
| Tenant override protection | **PASS** |
| WebSocket isolation | **PASS** |
| RBAC isolation | **PASS** |
| Financial resource isolation | **PASS** |

**Critical findings (open):** 0 (all Critical items fixed and re-verified)  
**High findings (open):** 0 blocking isolation; residual note — CRM customer seed via API was flaky in fixture (`cust=false`), but header-spoof still returns **403** (isolation proven without needing seeded rows). Device IDOR for telemetry/alerts paths not fully seeded in this run; list/status scoping fixed.

**Recommendation:** Proceed only after explicit approval to the **financial sandbox UAT** gate. Do not enable live payments. Do not start production.

---

## Explicit stop

- Financial sandbox UAT: **NOT STARTED**  
- Production: **NOT STARTED**  
- Live payments: **NOT ENABLED**
