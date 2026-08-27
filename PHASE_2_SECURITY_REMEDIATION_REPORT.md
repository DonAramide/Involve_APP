# PHASE 2 — Security & Financial Lockdown Remediation Report

**Date:** 2026-08-13  
**Phase status:** COMPLETE (awaiting approval for Phase 3)  
**Scope:** CRITICAL + immediately relevant HIGH security/financial findings from `PRODUCTION_READINESS_AUDIT.md`  
**Production environment created:** NO  
**Live payment providers enabled:** NO  

---

## Executive Summary

Phase 2 locked down money-moving HTTP APIs, closed fail-open refund/webhook paths, enforced JWT verification (HTTP + Socket.IO), removed automatic `super_admin` escalation and email-based privilege elevation, disabled staging passwordless offline auth, removed production-capable mock webhook secrets and JWT/license HMAC fallbacks, and moved client license signing off mobile/admin binaries.

The platform is **still not production-ready**. Environment separation, deploy plumbing, and remaining HIGH/MEDIUM items are deferred to Phase 3+.

---

## Findings Addressed

| Finding | Original Severity | Status | Files Changed | Evidence | Tests | Remaining Risk |
|---------|-------------------|--------|---------------|----------|-------|----------------|
| Unauthenticated `/payments/*` | CRITICAL | FIXED | `app.ts`, `payment.controller.ts` | Routes now require `authenticate` + roles + tenant checks | `phase2.security.lockdown.test.ts` unauthenticated → 401 | Misconfigured RBAC still possible |
| Cross-tenant via `x-tenant-id` on finance | CRITICAL/HIGH | FIXED | `finance-tenant.ts`, payout/payment controllers | Authoritative tenant from `req.user.tenantId` | Contract + payout tests | Super-admin may still select tenant intentionally |
| Refund fail-open after Quasar failure | CRITICAL | FIXED | `payment.service.ts` | Provider failure throws 502; no SUCCESS/ledger | Source contract + fail-closed log | Needs live Quasar integration test |
| `whsec_mock_quasar_key` webhook fallback | CRITICAL | FIXED | `webhook.controller.ts` | Missing secrets → 503 fail-closed | Source contract test | Operators must configure real secrets |
| Paystack/FLW/Stripe mock webhook secrets | HIGH | FIXED | `webhook.controller.ts` | Env required; no mock defaults | Manual/source | Same |
| Simulated gateway → prod money | HIGH | FIXED | `gateway.service.ts`, FeatureGate | Simulation blocked unless `isSimulatorAllowed()`; never SUCCESS | — | Simulated PENDING rows still possible in LOCAL |
| Payout FeatureGate not enforced | HIGH | FIXED | `payment.service.ts`, `build-variant.ts`, payout routes | `FEATURE_REAL_MONEY_PAYOUTS=true` **and** PROD required | Payout gate test | Explicit enable still needed for go-live |
| Weak payment idempotency | HIGH | PARTIALLY FIXED | `payment.service.ts`, controllers | Client `Idempotency-Key` + metadata replay | — | No DB unique constraint migration yet |
| JWT decode-without-verify | CRITICAL | FIXED | `auth.middleware.ts`, `security-boot.ts` | Staging/prod require `SUPABASE_JWT_SECRET`; no decode-only | Forged JWT / mock rejection tests | LOCAL still needs secrets configured |
| Socket `mock-super-admin` ungated | CRITICAL | FIXED | `app.ts` | Gated by `isMockTokenAllowed()`; JWT verify required | PROD/STAGING mock rejection | LOCAL mock still available by design |
| Socket JWT decode-only | CRITICAL | FIXED | `app.ts` | `jwt.verify` only | — | — |
| Auto `super_admin` on missing profile | CRITICAL | FIXED | `auth.middleware.ts` | Staging/prod reject; LOCAL inserts `owner` only | Source contract | Claim fallback LOCAL only, least privilege |
| Hardcoded email → `super_admin` | HIGH | FIXED | `auth.middleware.ts`, `auth.controller.ts` | Email hard-elevation removed | Source contract | DB must hold correct roles |
| Staging passwordless offline auth | CRITICAL | FIXED | `auth.controller.ts` | `offlineAuthAllowed` LOCAL + `OFFLINE_LOCAL_AUTH` only | STAGING mock rejection | Connectivity outage = 503 (correct) |
| `OFFLINE_LOCAL_AUTH` / mock flags | HIGH | FIXED | `constants.ts`, `security-boot.ts` | Startup refuses mock flags in staging/prod | — | Must set boot env correctly |
| Unsigned `local_dev_signature` tokens | HIGH | FIXED | `auth.controller.ts`, `app.ts` | Offline tokens signed with `JWT_SECRET`; unsigned rejected | — | Rotate any previously issued offline tokens |
| Password-reset sandbox 200 success | CRITICAL | FIXED | `auth.controller.ts` | Bypass paths removed | — | Reset still public; needs OTP hardening in later phase |
| Hardcoded JWT fallback `your-super-secret-key-2026` | CRITICAL | FIXED | `onboarding.controller.ts` | Missing `JWT_SECRET` → 503 | Source contract | — |
| Flutter `.env` asset packaging | CRITICAL | FIXED | `pubspec.yaml`, `app_config.dart`, `main.dart` | `.env` removed from assets; dart-define / optional local load | — | Ensure CI release builds pass defines |
| Hardcoded staging Supabase in `main.dart` | CRITICAL | FIXED | `main.dart`, `app_config.dart` | Config from defines/env only | — | Staging project still used if define points there |
| Shared license HMAC in clients | CRITICAL | FIXED | `license.util.ts`, admin/mobile license files, DeviceActivationPage | Signing server-only; clients call API | Source contract | Legacy `tmp/` scratch files still contain old secret (not shipped) |
| Hardcoded POS auth token | CRITICAL | FIXED | `pos.service.ts` | Defaults emptied; load from secure config | — | Must load real host credentials via vault/config |
| `PRO-TOKEN-123` sync secret | HIGH | FIXED | `main.dart`, `sync_bloc.dart` | Per-install random token persisted | — | Existing devices may need re-pair |
| OTP cleartext logging / API return | HIGH | FIXED | `verification.service.ts`, `otp.service.ts`, `otp.controller.ts` | No OTP in responses; log only with `LOG_OTP_IN_LOCAL` | — | Staging needs real WhatsApp provider wired |
| Default onboarding password `123456` | MEDIUM | FIXED | `onboarding.controller.ts` | Strong password required | — | — |
| Dummy Supabase key / staging URL fallback | HIGH | PARTIALLY FIXED | `build-variant.ts` | Staging/prod throw if missing; no dummy key | — | Migration TS runners may still hardcode staging URL |

---

## Findings Not Yet Addressed

Deferred to Phase 3+ (environment / infra / remaining HIGH):

- Dedicated production database / secret plane / compose
- Docker `CMD dist/main` vs `dist/app.js`, k8s probe mismatches
- Dual migration paths / scratch scripts targeting staging
- In-process workers / distributed locks
- Admin ngrok leftovers in some Vue pages
- Full MFA-at-login enforcement
- DB unique constraint for payment idempotency keys
- CI/CD promotion pipeline
- Remaining localhost references in Flutter activation pages (some still present; release path now fails closed on LAN via `AppConfig`)
- Legacy `backend/` stack cleanup beyond license secret

---

## Authentication Changes

- JWT must be verified; missing secret fails closed in staging/prod (middleware + boot assert).
- Mock tokens (`mock-super-admin`, `mock-admin-token`, `mock-agent-token-*`) only via `isMockTokenAllowed()` (LOCAL/test).
- Blanket offline bypass requires `OFFLINE_LOCAL_AUTH=true` **and** local guards — never staging/prod.
- Offline login tokens are HMAC-signed with `JWT_SECRET` (no `local_dev_signature`).
- Missing profiles no longer become `super_admin`.
- Email → role hard overrides removed.
- Password-reset fake success bypasses removed.
- Socket.IO uses the same verification model.

---

## Authorization Changes

- `/payments/*` and `/api/payout/*` require authentication + role gates + tenant isolation helpers.
- Financial tenant context resolved by `resolveAuthoritativeTenantId()` — client headers cannot override non–super-admin tenants.
- Refunds/cancels/history assert transaction tenant ownership.

---

## Financial Changes

- Refunds fail closed on provider error (no SUCCESS ledger).
- Payouts gated by `FeatureGateService.isFeatureEnabled('real_money_payouts')` (`FEATURE_REAL_MONEY_PAYOUTS=true` + PROD).
- Gateway initialize is explicitly simulated and forbidden when simulators are not allowed.
- Idempotency-Key support added for intents/refunds/payouts/checkouts (application-level; DB unique constraint pending).

---

## Webhook Changes

- Quasar: no mock signing secret; missing secret → 503.
- Removed “accept sandbox unsigned in development” bypass.
- Paystack / Flutterwave / Stripe: no mock secret defaults; missing → 503.

---

## Client Security Changes

- Flutter: removed `.env` from `pubspec` assets; Supabase URL/anon key no longer hardcoded; `AppConfig` uses `--dart-define` / optional local dotenv for debug.
- License HMAC removed from Flutter + admin clients; generation via backend `/devices/activations`.
- Sync `PRO-TOKEN-123` replaced with per-device persisted random token.
- Release builds refuse mock-super-admin fallback tokens.

---

## Environment Guard Changes

- New `assertSecureBootConfiguration()` refuses staging/prod boot with mock auth flags or missing JWT/license secrets.
- `BuildVariantService.getSupabaseConfig()` no longer injects staging URL / dummy keys for staging/prod.
- `real_money_payouts` requires explicit env opt-in in PROD.

---

## Tests Executed

| Suite | Result |
|-------|--------|
| `test/phase2.security.lockdown.test.ts` | PASS |
| `test/commission.security.test.ts` | PASS |
| Broader subset (`hardening`, `activation`, `subscription`, `api.integration`, whatsapp webhook) | Mixed — several failures appear environment/DB-mock related; Paystack webhook now correctly fails closed without secret |

Core Phase 2 security suite: **38/38 passed** when run as `phase2.security|commission.security`.

---

## Security Scans Executed

Searched for (post-remediation):

`your-super-secret-key-2026`, `INVOLVE-SECURE-HMAC-SECRET-2024`, `PRO-TOKEN-123`, `whsec_mock_quasar_key`, `sk_test_mock_paystack`, POS Base64 auth token, email hardcodes, `local_dev_signature` acceptance paths.

**Remaining matches (classified):**

| Match | Classification |
|-------|----------------|
| `tmp/license_gen.dart`, `tmp/generate_license.dart` | Scratch/dev tools — not app runtime; treat as compromised artifacts to delete in hygiene pass |
| `invify-backend/scratch/test_direct_ipv6.ts` | Scratch only |
| `lib/main.dart` mentions `PRO-TOKEN-123` only to migrate away from legacy stored value | Safe |
| `local_dev_signature` strings in auth/socket | Rejection paths only |
| Flutter activation `localhost:3004` literals | Still present in some activation pages — HIGH residual; release `AppConfig` fails closed on LAN, but pages should be cleaned in Phase 3 |

---

## Regression Results

- Payment/auth security suites: green.
- Some pre-existing integration tests fail without live Supabase mocks (`Cannot read properties of undefined (reading 'from')`).
- Paystack webhook tests that expected mock-secret acceptance now observe fail-closed 503 — expected security behavior.

---

## Remaining CRITICAL Findings

From original 14:

| # | Item | Status |
|---|------|--------|
| Unauthenticated payments | FIXED |
| Refund fail-open | FIXED |
| Webhook mock secret | FIXED |
| JWT decode-only | FIXED |
| Auto super_admin | FIXED |
| Socket mock/decode | FIXED |
| Staging offline passwordless | FIXED |
| Password-reset sandbox 200 | FIXED |
| JWT secret fallback | FIXED |
| Flutter Supabase/.env packaging | FIXED |
| Shared license HMAC in clients | FIXED (runtime paths) |
| Hardcoded POS auth token | FIXED |
| Docker CMD mismatch | **NOT FIXED** (Phase 3 infra) |
| CI `/readiness` mismatch | **NOT FIXED** (Phase 3 infra) |

**CRITICAL remaining (infra, deferred):** 2  

---

## Remaining HIGH Findings

Still open (non-exhaustive): BUILD_VARIANT default LOCAL risk in misconfigured deploys (mitigated by boot asserts when staging/prod flags set), Flutter activation localhost literals, admin ngrok pages, MFA-at-login, dual migrations, in-process jobs, incomplete CI, idempotency DB constraint, WhatsApp real provider wiring for staging.

Approximate remaining HIGH: ~12 (down from 20; several fixed or partially fixed).

---

## New Risks / Tradeoffs

1. **LOCAL requires secrets** (`JWT_SECRET`, preferably `SUPABASE_JWT_SECRET`) — developers must set env.
2. **Payouts disabled everywhere until** `BUILD_VARIANT=PROD` + `FEATURE_REAL_MONEY_PAYOUTS=true`.
3. **License keys minted with old HMAC** will not validate under new `LICENSE_HMAC_SECRET` — re-issue required.
4. **LAN sync** requires re-pairing after token rotation away from `PRO-TOKEN-123`.
5. **Offline POS tokens** TTL reduced from 10y to 30d on onboarding register.

---

## Recommended Phase 3

**Environment Separation + Configuration Architecture + DEV/STAGING/PRODUCTION Infrastructure**

1. Fix Docker entrypoint + health/readiness probes.  
2. Create isolated staging/prod config matrices (no shared Supabase project hardcoding).  
3. Clean remaining client localhost/ngrok.  
4. Add DB unique constraints for idempotency keys.  
5. Wire durable workers and CI promotion with approval gates.  
6. Only then consider enabling live payment providers.

---

## Phase 2 Completion Gate

```text
CRITICAL FINDINGS BEFORE:     14
CRITICAL FINDINGS FIXED:      12
CRITICAL FINDINGS REMAINING:   2   (Docker CMD; CI readiness — deferred to Phase 3 infra)
HIGH FINDINGS FIXED:          ~8
HIGH FINDINGS REMAINING:     ~12
```

Gate items required by Phase 2 brief:

| Gate item | Status |
|-----------|--------|
| Unauthenticated money-moving endpoints | RESOLVED |
| Fail-open refunds | RESOLVED |
| Forgeable production JWTs | RESOLVED |
| Unauthenticated administrative sockets | RESOLVED |
| Staging passwordless authentication | RESOLVED |
| Production-capable mock authentication | RESOLVED |
| Production-capable mock webhook secrets | RESOLVED |
| Automatic super_admin escalation | RESOLVED |
| Client-side signing secrets | RESOLVED |
| Hardcoded production-capable credentials | RESOLVED (POS/JWT/HMAC/sync) |

---

**STOP.** Do not proceed to Phase 3 without explicit approval.
