# PHASE 4 — Hardening Test Cleanup Report

**Date:** 2026-08-15  
**Scope:** `invify-backend/test/hardening.test.ts` + related ownership gate  
**Production work:** NOT started  
**Live payments:** NOT enabled  
**FEATURE_REAL_MONEY_PAYOUTS:** unchanged (`false`)

---

## Verdict

**Classification: C — both** (Jest harness drift **and** a small real ownership-gate defect)

| Suite | Result |
|---|---|
| `test/hardening.test.ts` | **8 passed / 0 failed** |
| Phase 2 security (`phase2.security.lockdown.test.ts` + `commission.security.test.ts`) | **38 passed / 0 failed** |
| Security regression | **None** — ownership gate tightened; auth/financial lockdown unchanged |

---

## 1. Failing tests (before fix)

| # | Test | Expected | Observed |
|---|---|---|---|
| 1 | Authenticated `/devices/onboard` with valid tenant | 200 | **401** |
| 2 | `tenant_id` from JWT, not body (spoof) | 200 + tenant from JWT | **401** |
| 3 | Cross-tenant `/api/mobile/terminal/sync` | 403 | **401** |
| 4 | Same-tenant `/api/mobile/terminal/sync` | 200 | **401** |
| 5 | Register retry on `23505` → 201 | 201 | **500** |
| 6 | Register conflict after 3 attempts → 409 | 409 | **500** |

Passing before fix (2): unauthenticated onboard → 401; unauthenticated sync → 401.

---

## 2. Exact failure causes

### A. Jest harness / mock drift (primary surface failures)

1. **Opaque Bearer tokens** (`valid-jwt-token`, `token-for-tenant-B`) — auth no longer uses `supabase.auth.getUser`; it requires cryptographically verified JWTs via `verifySupabaseAccessToken` / shared secrets.
2. **Mock exported only `supabase`** — register, auth profile lookup, and terminal sync use **`supabaseAdmin`**. `supabaseAdmin` was `undefined` → register `Cannot read properties of undefined (reading 'from')` → HTTP 500.
3. **Wrong query shapes** — auth uses `.maybeSingle()`; terminal sync uses `.select().eq().limit(10)` on `device_registrations` / `devices`. The old harness mocked `.single()` / `.maybeSingle()` on the wrong tables.
4. **Non-thenable builders** — register probes tenants with `await .select().ilike().eq()`; PostgREST builders are thenable. The mock had to mirror that.

### B. Application defect (would still break cross-tenant hardening after harness-only fix)

1. **`_mapAssignmentBundle` dropped `assigned_tenant_id`** — inventory ownership signal never reached `TerminalSyncService`.
2. **Rebind condition treated missing inventory as agreement** (`!inventoryTenantId || inventoryTenantId === tenantId`) — a JWT from tenant B could rebind a device owned by tenant A when inventory was absent, instead of denying with `ACCESS_DENIED_OWNERSHIP_MISMATCH` (403).

That is a real cross-tenant sync weakness, not a test-only artifact. Fix strengthens security; it does not weaken production gates.

---

## 3. Production application code involvement

| Area | Involved? | Change |
|---|---|---|
| Auth middleware / JWT verification | No (behavior kept) | Tests now issue HS256 tokens with `SUPABASE_JWT_SECRET` |
| Onboarding register | No (behavior kept) | Harness mocks `supabaseAdmin.from` + `auth.admin.createUser` + `JWT_SECRET` |
| Device onboard | No (behavior kept) | Shared `supabase`/`supabaseAdmin` mock |
| Terminal inventory mapping | **Yes** | Preserve `assigned_tenant_id` / `assignment_status` on assignment bundle |
| Terminal sync ownership rebind | **Yes** | Rebind only when inventory **explicitly** matches JWT tenant |

No payment, payout, or auth-bypass changes.

---

## 4. Fixes applied

### Harness — `test/hardening.test.ts`

- Set `BUILD_VARIANT=LOCAL`, `SUPABASE_JWT_SECRET`, `JWT_SECRET`, `OFFLINE_LOCAL_AUTH=false` before app load; reset `BuildVariantService`.
- Mock **both** `supabase` and `supabaseAdmin` (shared `from` + `auth.admin.createUser`).
- Sign real HS256 access tokens with tenant claims.
- Thenable query builders matching `maybeSingle` / `limit` / awaited filter chains.
- Register path: empty multi-device probe, insert retry sequence, `createUser`, users insert, JWT issue.

### Smallest safe server-side fixes

- `src/services/terminal-inventory.service.ts` — include `assigned_tenant_id` (and `assignment_status`) in `_mapAssignmentBundle`.
- `src/services/terminal-sync.service.ts` — `inventoryAgrees` requires `inventoryTenantId != null && inventoryTenantId === tenantId`.

### Regression coverage

Existing hardening assertions retained (not weakened/deleted). Cross-tenant sync (403) and same-tenant sync (200) now exercise the corrected ownership gate. Register collision retry/409 coverage restored under `supabaseAdmin`.

---

## 5. Re-run results

### Hardening

```text
PASS test/hardening.test.ts
Tests: 8 passed, 8 total
```

### Phase 2 security

```text
PASS test/commission.security.test.ts
PASS test/phase2.security.lockdown.test.ts
Test Suites: 2 passed, 2 total
Tests:       38 passed, 38 total
```

---

## 6. Security confirmation

| Check | Status |
|---|---|
| Hardening suite green | PASS |
| Phase 2 lockdown + commission security green | PASS |
| Auth still fail-closed (verified JWT; no opaque Bearer) | Confirmed by suite |
| Cross-tenant terminal sync denied without inventory proof | Confirmed (403) |
| Tenant code spoof via register body not introduced | N/A — register path unchanged |
| Real-money / live Quasar / production | Not touched |

---

## 7. Stop point

Work stopped after test results and this report.

- No production deploy
- No live payment enablement
- No further Phase 4 production gates started
