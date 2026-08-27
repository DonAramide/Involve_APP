# PHASE 4 — Post-Supabase-Key-Migration Staging UAT Report

**Date:** 2026-08-18  
**Scope:** STAGING only  
**Image:** `invify:p4-supabase-key-mig`  
**Staging API:** `http://staging-api.invify.local:3000`  
**Staging Supabase host:** `rpcjelhacmkhzguljdgi.supabase.co`

**Not performed:** production changes, live payments, `FEATURE_REAL_MONEY_PAYOUTS=true`, disablement of legacy anon / service_role keys.

No secret values appear in this document.

---

## Scorecard

| Gate | Result |
|---|---|
| Staging stack | **PASS** |
| Health | **PASS** |
| Authentication | **PASS** |
| Backend Supabase access | **PASS** |
| Admin staging | **PASS** |
| Flutter staging | **PASS** |
| Tenant isolation | **PASS** |
| Financial sandbox | **PASS** (provider-confirmed refund SUCCESS remains blocked) |
| Security regression | **PASS** |
| Secret scan | **PASS** |
| Legacy consumers (staging runtime) | **0** |
| Legacy key disablement | **NOT PERFORMED** (correct) |

**Overall post-migration staging verification: PASS**

**STOP.** Do not disable legacy Supabase keys yet.

---

## Safety posture (verified)

| Control | Value |
|---|---|
| `PORT` | `3000` |
| `BUILD_VARIANT` | `STAGING` |
| `NODE_ENV` | `staging` |
| `APP_ENV` | `staging` |
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` |
| `OFFLINE_LOCAL_AUTH` | `false` |
| `OFFLINE_MOCK_AUTH` | `false` |
| `QUASAR_BASE_URL` / `STAGING_QUASAR_BASE_URL` | unset (no live / production Quasar) |
| `STAGING_SUPABASE_SECRET_KEY` | SET (class SECRET; value not printed) |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | SET (class PUBLISHABLE; value not printed) |
| `SUPABASE_SERVICE_ROLE_KEY` | UNSET in staging container |
| `SUPABASE_KEY` / `STAGING_SUPABASE_KEY` / `STAGING_SUPABASE_SERVICE_KEY` | UNSET in staging container |
| Production routing / DB | not used |

Normalization (operator-reported, then re-verified by class checks only):

```text
PUBLISHABLE_CLASS=PUBLISHABLE
SECRET_CLASS=SECRET
URL_SET=true
NORMALIZE=PASS
```

Stack recreate:

```text
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --force-recreate
```

---

## 1. Staging stack

| Check | Result | Evidence |
|---|---|---|
| Image | **PASS** | `invify:p4-supabase-key-mig` |
| Compose injects publishable + secret only | **PASS** | `docker-compose.staging.yml` — no `STAGING_SUPABASE_KEY` / `STAGING_SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` interpolation |
| Security-boot refuses legacy staging env names | **PASS** | staging boot requires `sb_publishable_*` + `sb_secret_*` |
| Real-money payouts | **PASS** | compose hard-sets `FEATURE_REAL_MONEY_PAYOUTS=false` |

**Staging stack: PASS**

---

## 2. Health

Target: `http://staging-api.invify.local:3000`

| Endpoint | Result |
|---|---|
| `/livez` | **PASS** HTTP 200 |
| `/readyz` | **PASS** HTTP 200 |
| `/health` | **PASS** HTTP 200 |

**Health: PASS**

---

## 3. Authentication

Scripts: `invify-backend/scripts/phase4_auth_uat.ts`, `invify-backend/scripts/phase4_jwt_alg_probe.ts`  
`STAGING_API_URL=http://staging-api.invify.local:3000`

Real staging Auth against the **new** publishable/secret pair (values not printed).

| Test | Result | Evidence |
|---|---|---|
| Login | **PASS** | HTTP 200, access token issued |
| Token refresh | **PASS** | Supabase refresh succeeded |
| `/me` (authenticated profile) | **PASS** | `/api/admin/profile` + `/payments/history` HTTP 200 |
| Logout / session | **PASS** | client discard model; unauthenticated follow-up 401 |
| Access token `alg` | **PASS** | `ES256`, `kid` present |
| JWKS verification | **PASS** | middleware verifies via staging JWKS |
| HS256 verify of access token | **PASS** (expected fail) | HMAC verify of ES256 token fails |
| `getUser` | **PASS** | Supabase Auth accepts token |
| Invalid token | **PASS** | HTTP 401 |
| Forged token | **PASS** | HTTP 401 |
| Expired token | **PASS** | HTTP 401 |
| `mock-super-admin` | **PASS** | HTTP 401 |
| `OFFLINE_LOCAL_AUTH` | **PASS** | `false` in staging runtime |

**Authentication: PASS**

---

## 4. Backend Supabase access

Script: `invify-backend/scripts/phase4_post_migration_verify.ts`  
Uses `STAGING_SUPABASE_SECRET_KEY` / `STAGING_SUPABASE_PUBLISHABLE_KEY` from gitignored `.env.staging` only. Values not printed.

| Test | Result | Evidence |
|---|---|---|
| Key classes | **PASS** | `secret=SECRET publishable=PUBLISHABLE` |
| Staging host | **PASS** | `rpcjelhacmkhzguljdgi.supabase.co` |
| Secret: `tenants` select | **PASS** | `tenants_select_ok` |
| Secret: `users` select | **PASS** | `users_select_ok` |
| Secret: tenant-scoped query | **PASS** | tenant filter succeeded |
| Secret: Auth Admin `listUsers` | **PASS** | `list_users_ok` |
| Publishable: Auth settings | **PASS** | HTTP 200 |
| Publishable: not privileged | **PASS** | RLS denied `tenants` (key accepted, not service-role) |
| Legacy names in `.env.staging` | **PASS** | `legacy_present=false` |

**Backend Supabase access: PASS**

---

## 5. Admin staging

### Build

```text
npx vite build --mode staging
```

Built successfully (~24s). Artifact: `invify-admin/dist`.

### Authenticated API UAT

Script: `invify-backend/scripts/phase4_admin_staging_uat.ts`  
Same staging API + new secret/publishable pair. Interactive browser UAT was not required; API evidence covers the requested surfaces.

| Surface | Result | Evidence |
|---|---|---|
| Login (tenant + platform admin fixtures) | **PASS** | real staging login |
| Cross-portal (tenant creds on admin portal) | **PASS** | rejected |
| Authenticated API / tenant context | **PASS** | own-scoped invoices, payments history, ledger, devices HTTP 200; no tenant B leak |
| RBAC | **PASS** | tenant denied reconciliation job; platform admin can list tenants |
| Invoice access | **PASS** | `/api/v1/finance/invoices` + status filter |
| Payment history | **PASS** | `/payments/history` |
| Refund screens (authz) | **PASS** | unauthenticated refund HTTP 401; no invented provider SUCCESS |
| Logout / session | **PASS** | missing auth → 401 |
| Real-money payout | **PASS** | still denied |

### Artifact scan (`invify-admin/dist`)

| Check | Result |
|---|---|
| `sb_publishable_*` present | **Allowed** — present |
| `sb_secret_*` | **PASS** — absent |
| service-role JWT | **PASS** — absent |
| JWT signing / HMAC / webhook secrets | **PASS** — absent |
| Staging API host `staging-api.invify.local` | **PASS** — present in artifact |
| Production API credentials / routing | **PASS** — no production credentials. One `api.invify.app` string is a vault UI hint (`hint="e.g. https://api.invify.app"` in `CredentialManagerDialog.vue`), not the Admin API base |

**Admin staging: PASS**

---

## 6. Flutter staging

Script: `invify-backend/scripts/phase4_flutter_staging_build.ts`

Dart-defines (names only): `APP_ENV`, `API_BASE_URL=http://staging-api.invify.local:3000`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

```text
FLUTTER_STAGING_BUILD=PASS out_exists=true
```

Artifact: `build/web`

| Check | Result |
|---|---|
| Staging API host | **PASS** — present |
| `sb_publishable_*` | **Allowed** — present |
| `sb_secret_*` | **PASS** — absent |
| `service_role` JWT | **PASS** — absent |
| JWT signing / HMAC / webhook secrets | **PASS** — absent |
| Production API (`api.invify.app`) | **PASS** — absent |

**Flutter staging: PASS**

---

## 7. Tenant isolation

Script: `invify-backend/scripts/phase4_tenant_isolation_uat.ts`

```text
79 PASS / 0 FAIL
exit 0
```

**Tenant isolation: PASS**

---

## 8. Financial sandbox

Script: `invify-backend/scripts/phase4_financial_sandbox_uat.ts`  
Webhook secret source: `STAGING_QUASAR_WEBHOOK_SIGNING_SECRET` (not the generic `QUASAR_WEBHOOK_SIGNING_SECRET` name).

```text
37 PASS / 0 FAIL
FEATURE_REAL_MONEY_PAYOUTS=false
```

| Area | Result | Notes |
|---|---|---|
| Invoice lifecycle | **PASS** | create / retrieve / cross-tenant non-disclosure |
| Payment success | **PASS** | signed sandbox webhook → `transactions_log` SUCCESS + ledger |
| Payment failure | **PASS** | fail-closed path exercised |
| Webhook verification | **PASS** | invalid signature rejected |
| Idempotency | **PASS** | duplicate webhook does not double-credit |
| Refund over-amount | **PASS** | rejected |
| Cross-tenant refund | **PASS** | rejected |
| Provider failure fail-closed | **PASS** | HTTP `/payments/create` 500 with empty Quasar base (expected) |
| Ledger correctness | **PASS** | tenant-scoped single credit on success |
| Real-money payout | **PASS** | HTTP 403 |
| Provider-confirmed refund SUCCESS | **PASS (blocked)** | `BLOCKED_no_staging_quasar_url_fail_closed_ok_no_false_success` |

No production Quasar. No invented refund SUCCESS.

**Financial sandbox: PASS**

---

## 9. Security regression

| Suite | Result |
|---|---|
| Phase 2 security (`test/phase2.security.lockdown.test.ts`) | **PASS** |
| Phase 3 environment / idempotency / health (`test/phase3.environment.test.ts`) | **PASS** |
| Phase 4 authentication (live staging UAT above) | **PASS** |
| Phase 4 hardening (`test/hardening.test.ts`) | **PASS** |
| Phase 4 tenant isolation (`test/phase4.tenant.isolation.test.ts` + live suite) | **PASS** |

Jest combined run after LOCAL-only harness fix:

```text
4 suites, 41 tests, 0 failed
```

Harness note (LOCAL/test only, not staging runtime): `@supabase/supabase-js` now throws if URL is empty. `src/db/supabase.ts` uses dummy `http://127.0.0.1:54321` / `local-test-missing-key` when keys are missing. Staging/prod still fail-closed in `BuildVariantService` + `security-boot.ts` before that path is used.

**Security regression: PASS**

---

## 10. Secret scan

Planes scanned: backend source, admin source + `dist`, Flutter `lib/` + `build/web`, Docker compose, CI (`.github`), scripts, migrations, scratch, generated artifacts.

| Check | Result | Evidence |
|---|---|---|
| Old exposed staging JWT keys in client artifacts | **PASS** | absent from Admin `dist` and Flutter `build/web` |
| New `sb_secret_*` client-side | **PASS** | absent from Admin `dist` and Flutter `build/web` |
| service-role JWT embedded | **PASS** | absent from client artifacts; scratch hardcoded JWTs previously purged |
| Hardcoded secrets in CI | **PASS** | no `sb_secret_*`, no insecure JWT defaults in `.github` |
| Production credentials in staging artifacts | **PASS** | none; vault hint hostname only (see Admin scan) |
| Insecure JWT defaults in staging runtime | **PASS** | `security-boot` refuses known defaults; container JWT present and not a listed default |
| Staging Docker | **PASS** | publishable + secret env names only |
| Scripts / UAT | **PASS** | load `.env.staging`; do not print values |

**Secret scan: PASS**

---

## 11. Legacy key consumers

**Do not disable legacy anon / service_role yet.**

### Staging runtime (the stack under test)

**Count: 0**

The staging container has legacy key env names **UNSET**. Compose injects only `STAGING_SUPABASE_PUBLISHABLE_KEY` and `STAGING_SUPABASE_SECRET_KEY`. `security-boot.ts` refuses to start if legacy staging names are present.

Provider-side legacy anon / service_role remain **enabled** (not disabled in this task). Staging application runtime does not consume them.

### Non-staging leftover name consumers (not this stack)

These still *read legacy env names* if invoked. They are not staging Docker/API runtime.

| Class | Path |
|---|---|
| LOCAL compose | `invify-backend/docker-compose.local.yml` |
| LOCAL/PROD code branch | `invify-backend/src/config/build-variant.ts` (LOCAL and PROD only) |
| LOCAL Admin fallback | `invify-admin/src/supabase.js` (`VITE_SUPABASE_ANON_KEY`, LOCAL only) |
| LOCAL Flutter fallback | `lib/core/utils/app_config.dart` (`SUPABASE_ANON_KEY`, development only) |
| PROD compose (untouched) | `invify-backend/docker-compose.prod.yml` |
| Migration fallback (non-staging) | `invify-backend/src/db/migrations/migration-env.ts` (`SUPABASE_SERVICE_ROLE_KEY`) |
| k8s placeholder | `invify-backend/k8s/secret.yaml` (`SUPABASE_SERVICE_ROLE_KEY: PLACEHOLDER`) |
| SCRIPT leftovers | `invify-backend/verify.ts`, `test-tenant-code-schema.ts`, `scripts/seed_dashboard_evidence.ts`, `scripts/phase4_supabase_rotation_verify.ts` (deny/rotation probe) |
| SCRATCH leftovers | `scratch/view_wallets_schema.ts`, `scratch/audit_supabase_security.ts`, and other scratch scripts still reading `STAGING_SUPABASE_SERVICE_KEY` / `STAGING_SUPABASE_KEY` |
| Ad-hoc JS leftovers | `check_vault.js`, `fix_vault.js`, `audit-phase4.js`, `activate_vault.js`, and similar one-off scripts |
| Deny-list / tests | `src/config/security-boot.ts`, `test/phase3.environment.test.ts` |

**Legacy consumers (staging runtime): 0**  
**Legacy name leftovers (non-runtime / non-staging): listed above; do not treat as a disablement go-ahead.**

---

## Constraints honored

- No production modifications
- No live payments
- `FEATURE_REAL_MONEY_PAYOUTS` remains `false`
- Legacy anon / service_role **not disabled**
- No credential values printed

**STOP after verification.**
