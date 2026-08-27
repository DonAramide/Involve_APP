# Phase 5 — Domain Configuration Update Report

This report documents the repository-wide audit, updates, and safety validation for the migration of the production canonical domains to the new company domain format (`invify.iips.app`).

---

## 1. Domain Migration Mapping & Audit Findings

Production domains have been mapped as follows:
- **Production API URL:** `https://api.invify.app` (legacy) → `https://api.invify.iips.app` (new canonical)
- **Production Admin URL:** `https://app.invify.app` (legacy) → `https://app.invify.iips.app` (new canonical)
- **Staging API/Admin URLs:** `https://staging-api.invify.local` / `https://staging.invify.local` (remain unmodified).

### Audited Domain Consumers

| Component / File | Domain Classification | Old Value | New Value / Status |
| :--- | :--- | :--- | :--- |
| `k8s/ingress.yaml` | Production Ingress host | `api.invify.app` | `api.invify.iips.app` |
| `quasar-provisioning.service.ts` | Outbound Webhook Fallback | `https://api.invify.app/...` | `https://api.invify.iips.app/...` |
| `docker-compose.prod.yml` | API CORS Origin | *(None)* | `https://app.invify.iips.app` |
| `ci-cd-pipeline.yml` | Production Deployment Metadata | `https://api.IIPS.app` | `https://api.invify.iips.app` |
| `ingress-controller.yaml` | Production Ingress Route | `api.IIPS.app` / `ops.IIPS.app` | `api.invify.iips.app` / `app.invify.iips.app` |
| `ssl-tls-cert-manager.yaml` | TLS CommonName / dnsNames | `api.IIPS.app` / `ops.IIPS.app` | `api.invify.iips.app` / `app.invify.iips.app` |
| `disaster-recovery.sh` | Disaster Recovery Dashboard | `https://ops.IIPS.app` | `https://app.invify.iips.app` |
| `build-variant.ts` | Production URL loader | `PROD_AGENT_PORTAL_URL` env | Loaded dynamically from environment |

---

## 2. Changes Made & Files Modified

### Backend Source & Configurations
- **[`quasar-provisioning.service.ts`](file:///c:/dev/Involve_APP/invify-backend/src/integrations/quasar/quasar-provisioning.service.ts):** Updated the fallback `INVIFY_WEBHOOK_URL` to use `https://api.invify.iips.app/webhooks/quasar`.
- **[`docker-compose.prod.yml`](file:///c:/dev/Involve_APP/invify-backend/docker-compose.prod.yml):** Added default environment parameter `- CORS_ORIGINS=${CORS_ORIGINS:-https://app.invify.iips.app}` to restrict cross-origin access in production to the new approved Admin host.
- **[`ingress.yaml`](file:///c:/dev/Involve_APP/invify-backend/k8s/ingress.yaml):** Swapped `api.invify.app` with `api.invify.iips.app` in `tls.hosts` and `rules.host` bindings.

### Infrastructure Manifests & Pipeline
- **[`ci-cd-pipeline.yml`](file:///c:/dev/Involve_APP/infrastructure/ci-cd/ci-cd-pipeline.yml):** Updated deployment environment metadata url property to `https://api.invify.iips.app`.
- **[`ingress-controller.yaml`](file:///c:/dev/Involve_APP/infrastructure/k8s/base/ingress-controller.yaml):** Restructured ingress routing mappings:
  - Mapped API Gateway route to host `api.invify.iips.app`.
  - Mapped Admin Console route to host `app.invify.iips.app`.
- **[`ssl-tls-cert-manager.yaml`](file:///c:/dev/Involve_APP/infrastructure/k8s/base/ssl-tls-cert-manager.yaml):** Updated Let's Encrypt Certificate resource `commonName` and `dnsNames` properties to request certificates matching `api.invify.iips.app` and `app.invify.iips.app`.
- **[`disaster-recovery.sh`](file:///c:/dev/Involve_APP/infrastructure/scripts/disaster-recovery.sh):** Updated printed post-restore dashboard url message to `https://app.invify.iips.app`.

---

## 3. Staging and Environment Separation Verification

- **Staging Intact:** The staging domains remain exactly mapped to the offline local domains `staging.invify.local` and `staging-api.invify.local`.
- **Staging Isolation Safety Check:** **PASS** (Added validation logic inside `src/config/security-boot.ts` that throws a startup exception if `CORS_ORIGINS` or `STAGING_SUPABASE_URL` contains production domain patterns like `invify.iips.app` or `IIPS.app` while running under `STAGING` variant).
- **Staging Isolation Test Case:** **PASS** (Added unit test `rejects production domains in STAGING CORS or Supabase URL` in `test/phase3.environment.test.ts` to verify the isolation safety throws the expected error).

---

## 4. Production Security Boot Verification

- **Allowed Hosts:** The production environment successfully resolves and boots when `PROD_AGENT_PORTAL_URL` points to `https://app.invify.iips.app`.
- **Banned Hosts Checks:** **PASS** (Validation logic in `src/config/security-boot.ts` continues to reject and fail closed if the production URL contains banned hosts like `localhost`, `127.0.0.1`, LAN IPs, `ngrok`, `staging.invify.local`, or `staging-api.invify.local`).

---

## 5. Remaining Operator Actions

The following DNS and certificate generation operations must be executed manually during the provisioning phase:
1. **DNS Provisioning:** Add `A`/`CNAME` records at the registrar:
   - `api.invify.iips.app` pointing to the production ingress load balancer public IP.
   - `app.invify.iips.app` pointing to the static web server/ingress.
2. **TLS Certificate Injection:** Let's Encrypt certificates will be automatically provisioned by `cert-manager` using the updated ACME issuer configuration in `ssl-tls-cert-manager.yaml` once DNS records propagate.

---

## 6. Final Status & Verdict

### Domain Setup Verdict: **PASS**
All production references have been audited, updated, and validated. Safety checks are in place to prevent production domains from contaminating the staging environments.
