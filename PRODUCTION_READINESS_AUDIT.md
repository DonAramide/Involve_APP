# INVIFY Production Readiness Audit

**Phase:** 1 — Production Readiness Audit (read-only)  
**Date:** 2026-08-13  
**Scope:** Entire `Involve_APP` repository (discovered structure, not assumed)  
**Mode:** AUDIT ONLY — no application, config, schema, infra, or dependency changes  
**Verdict:** **NOT PRODUCTION READY**

---

## Executive Summary

INVIFY is a multi-surface platform (Flutter POS mobile, Vue admin, TypeScript SaaS backend, legacy Express workers, Quasar scaffold UI) with substantial product surface area (auth, wallets, ledger, Quasar payments/POS, WhatsApp, reconciliation, device onboarding). Capability exists; **environment isolation and production safety controls do not**.

**Primary blockers:** unauthenticated money-moving HTTP routes; fail-open refunds; JWT verification gaps (decode-without-verify / forgeable offline tokens); ungated Socket.IO mock admin; staging passwordless offline login; hardcoded client credentials (Supabase staging project, license HMAC, POS auth token); broken Docker entrypoint vs `package.json` start script; no dedicated production database wiring; CI/deploy probes that do not match the running app.

**Production readiness score:** **28 / 100**

Do **not** convert the current development/staging stack into production. Establish a separate production plane after remediation.

---

## Repository Architecture

### Discovered top-level surfaces

| Surface | Path | Role | Status |
|---------|------|------|--------|
| Flutter mobile / POS | `/` (`lib/`, `android/`, `ios/`, `pubspec.yaml`) | Tenant invoicing, school, device activation, sync | Active; LAN/staging-wired |
| Android MPOS SDKs | `android/mpossdk/`, `android/morefunsdk/` | Card reader / device path | Present |
| Primary backend | `invify-backend/` | Express/TS API, finance, webhooks, vault, POS, WhatsApp, Socket.IO | Active primary |
| Legacy backend | `backend/` | Older Express + BullMQ Redis workers | Present; likely stale / parallel |
| Admin console | `invify-admin/` | Vue 3 + Quasar admin / governance / finance UI | Active |
| Quasar control UI | `invify-quasar-app/` | Prototype SPA (not Quasar payment API) | Scaffold / non-prod |
| Engine tests | `engine-tests/` | Isolated test package | Present |
| Infrastructure templates | `infrastructure/` | K8s, GitLab-style CI, observability, DR | Mostly aspirational |
| Backend deploy artifacts | `invify-backend/Dockerfile`, `docker-compose.*.yml`, `k8s/`, `.github/workflows/` | Partial deploy attempt | Gaps / mismatches |
| Docs / ops scratch | `docs/`, `scripts/`, `invify-backend/scratch/` | Guides + dangerous ops scripts | High risk if pointed at live DB |

### Backend capability map (`invify-backend`)

| Capability | Location | Notes |
|------------|----------|-------|
| HTTP API | `src/app.ts` | Monolithic route wiring |
| Auth / MFA | `auth.controller.ts`, `auth.middleware.ts`, MFA controllers | Multiple bypass paths |
| RBAC / tenant | `rbac.middleware.ts`, tenant checks | Super-admin / owner bypasses |
| Payments / refunds | `payment.controller.ts`, `payment.service.ts` | **Unauthenticated routes** |
| Gateway (Paystack/FLW/Stripe) | `gateway.service.ts` | Simulated checkout URLs + mock key fallbacks |
| Wallet / ledger | `wallet.*`, `ledger.service.ts`, finance modules | Ledger has idempotency keys |
| POS / ISO / Quasar | `pos.service.ts`, `integrations/quasar/*` | Live/sandbox key mixing |
| Settlement / reconciliation | `settlement/*`, `reconciliation.service.ts`, nightly job in `app.ts` | In-process timers |
| Integration vault | `integration-vault.service.ts` | Credential store |
| Webhooks | Quasar, Paystack, Flutterwave, Stripe, WhatsApp | Signature handling uneven |
| Queues | `QueueEngine` / `queue_messages` | Not dedicated Redis workers in primary backend |
| Migrations | `supabase/migrations/` + `src/db/migrations/` | Dual path |
| Health | `GET /health` only | K8s/CI expect other paths |

### Explicitly NOT FOUND (as production-grade artifacts)

- Dedicated production `docker-compose.prod*.yml`
- Root-level `.github/workflows` for monorepo
- Staging GitHub Actions deploy workflow
- Checked-in `.env.example` / `.env.production` templates (repo glob found 0 env example files)
- App routes `/liveness`, `/readiness`, `/healthz`
- Dedicated production Supabase URL hardcoded (prod expects env-only; concrete prod project **NOT FOUND** in repo)
- Automated k8s apply in the GitHub production workflow (image push + curl smoke only)

---

## Current Environment Architecture

```
DEV / LOCAL                         STAGING (partial)                    PRODUCTION (missing / broken)
─────────────────────────────────   ─────────────────────────────────    ─────────────────────────────
Flutter → LAN 192.168.1.193:3004    Same staging Supabase project         No dedicated prod app config
Admin → Vite proxy 127.0.0.1:3004   ngrok leftovers in several pages      No isolated frontend env matrix
Backend → LOCAL BUILD_VARIANT       docker-compose.staging.yml            Dockerfile CMD ≠ package start
Integrations → mock/sandbox         Mixed vault + sandbox HMAC relax      No enforced real-money plane
DB → local / staging fallback URL   Hardcoded staging Supabase project    PROD_SUPABASE_* env only
Secrets → local .env / vault        Staging keys in clients/scripts       k8s secret placeholders + Vault YAML
CI → local npm scripts              Staging compose only                  Tag → GHCR + mismatched smoke
```

**Finding:** There is no complete, isolated PRODUCTION environment evidenced in-repo. `BUILD_VARIANT` and mock-auth guards exist, but defaults, clients, and fail-open paths still bind the stack to development/staging.

---

## Environment Separation Findings

| Finding | Severity | Evidence |
|---------|----------|----------|
| `BUILD_VARIANT` unset → LOCAL | HIGH | `build-variant.ts` L17–18 |
| Staging Supabase URL hardcoded as fallback | HIGH | `build-variant.ts` L72; Flutter `main.dart` L152 |
| Flutter always initializes staging Supabase | CRITICAL | `lib/main.dart` L150–154 |
| Migrations default to staging project URL | HIGH | `src/db/migrations/001_*.ts` L18–19 (and siblings) |
| Admin pages hardcode ngrok tunnel | HIGH | e.g. `AuditTrailPage.vue` L361; `SessionGovernancePage.vue` L243+ |
| Prod compose / prod namespace wiring incomplete | HIGH | Prod compose NOT FOUND; infra namespaces production-only templates |
| Dummy Supabase key fallbacks | MEDIUM | `build-variant.ts` L73, L77 (`dummy-key-prevent-crash`) |

---

## Hardcoded Configuration Findings

### Runtime / client endpoints (production risk)

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| LAN API fallback | HIGH | `lib/core/utils/app_config.dart` | L4–12 | Default `http://192.168.1.193:3004` | Release builds can call LAN | `defaultIp = '192.168.1.193'` | Flavors + compile-time defines; fail if unset in release |
| Localhost OTP/onboarding | HIGH | Activation pages under `lib/features/activation/` | e.g. `verify_email_page.dart` L59, L118; `onboarding_navigator.dart` L75, L170 | Hardcoded `http://localhost:3004/auth/...` | Device release cannot reach API; or debug path ships | Literal localhost URLs | Use `AppConfig.baseUrl` only; flavor-gate |
| Staging Supabase URL + anon key in mobile | CRITICAL | `lib/main.dart` | L150–154 | Always initializes staging project; anon JWT embedded in source | All installs hit staging; key rotation requires app release; environment mix | Hardcoded URL + anon JWT (value **REDACTED**) | Flavor-specific config; never commit keys; remote config or build secrets |
| `.env` packaged as Flutter asset | CRITICAL | `pubspec.yaml` | L114–119 | `.env` shipped inside binary | Secrets/config extractable from APK | `assets: … - .env` | Remove from assets; use dart-define / flavors |
| Admin ngrok API defaults | HIGH | Multiple admin Vue pages | e.g. `AuditTrailPage.vue` L361 | Fallback to personal ngrok URL | Traffic to uncontrolled tunnel | `VITE_API_URL \|\| 'https://bertie-….ngrok-free.dev'` | Require `VITE_API_URL`; fail build if missing |
| Quasar base URL in settings JSON | MEDIUM | `invify-backend/global_settings.json` | L27 | LAN Quasar URL | Dev config may be mistaken for runtime | `http://192.168.1.193:4000/api/v1` | Env-only; remove from committed runtime JSON |
| APP_URL localhost defaults | MEDIUM | `invite.service.ts` L143; `invite.controller.ts` L25 | Invite links fall back to `http://localhost:9000` | Broken / phishing-prone links in shared envs | `process.env.APP_URL \|\| 'http://localhost:9000'` | Require HTTPS `APP_URL` in staging/prod |
| Agent reset redirect localhost | MEDIUM | `agent.controller.ts` | L116 | Hardcoded `http://localhost:3000/agent/reset-password` | Wrong redirect in non-local | Literal URL | Env-configured frontend URL |
| Listen `0.0.0.0` | LOW | `app.ts` | L1129 | Binds all interfaces | Expected for containers; ensure firewall | `server.listen(PORT, '0.0.0.0')` | Document; restrict via network policy |

### Legitimate constants (not flagged as issues)

Examples intentionally excluded: `MAX_RETRIES`, OTP length/expiry constants, UUID format regexes, rate-limit numeric thresholds, documentation examples in comments.

---

## Secrets & Credentials Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Hardcoded JWT signing fallback (10y TTL) | CRITICAL | `onboarding.controller.ts` | L522–531 | Signs offline POS JWT with `JWT_SECRET \|\| 'your-super-secret-key-2026'` | Anyone knowing fallback forges long-lived tokens | Fallback string present | Fail boot if unset; short TTL; rotate |
| Shared license HMAC secret in clients + backend | CRITICAL | Flutter `license_*.dart`; admin `licenseGenerator.js`; backend `license.util.ts`; legacy `license.service.js` | Flutter L9–10; admin L2; backend L4 | Same static HMAC across mobile/admin/backend | Licenses forgeable offline | `INVOLVE-SECURE-HMAC-SECRET-2024` | Per-env secret from KMS/vault; never ship in client if used for trust |
| Hardcoded POS host auth token | CRITICAL | `pos.service.ts` | L136–137 | Default host config embeds Base64 auth token | Credential leakage / unauthorized host calls | `authToken: 'RXRy…'` (**REDACTED** in ops notes) | Vault-only credentials; scrub defaults |
| Webhook mock signing secret | CRITICAL | `webhook.controller.ts` | L232–233 | If no secrets loaded → `whsec_mock_quasar_key` | Forged Quasar webhooks can credit ledger | `pushSecret('whsec_mock_quasar_key')` | Fail closed without real secret in staging/prod |
| Gateway mock secret defaults | HIGH | `gateway.service.ts` | L33, L42, L49 | Mock Paystack/FLW/Stripe secrets + fake checkout URLs | Fake “paid” flows if route used in prod | `sk_test_mock_paystack_key_quasar` etc. | Remove defaults; require live keys + FeatureGate |
| Lineage hashing fallback secret | HIGH | `ReferralLineageEngine.ts` | ~L21 | `AGENT_LINEAGE_SECRET \|\| 'fallback_secret_for_hashing'` | Forgeable lineage | Fallback string | Fail closed |
| Seed / demo passwords in repo | MEDIUM | `activation_seed.ts` L23; multiple scratch/scripts | Various | `password123` / known test passwords | Accidental use against shared DB | Seed password literals | Keep seeds local-only; never run against staging/prod |
| k8s secrets placeholders | MEDIUM | `invify-backend/k8s/secret.yaml` | L6–11 | Placeholder values | Easy to deploy insecure placeholders | `PLACEHOLDER` | ExternalSecrets / sealed secrets only |
| Flutter Supabase anon key in source | HIGH | `lib/main.dart` | L153 | Anon JWT committed | Staging project permanently coupled; rotation hard | JWT (**REDACTED**) | Build-time injection; treat staging ≠ prod |

**Note:** Root `.env` exists on disk (observed in workspace listing). Do not commit. Treat as potentially containing live credentials; rotate if ever committed historically.

---

## Authentication & Authorization Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| JWT decode without verify if secret missing | CRITICAL | `auth.middleware.ts` | L171–186 | Missing `SUPABASE_JWT_SECRET` → `jwt.decode` only | Forged Bearer tokens accepted | `else { jwtPayload = jwt.decode(token) }` | Hard-fail auth/boot when secret missing outside LOCAL |
| Auto-create user as `super_admin` | CRITICAL | `auth.middleware.ts` | L292–296 | Missing profile defaults role to `super_admin` | Privilege escalation on first auth | `decodedRole = … 'super_admin'` | Least privilege default; never auto-super_admin |
| Socket `mock-super-admin` ungated | CRITICAL | `app.ts` | L911–920 | Token string match grants admin socket without `isMockTokenAllowed()` | Anyone can join as admin over Socket.IO | `if (token === 'mock-super-admin')` | Gate with `isMockTokenAllowed()`; strip from prod builds |
| Socket JWT decode-only | CRITICAL | `app.ts` | L940–941 | Always `jwt.decode` | Arbitrary socket identity | `const jwtPayload = jwt.decode(token)` | `jwt.verify` with secret |
| Offline passwordless login on staging | CRITICAL | `auth.controller.ts` | L28–31, L323–348 | On Supabase timeout, LOCAL **or STAGING** issues offline token without password validation | Staging passwordless access | `offlineAuthAllowed` includes `isStaging()` | Require explicit flag; never skip password; disable in staging |
| `OFFLINE_LOCAL_AUTH` accepts nearly any password | HIGH | `auth.controller.ts` | L276–298 | Flag true → bypass Supabase (except `wrongpassword`) | Shared env misconfig → open door | Console log bypass message | Gate only via `isMockAuthAllowed()`; refuse if production env flags set |
| Unsigned offline tokens | HIGH | `auth.controller.ts` | buildOfflineToken (~L158–171) | Payload + `local_dev_signature` | Forgeable if socket/middleware accept | `local_dev_signature` | Signed JWT with dedicated secret; reject unsigned outside LOCAL |
| Hardcoded email → super_admin | HIGH | `auth.middleware.ts` | L101–108 | Specific emails forced to `super_admin` | Account email change / spoof escalation | Email allowlist including personal Gmail | Remove hardcodes; DB role only |
| Dev account sandbox login (LOCAL) | HIGH | `auth.controller.ts` | L359–385 | Known emails get offline token when auth fails | LOCAL only today; still dangerous if variant wrong | `devAccounts.includes(...)` | Keep behind `isMockAuthAllowed()` only |
| Password reset sandbox success bypass | CRITICAL | `auth.controller.ts` | L659–712 | On errors / mock userIds / non-UUID → HTTP 200 “success” | False-success resets; possible abuse of public reset route | Sandbox bypass returns 200 | Require verified OTP/session; remove sandbox 200 paths |
| MFA not enforced at login | HIGH | MFA controllers + `auth.controller.ts` | Login path | MFA generate/enable exist; login does not require MFA | Privileged accounts unprotected | No MFA gate on login success | Enforce MFA for super_admin / finance before session |
| OTP codes logged unconditionally | HIGH | `verification.service.ts` L27; `otp.service.ts` L58–64 | Logs raw OTP / mock WhatsApp provider | OTP leakage via logs | `[DEV OTP BYPASS] Generated OTP…` | Never log OTP outside LOCAL + redaction |
| Mock WhatsApp OTP provider | HIGH | `otp.service.ts` | L58–79 | Console mock; commented Termii | No real delivery in production if path used | Mock provider banner | Real provider; fail if unconfigured in prod |
| Middleware mock paths (gated) | MEDIUM | `auth.middleware.ts` | L124–161 | `mock-super-admin` / offline bypass behind `isMockTokenAllowed` / `isMockAuthAllowed` | Safe **if** env correct; LOCAL default risk | Guards in `constants.ts` L49–88 | Boot assert: production flags require PROD variant |
| Default onboarding password | MEDIUM | `onboarding.controller.ts` | ~L151 | `password \|\| '123456'` | Weak accounts | Default string | Require strong password |
| Socket CORS `origin: '*'` | MEDIUM | `app.ts` | L901–904 | Any origin | Broad WS attack surface | `origin: '*'` | Explicit allowlist |
| RBAC path/role bypass breadth | MEDIUM | `rbac.middleware.ts` | L27–151 | Super-admin / owner / path prefix grants | Over-broad authorization | Owner bypass `next()` | Explicit permission matrix |

**Positive control:** `isMockAuthAllowed` / `isMockTokenAllowed` correctly return false when `NODE_ENV`/`APP_ENV`/`BUILD_PROFILE` is production or variant is STAGING/PROD (`constants.ts` L49–88). Parallel paths in login and Socket.IO do **not** consistently use these guards.

---

## Financial System Findings

Treat all money movement as **HIGH-RISK**.

### Where money moves

| Operation | Where | Auth today | Idempotency |
|-----------|-------|------------|-------------|
| Create payment intent | `PaymentService.createIntent` | **None** on `/payments/*` | Weak (`Date.now` refs); no Idempotency-Key |
| Gateway initialize | `PaymentGatewayConvergenceService` | **None** | Local ref only; **simulated** URLs |
| Refund | `PaymentService.refundIntent` | **None** on route | Ledger key `ledger:refund:…` after local SUCCESS |
| Payout / withdraw | `PaymentService.createPayout` / payout controller | `authenticate` only; tenant from header preferred | `payout:${reference}` + RPC lock |
| Webhook credit | `webhook.controller.ts` | HMAC (with mock fallback) | `LedgerService.exists` / quasar ref keys |
| QFS sandbox credit/debit | `/api/v1/sandbox/*` | API key | Sandbox simulation |
| POS card paths | Quasar live keys preferred | Authenticated POS routes | Provider-dependent |

### Structured findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Unauthenticated payment + refund APIs | CRITICAL | `app.ts` | L154–161 | create/initialize/intents/cancel/**refund**/history have no `authenticate` | Anyone can move/refund/read by guessing IDs/tenant | Routes bare | Auth + tenant RBAC + finance role + MFA on refund |
| Refund fail-open after Quasar error | CRITICAL | `payment.service.ts` | L338–344, L346–381 | Quasar refund fails → still SUCCESS + ledger debit | Phantom refunds / drained wallets | `proceeding locally` warn then ledger | Fail closed; ledger only after provider confirm/webhook |
| Mock gateway checkout (no live HTTP) | HIGH | `gateway.service.ts` | L31–54 | Fake checkout URLs; mock secrets | False payment success narrative | Comment: “In production, we'd make a real HTTP request” | Disable route in prod until real integration; FeatureGate |
| Webhook mock secret / sandbox skew | CRITICAL / HIGH | `webhook.controller.ts` | L232–257 | Mock secret; sandbox can skip timestamp skew | Forged credits | See secrets section | Fail closed; strict verify in prod |
| Payout tenant from `x-tenant-id` | HIGH | payout controller + `app.ts` | withdraw path | Header preferred over user tenant | Cross-tenant payout | Header `\|\|` user tenant | Force `user.tenantId`; `checkTenantAccess` |
| `real_money_payouts` FeatureGate unused on withdraw | HIGH | `build-variant.ts` L97–98 vs payout routes | Gate exists for PROD-only but not enforced on withdraw | Staging can still call real Quasar transfer if wired | Feature defined, route ungated | Enforce FeatureGate on all money exits |
| Intent idempotency weak | HIGH | `payment.service.ts` | ~L37–38 | `QNX-${Date.now()}-…` | Duplicate charges under retry | Timestamp refs | Client Idempotency-Key + unique DB constraint |
| Hardcoded POS credentials in defaults | CRITICAL | `pos.service.ts` | L120–137 | IP + auth token in source | Credential abuse | See secrets | Vault-only |

**Positive controls:** Ledger double-entry idempotency (`ledger.service.ts`); Quasar webhook HMAC path when secrets present; card settlement upload MFA middleware; payout RPC lock pattern.

**Providers observed:** Quasar (primary live/sandbox), Paystack, Flutterwave, Stripe (gateway mostly simulated), Wema/Providus adapters (heavy mock/simulation), Meta WhatsApp, Zoho SMTP, Firebase push, AWS S3 SDK dependency, Gemini AI key via config/env.

---

## Database Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Dual migration systems | HIGH | `supabase/migrations/` vs `src/db/migrations/` | Multiple | SQL Supabase migrations + TS runners | Non-deterministic prod init; drift | Both trees present | Single source of truth; CI applies one path |
| Staging URL fallback in TS migrations | HIGH | e.g. `001_p0_1_device_onboarding.ts` | L18–19 | Defaults to staging Supabase project | Dev scripts mutate staging accidentally | Hardcoded staging URL | Require env; refuse default remote URL |
| Seed data inside migrations | MEDIUM | e.g. `20260618_p05c_seed_commissions.sql` | L1+ | INSERT seed configs | Prod may inherit demo/config seeds | Seed SQL files | Separate seed jobs; never auto-seed prod |
| Dummy keys prevent crash | MEDIUM | `build-variant.ts` | L73–77 | Missing keys → dummy | Silent misconfig | `dummy-key-prevent-crash` | Fail boot in staging/prod if missing |
| Scratch scripts with service role | HIGH | `invify-backend/scratch/*`, `activate_vault.js`, etc. | Various | Ops scripts target `STAGING_SUPABASE_*` | Accidental destructive ops | Many scripts | Isolate; require explicit confirm; no default remote |
| Financial integrity SQL present | INFO | e.g. `p10_finance_ledger_engine.sql`, `p19_transactions_log…` | Migrations | Ledger/audit tables exist | Good foundation if enforced | Migration names | Keep; add constraints/tests for money tables |
| RLS / service-role policies | MEDIUM | `20260811210000_rls_service_role_policies…` | Migration | Hardening attempted | Must verify every money path uses correct client | Migration present | Penetration tests per tenant |

**Determinism:** Supabase SQL migrations appear ordered by timestamp prefixes. TS migrations are imperative runners with remote URL defaults — **not safe** as sole prod initializer without env discipline.

---

## Docker & Infrastructure Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Dockerfile CMD wrong entry | CRITICAL | `Dockerfile` vs `package.json` | Dockerfile L31; package.json L7 | Image runs `node dist/main`; app starts via `node dist/app.js` | Container exits / never serves | `CMD ["node", "dist/main"]` vs `"start": "node dist/app.js"` | Align CMD with build output; smoke test image |
| No HEALTHCHECK in Dockerfile | MEDIUM | `Dockerfile` | — | Missing | Orchestrator can't detect dead process | HEALTHCHECK NOT FOUND | Add HEALTHCHECK hitting `/health` |
| Non-root user present | INFO (positive) | `Dockerfile` | L21–28 | Runs as `nestjs` uid 1001 | Good | `USER nestjs` | Keep |
| K8s probes mismatch | HIGH | `k8s/deployment.yaml` | ~L35–46 | Probes `/liveness` `/readiness` | Pods never ready | App only has `/health` | Align probes or add routes |
| Infra probes `/healthz` + port 3005 | HIGH | `infrastructure/k8s/apps/backend-deployment.yaml` | ~L12–113 | Different port/path/image story | Dual conflicting deploy truths | Port 3005 vs 3000 | Consolidate single deploy contract |
| Staging compose OK-ish | MEDIUM | `docker-compose.staging.yml` | L1–24 | API+Redis; secrets from env; restart always | No healthcheck; Redis exposed | Ports 3000/6379 | Add healthchecks; don't publish Redis publicly |
| Prod compose | HIGH | — | — | **NOT FOUND** | No reproducible prod compose path | — | Create after env matrix locked |
| Infra CI is GitLab syntax | MEDIUM | `infrastructure/ci-cd/ci-cd-pipeline.yml` | L3+ | Not wired to GitHub Actions monorepo | Aspirational / unused | `$CI_COMMIT_BRANCH` | Either wire or mark deprecated |
| Secrets in image | LOW | `Dockerfile` | L24–26 | Only dist/node_modules/package.json | Good (no .env copy observed) | COPY limited | Keep; .dockerignore for env/scratch |

---

## Worker & Queue Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| In-process timers for critical jobs | HIGH | `app.ts` | ~L1071–1127 | Telemetry, audit archive, nightly reconciliation via `setInterval` | Lost on crash; duplicate on multi-instance | setInterval blocks | Dedicated workers / CronJobs with locks |
| QueueEngine memory vs DB | MEDIUM | `QueueEngine.ts` | ~L6–36 | Non-prod in-memory; prod uses `queue_messages` | Horizontal scale unsafe in non-prod patterns | Conditional storage | Always durable queue in staging/prod |
| Legacy BullMQ workers | MEDIUM | `backend/src/workers/*` | webhook/reconciliation workers | Separate Redis workers in legacy tree | Dual systems; unclear ownership | Redis `127.0.0.1` defaults | Deprecate or isolate; never dual-write money |
| Webhook DLQ migration exists | INFO | `20260710180000_p09_webhook_dlq.sql` | — | DLQ schema present | Need runtime usage verification | Migration | Ensure workers drain DLQ |
| Idempotency of nightly recon | MEDIUM | Nightly job registration | `app.ts` | 24h interval | Duplicate runs if multiple pods | No distributed lock evident | Leader election / advisory lock |

---

## External Integration Findings

| Provider | Purpose | Env config | Credentials location | Dev / sandbox | Staging | Production | Webhook | Verification | Retry / timeout / idempotency | Risk |
|----------|---------|------------|----------------------|---------------|---------|------------|---------|--------------|-------------------------------|------|
| Quasar | Payments, POS, VA, transfers | `QUASAR_*`, vault | Vault + env + `quasar_integrations` | `sk_test_*`, sandbox routes | Mixed | Prefers `sk_live_*` | `/webhooks/quasar` | HMAC; mock fallback | Ledger idempotency keys; sandbox skew | **CRITICAL** if mock secret used |
| Paystack | Gateway / banking adapter | `PAYSTACK_SECRET_KEY` | Env / mock default | Mock key + simulated checkout | Env | Env expected | `/webhooks/paystack` | Present path | Gateway not real HTTP initialize | HIGH (mock path) |
| Flutterwave | Same | `FLW_SECRET_KEY` | Env / mock | Mock | Env | Env | `/webhooks/flutterwave` | Path present | Same | HIGH |
| Stripe | Same | `STRIPE_SECRET_KEY` | Env / mock | Mock | Env | Env | `/webhooks/stripe` | Path present | Same | HIGH |
| Meta WhatsApp | OTP / notifications | `WHATSAPP_*` / vault `META_WHATSAPP` | Vault + env | Console mock OTP path | Vault hydrate | Vault | WhatsApp webhook routes | Verify token / app secret expected | Logging of OTP | HIGH |
| Zoho SMTP | Email | Vault `ZOHO_SMTP` / SMTP_* | Vault + env | May mock without password | Same | Prefers PRODUCTION vault | N/A | N/A | Invite links localhost default | MEDIUM |
| Firebase | Push | firebase-admin dep | Config/credentials | Token mocks in admin dispatcher samples | — | Needs real creds | N/A | N/A | — | MEDIUM |
| AWS S3 | Storage SDK present | AWS SDK dep | Env expected | — | — | Infra MinIO templates | N/A | N/A | — | MEDIUM (maturity) |
| Gemini | AI | `GEMINI_API_KEY` / DB config | Env/DB | — | — | — | N/A | N/A | — | LOW–MEDIUM |
| Banks (Wema/Providus) | VA/transfer adapters | CredentialResolver | Adapters | Sandbox simulator | Flag-gated | Simulator denied in PROD variant | — | — | Simulation strings in adapters | HIGH if selected wrongly |
| ngrok | Dev tunnel | Hardcoded in admin | N/A | Used as API fallback | Leftover | Must not ship | N/A | N/A | — | HIGH |

**Cross-env credential risk:** Staging Supabase project ID appears in mobile, migrations, and many scripts. Development clients and scratch scripts can target the same remote DB. Production project URL **NOT FOUND** in repo (env-only) — good pattern, but means prod is not yet established.

---

## Frontend Findings (`invify-admin`, `invify-quasar-app`)

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Ngrok hardcoded API | HIGH | Multiple governance pages | e.g. `SessionGovernancePage.vue` L243+; `MFAChallengePage.vue` L186+; `AuditTrailPage.vue` L361 | Calls personal tunnel | Data exfil / broken prod | Hardcoded HTTPS ngrok | `VITE_API_URL` only |
| Vite proxy localhost | LOW (dev-ok) | `vite.config.js` | L27–29 | Dev proxy to `127.0.0.1:3004` | OK for local | Comment about IPv4 | Keep dev-only |
| License HMAC in browser | CRITICAL | `licenseGenerator.js` | L1–2 | Client can mint licenses | Trust bypass | Same HMAC as mobile | Server-side only |
| Developer portal sandbox UI | MEDIUM | `DeveloperPortalPage.vue` | L90, L206 | Documents localhost webhooks | Confusing if exposed in prod build | Sandbox curl samples | Hide behind env / role |
| Quasar app maturity | MEDIUM | `invify-quasar-app/package.json` | test script noop | Prototype; no real API client maturity | Not prod UI | `"test": "echo … exit 0"` | Exclude from prod release train |
| Source maps | LOW | `vite.config.js` | — | No explicit sourcemap hardening documented | Possible source leak if enabled elsewhere | Setting NOT FOUND | Explicit `sourcemap: false` for prod |

---

## Mobile Findings (Flutter)

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Staging Supabase + anon key embedded | CRITICAL | `lib/main.dart` | L150–154 | Always staging | Env mix; key in binary | Hardcoded URL/key (**REDACTED**) | Flavors: dev/staging/prod |
| `.env` asset packaged | CRITICAL | `pubspec.yaml` | L119 | `.env` in APK/IPA | Secret extraction | Asset entry | Remove; dart-define |
| LAN default API | HIGH | `app_config.dart` | L4–12 | `192.168.1.193:3004` | Wrong target in field | defaultIp | Fail closed in release |
| Localhost activation URLs | HIGH | activation feature pages | Multiple | Bypass AppConfig | Broken/insecure activation | localhost:3004 | Single config source |
| `PRO-TOKEN-123` sync secret | HIGH | `main.dart` L353; `sync_bloc.dart` L258 | Static sync token | Device sync spoofing | Literal token | Per-device secret |
| `mock-super-admin` client usage | HIGH | `main.dart` and services | Multiple | Client still sends mock tokens | Works only if server allows; dangerous with LOCAL default | Bearer mock tokens | Strip from release builds |
| Shared license HMAC | CRITICAL | `license_generator.dart` / `license_validator.dart` | L9–10 | Static HMAC | Forge licenses | Same constant | Secure remote attestation or env secret not in client |
| Package IDs | INFO | Android/iOS gradle/pbxproj | applicationId `com.invify.invoice_app` | Stable ID | Need prod signing config review | IDs present | Confirm release signing & store listing |
| Test bundle leftover | LOW | iOS project | `com.example.involveApp.RunnerTests` | Example ID | Hygiene | pbxproj | Rename |

---

## Logging & Observability Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| OTP logged in cleartext | HIGH | `verification.service.ts` | L27 | Always logs OTP | Account takeover via logs | `[DEV OTP BYPASS]…` | Remove; structured redact |
| WhatsApp OTP mock logs code | HIGH | `otp.service.ts` | L58–64 | Prints code to console | Same | Mock provider banner | Real provider; no code logs |
| Auth bypass warnings | MEDIUM | `auth.middleware.ts`, `app.ts` | Multiple | Logs when bypass fires | Useful alert if monitored; noise otherwise | `Developer … bypass triggered` | Metric + page if fires in staging |
| Health only `/health` | HIGH | `app.ts` | L146–152 | No readiness/liveness split | CI/k8s false failures or false greens | Only `/health` | Add `/livez` `/readyz` with dependency checks |
| Metrics / OTel | MEDIUM | `infrastructure/k8s/observability/*` | Templates | Aspirational | No proven prod telemetry | YAML templates | Wire real exporters |
| Request IDs / audit | MEDIUM | gov-audit / audit services | Present | Audit logging exists; IP defaults to 127.0.0.1 often | Weak forensic quality | Defaults in gov-audit | Propagate real client IP / request ID |
| Morgan / console logging | LOW–MEDIUM | Express stack | Various | Verbose in LOCAL via variant | May log PII | `getLoggingLevel()` | PII scrubbing middleware |

---

## CI/CD Findings

| Finding | Severity | File | Location | Current Behavior | Production Risk | Evidence | Recommended Fix |
|---------|----------|------|----------|------------------|-----------------|----------|-----------------|
| Single workflow under backend only | HIGH | `invify-backend/.github/workflows/production.yml` | Whole file | Tag `v*.*.*` → validate → Trivy → GHCR → curl smoke | No monorepo frontend/mobile gates | Path under submodule-like folder | Root workflows; matrix apps |
| Smoke hits `/readiness` missing | CRITICAL | `production.yml` | L100–101 | `curl …/readiness` | False deploy success/failure | App has no `/readiness` | Align smoke with `/health` or add route |
| No actual cluster deploy step | HIGH | `production.yml` | L95–104 | Push image + curl; no kubectl/helm | “Deploy” incomplete | Sleep 30 + curl | Explicit deploy + approval gates |
| Staging pipeline | HIGH | — | — | **NOT FOUND** | No promotion path | — | Staging deploy + soak before prod |
| `test:e2e` referenced but script may be absent | HIGH | `production.yml` L27 vs `package.json` scripts | package.json lacks `test:e2e` / `lint` in shown scripts | CI may fail or be incomplete | `"test": "jest…"` only in package.json | Add scripts or fix workflow |
| Infra GitLab pipeline unused | MEDIUM | `infrastructure/ci-cd/ci-cd-pipeline.yml` | — | Manual canary references `api.IIPS.app` vs GH `api.invify.app` | Conflicting prod URLs | Two hostnames | Single source of truth |
| Approval gates | MEDIUM | GH `environment: production` | L69 | Environment protection possible | Depends on GH settings (not in repo) | `environment: production` | Enforce required reviewers |

---

## Security Findings

Consolidated security-critical themes (detail above):

1. Unauthenticated financial HTTP APIs  
2. Fail-open refunds and webhook mock secrets  
3. JWT verification gaps (HTTP + Socket.IO)  
4. Privilege escalation via default `super_admin` profile creation and email hardcodes  
5. Staging offline login without password  
6. Password-reset false-success bypasses  
7. Client-embedded secrets (Supabase anon, HMAC, PRO-TOKEN, `.env` asset, POS auth token)  
8. Ngrok and LAN endpoints in shipping clients  
9. Broken/mismatched production container entrypoint and probes  

---

## Environment Matrix

Based **only** on what exists in-repo:

| Configuration | Development | Staging | Production | Finding |
|---------------|-------------|---------|------------|---------|
| API | Local nodemon / compose :3000; Flutter :3004 LAN; admin Vite proxy | `docker-compose.staging.yml` `NODE_ENV=staging` | Declared `api.invify.app` (smoke) + infra `api.IIPS.app` | Conflicting prod hostnames; broken image CMD |
| Database | LOCAL_SUPABASE_* / local | Hardcoded project `rpcjelhacmkhzguljdgi` fallback | `PROD_SUPABASE_*` env only — concrete URL **NOT FOUND** | Staging heavily hardcoded; prod not established |
| Redis | Compose redis:7 | Compose redis | Infra Redis cluster YAML (template) | Staging Redis unauthenticated exposure risk |
| Storage | Local `uploads/` static | Same patterns | MinIO/object-storage YAML template | Prod object storage **NOT FOUND** as live config |
| Authentication | Supabase + offline/mock paths | Offline timeout bypass allowed; mock tokens blocked by variant guards | Mock blocked if env set; JWT secret required for verify | Staging offline bypass is a blocker |
| WhatsApp | Mock console OTP + vault hydrate | Vault/env | Vault preferred | Mock still in code path |
| Email | Zoho/SMTP vault; localhost APP_URL links | Same | Requires APP_URL | Localhost link defaults |
| Payments | Mock gateway + Quasar test keys | Mixed | Live Quasar expected; gateway still simulated | Real-money gate incomplete |
| Webhooks | Mock secret fallback | Sandbox skew relax | Must use real secrets | Fail-open risk |
| Workers | In-process intervals + in-memory queue | Same | DB queue if NODE_ENV=production | Multi-instance unsafe |
| Queues | QueueEngine memory | Memory unless prod NODE_ENV | `queue_messages` | Legacy BullMQ separate |
| Monitoring | Console | Partial | OTel/Prom templates only | **NOT FOUND** as wired prod |
| Secrets | `.env` / vault local | Env + staging vault | k8s placeholders + Vault ExternalSecret templates | Prod secret plane incomplete |
| CI/CD | npm scripts | **NOT FOUND** (deploy) | Tag → GHCR + curl | Incomplete |
| Mobile flavors | Single config + `.env` asset | Staging Supabase in code | **NOT FOUND** | No prod flavor |
| Admin env | Vite empty / ngrok leftovers | Tunnel leftovers | **NOT FOUND** dedicated | Env not productionized |

---

## CRITICAL Findings

1. **Unauthenticated `/payments/*` including refund** — `invify-backend/src/app.ts` L154–161  
2. **Refund proceeds locally after Quasar failure** — `payment.service.ts` L338–381  
3. **Webhook mock signing secret when none configured** — `webhook.controller.ts` L232–233  
4. **HTTP JWT decode-without-verify if `SUPABASE_JWT_SECRET` missing** — `auth.middleware.ts` L171–186  
5. **Missing user profile auto-created as `super_admin`** — `auth.middleware.ts` L292–296  
6. **Socket.IO `mock-super-admin` ungated + decode-only JWT** — `app.ts` L911–941  
7. **Staging offline passwordless login on Auth connectivity failure** — `auth.controller.ts` L28–31, L323–348  
8. **Password reset sandbox returns success without real reset** — `auth.controller.ts` L659–712  
9. **Hardcoded JWT secret fallback with 10-year offline POS token** — `onboarding.controller.ts` L522–531  
10. **Flutter embeds staging Supabase URL + anon key; packages `.env`** — `lib/main.dart` L150–154; `pubspec.yaml` L119  
11. **Shared license HMAC secret in mobile/admin/backend** — multiple files (`INVOLVE-SECURE-HMAC-SECRET-2024`)  
12. **Hardcoded POS auth token / host defaults** — `pos.service.ts` L136–137  
13. **Docker CMD `dist/main` ≠ app entry `dist/app.js`** — `Dockerfile` L31 vs `package.json` L7  
14. **CI smoke `/readiness` does not exist on app** — `production.yml` L100–101 vs `app.ts` `/health` only  

**CRITICAL count: 14**

---

## HIGH Findings

1. `BUILD_VARIANT` defaults to LOCAL — `build-variant.ts` L17–18  
2. Staging Supabase URL hardcoded in build-variant + TS migrations  
3. `OFFLINE_LOCAL_AUTH` near-passwordless login — `auth.controller.ts` L276–298  
4. Unsigned `local_dev_signature` tokens — auth controller  
5. Hardcoded email → `super_admin` — `auth.middleware.ts` L101–108  
6. MFA not enforced at login for privileged roles  
7. OTP cleartext logging — `verification.service.ts` L27; WhatsApp mock OTP  
8. Mock WhatsApp OTP provider still primary path — `otp.service.ts`  
9. Gateway simulated checkouts + mock secrets — `gateway.service.ts`  
10. Payout tenant override via `x-tenant-id`  
11. `FeatureGate real_money_payouts` not enforced on withdraw  
12. Weak payment intent idempotency  
13. Dual migration paths / scratch scripts targeting staging  
14. K8s/infra health path & port mismatches  
15. In-process critical jobs without distributed locks  
16. Admin ngrok hardcoded endpoints  
17. Flutter LAN defaults, localhost activation, `PRO-TOKEN-123`, mock tokens in client  
18. Incomplete CI (no staging deploy; no monorepo; e2e/lint script mismatch risk)  
19. Conflicting production API hostnames (`api.invify.app` vs `api.IIPS.app`)  
20. Invite/reset links default to localhost  

**HIGH count: 20**

---

## MEDIUM Findings

1. Dummy Supabase key fallbacks (`dummy-key-prevent-crash`)  
2. Seed data inside SQL migrations  
3. RBAC owner/path over-broad grants  
4. Socket CORS `origin: '*'`  
5. Default onboarding password `123456`  
6. APP_URL / agent redirect localhost defaults  
7. QueueEngine in-memory outside production NODE_ENV  
8. Legacy BullMQ stack coexistence  
9. Missing Dockerfile HEALTHCHECK; compose without healthchecks  
10. Infra GitLab pipeline aspirational / unused  
11. Observability stack template-only  
12. Audit IP defaulting to `127.0.0.1`  
13. `invify-quasar-app` prototype maturity  
14. Developer portal sandbox surfaces in admin  
15. Redis published without auth in compose  
16. Global settings committed with LAN Quasar URL  

**MEDIUM count: 16**

---

## LOW Findings

1. Listen on `0.0.0.0` (expected for containers; document network policy)  
2. Vite localhost proxy (dev-appropriate)  
3. iOS test bundle still `com.example.*`  
4. Explicit Vite `sourcemap: false` not documented  
5. Documentation / naming inconsistencies (Involve vs Invify)  
6. Large `scratch/` and agent-tools log clutter in workspace  
7. Websocket health page shows `ws://localhost:3004`  

**LOW count: 7**

---

## Recommended Remediation Order

1. **Freeze live money paths** — authenticate/authorize `/payments/*`; fail-closed refunds; remove webhook mock secret; gate payouts with FeatureGate + tenant bind.  
2. **Fix authentication plane** — require JWT verify; remove decode-only; remove socket mock ungated path; stop staging offline passwordless; remove reset sandbox 200; stop auto-`super_admin`; remove email hardcodes.  
3. **Establish environment separation** — dedicated prod Supabase + secrets; remove staging URL hardcodes from clients/migrations; Flutter/admin flavors; delete ngrok/LAN from release paths; stop packaging `.env`.  
4. **Rotate all exposed/static secrets** — JWT fallback, license HMAC, POS auth token, any keys that lived in `.env`/APK, webhook mocks ever used.  
5. **Make deploy real** — fix Dockerfile CMD; align health probes; single prod hostname; staging pipeline; remove aspirational dual infra or wire one.  
6. **Workers & idempotency** — durable queues, distributed locks for recon/settlement, Idempotency-Key on payments.  
7. **Observability & CI hardening** — real readiness, metrics, PII-safe logging, monorepo gates, approval-gated prod.  
8. **Only then** enable live payment providers end-to-end.

---

## Production Readiness Score

| Domain | Score (0–10) | Notes |
|--------|--------------|-------|
| Environment separation | 2 | Staging hardcoded; prod incomplete |
| Secrets management | 2 | Multiple static/hardcoded secrets |
| Authentication | 3 | Guards exist but parallel bypasses |
| Authorization / tenancy | 4 | RBAC present; holes remain |
| Financial integrity | 2 | Unauth routes + fail-open refund |
| Database / migrations | 4 | SQL foundation; dual path risk |
| Docker / deploy | 3 | Non-root good; CMD/probes broken |
| Workers / jobs | 3 | In-process; weak multi-instance |
| Integrations | 3 | Quasar rich; gateways simulated |
| Frontend / mobile config | 2 | LAN/ngrok/staging embedded |
| Observability | 3 | `/health` only; templates elsewhere |
| CI/CD | 3 | Tag workflow partial |
| **Weighted overall** | **28 / 100** | **NOT PRODUCTION READY** |

---

## Production Blockers

1. Close unauthenticated payment/refund APIs and fail-open refund/webhook paths.  
2. Close JWT forge paths (HTTP decode-only, socket decode-only, mock-super-admin, hardcoded JWT fallback).  
3. Remove staging passwordless offline login and password-reset sandbox success bypasses.  
4. Remove/stop shipping client secrets (Supabase key, `.env` asset, license HMAC, POS token, PRO-TOKEN).  
5. Establish a dedicated production database + secret plane (do **not** reuse staging).  
6. Fix container entrypoint and health/smoke contract so deploys are real and verifiable.  
7. Enforce tenant binding + FeatureGate on all money-moving operations.  
8. Add staging→prod promotion CI with approval gates (currently incomplete).

---

## Audit metadata

| Item | Value |
|------|-------|
| Audit completed | YES |
| Application/source/config/infra files modified | **NONE** (documentation deliverable only) |
| Audit report location | `PRODUCTION_READINESS_AUDIT.md` |
| CRITICAL findings | 14 |
| HIGH findings | 20 |
| MEDIUM findings | 16 |
| LOW findings | 7 |
| Production readiness assessment | **NOT PRODUCTION READY (28/100)** |
| Recommended next phase | **Phase 2 — Remediation planning & prioritized security/financial lockdown** (explicit approval required before any code changes) |

---

*End of Phase 1 audit. STOP. Do not begin remediation without explicit approval.*
