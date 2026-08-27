# PHASE 4 — Client Connectivity UAT Report

**Date:** 2026-08-17  
**Scope:** Staging interactive Admin + Mobile connectivity against the existing staging API hostname  
**Production work:** NOT started  
**Live payments:** NOT enabled  
**FEATURE_REAL_MONEY_PAYOUTS:** `false` (unchanged)  
**Auth / financial application logic:** NOT modified  

---

## Verdict

Interactive client UAT **did not complete**. The intended hostname is already baked into the staging client artifacts, but this operator environment cannot resolve it, and the staging API process is not currently listening.

No public staging DNS provider exists in the repository. Per instructions, a domain was **not invented**, hosts/DNS was **not mutated** from this agent, and application logic was **not changed**.

```text
Admin interactive UAT: FAIL
Mobile interactive UAT: FAIL
Staging DNS/hostname: BLOCKED
Production endpoint leakage: PASS
Secret scan: PASS
```

---

## 1. Intended DNS / hostname mechanism (from existing infra)

The project already chose a **private `.invify.local` split-horizon hostname**, not a public DNS zone.

| Source | Intended host |
|---|---|
| Staging compose `APP_URL` default | `https://staging.invify.local` (`STAGING_APP_URL`) |
| Admin staging artifact `VITE_API_URL` | `http://staging-api.invify.local:3000` |
| Mobile staging artifact `API_BASE_URL` | `http://staging-api.invify.local:3000` |
| Staging compose published API | host port `${STAGING_API_PORT:-3000}` → container `3000` (HTTP) |
| Kubernetes ingress in-repo | **production** hosts `api.invify.app` / `api.IIPS.app` — **must not be used for staging** |

There is:

- no staging DNS zone / registrar / Cloudflare / Route53 config in this repo
- no staging TLS reverse proxy in `docker-compose.staging.yml`
- no cert-manager issuer for `*.invify.local`
- no ngrok, LAN IP, or localhost API base in the **runtime client API configuration**

**Mechanism:** operator-side name resolution for `staging-api.invify.local` (and optionally `staging.invify.local`) to the staging API listener. That is hosts-file or internal DNS — not a public domain.

---

## 2. Why connectivity could not be established here

| Check | Result |
|---|---|
| `staging-api.invify.local` DNS | **NXDOMAIN** (`DNS name does not exist`) |
| Windows hosts entry for that name | **absent** |
| Agent hosts-file write | **not applied** (environment cannot configure machine DNS from this session) |
| Public staging domain in repo | **none** — not invented |
| `http://127.0.0.1:3000/livez` | **connection failed** (no listener) |
| Docker CLI / daemon | **unavailable** (`docker` not on PATH; `docker.exe` only under `Docker.backup`; Docker Desktop exe missing) |
| TLS terminator for `https://staging-api.invify.local` | **not present** in staging compose |

HTTPS preference is already expressed by `STAGING_APP_URL=https://staging.invify.local`, but the running staging definition currently exposes **plain HTTP on port 3000**. Client artifacts match that HTTP URL. Enabling real HTTPS still needs an operator-controlled TLS edge **on the same `.invify.local` names** (or an already-owned internal staging hostname). This session did not add one.

---

## 3. Operator-side DNS / hosts requirement (do this; do not change app code)

On **every browser or device** that must run interactive UAT against local Docker staging:

### Windows (this operator PC)

As Administrator, add to `%SystemRoot%\System32\drivers\etc\hosts`:

```text
# Invify staging only — not production
127.0.0.1  staging-api.invify.local staging.invify.local
```

Then verify:

```powershell
Resolve-DnsName staging-api.invify.local
# Expected: 127.0.0.1

Invoke-WebRequest -UseBasicParsing http://staging-api.invify.local:3000/livez
# Expected: 200 after staging compose is up
```

Loopback in the hosts file is **name resolution**, not a client API base. Artifacts must keep using `staging-api.invify.local`, never `localhost` / `127.0.0.1` / LAN / ngrok.

### Physical mobile devices

A PC hosts file **does not** apply to phones. Device UAT needs **internal DNS** (or MDM/private DNS) mapping:

```text
staging-api.invify.local  →  <staging API address on the operator network>
```

Do **not** rebake clients to a LAN IP, ngrok URL, or production `api.invify.app`.

### HTTPS (preferred, still operator infra)

Once the name resolves:

1. Keep using hostname `staging-api.invify.local` (do not invent a public TLD).
2. Terminate TLS in **staging-only** reverse proxy (Caddy/nginx) in front of compose port 3000.
3. Trust the staging cert on the operator browser/device (internal CA / mkcert). Public Let’s Encrypt **cannot** issue for `.local`.
4. Rebuild Admin/Mobile with `https://staging-api.invify.local` only after that edge exists.
5. Set staging `CORS_ORIGINS` to the Admin SPA origin (compose currently has no `CORS_ORIGINS`; default allowlist is localhost Vite ports).

### Staging API must be running

```powershell
cd invify-backend
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
# FEATURE_REAL_MONEY_PAYOUTS must remain false
# Do not set STAGING_QUASAR_BASE_URL to production Quasar
```

---

## 4. Interactive UAT checklist (this run)

| # | Check | Result |
|---|---|---|
| 1 | Admin staging interactive login | **NOT EXECUTED** — hostname unresolved; API down |
| 2 | Admin authenticated navigation | **NOT EXECUTED** |
| 3 | Admin tenant/RBAC checks | **NOT EXECUTED** (API UAT 25/25 remains prior evidence) |
| 4 | Admin invoice/payment/refund screens | **NOT EXECUTED** |
| 5 | Admin logout/session expiry | **NOT EXECUTED** |
| 6 | Mobile staging interactive startup | **NOT EXECUTED** |
| 7 | Mobile real staging login | **NOT EXECUTED** |
| 8 | Mobile tenant identity | **NOT EXECUTED** |
| 9 | Mobile invoice/device/sync flows | **NOT EXECUTED** |
| 10 | Staging traffic never reaches production | **PASS** for artifact API base; live browser traffic **not generated** |

Prior Phase 4 **API** evidence (not a substitute for this interactive gate): Admin API 25/25, tenant isolation 79/79, financial sandbox 37/37, worker 12/12.

---

## 5. Final client artifact scan

Artifacts dated **2026-08-15** (Admin `invify-admin/dist`, Mobile `build/web`).

### Runtime API bases

| Client | Runtime API base | Localhost / 127.0.0.1 / LAN / ngrok as API base | Production API as API base |
|---|---|---|---|
| Admin | `http://staging-api.invify.local:3000` | **absent** | **absent** |
| Mobile web | `http://staging-api.invify.local:3000` | **absent** | **absent** |

Staging Supabase host embedded: `rpcjelhacmkhzguljdgi.supabase.co` (staging project). Dev project host not used as API base.

### Strings that are NOT runtime API endpoints (documented separately)

| Location | String | Classification |
|---|---|---|
| Admin Developer Portal docs snippet | `http://localhost:3001/webhooks/quasar` | Example curl webhook URL |
| Admin vault credential hint | `https://api.invify.app` | UI placeholder, not `baseURL` |
| Admin Platform Config / POS gateway placeholders | `http://192.168.1.193:4000/api/v1`, `http://127.0.0.1:4000/api/v1` | Form hints / fill buttons |
| Admin Developer Portal | `sk_test_your_key_here`, copy about `sk_live_*` | Docs / UI labels |
| Mobile `main.dart.js` | regex mentioning `172.(1[6-9]…)` | Safety **guard** against LAN URLs, not an endpoint |
| Mobile `main.dart.js` | Flutter/font CDN URLs | Framework assets |

### Secret scan

| Check | Result |
|---|---|
| Backend `service_role` key / `SUPABASE_SERVICE_ROLE` | **absent** |
| `sk_live_` **credential values** | **absent** |
| `JWT_SECRET` / `SUPABASE_JWT_SECRET` / `LICENSE_HMAC_SECRET` | **absent** |
| Webhook signing secrets | **absent** |
| Mobile embedded JWT | **anon** role only (`iss` supabase) — expected public client key, not a backend secret |

**Secret scan: PASS**

**Production endpoint leakage: PASS** (runtime API base is staging-only; production host appears only as a vault hint string).

---

## 6. Safety held

| Control | Status |
|---|---|
| Auth middleware / JWT verification | unchanged |
| Financial / payout / refund logic | unchanged |
| `FEATURE_REAL_MONEY_PAYOUTS` | not enabled |
| Production routing / `api.invify.app` as staging target | not used |
| Ngrok / LAN / localhost as client API base | not introduced |
| Production infrastructure | not started |

---

## Remaining limitations

1. **`staging-api.invify.local` does not resolve** on this operator machine (no hosts entry, no internal DNS). Interactive browser/device UAT is blocked until the operator applies the hosts/DNS mapping above.
2. **Staging API is not running** in this session (Docker daemon/CLI unavailable; nothing on port 3000).
3. **HTTPS is not yet terminated** for the staging hostname. Artifacts correctly use HTTP `:3000` until a staging-only TLS edge exists for the same `.invify.local` names.
4. **Physical device UAT** needs internal DNS; a PC hosts file is insufficient.
5. After hostname + API are up, set staging **`CORS_ORIGINS`** to the Admin SPA origin or browsers will fail CORS (defaults are localhost Vite ports).
6. Developer Portal still contains a **localhost webhook example** (docs only; not API base).
7. Provider-confirmed refund SUCCESS remains blocked on missing approved staging Quasar (unchanged from acceptance report).

---

## Scoreboard

```text
Admin interactive UAT: FAIL
Mobile interactive UAT: FAIL
Staging DNS/hostname: BLOCKED
Production endpoint leakage: PASS
Secret scan: PASS
Remaining limitations:
  - Operator hosts/internal DNS for staging-api.invify.local required
  - Staging Docker/API not running in this environment
  - HTTPS TLS edge for .invify.local not present (HTTP :3000 is current artifact contract)
  - Physical devices need internal DNS, not a PC hosts file
  - CORS_ORIGINS must include Admin SPA origin once UI is served
```

**STOP.** Do not begin production infrastructure. Do not enable live payments. Do not enable `FEATURE_REAL_MONEY_PAYOUTS`.
