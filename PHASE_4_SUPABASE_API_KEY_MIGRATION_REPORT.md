# PHASE 4 — Supabase API key migration report

**Date:** 2026-08-18  
**Scope:** STAGING only  
**Production:** not modified  
**Legacy anon/service_role:** **NOT disabled** (per instructions)  
**Live payments / FEATURE_REAL_MONEY_PAYOUTS:** unchanged (`false`)

No secret values appear in this document.

---

## Executive summary

Invify **source code** is migrated to Supabase **publishable** (client) and **secret** (backend) key classes for staging. Staging runtime verification is **BLOCKED** because gitignored `invify-backend/.env.staging` on this machine still contains **legacy JWT** keys only — the new `sb_publishable_*` / `sb_secret_*` values were not found under the canonical variable names (or any gitignored env file).

```text
Code migration (staging):          PASS
Scratch hardcoded credential purge: PASS
Unit regression (Phase 2/3/4/hardening): PASS
Staging env normalization:         FAIL (publishable/secret not present in .env.staging)
Staging Docker recreate + UAT:     BLOCKED (depends on env normalization)
Admin/Flutter staging build scan:  BLOCKED (depends on publishable key in build env)
Legacy key disablement:            NOT PERFORMED (correct)
```

**STOP** before disabling legacy Supabase keys.

---

## 1. Consumer inventory

| Consumer | Class | Previous key | Staging target | Status |
|---|---|---|---|---|
| `build-variant.ts` (STAGING) | BACKEND | `STAGING_SUPABASE_KEY` / `STAGING_SUPABASE_SERVICE_KEY` | `STAGING_SUPABASE_PUBLISHABLE_KEY` / `STAGING_SUPABASE_SECRET_KEY` | **Migrated** — no legacy fallback |
| `supabase.ts` / `supabaseAdmin` | BACKEND | via BuildVariant | publishable + secret | **Migrated** |
| `security-boot.ts` (STAGING) | BACKEND | tolerated legacy env | requires `sb_publishable_*` + `sb_secret_*`; rejects legacy staging env names | **Migrated** |
| `docker-compose.staging.yml` | BACKEND | `STAGING_SUPABASE_KEY`, `STAGING_SUPABASE_SERVICE_KEY` | `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_SUPABASE_SECRET_KEY` | **Migrated** |
| Phase 4 UAT scripts (`phase4_*`) | SCRIPT | mixed `.env` + legacy names | `.env.staging` only + new names | **Migrated** |
| `apply_staging_idempotency.ts` | SCRIPT | `STAGING_SUPABASE_SERVICE_KEY` | `STAGING_SUPABASE_SECRET_KEY` | **Migrated** |
| `scripts/lib/staging-supabase-env.ts` | SCRIPT | — | shared loader/validators | **Added** |
| `scripts/normalize_staging_supabase_env.ts` | SCRIPT | — | rewrites `.env.staging` + `invify-admin/.env.staging` | **Added** |
| DB migrations `001`–`004` | MIGRATION | `SUPABASE_SERVICE_ROLE_KEY` inline | `migration-env.ts` → `STAGING_SUPABASE_SECRET_KEY` when staging | **Migrated** |
| `invify-admin/src/supabase.js` | CLIENT | `VITE_SUPABASE_ANON_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY` (staging/prod required) | **Migrated** |
| `lib/core/utils/app_config.dart` | CLIENT | `SUPABASE_ANON_KEY` dart-define | `SUPABASE_PUBLISHABLE_KEY` (staging/prod required) | **Migrated** |
| `lib/main.dart` | CLIENT | anon messaging | publishable messaging | **Migrated** |
| `scratch/test_supabase_*` | SCRATCH | hardcoded service-role JWT | env from `.env.staging` only | **Cleaned** |
| `scratch/rls_penetration_test.ts` | SCRATCH | hardcoded dev anon JWT | env-only | **Cleaned** |
| `docker-compose.local.yml` | BACKEND (LOCAL) | legacy names | unchanged | **LOCAL preserved** |
| `docker-compose.prod.yml` | BACKEND (PROD) | legacy names | unchanged | **PROD untouched** |
| Mixed developer `.env` | SCRATCH/DEV | legacy JWT staging copies | not used for staging compose | **Isolated** |

---

## 2. Client migration

### Admin (`invify-admin`)

- `src/supabase.js` now requires `VITE_SUPABASE_PUBLISHABLE_KEY` for **STAGING/PROD** builds.
- LOCAL builds may still fall back to `VITE_SUPABASE_ANON_KEY` during transition.
- Added `invify-admin/.env.staging.example` with publishable key placeholder.

### Flutter (`lib/`)

- Staging/production builds require `--dart-define=SUPABASE_PUBLISHABLE_KEY=...`.
- `supabaseAnonKey` is now an alias of `supabasePublishableKey`.
- LOCAL development may still use `SUPABASE_ANON_KEY` dart-define or dotenv.

### Source scan (client planes)

- No `sb_secret_*`, `service_role`, or `SUPABASE_SERVICE_*` references under `invify-admin/src` or `lib/`.

---

## 3. Backend migration

- Staging `BuildVariantService.getSupabaseConfig()` reads **only**:
  - `STAGING_SUPABASE_URL`
  - `STAGING_SUPABASE_PUBLISHABLE_KEY`
  - `STAGING_SUPABASE_SECRET_KEY`
- `security-boot.ts` fail-closed if staging runtime still sets legacy `STAGING_SUPABASE_KEY`, `STAGING_SUPABASE_SERVICE_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.
- Pre-built Docker image with migration code: **`invify:p4-supabase-key-mig`**

---

## 4. Worker / script migration

All Phase 4 staging scripts now load **`invify-backend/.env.staging` only** (not mixed `.env`) via `scripts/lib/staging-supabase-env.ts`:

- `phase4_auth_uat.ts`
- `phase4_jwt_alg_probe.ts`
- `phase4_tenant_isolation_uat.ts`
- `phase4_financial_sandbox_uat.ts`
- `phase4_admin_staging_uat.ts`
- `phase4_worker_staging_uat.ts`

---

## 5. Migration tooling

- `src/db/migrations/migration-env.ts` — resolves elevated credentials from execution environment; staging requires `STAGING_SUPABASE_SECRET_KEY`.
- Migrations `001`–`004` updated to use the helper (no embedded credentials).

---

## 6. Scratch cleanup

| File | Before | After |
|---|---|---|
| `scratch/test_supabase_direct.js` | hardcoded staging service-role JWT | requires `STAGING_SUPABASE_URL` + `STAGING_SUPABASE_SECRET_KEY` from `.env.staging` |
| `scratch/test_supabase_ts.ts` | hardcoded staging service-role JWT | same |
| `scratch/rls_penetration_test.ts` | hardcoded dev anon JWT | env-only elevated + publishable/anon key |

No live credential strings remain in these scratch files.

---

## 7. Environment naming

### Canonical staging names (required)

```text
STAGING_SUPABASE_URL
STAGING_SUPABASE_PUBLISHABLE_KEY   # sb_publishable_*
STAGING_SUPABASE_SECRET_KEY        # sb_secret_*
```

### Removed from staging compose / runtime

```text
STAGING_SUPABASE_KEY
STAGING_SUPABASE_SERVICE_KEY
SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Operator action required

On this machine, `normalize_staging_supabase_env.ts` reported:

```text
PUBLISHABLE_CLASS=UNSET
SECRET_CLASS=UNSET
NORMALIZE=FAIL
```

The gitignored `invify-backend/.env.staging` still classifies Supabase keys as **legacy JWT**, not `sb_publishable_*` / `sb_secret_*`.

**After adding the new keys to `.env.staging` under the canonical names**, run:

```text
cd invify-backend
npx ts-node --transpile-only scripts/normalize_staging_supabase_env.ts
```

This rewrites:

- `invify-backend/.env.staging` (drops legacy Supabase key lines)
- `invify-admin/.env.staging` (sets `VITE_SUPABASE_PUBLISHABLE_KEY`)

Then recreate staging:

```text
STAGING_IMAGE=invify:p4-supabase-key-mig docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --force-recreate
```

---

## 8. Artifact scan

| Artifact | Status | Notes |
|---|---|---|
| Admin STAGING build | **BLOCKED** | needs `invify-admin/.env.staging` with publishable key |
| Flutter STAGING build | **BLOCKED** | needs `--dart-define=SUPABASE_PUBLISHABLE_KEY=...` |
| Backend source/client bundles | **PASS** | no `sb_secret_*` in admin/mobile source |

Expected after successful builds:

- `sb_publishable_*` may appear in client artifacts (OK)
- `sb_secret_*`, legacy service-role JWT, signing secrets must not appear in client artifacts

---

## 9. Staging runtime verification

**Not executed** — blocked on env normalization.

Planned checks once `.env.staging` is updated:

| Check | Expected |
|---|---|
| `/livez` `/readyz` `/health` | 200 |
| `phase4_auth_uat.ts` | PASS (ES256, /me, rejections) |
| `phase4_jwt_alg_probe.ts` | PASS |
| Tenant isolation UAT | PASS |
| Financial sandbox UAT | PASS |

---

## 10. Regression (unit / harness)

Executed:

```text
test/phase2.security.lockdown.test.ts   PASS
test/phase3.environment.test.ts       PASS
test/hardening.test.ts                PASS
test/phase4.tenant.isolation.test.ts  PASS
```

Backend TypeScript compile: **PASS**  
Docker image build: **`invify:p4-supabase-key-mig` PASS**

Live staging UAT scripts: **NOT RUN** (missing publishable/secret in `.env.staging`).

---

## 11. Remaining legacy consumers

### Staging runtime (after env update)

**Target: zero** legacy anon/service_role consumers once `.env.staging` is normalized and stack recreated.

### Still using legacy names by design

| Plane | Consumers | Notes |
|---|---|---|
| LOCAL | `docker-compose.local.yml`, `build-variant.ts` LOCAL branch | intentional — not changed |
| PROD | `docker-compose.prod.yml`, `build-variant.ts` PROD branch | **not migrated in this task** |
| LOCAL dev clients | Admin `VITE_SUPABASE_ANON_KEY` fallback; Flutter `SUPABASE_ANON_KEY` in dev | transition fallback only |
| Mixed developer `.env` | legacy JWT copies | must not be used with `--env-file .env.staging` |

### Legacy keys at Supabase provider

**NOT disabled.** Prior rotation report still applies: exposed legacy staging keys were **STILL VALID** until provider disablement after full verification.

---

## 12. Final recommendation

1. Add `STAGING_SUPABASE_PUBLISHABLE_KEY` and `STAGING_SUPABASE_SECRET_KEY` to gitignored `invify-backend/.env.staging` (remove legacy `STAGING_SUPABASE_KEY` / `STAGING_SUPABASE_SERVICE_KEY` lines).
2. Run `scripts/normalize_staging_supabase_env.ts`.
3. Recreate staging with image `invify:p4-supabase-key-mig`.
4. Re-run Phase 4 auth, tenant isolation, and financial sandbox UAT.
5. Build Admin (`vite build --mode staging`) and Flutter staging with publishable dart-define; scan artifacts.
6. Prove new keys work and old legacy keys are rejected (separate rotation verification).
7. **Only then** disable legacy anon/service_role in the Supabase STAGING project.

**Do not disable legacy keys yet.**
