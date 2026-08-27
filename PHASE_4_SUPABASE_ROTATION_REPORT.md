# PHASE 4 — Staging Supabase credential rotation verification

**Date:** 2026-08-18  
**Production:** not touched  
**Live payments:** not enabled  
**FEATURE_REAL_MONEY_PAYOUTS:** `false`  
**Admin/Mobile interactive UAT:** STOPPED (provider rotation checks did not all PASS)

No secret values are included in this document.

---

## Scorecard

```text
Provider rotation:                 FAIL
Old service-role invalidated:      FAIL
Old anon invalidated:              FAIL
New staging credentials functional: PASS
ES256/JWKS authentication:         PASS
Secret scan:                       FAIL
Phase 2 regression:                PASS
Phase 3 regression:                PASS
Hardening regression:              PASS
```

**STOP.** Do not resume Admin/Mobile interactive UAT. Do not start production infrastructure. Do not enable live payments.

---

## Invalidation proof (no secret values)

Probed against the staging Supabase Auth settings endpoint (`/auth/v1/settings`).  
`401/403` = REJECTED. `200` = STILL VALID.

Source of “old” staging credentials: gitignored mixed developer `.env` (the leak plane that previously fed Compose / `docker inspect`), plus hardcoded copies in scratch files. Values were never printed.

```text
OLD service-role credential → STILL VALID
OLD anon credential         → STILL VALID
```

Evidence (fingerprints only):

| Candidate | Class | Project ref (JWT public claim) | Matches current `.env.staging` | Auth settings |
|---|---|---|---|---|
| Mixed `.env` service-role | legacy JWT `service_role` | staging project | **yes** | **200** |
| Mixed `.env` anon | legacy JWT `anon` | staging project | **yes** | **200** |
| Scratch `test_supabase_*.js/ts` | legacy JWT `service_role` | staging project | **yes** | **200** |
| Scratch `rls_penetration_test.ts` anon | legacy JWT `anon` | **dev** project (not staging) | no | 401 (wrong project; not a staging-rotation proof) |

`.env.staging` and mixed `.env` still carry the **same** staging service-role and staging anon material. The keys currently injected into the staging API are therefore the previously exposed ones, and the provider still accepts them.

`_p4_inspect*.txt` in this workspace are tiny leftover logs, not full inspect dumps, so they were not used as a second copy of the leaked keys.

---

## 1. Staging recreate (`.env.staging` only)

Command:

```text
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --force-recreate
```

Compose exit: **0**. Mixed developer `.env` was not used as `--env-file`.

Sanitized runtime (container process env; secrets printed only as SET / UNSET / INSECURE_DEFAULT):

```text
PORT=3000
BUILD_VARIANT=STAGING
NODE_ENV=staging
APP_ENV=staging
FEATURE_REAL_MONEY_PAYOUTS=false
OFFLINE_LOCAL_AUTH=false
OFFLINE_MOCK_AUTH=false
QUASAR_BASE_URL=UNSET
JWT_SECRET=<SET>
SUPABASE_JWT_SECRET=<SET>
LICENSE_HMAC_SECRET=<SET>
SUPABASE_SERVICE_ROLE_KEY=<SET>
SUPABASE_KEY=<SET>
```

No insecure JWT default was present in the running process.

---

## 2. Health

```text
/livez  → 200
/readyz → 200
/health → 200
```

---

## 3. Authentication (live staging)

`scripts/phase4_auth_uat.ts` (loads gitignored `.env.staging` over `.env`; no secret echo):

| Check | Result |
|---|---|
| `OFFLINE_LOCAL_AUTH=false` / `OFFLINE_MOCK_AUTH=false` | PASS |
| Real signup + login | PASS |
| Authenticated `/api/admin/profile` (`/me` equivalent) | PASS (200) |
| Protected `/payments/history` | PASS (200) |
| Invalid JWT | PASS (401) |
| Forged JWT | PASS (401) |
| Expired JWT | PASS (401) |
| `mock-super-admin` | PASS (401) |

`scripts/phase4_jwt_alg_probe.ts`:

```text
alg=ES256
kid=present
legacy HS256 verify of access token = FAIL (expected)
supabase auth.getUser = PASS
```

---

## 4. Supabase connectivity (service + tenant)

Using `.env.staging` only; no credentials printed.

| Check | Result |
|---|---|
| Staging host (not dev, not localhost) | PASS |
| Database access (`tenants` select, service-role) | PASS |
| Authenticated user lookup (`users` select) | PASS |
| Admin Auth API (`listUsers`) | PASS |
| Tenant-scoped `users` filter | PASS (query succeeded) |
| Anon key accepted by API | PASS (RLS denied `tenants` — key valid, not privileged) |

---

## 5. API key class audit

Invify is **not** on the new publishable/secret key classes yet.

| Plane | Preferred | Actual in this staging run |
|---|---|---|
| Client | publishable (`sb_publishable_`) only | **legacy JWT anon** |
| Backend | secret (`sb_secret_`) only | **legacy JWT service_role** |

No `sb_publishable_` / `sb_secret_` consumers were found in application source.

### Legacy anon consumers (do **not** disable yet)

- Backend anon client: `invify-backend/src/db/supabase.ts` via `BuildVariantService.getSupabaseConfig().key`
- Staging Compose: `STAGING_SUPABASE_KEY` → container `SUPABASE_KEY`
- Admin SPA: `invify-admin/src/supabase.js` (`VITE_SUPABASE_ANON_KEY`)
- Flutter: `lib/core/utils/app_config.dart` / `lib/main.dart` (`SUPABASE_ANON_KEY` dart-define; dotenv only in development)
- Phase 4 UAT scripts (`phase4_auth_uat.ts`, `phase4_jwt_alg_probe.ts`, others)

Elevated service-role is **not** referenced in Admin SPA, Flutter `lib/`, or Docker *client* artifacts. It is backend/Compose/scripts only — except the scratch leaks below.

### Legacy service_role consumers (do **not** disable yet)

- Backend admin client: `supabaseAdmin` in `invify-backend/src/db/supabase.ts`
- Staging/prod/local Compose: `SUPABASE_SERVICE_ROLE_KEY`
- Migrations under `invify-backend/src/db/migrations/`
- Phase 4 UAT scripts (auth, tenant isolation, financial sandbox, admin, worker)
- Scratch scripts (some **hardcode** a live staging service-role JWT — see secret scan)

**Do not disable legacy anon/service_role keys** until every consumer above is migrated to publishable/secret classes and re-verified.

---

## 6. Secret scan

Search covered source, tests, Compose, CI workflows, scripts, and documentation. Values were not printed. Gitignored `.env` / `.env.staging` were excluded from “committed source” hits.

| Check | Result | Notes |
|---|---|---|
| Exposed old staging **service-role** absent from source | **FAIL** | Present in `invify-backend/scratch/test_supabase_direct.js` and `invify-backend/scratch/test_supabase_ts.ts` (same fingerprint as current staging service-role) |
| Exposed old staging **anon** absent from source | PASS for *staging* anon | Current staging anon not found outside gitignored env files |
| Other hardcoded JWT anon in scratch | **FAIL (separate)** | `invify-backend/scratch/rls_penetration_test.ts` embeds a **dev**-project anon JWT (not staging; still must be removed) |
| Old staging secrets embedded in builds | PASS (this run) | `.dart_tool` skipped; no current staging anon hit in scanned source/build configs |
| Production credentials present | PASS | No production service-role/anon material found; placeholders only in Phase 3 tests |
| Hardcoded signing secrets used as runtime fallbacks | PASS | `onboarding.controller.ts` refuses missing `JWT_SECRET` (503). Known insecure strings exist only as a **deny list** in `security-boot.ts` / tests / rotation helper |
| Insecure JWT defaults in staging runtime | PASS | Container `JWT_SECRET=<SET>` and not an insecure default |
| Local Compose default | N/A to staging | `docker-compose.local.yml` still has a local-only JWT default — not used by this staging recreate |

Secret scan overall: **FAIL** because live staging service-role material remains hardcoded in scratch files.

---

## 7. Regression

| Suite | Command / artifact | Result |
|---|---|---|
| Phase 2 security | `test/phase2.security.lockdown.test.ts` | PASS |
| Phase 3 environment / idempotency / health | `test/phase3.environment.test.ts` | PASS |
| Phase 4 hardening | `test/hardening.test.ts` | PASS |
| Combined Jest | 3 suites, **37 passed / 0 failed** | PASS |
| Phase 4 authentication (live) | `scripts/phase4_auth_uat.ts` | PASS |
| ES256 / JWKS probe | `scripts/phase4_jwt_alg_probe.ts` | PASS |

---

## 8. What must happen before UAT resumes

Provider rotation is **not** complete until **both** leaked staging key classes return **REJECTED** against the staging project, and `.env.staging` contains **new** distinct fingerprints.

Required operator steps (do not paste secrets into chat):

1. In the **staging** Supabase project, rotate **both** the legacy anon key and the legacy service-role key (or issue new publishable/secret keys if migrating).
2. Write the new values **only** into gitignored `invify-backend/.env.staging`.
3. Recreate: `docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --force-recreate`
4. Remove hardcoded JWTs from `invify-backend/scratch/test_supabase_direct.js`, `test_supabase_ts.ts`, and `rls_penetration_test.ts`.
5. Re-run this verification. Resume Admin/Mobile interactive UAT only if every scorecard line above is PASS.

Until then:

- Treat the currently configured staging service-role and staging anon as **still compromised**.
- Do not start production.
- Keep `FEATURE_REAL_MONEY_PAYOUTS=false`.
