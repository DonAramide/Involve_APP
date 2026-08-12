# INVIFY — Production Readiness Audit

**Phase:** 0 — Full System Discovery (read-only)  
**Date:** 2026-08-12  
**Scope:** Entire `Involve_APP` repository  
**Verdict:** **NOT PRODUCTION READY**

This document does **not** claim production readiness. It inventories the platform and records environment-isolation, security, and operational gaps that must be closed before a dedicated production codebase/environment is established.

**Critical rule reminder:** Do not convert the existing development environment into production. Establish a separate PRODUCTION stack (DB, secrets, APIs, frontends, integrations) with no cross-environment dependency.

---

## 1. System inventory

| Surface | Path | Role | Maturity |
|---------|------|------|----------|
| Flutter mobile app | `/` (`lib/`, `android/`, `ios/`, `pubspec.yaml`) | Tenant POS / invoicing / school / services client | Active, LAN/staging-wired |
| Android MPOS SDK | `android/mpossdk/` | Card reader / ISO8583 device path | Active, demo package names |
| Primary backend (TS) | `invify-backend/` | SaaS API, finance, webhooks, vault, POS, WhatsApp | Active, production-risky |
| Legacy backend (JS) | `backend/` | Older Express + BullMQ workers | Present, likely stale, risky |
| Admin console (Vue) | `invify-admin/` | Platform / tenant / finance governance UI | Active, staging/LAN-wired |
| Quasar control UI | `invify-quasar-app/` | Prototype SPA (not payment Quasar API) | Scaffold / non-prod |
| Quasar payment integration | `invify-backend/src/integrations/quasar/` | Live/sandbox payment & POS gateway client | Present, mixed live/test |
| Infrastructure templates | `infrastructure/` | K8s, CI/CD, observability samples | Mostly aspirational |
| Backend deploy manifests | `invify-backend/k8s/`, `Dockerfile`, compose | Real attempt at deploy | Partial / broken |
| Engine tests | `engine-tests/` | Isolated test package | Present |
| Docs / guides | `assets/docs/`, various `*.md` | User/ops docs | Present |

### Backend capability map (`invify-backend`)

| Capability | Location | Notes |
|------------|----------|-------|
| HTTP API | `src/app.ts` (monolithic route wiring) | 100+ routes |
| Auth / MFA | `auth.middleware.ts`, `auth.controller.ts`, MFA controllers | Bypass paths exist |
| RBAC / tenant isolation | `rbac.middleware.ts`, tenant checks | Super-admin hardcodes |
| Payments / refunds | `payment.controller.ts`, `payment.service.ts` | Some routes unauthenticated |
| Wallet / ledger | `wallet.*`, ledger / finance services | Present |
| POS / ISO | `pos.service.ts`, ISO packager services | Quasar-dependent |
| Settlement / reconciliation | `services/settlement/*`, reconciliation controllers | Card settlement + MFA on upload |
| Integration vault | `integration-vault.service.ts`, `vault.*` | Credential store; insecure fallbacks |
| Webhooks | Quasar, Paystack, Flutterwave, Stripe, WhatsApp | Signature checks uneven |
| WhatsApp | Meta provider + notification + webhook | Mocks when creds missing |
| Banking adapters | Wema / Providus / Paystack / Flutterwave | Sandbox simulation service |
| Queues | In-process `QueueEngine` / DB `queue_messages` | Not dedicated workers |
| WebSockets | Socket.IO on same HTTP server | Weaker auth than HTTP |
| Audit / gov | `gov-audit.service.ts`, audit archive | Seeds sample logs on boot |
| Migrations | `supabase/migrations/` (~38 SQL) | Present; dual path with `src/db/migrations/` |
| Scratch / ops scripts | `scratch/` (200+) | Dangerous against staging with service role |
| Health | `GET /health` only | K8s expects `/liveness` `/readiness` |

### Database / storage

| Item | Status |
|------|--------|
| Supabase (staging project in client code) | Used as primary remote DB today |
| Dedicated production database | **Not established in repo config** |
| Formal SQL migrations | Present under `supabase/migrations/` |
| Seed / commission seed SQL | Present (including seed migrations) |
| Local filesystem `uploads/` + DB backups | Served statically; backup `.db` files exist in tree |
| Object storage K8s YAML | Template only (`infrastructure/k8s/data/object-storage.yaml`) |

### Deployment / ops

| Item | Status |
|------|--------|
| `invify-backend/Dockerfile` | Present; **CMD points to `dist/main`** (app builds `dist/app.js`) |
| `docker-compose.local.yml` / `.staging.yml` | Present |
| Production compose | **Missing** |
| `invify-backend/k8s/*` | Present; probes mismatch; ConfigMap lacks `BUILD_VARIANT=PROD` |
| `infrastructure/` blue-green / canary / Vault | Templates; CI references missing paths |
| GH Actions `production.yml` | Present; scripts/probes misaligned with package |
| Monitoring (Prometheus/Grafana/Loki/OTel) | Template YAML only |
| Real prod secrets store | Placeholder `k8s/secret.yaml` |

---

## 2. Environment separation assessment

```
DEV (actual)                 STAGING (partial)              PRODUCTION (missing)
───────────────────────────  ─────────────────────────────  ─────────────────────────────
Flutter → LAN 192.168.x      Same staging Supabase ref      No dedicated prod app config
Admin → 127.0.0.1:3004       Staging API / ngrok leftovers  No .env.production
Backend → local/docker       docker-compose.staging         Broken Dockerfile/K8s probes
Quasar UI → stub             —                              —
Integrations → mock/sandbox  Mixed sandbox + staging keys  No enforced real-only plane
Secrets → local .env         Staging keys in clients/scripts No isolated prod secret plane
DB → local / staging         Staging Supabase               No production database wiring
```

**Finding:** There is no complete, isolated PRODUCTION codebase/environment today. `BUILD_VARIANT` and some mock-auth guards exist on the backend, but clients, secrets, infra templates, and default fallbacks still bind the stack to development/staging.

---

## 3. Master audit table

Status legend: **Missing** | **Partial** | **Present** | **Risky** | **Broken** | **Critical**  
Risk legend: **Critical** | **High** | **Medium** | **Low** | **Info**

| Area | Status | Risk | Finding | Required Action |
|------|--------|------|---------|-----------------|
| Production isolation (overall) | Missing | Critical | No dedicated prod DB/secrets/API/frontend/mobile plane; staging Supabase and LAN URLs dominate runtime defaults | Create separate PROD env + codebase/config overlays; forbid shared staging credentials |
| Production database | Missing | Critical | Repo has no production Supabase/Postgres project wiring; clients hardcode staging project `rpcjelhacmkhzguljdgi` | Provision prod DB; migrate with audited pipeline; never share staging project |
| Production secrets | Missing / Risky | Critical | Local `.env` (gitignored) holds keys; tracked files contain anon/service JWTs and POS encryption material | Rotate all exposed keys; move secrets to vault/KMS; purge from git history |
| Hardcoded Supabase anon key (mobile) | Critical | Critical | `lib/main.dart` hardcodes staging Supabase URL + anon JWT | Inject via `--dart-define` / flavors; remove from source |
| Hardcoded service_role JWTs (scratch) | Critical | Critical | `invify-backend/scratch/test_supabase_direct.js`, `test_supabase_ts.ts` embed staging **service_role** JWTs | Delete/rotate immediately; exclude scratch from images; treat as incident |
| Hardcoded anon JWT (scratch) | Risky | High | `scratch/rls_penetration_test.ts` embeds anon key + password patterns | Remove secrets; use env-only test harnesses |
| Committed POS encryption key | Critical | Critical | `invify-backend/global_settings.json` contains `quasar_pos_encryption_key_base64` and LAN Quasar URL | Remove key from VCS; load from vault; rotate key |
| Flutter ships `.env` as asset | Risky | Critical | `pubspec.yaml` includes `.env`; default `BASE_URL` falls back to `http://192.168.1.193:3004` (`app_config.dart`) | Stop packaging `.env`; use flavors + compile-time defines; HTTPS prod API only |
| Flutter localhost OTP/onboarding | Risky | High | Multiple activation pages call `http://localhost:3004/...` before/with `AppConfig` | Remove localhost from release paths; flavor-gated debug only |
| Android cleartext traffic | Risky | High | `AndroidManifest.xml` `usesCleartextTraffic="true"` for release | Disable cleartext in release; network security config HTTPS-only |
| Android release signing | Partial | High | Release falls back to **debug** signing if `key.properties` missing | Fail release builds without production keystore |
| Flutter product flavors | Missing | High | Single `applicationId`; no dev/staging/prod flavors | Add flavors with separate app IDs, API hosts, Supabase projects |
| Admin API base URL | Partial | High | `VITE_API_URL` supported, but multiple governance pages hardcode ngrok host | Use env-only base URL; delete ngrok hardcodes |
| Admin mock tokens | Risky | High | Pages fall back to `mock-admin-token-123` / SSO mock JWTs | Fail closed without real auth in STAGING/PROD builds |
| Admin `.env.example` | Broken | Medium | Example file misaligned with Vite frontend needs | Rewrite frontend-specific `.env.example` / `.env.production.example` |
| Admin production env file | Missing | High | No `.env.production` for admin | Add CI-built prod env with HTTPS API + prod Supabase anon only |
| Quasar UI app | Present (scaffold) | Medium | Fake login; no real API; not production surface | Exclude from prod deploy; or rebuild as real control plane later |
| Legacy `backend/` tree | Present | High | Unauthenticated admin GETs; mock webhook helpers; Redis workers separate from TS backend | Quarantine/retire; do not deploy alongside prod |
| Dual backend ambiguity | Risky | High | Unclear which backend ships; infra CI references `backend/Dockerfile` (missing) | Single canonical backend (`invify-backend`); update all CI paths |
| Global TLS verify disabled | Critical | Critical | `app.ts` sets `NODE_TLS_REJECT_UNAUTHORIZED='0'` at boot for all HTTPS | Remove globally; allow only explicit local/dev override |
| Unauthenticated payment APIs | Critical | Critical | `/payments/create`, initialize, cancel, **refund**, history lack `authenticate` | Require auth + tenant authorization on all money-moving routes |
| Unauthenticated `/admin/lookup` | Risky | High | `POST /admin/lookup` has no auth | Protect with admin auth + RBAC |
| Agent change-password unauthenticated | Risky | High | Agent password change route reported without authenticate | Require auth + proof-of-possession / token validation |
| JWT verify fallback to decode | Critical | Critical | If `SUPABASE_JWT_SECRET` unset, `auth.middleware.ts` uses `jwt.decode` only | Fail boot in PROD without secret; never decode-only |
| Auto-provision as `super_admin` | Critical | Critical | Missing user profile defaults role to `super_admin` on insert | Default least privilege; deny auto-create in prod |
| Hardcoded privilege emails | Critical | Critical | `averyd777@gmail.com`, `sysadmin@iips.app`, etc. force/super-admin paths in auth | Remove email allowlists; use DB roles only |
| Auth email heuristic privilege | Risky | High | Login treats emails containing `admin` / `iips` as super-admin in paths | Delete heuristic privilege elevation |
| Mock auth bypasses | Partial | High | Gated by `isMockAuthAllowed` / `isMockTokenAllowed`, but Socket.IO still has `mock-super-admin` path; staging offline auth concerns | Ensure all sockets/HTTP paths fail closed when `BUILD_VARIANT=PROD` |
| Offline/staging auth | Risky | High | Offline/mock login paths exist for non-local variants in auth controller | Restrict strictly to LOCAL + explicit flag |
| Master mode password | Broken | High | `admin.controller.ts` TODO: password not actually verified | Implement real password/MFA verification or disable master mode |
| Rate limiting | Risky | High | Defaults effectively very high (~10000/15min) | Production-grade limits per route class |
| CORS | Partial | Medium | Prod empty allowlist if env unset; localhost defaults in non-prod | Explicit allowlist from env; fail if empty in PROD |
| Socket.IO security | Risky | High | `cors.origin: '*'`, mock token bypass, JWT decode-only / hardcoded tenant fallback | Match HTTP auth; restrict origins; no mock in PROD |
| Hardcoded crypto secrets | Critical | Critical | License HMAC `INVOLVE-SECURE-HMAC-SECRET-2024` in backend + Flutter; onboarding JWT fallback `your-super-secret-key-2026`; vault `insecure-dev-password` | Env/KMS secrets; fail boot if missing in PROD |
| `demo-key` Quasar fallback | Risky | High | Admin/onboarding fall back to `demo-key` when Quasar key missing | Fail loudly if Quasar key absent in STAGING/PROD |
| Payment webhook mock secrets | Risky | High | Defaults like `sk_test_mock_paystack_key_quasar` / `whsec_mock_*` | Require real secrets in PROD; refuse mock defaults |
| `sk_test_*` in financial paths | Partial | Critical | Factory blocks some POS with test keys, but sandbox surface + fallbacks remain | PROD must require `sk_live_*` only; separate sandbox deploy |
| QFS sandbox API | Present | High | Full `/api/v1/sandbox/*` surface in same app | Disable/remove sandbox routes from production binary |
| Banking adapters sandbox | Risky | High | Wema/Providus/etc. use `SandboxBankingSimulationService` | Real banking integrations only in PROD; simulation LOCAL/STAGING only |
| WhatsApp mock send | Risky | Medium | Missing Meta credentials → mock send outside production check paths | Fail closed in PROD when WhatsApp enabled but unconfigured |
| Idempotency registry mock | Critical | Critical | `IdempotencyRegistry.useMock = true` always (in-memory) | Durable DB-backed idempotency required for money ops in PROD |
| Queue durability | Partial | High | In-memory outside production; in-process workers; no separate worker process | Dedicated workers + durable queue for PROD |
| Cron / scheduled jobs | Partial | Medium | `setInterval` in `app.ts` (audit archive, nightly recon) — not HA-safe | External scheduler / leader election; durable jobs |
| Boot-time sample audit seed | Risky | Medium | `GovAuditService.seedSampleLogs()` on startup | Never seed demo audit data in PROD |
| Static `/uploads` + backups | Risky | Critical | Serves uploads; backup `.db` / dumps exist under backend tree | Stop serving backups; gitignore; store in secured object storage |
| Error leakage | Partial | High | Client responses include `err.message`; may expose internals | Generic client errors; structured server logs with redaction |
| Logging | Partial | Medium | `morgan('dev')`; no production JSON logging / PII redaction standard | Structured logs; scrub tokens, PANs, OTPs, secrets |
| Health checks | Broken | High | App: `/health`; K8s: `/liveness`, `/readiness` | Align probes; readiness should check DB/critical deps |
| Dockerfile entrypoint | Broken | Critical | `CMD ["node", "dist/main"]` vs `dist/app.js` | Fix CMD; multi-stage must exclude scratch/secrets |
| K8s ConfigMap | Partial | Critical | Sets `NODE_ENV=production` only — **no `BUILD_VARIANT=PROD`** | Require `BUILD_VARIANT=PROD` + fail-fast config validation |
| K8s secrets | Partial | High | Placeholder secret manifest | ExternalSecrets/Vault; never commit real values |
| Infrastructure templates | Partial | Medium | Blue-green/canary/observability YAML aspirational; CI paths broken | Either wire real pipelines or mark docs-only; fix path refs |
| CI production workflow | Partial | High | Expects missing scripts (`lint`, `test:e2e`); smoke against `api.invify.app` | Align scripts; gate deploy on tests + secret scan |
| Reproducible builds | Missing | High | No locked prod build matrix for mobile/admin; Flutter assets nondeterministic with local `.env` | Reproducible CI artifacts; pinned deps; SBOM |
| Feature flags | Partial | Medium | Build variant + chaos flag (`VITE_ENABLE_CHAOS`); financial feature gates incomplete | Explicit PROD flag set; chaos disabled; mock_data off |
| Tenant isolation | Partial | High | RBAC present but privilege hardcodes / service-role bypasses / missing auth on money routes undermine isolation | Fix auth holes; RLS audit; deny cross-tenant by default |
| Destructive ops protection | Partial | High | MFA on card settlement upload; master mode incomplete; some admin actions weak | MFA + dual control for payouts, refunds, vault rotate, tenant destroy |
| Financial auditability | Partial | Medium | Audit tables/migrations exist; sample seeding and incomplete engines weaken trust | Immutable audit for all money movements; no demo seeds |
| Agent/governance engines | Risky | High | Many TODOs: payouts, integrity, lineage not persisted | Do not enable live agent payouts until persistence + audit complete |
| Notification integrations | Partial | Medium | WhatsApp present; admin NotificationRouter email/SMS/FCM still TODO | Configure real providers or disable channels in PROD |
| Email integrations | Partial | Medium | Invite/retention links default to `http://localhost:9000` | Require `APP_URL` HTTPS in PROD |
| Device integrations | Present | Medium | Device registration, MPOS SDK, cleartext/LAN assumptions | Prod device enrollment over TLS; no LAN defaults |
| Storage | Partial | Medium | Local disk uploads; object storage only in infra templates | Prod object storage + signed URLs; no local disk persistence |
| WebSockets monitoring | Partial | Low | Admin websocket health page shows `ws://localhost:3004` | Env-driven WSS endpoints |
| Domain consistency | Risky | Medium | Mix of `api.invify.app`, `.co`, `.com`, `api-quasar.iips.app`, ngrok | Canonical domains per env; enforce in config schema |
| Migration determinism | Partial | High | Dual migration systems (`supabase/migrations` + `src/db/migrations`); scratch apply scripts | Single migration authority; CI apply/verify; documented rollback |
| Seed / demo accounts | Risky | High | Dev account lists in auth; commission seed SQL; sample audit logs | No auto demo users/accounts in PROD |
| Test payment providers | Risky | Critical | Mock gateway secrets + sandbox banking + QFS sandbox in same codebase | Separate binaries or compile-time exclusion for PROD |
| Hardcoded financial values | Partial | Medium | Defaults in `global_settings.json` (fees, commissions) | Env/tenant config; no committed encryption keys |
| Hardcoded ports / IPs | Risky | High | Widespread `3004`, `192.168.1.193`, `127.0.0.1` fallbacks in runtime paths | Remove from production codepaths |
| Hardcoded UUIDs | Partial | Info | System sentinel UUIDs in `constants.ts` (documented) | Keep as constants; ensure not used as real tenant keys in RLS filters |
| Monitoring / alerting | Missing | High | No live APM/Sentry wiring evident; infra YAML only | Prod metrics, tracing, error alerting, on-call |
| Secret scanning in CI | Missing | High | No evidence of mandatory gitleaks/trufflehog gate | Add pre-commit + CI secret scan; block merges |
| Production codebase separation | Missing | Critical | Single monorepo used for all envs; no prod overlay/tree as required by program | Establish dedicated prod config/codebase separation (overlays or prod branch/repo policy) without converting DEV into PROD |

---

## 4. Highest-priority blockers (P0)

These must be resolved before any production traffic or real money:

1. **Rotate and revoke** all exposed Supabase service_role / anon keys found in tracked scratch and client source; purge from git history.
2. **Remove** POS encryption key and LAN Quasar URL from `global_settings.json`; rotate the key.
3. **Remove** `NODE_TLS_REJECT_UNAUTHORIZED='0'` from default boot.
4. **Authenticate and authorize** all payment/refund/history and admin mutation routes.
5. **Fail closed** without `SUPABASE_JWT_SECRET`, `VAULT_MASTER_KEY`, webhook secrets, Quasar live keys, and `BUILD_VARIANT=PROD`.
6. **Eliminate** hardcoded super-admin emails and auto-`super_admin` provisioning.
7. **Disable** sandbox/QFS/mock banking/mock webhooks in the production artifact.
8. **Fix** Docker CMD and K8s probes; require durable idempotency for financial ops.
9. **Stop** shipping LAN `.env` / localhost / cleartext in mobile release builds.
10. **Provision** a true production database and secret plane that never shares staging credentials.

---

## 5. Explicit non-claims

| Claim | Status |
|-------|--------|
| Production ready | **No** |
| Production isolated from development | **No** |
| Production has its own database | **No** (not configured in repo) |
| Production has its own secrets | **No** |
| No secrets in source | **False** — secrets and key material found in tracked files |
| No localhost in production runtime config | **Cannot claim** — localhost/LAN still in client & server defaults |
| No mock/test providers in prod paths | **Cannot claim** |
| No auth bypass in production | **Cannot claim** without hardened build gates |
| Auditable financial ops only | **Cannot claim** (idempotency mocked; seeds; incomplete engines) |

---

## 6. Recommended next phases (after Phase 0)

| Phase | Goal |
|-------|------|
| 1 | Incident response: rotate leaked keys; quarantine scratch; stop serving backups |
| 2 | Define PROD / STAGING / DEV topology + canonical domains + secret inventory |
| 3 | Establish dedicated production codebase/config overlays (do **not** mutate DEV into PROD) |
| 4 | Harden auth, money routes, TLS, idempotency, webhook verification |
| 5 | Production DB + deterministic migrations + RLS verification |
| 6 | Client flavors (Flutter/Admin) with HTTPS-only prod endpoints |
| 7 | Real deploy pipeline (fixed Docker/K8s/CI) + observability |
| 8 | Production readiness re-audit and gated go-live checklist |

---

## 7. Evidence index (representative paths)

| Finding | Evidence |
|---------|----------|
| TLS disabled | `invify-backend/src/app.ts` (boot) |
| Open payment routes | `invify-backend/src/app.ts` payment route block |
| JWT decode fallback / super_admin insert | `invify-backend/src/middleware/auth.middleware.ts` |
| Privilege emails | `auth.middleware.ts`, `auth.controller.ts` |
| Wrong Docker CMD | `invify-backend/Dockerfile` |
| Probe mismatch | `invify-backend/k8s/deployment.yaml` vs `/health` |
| Staging Supabase in mobile | `lib/main.dart` |
| LAN API fallback | `lib/core/utils/app_config.dart` |
| POS key in settings | `invify-backend/global_settings.json` |
| Service role in scratch | `invify-backend/scratch/test_supabase_*.js|ts` |
| Always-mock idempotency | `invify-backend/src/services/idempotency/IdempotencyRegistry.ts` |
| License HMAC hardcode | `license.util.ts`, `lib/core/license/license_generator.dart` |
| Ngrok in admin | `invify-admin/src/pages/governance/*.vue` |
| Infra aspirational | `infrastructure/ci-cd/ci-cd-pipeline.yml` path mismatches |

---

**End of Phase 0 audit.**  
No production readiness claim is made. Proceed only after Phase 1 key rotation and an approved production isolation design.
