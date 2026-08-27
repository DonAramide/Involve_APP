# PHASE 4 — Runtime Secret Exposure Remediation Report

**Date:** 2026-08-17  
**Production:** not touched  
**Live payments:** not enabled  
**FEATURE_REAL_MONEY_PAYOUTS:** `false`  
**Admin/Mobile interactive UAT:** STOPPED (not resumed)

No secret values are included in this document.

---

## Executive result

App-owned staging signing secrets were rotated and the insecure JWT default was removed from staging runtime. **Supabase service-role / anon keys were not rotated at the provider** (no staging management token in this environment). Those provider credentials remain compromised until the operator resets them in the staging Supabase project.

```text
Runtime secret exposure: FAIL
Secret rotation: FAIL
Hardcoded fallback removal: PASS
Secret architecture: PASS
Repository secret scan: PASS
Docker runtime: PASS
Authentication regression: PASS
Security regression: PASS
```

---

## 1. What docker inspect exposed

The running staging API received secrets via Compose environment interpolation. A `docker inspect` of that container therefore dumps every injected variable in plaintext.

Credential-bearing names on the staging Compose contract (treat as **compromised** if they were set in the inspected container):

| Variable | Classification | Client-safe? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` / `STAGING_SUPABASE_SERVICE_KEY` | Backend service-role JWT | **No** |
| `SUPABASE_JWT_SECRET` | HS256 JWT signing secret (legacy) | **No** |
| `JWT_SECRET` | App offline/device JWT signing secret | **No** |
| `LICENSE_HMAC_SECRET` | License HMAC | **No** |
| `QUASAR_WEBHOOK_SIGNING_SECRET` | Webhook HMAC | **No** |
| `STAGING_SUPABASE_KEY` / `SUPABASE_KEY` | Supabase anon (public client class) | Public by design; still rotate after inspect |
| `STAGING_SUPABASE_URL` / `SUPABASE_URL` | Project URL | Public identifier |
| `QUASAR_BASE_URL` | Integration URL | Was **empty** in this staging run |

Host `.env` classification (values not printed):

| Name | Classification |
|---|---|
| `JWT_SECRET` | **INSECURE_DEFAULT** (`your-super-secret-key-2026`) — **actively used** in the pre-remediation staging container |
| `SUPABASE_JWT_SECRET` | SET_NONDEFAULT |
| `LICENSE_HMAC_SECRET` | SET_NONDEFAULT |
| `QUASAR_WEBHOOK_SIGNING_SECRET` | SET_NONDEFAULT |
| `STAGING_SUPABASE_SERVICE_KEY` | JWT_SHAPED (service-role) |
| Management / access token for Supabase | **UNSET** |

Repo `_p4_inspect*.txt` files are tiny leftover logs, not full inspect dumps. The live leak was the running container env.

---

## 2. `JWT_SECRET=your-super-secret-key-2026`

**Verdict: A — actively used** in the pre-remediation staging runtime (host `.env` matched the known insecure default).

Not merely legacy: Compose previously interpolated `JWT_SECRET` from the mixed developer `.env`, so staging signed/verified with that default.

Application source (`onboarding.controller.ts`) already refused to *fall back* to that string (503 if unset). The defect was **runtime configuration still setting the default as the real secret**.

Remediation:

- Generated a new staging `STAGING_JWT_SECRET` (not a hardcoded replacement).
- Replaced the insecure default in gitignored host `.env` (no value printed).
- Staging Compose now requires `STAGING_JWT_SECRET` (will not pick up mixed `.env` `JWT_SECRET`).
- `security-boot.ts` now **fail-closed** if `JWT_SECRET` / `SUPABASE_JWT_SECRET` / `LICENSE_HMAC_SECRET` equals a known insecure default.
- Remaining hardcoded fallbacks removed from legacy `backend/` auth paths and scratch/scripts.

---

## 3. Rotation status

| Secret | Provider | Status |
|---|---|---|
| `JWT_SECRET` / `STAGING_JWT_SECRET` | App-owned | **Rotated** |
| `SUPABASE_JWT_SECRET` / `STAGING_SUPABASE_JWT_SECRET` | Env value rotated to a new app-owned secret so the leaked HS secret no longer verifies on this API. **Supabase project JWT secret was not rotated in the dashboard** (no management API token). Staging access tokens are ES256/JWKS. | **Partial** |
| `LICENSE_HMAC_SECRET` | App-owned | **Rotated** |
| Webhook signing secret | App-owned | **Rotated** |
| Supabase service-role | Staging Supabase project | **Not rotated** — no `SUPABASE_ACCESS_TOKEN` / management credentials. Operator must reset API keys in the **staging** project only. |
| Supabase anon key | Staging Supabase project | **Not rotated** (same blocker). Public client class; still inspect-leaked. |

Production credentials were not read, rotated, or substituted.

**Operator required (staging project only):** Dashboard → API → reset service-role and anon keys → put new values only in gitignored `.env.staging` as `<STAGING_SECRET>` replacements. Then recreate the API. Do not use production keys.

---

## 4. Secret-loading architecture

Intended path:

```
Application source (no secrets)
        ↓
gitignored .env.staging  (--env-file)
        ↓
Compose interpolates STAGING_* names into container env
        ↓
STAGING runtime (process.env)
```

**Why the container started without `.env.staging`:** Docker Compose auto-loads `invify-backend/.env` for YAML substitution. The previous session exported that mixed file into the process environment and ran `docker compose -f docker-compose.staging.yml up -d`. Secrets therefore came from **developer `.env`**, not a dedicated staging secret plane.

Fix: Compose now requires:

- `STAGING_JWT_SECRET`
- `STAGING_SUPABASE_JWT_SECRET`
- `STAGING_LICENSE_HMAC_SECRET`

Start command:

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
```

Do **not** use `docker inspect` for diagnostics. Sanitized form only, e.g. `JWT_SECRET=<SET>`.

Dockerfile does not embed signing/service-role secrets (only `NODE_ENV`/`PORT`). Frontend/mobile must not receive service-role or signing secrets.

---

## 5. `.env.staging` mechanism

| Item | Status |
|---|---|
| Committed `.env.staging` | Must not exist (gitignored via `.env.*`) |
| `.env.staging.example` | Updated with **placeholders only** (`<STAGING_SECRET>`) |
| Local gitignored `.env.staging` | Created by operator helper `scripts/write_rotated_staging_env.ts` (values not committed, not logged) |

---

## 6. Docker / runtime verification (sanitized)

Image: `invify:58b5e459-p4-fin2` (pre-dates the new boot denylist in source; runtime no longer uses the insecure JWT default).

```text
PORT=3000
BUILD_VARIANT=STAGING
NODE_ENV=staging
APP_ENV=staging
FEATURE_REAL_MONEY_PAYOUTS=false
OFFLINE_LOCAL_AUTH=false
QUASAR_BASE_URL=UNSET
JWT_SECRET=<SET> (not insecure default)
SUPABASE_JWT_SECRET=<SET>
LICENSE_HMAC_SECRET=<SET>
SUPABASE_SERVICE_ROLE_KEY=<SET>
```

```text
/livez  → 200
/readyz → 200
/health → 200
```

The running image will include the insecure-default **boot refuse** only after a future staging image rebuild. Env rotation already removed the default from the live process.

---

## 7. Authentication regression (live staging)

`scripts/phase4_auth_uat.ts` (loads `.env.staging` then `.env`):

| Check | Result |
|---|---|
| Real login | PASS |
| Token verification / authenticated profile & payments history | PASS |
| Invalid token | PASS (401) |
| Forged JWT | PASS (401) |
| Expired JWT | PASS (401) |
| `mock-super-admin` | PASS (401) |
| `OFFLINE_LOCAL_AUTH=false` | PASS |

JWT alg probe (`scripts/phase4_jwt_alg_probe.ts`):

```text
login_status=200 alg=ES256 kid=present
legacy_hs_verify=FAIL (expected for ES256)
supabase_getUser=PASS
```

---

## 8. Security regression

| Suite | Result |
|---|---|
| Phase 2 lockdown + commission | **PASS** (included new insecure-default boot test) |
| Phase 3 environment / idempotency / health | **PASS** |
| Combined | **51 passed / 0 failed** |

---

## 9. Repository leak scan (no values)

| Path | Variable / artifact | Classification | Remediated? |
|---|---|---|---|
| Host gitignored `.env` | `JWT_SECRET` was insecure default | Staging runtime signing secret | **Yes** (replaced locally; not committed) |
| `invify-backend/src/config/security-boot.ts` | denylist of known default **names** | Fail-closed boot | **Yes** |
| `invify-backend/src/controllers/onboarding.controller.ts` | no hardcoded JWT fallback | App signing | Already fail-closed |
| `invify-backend/docker-compose.staging.yml` | `STAGING_*` interpolation | Staging inject | **Yes** |
| `invify-backend/docker-compose.local.yml` | LOCAL-only `${JWT_SECRET:-local-dev-...}` | Local fallback | LOCAL-only; not staging/prod |
| `invify-backend/.github/workflows/*.yml` | CI test secrets (`ci-test-*-32chars`) | CI fixtures | Test-only; not staging runtime |
| `invify-backend/test/*.ts` | test JWT strings | Test fixtures | Test-only |
| `backend/src/services/auth.service.js` | JWT fallback | Legacy backend | **Yes** (require env) |
| `backend/src/api/middleware/auth.middleware.js` | JWT fallback | Legacy backend | **Yes** |
| `backend/tests/integration/dashboard.integration.test.js` | hardcoded test HMAC | Test | **Yes** (env required) |
| `invify-backend/scripts/dashboard_physical_validation.ts` | JWT fallback | Scratch/script | **Yes** |
| `invify-backend/scratch/verify_p6_2.ts` | JWT fallback | Scratch | **Yes** |
| `invify-backend/scratch/test_direct_ipv6.ts` | hardcoded password guesses | Scratch | **Yes** (env only) |
| `invify-backend/scratch/dump_credentials.ts` | prints decrypted vault values | Scratch dumper | **Partial** (refuses staging/prod) |
| `PHASE_2_SECURITY_REMEDIATION_REPORT.md` | historical finding name | Documentation | N/A (not a runtime secret) |
| `PRODUCTION_READINESS_AUDIT.md` | historical finding name | Documentation | N/A |
| `invify-admin` staging dist | API base / anon JWT | Client-safe anon | Unchanged; not service-role |
| `invify-admin/src/services/realtime/RealtimeConnectionManager.js` | `sk_live_enterprise_default` placeholder | UI/default string | Not a live payment credential |
| Dockerfile | no signing/service-role ENV | Image | PASS |

No production credentials were found as staging runtime replacements.

---

## Remaining limitations

1. **Rotate staging Supabase service-role and anon keys in the staging project dashboard**, then update gitignored `.env.staging` and recreate. Until then those inspect-leaked keys remain valid.
2. Rotate the **staging project's** legacy JWT secret in Supabase if HS256 issuance is still enabled there (this API now uses a distinct env HS secret; live tokens are ES256).
3. Rebuild a new staging image to ship `security-boot` insecure-default refusal into the container.
4. Anyone with Docker access can still `inspect` env; treat Docker host access as equivalent to secret access. Prefer secret files / a secret manager later.
5. Do not resume Admin/Mobile interactive UAT until provider key rotation is done.
6. Do not enable live payments or `FEATURE_REAL_MONEY_PAYOUTS`.

---

## Scoreboard

```text
Runtime secret exposure: FAIL
Secret rotation: FAIL
Hardcoded fallback removal: PASS
Secret architecture: PASS
Repository secret scan: PASS
Docker runtime: PASS
Authentication regression: PASS
Security regression: PASS
Remaining: staging Supabase service-role/anon rotation in provider dashboard
```

**STOP.** Do not continue Admin/Mobile UAT. Do not start production infrastructure.
