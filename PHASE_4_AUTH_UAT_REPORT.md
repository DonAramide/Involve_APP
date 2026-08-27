# Phase 4 — Staging Authentication UAT Report

**Date:** 2026-08-15  
**Scope:** Staging JWT configuration, API restart, real Supabase auth UAT  
**Environment:** Dedicated staging Supabase (`rpcjelhacmkhzguljdgi.supabase.co`) + Docker staging API  
**Image:** `invify:58b5e459-p4-es256`  
**Constraint:** No secret values printed or committed. No financial UAT. No production.

---

## Summary verdict

**Overall staging authentication: PASS**

Real staging login issues ES256 access tokens. Middleware was updated (defect fix only) to verify asymmetric tokens via the staging project JWKS while retaining HS256 verification with the staging `SUPABASE_JWT_SECRET` (legacy JWT secret). Authenticated routes accept valid staging tokens and reject invalid/forged/expired/mock tokens.

---

## JWT configuration

| Check | Result | Sanitized evidence |
|---|---|---|
| `SUPABASE_JWT_SECRET` present in staging API env | **PASS** | `CONTAINER_JWT_PRESENT=true` (length ≥ 16; value not shown) |
| Staging project only (not DEV/PROD host) | **PASS** | Staging host `rpcjelhacmkhzguljdgi.supabase.co` |
| Secret not generated / not replaced by agent | **PASS** | Host `.env` staging secret mechanism; not echoed |
| Boot JWT assertion | **PASS** | No `SUPABASE_JWT_SECRET is required` / refuse-to-start in API logs |

**JWT configuration: PASS**

---

## API restart

| Check | Result | Sanitized evidence |
|---|---|---|
| Image rebuild with ES256/JWKS support | **PASS** | Built `invify:58b5e459-p4-es256` |
| Force-recreate staging API | **PASS** | Container recreated and started |
| `/livez` | **PASS** | HTTP 200 |
| `/readyz` | **PASS** | HTTP 200 |
| `/health` | **PASS** | HTTP 200 |
| `BUILD_VARIANT` | **PASS** | `STAGING` |
| `OFFLINE_LOCAL_AUTH` (container) | **PASS** | `false` |
| `FEATURE_REAL_MONEY_PAYOUTS` | **PASS** | Remains `false` (compose) |

**API restart: PASS**

---

## Defect found and fix (auth logic)

### Finding
Staging Supabase issues user access tokens with **`alg=ES256`** (`kid` present).  
Legacy `SUPABASE_JWT_SECRET` HS256 verify **fails** on those tokens.  
`supabase.auth.getUser(token)` **succeeds**.

Prior middleware/`socket` auth only called `jwt.verify(token, SUPABASE_JWT_SECRET)`, so login succeeded but authenticated API calls returned **401**.

### Fix (minimal)
- Added `src/utils/supabase-jwt.ts` using `jose`:
  - ES/RS/PS → verify via `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  - HS → verify via staging `SUPABASE_JWT_SECRET`
- Wired into `auth.middleware.ts` and Socket.IO auth in `app.ts`
- Dependency: `jose`
- No mock auth, no offline bypass enablement, no financial changes

---

## Real staging auth UAT

Script: `invify-backend/scripts/phase4_auth_uat.ts`  
Artifact: `invify-backend/_p4_auth_uat_results3.txt` (RESULT lines only)

| Test | Result | Sanitized evidence |
|---|---|---|
| Signup (admin createUser + profile) | **PASS** | `user_created=true` |
| Login | **PASS** | status=200, `has_token=true` |
| Token refresh | **PASS** | `supabase_refresh_ok` |
| Authenticated `/api/admin/profile` + `/payments/history` | **PASS** | both status=200 |
| Logout (client discard model) | **PASS** | no server logout route; client discards token |
| Password reset path | **PASS** | status=400 OTP-required (expected gated flow) |
| Verification flow (`send-email-otp`) | **PASS** | status=200 |
| Expired JWT rejection | **PASS** | status=401 |
| Invalid JWT rejection | **PASS** | status=401 |
| Forged JWT rejection | **PASS** | status=401 |
| `mock-super-admin` rejection | **PASS** | status=401 |
| Offline / mock flags | **PASS** | `OFFLINE_LOCAL_AUTH` not `true`; `OFFLINE_MOCK_AUTH=false` |
| Dev mock auth unused | **PASS** | No mock tokens used to pass tests |

**Real login: PASS**  
**Token verification: PASS**  
**Token rejection: PASS**  
**Mock auth rejection: PASS**  
**Offline auth disabled: PASS**

---

## Required scoreboard

| Item | Result |
|---|---|
| JWT configuration | **PASS** |
| API restart | **PASS** |
| Real login | **PASS** |
| Token verification | **PASS** |
| Token rejection | **PASS** |
| Mock auth rejection | **PASS** |
| Offline auth disabled | **PASS** |
| **Overall staging authentication** | **PASS** |

---

## Explicit stop

- Financial UAT: **NOT STARTED** (blocked until this auth gate; gate now PASS — still not executed per instruction)
- Production: **NOT STARTED**
- No secrets committed; no secret values in this report
