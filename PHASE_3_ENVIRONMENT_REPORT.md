# PHASE 3 — Environment Separation + Configuration + Deployment Foundation

**Date:** 2026-08-13  
**Phase status:** COMPLETE (foundation only — awaiting approval for Phase 4)  
**Production traffic:** NOT activated  
**Live payment providers:** NOT enabled  
**Production-ready declaration:** NO  

---

## Environment Architecture

Single repository, single application codebase, three configuration planes:

| Plane | Variant | Database | Secrets | Integrations |
|---|---|---|---|---|
| Development | `LOCAL` | DEV / LOCAL Supabase | DEV | mock/sandbox allowed |
| Staging | `STAGING` | STAGING Supabase | STAGING | sandbox/test |
| Production | `PROD` | PRODUCTION Supabase | PRODUCTION | real providers gated off |

Promotion path: `feature/* → main → CI build → STAGING → QA/UAT → approval → tag → PRODUCTION definition (not live)`.

Docs: `docs/ENVIRONMENT_CONFIGURATION_MATRIX.md`, `docs/DEPLOYMENT_ARCHITECTURE.md`.

---

## Development Environment

- Compose: `invify-backend/docker-compose.local.yml`
- `BUILD_VARIANT=LOCAL`, localhost/LAN allowed for engineering only
- Flutter debug may use `http://127.0.0.1:3004`; release/staging/production require dart-defines
- Admin Vite proxy / empty `VITE_API_URL` in development

## Staging Environment

- Compose: `invify-backend/docker-compose.staging.yml` (reproducible definition)
- Required staging Supabase + JWT + license secrets (`:?` fail if missing)
- `FEATURE_REAL_MONEY_PAYOUTS=false`
- Health: `/readyz`
- Deploy path defined; optional CI smoke when `STAGING_API_URL` set

## Production Environment

- Compose: `invify-backend/docker-compose.prod.yml` — **foundation only**
- Secrets are placeholders/references only — none committed
- `BUILD_VARIANT=PROD` required; boot refuses mock auth, simulators, dev endpoints
- `FEATURE_REAL_MONEY_PAYOUTS` defaults **false**
- GitHub `production` environment approval on release tags
- **No live traffic in Phase 3**

---

## Configuration Architecture

- Backend: `BUILD_VARIANT` + `APP_ENV` + env-scoped `*_SUPABASE_*`
- Fail-fast when production claimed without `BUILD_VARIANT=PROD`
- Staging/prod refuse localhost/LAN/ngrok Supabase URLs
- Admin: `resolveApiBaseUrl()` + `VITE_BUILD_VARIANT` fail-fast
- Mobile: `APP_ENV` + `API_BASE_URL` + Supabase dart-defines; staging≠prod URL heuristics

## Secrets Architecture

Documented in `docs/SECRETS_MANAGEMENT.md`.  
DEV / STAGING / PROD secret planes are independent. No secret values in git.

## Database Migration Strategy

Documented in `docs/DATABASE_MIGRATION_STRATEGY.md`.

| Decision | Value |
|---|---|
| Authoritative path | `invify-backend/supabase/migrations/` |
| TS runners | Operational only; require explicit URL; no hardcoded remote default |
| Production path | Same SQL files, explicit PRODUCTION target after staging apply + review |

Idempotency migration: `20260813000000_p20_payment_idempotency_constraints.sql`  
(tenant-scoped unique index + `payment_idempotency_keys` table). **Not auto-applied at boot.**

## Docker Changes

| Item | Result |
|---|---|
| Entrypoint | `CMD ["node", "dist/app.js"]` (verified; `dist/main.js` does not exist) |
| Build assert | `RUN test -f dist/app.js` |
| HEALTHCHECK | Node fetch → `/livez` (no wget dependency) |
| Compose health | Node fetch → `/livez` or `/readyz` |

## Health/Readiness Contract

| Endpoint | Meaning |
|---|---|
| `/livez` | Process alive |
| `/readyz` | Ready for traffic |
| `/health` | Compatibility + contract documentation |
| `/liveness` `/readiness` `/healthz` | Aliases only |

Aligned: Dockerfile, Compose, `invify-backend/k8s`, CI smoke.  
`infrastructure/k8s` remains non-authoritative (legacy probe mismatch documented).

## CI/CD Architecture

- Authoritative: GitHub Actions under `invify-backend/.github/workflows/`
- `ci.yml`: build → test → security subset → container smoke → optional staging
- `production.yml`: tag `v*.*.*` → validate → Trivy → **approval environment** → image push → optional smoke
- Ordinary `main` commits do **not** auto-deploy production

## Worker Architecture

Documented in `docs/WORKER_ARCHITECTURE.md`.  
Jobs remain in-process timers; financial durable workers deferred.  
Minimal fix: governance sample seed runs **LOCAL only**.

## Mobile Configuration

`lib/core/utils/app_config.dart`:
- `APP_ENV` = development | staging | production
- Required defines for non-dev / release
- Rejects localhost/LAN/ngrok outside development
- Guards staging↔production URL mixups

## Admin Configuration

- `src/config/env.js` — `resolveApiBaseUrl()` fail-fast
- `src/config/buildVariant.ts` — production requires `VITE_BUILD_VARIANT=PROD`
- Governance pages (MFA / Session / Tenant) use `resolveApiBaseUrl()`

## Payment Environment Separation

- App-level idempotency (Phase 2) + DB constraint migration (Phase 3)
- `IdempotencyRegistry` scoped by `(tenant_id, operation, key)` → `payment_idempotency_keys`
- Real-money payouts still require PROD **and** explicit feature flag (flag off)
- No live credentials created

---

## Tests Executed

| Suite | Result |
|---|---|
| `phase2.security.lockdown.test.ts` + `commission.security.test.ts` | **PASS (38)** — no regression |
| `phase3.environment.test.ts` | **PASS (12)** |
| Combined | **50/50 PASS** |

Phase 3 coverage includes:
- BuildVariant fail-fast (missing/LOCAL under production)
- SecurityBoot rejects mock auth / missing JWT / localhost Supabase
- Idempotency same-tenant duplicate vs cross-tenant isolation
- `/livez` `/readyz` `/health` HTTP contract

## Docker Status

| Check | Status |
|---|---|
| Entrypoint contract in Dockerfile | Fixed |
| `npm run build` → `dist/app.js` contains `/livez` | Verified |
| Process smoke: start `node dist/app.js`, hit `/livez` `/readyz` `/health` | **200 OK** |
| `docker build` on this host | **Blocked** — Docker daemon unresponsive (no output / hung CLI); image build not completed here |

CI workflow still defines container smoke for environments with a working Docker daemon.

## Staging Status

Deployment **definition ready** (`docker-compose.staging.yml` + CI optional path).  
Not claimed as live-deployed in this phase.

## Production Infrastructure Status

Deployment **definition ready** (`docker-compose.prod.yml` + approval-gated workflow).  
**Not activated.** No production traffic. No live payments.

---

## Remaining CRITICAL Findings

1. Docker image build/runtime verification pending on a host with a healthy Docker daemon (entrypoint fixed; process smoke passed).
2. Idempotency SQL not yet **applied** to staging/production databases (migration exists; apply is an ops step).

## Remaining HIGH Findings

1. In-process financial workers (reconciliation) without distributed locking — documented for Phase 4.
2. Dual aspirational infra (`infrastructure/k8s`) still mismatched — marked non-authoritative.
3. Admin pages that still read `VITE_API_URL || ''` directly (boot path fail-fast mitigates; full call-site migration incomplete).
4. Scratch scripts with historical staging URLs — quarantine for Phase 4 cleanup.
5. Flutter ngrok header leftovers / sample LAN strings in admin tooling UIs (non-runtime shipping paths partially remain).

## Remaining MEDIUM Findings

1. Telemetry still mocks disk/network metrics.
2. No `ENABLE_INPROCESS_WORKERS` split yet.
3. Vite `operations.sdk.ts` may use alternate `VITE_API_BASE_URL` naming — align later.

## Deferred Items

- Live payment provider enablement
- Production traffic cutover
- Durable worker platform rewrite
- Deleting legacy `backend/` or either migration tree
- Applying migrations to real staging/prod projects
- Customer data migration

## Recommended Phase 4

1. Apply `supabase/migrations` (including idempotency) to a dedicated staging DB; verify runners against staging only with explicit env.
2. Stand up durable workers / locks for nightly reconciliation & settlement.
3. Complete admin call-site migration to `resolveApiBaseUrl`; Flutter flavor CI matrices.
4. Quarantine/delete scratch hardcoded staging URLs; retire non-authoritative infra or align probes.
5. Staging UAT + smoke under CI with real `STAGING_API_URL`.
6. Keep production gated; do not enable `FEATURE_REAL_MONEY_PAYOUTS`.

---

## STOP

Phase 3 establishes infrastructure and configuration foundation only.  
**Do not proceed to Phase 4 without explicit approval.**
