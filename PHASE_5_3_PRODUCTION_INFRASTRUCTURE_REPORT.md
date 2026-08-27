# Phase 5.3 — Production Infrastructure Preparation Report

This report outlines the deployment topologies, database schemas, network domains, and environment separation gates prepared for the production release of Invify.

---

## 1. Production Infrastructure Topology & Status

Every component has been categorized using the following states:
- `READY` / `CONFIGURED`: Definitions exist and are verified.
- `REQUIRES OPERATOR`: Awaits manual initialization in production portal.
- `NOT YET ACTIVATED`: Deliberately kept inactive for safety.
- `BLOCKED`: Blocked by code or security issues (None).

| Component | Status | Classification & Action Required |
| :--- | :--- | :--- |
| **API** | **CONFIGURED** | apps/v1 Kubernetes Deployment with `replicas: 2`, resource limits (`1Gi` memory, `1.0` CPU), and startup probes (`/livez`/`/readyz`). |
| **Admin** | **CONFIGURED** | Static SPA served over TLS on `https://app.invify.app`. Configured to point strictly to the production API. |
| **Mobile** | **CONFIGURED** | Flutter build configured with package `com.invify.app` and API endpoint `https://api.invify.app`. Safety gates prevent local/LAN hostnames. |
| **Database** | **REQUIRES OPERATOR** | Dedicated production Supabase PG instance must be provisioned. Staging database schemas must NOT be cloned directly with staging references. |
| **Supabase** | **REQUIRES OPERATOR** | Production Supabase project must be registered to generate active production URL, publishable key, and secret key. |
| **Redis** | **CONFIGURED** | Dedicated container running `redis:7-alpine` on internal network only. Requires `REDIS_PASSWORD` authentication and secured health checks. |
| **Workers** | **CONFIGURED** | Decoupled from API server. Defined as a Kubernetes CronJob triggering `/admin/reconciliation/run-job` nightly with an injected service JWT. |
| **Queues** | **CONFIGURED** | Redis-backed local transient queue, isolated inside the secure internal Kubernetes namespace. |
| **Storage** | **REQUIRES OPERATOR** | Storage buckets (`invoices`, `receipts`, `kyc`) must be provisioned in the production Supabase instance with active RLS policies. |
| **Webhook Endpoints**| **CONFIGURED** | Quasar webhook handler `/webhooks/quasar` configured with secure dynamic environment injection and HMAC signature verification. |
| **Email (SMTP)** | **REQUIRES OPERATOR** | Production SMTP relay server configuration is defined; requires live SMTP username and password credentials. |
| **WhatsApp** | **REQUIRES OPERATOR** | Meta WhatsApp Graph API integration is configured; requires Meta Access Token and Business Account ID inputs. |
| **Monitoring** | **CONFIGURED** | Observability logging levels set to `warn`. Correlation IDs injected on all requests. Health probes configured on K8s templates. |
| **Backups** | **REQUIRES OPERATOR** | Supabase automated daily backups must be enabled, with a verified restore test schedule (RTO: 4 hours, RPO: 24 hours). |
| **Domains / TLS** | **CONFIGURED** | Ingress controller mapped to `api.invify.app` utilizing Let's Encrypt production certificates (`letsencrypt-prod`). |
| **CI / CD** | **CONFIGURED** | Immature pipelines replaced. YAML defines automated build, test, and security scan stages, leading to a manual approval deployment gate. |

---

## 2. Database Migration & Security Preparation

### Migration Protocol
- **Target Verification:** Database migrations are applied using `npx ts-node src/db/migrations/apply.ts` inside the release pod. The resolver strictly requires `PROD_SUPABASE_URL` and `PROD_SUPABASE_SECRET_KEY` (no fallbacks allowed).
- **RLS Enforced:** Row Level Security (RLS) is enabled on all tables, requiring active tenant isolation filters on every select/insert.
- **Constraints:** Schema defines strict unique constraints (`tenant_code` unique index, ledger transaction unique hashes) to prevent duplicate postings.

---

## 3. Worker Architecture

The production API replicas do not run scheduled workers locally, preventing concurrent execution risks.
- **Schedule:** Nightly at 1:00 AM UTC.
- **Identity & Auth:** Triggered via a secure POST request to `/admin/reconciliation/run-job`. The trigger uses a signed JWT containing the `role: "super_admin"` claim (validated by the API's RBAC middleware).
- **Idempotency:** NightlyReconciliationJob uses transaction-level idempotency keys in the ledger, ensuring duplicate triggers return success without writing redundant records.

---

## 4. Domain & URL Safety Mapping

Production endpoints are strictly isolated from development or staging references.

- **Production API URL:** `https://api.invify.app`
- **Production Admin URL:** `https://app.invify.app`
- **Banned Hostnames:** The boot-level security validation throws hard errors if any of the following strings are found in production URLs:
  - `localhost` / `127.0.0.1`
  - `192.168.*` / `10.0.*` (LAN IPs)
  - `ngrok`
  - `staging.invify.local` / `staging-api.invify.local`

---

## 5. Payments Readiness (NOT YET ACTIVATED)

Live money movement is disabled.
- **Feature Flag:** `FEATURE_REAL_MONEY_PAYOUTS` is hard-coded to `false` in production compose.
- **Credentials:** No production Paystack or Quasar client credentials are created or injected.
- **Activation Gate:** Enabling payments requires a manual, reviewed CI/CD approval phase to inject `FEATURE_REAL_MONEY_PAYOUTS=true`, `PAYSTACK_LIVE_SECRET_KEY`, and `QUASAR_PRODUCTION_CLIENT_SECRET` from a secure vault.

---

## 6. Environment Separation Verification

The production manifest and compose configurations have been scanned and contain **zero** instances of:
- Staging Supabase URLs or secrets.
- Mock authentication bypasses (`OFFLINE_LOCAL_AUTH`, `OFFLINE_MOCK_AUTH`).
- Developer mock tokens (`mock-super-admin`).
- Unauthenticated Redis bindings.

---

## 7. Remaining External Dependencies & Blockers

### External Dependencies
1. **Production Supabase Project:** Must be manually created in the Supabase organization to generate URL, publishable key, and secret key.
2. **SMTP Relay Provider:** Real SMTP server connection credentials (e.g., SendGrid, Mailgun) must be acquired.
3. **Meta Business API:** WhatsApp business API accounts and verified phone numbers must be linked.
4. **Partner Client Secret keys:** Real Paystack and Quasar production keys must be provisioned.

### Blockers
- **None:** All code, validation, and container-level blockers have been resolved.

---

## 8. Final Verdict

### Verdict: **READY (Infrastructure Configured)**
The production deployment configurations and manifests are certified as secure and ready for operator provisioning.
