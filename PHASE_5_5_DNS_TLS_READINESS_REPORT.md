# Phase 5.5 — Invify.org DNS & TLS Readiness Report

This report evaluates and validates the DNS routing configuration, TLS cert-manager settings, ingress controller bindings, and environment separation safety for the migration to `invify.org`.

---

## 1. Kubernetes Ingress & Frontend Resolution Audit

Both production domains are mapped to the same entry point inside the Kubernetes cluster:

- **Ingress Controller:** NGINX Ingress Controller (class: `nginx`).
- **Ingress Resource:** `invify-production-ingress` in namespace `invify-production`.
- **API Resolution (`api.invify.org`):** Routes HTTP prefix `/api` to the internal ClusterIP service `invify-backend-service` on port `3005`.
- **Admin Console Resolution (`app.invify.org`):** Routes HTTP prefix `/` to the internal ClusterIP service `invify-admin-console-service` on port `80`.
- **WebSocket Gateway Resolution (`stream.IIPS.app`):** Routes HTTP prefix `/ws` to `invify-websocket-gateway-service` on port `4000`.

### Provisioning Status: **BLOCKED / REQUIRES OPERATOR**
The external load balancer IP address is **not** provisioned in the offline code repositories. The IP allocation is a dynamic Kubernetes service runtime behavior of the NGINX Ingress Controller Helm deployment. 

> [!WARNING]
> Do not guess or stub an IP address. Live provisioning is blocked until the NGINX ingress load balancer is deployed on the cluster and assigns a public external IP.

---

## 2. Domain Representation Consistency

The new `invify.org` canonical domains have been consistently configured across all production layers:

1. **Kubernetes Ingress:** Mapped to hosts `api.invify.org` and `app.invify.org` in `k8s/ingress.yaml` and `ingress-controller.yaml`.
2. **TLS / Cert-Manager:** Configured in `ssl-tls-cert-manager.yaml` to request Let's Encrypt certificates matching both hosts.
3. **CORS Origins:** Default permitted origin in `docker-compose.prod.yml` set to `https://app.invify.org`.
4. **Backend Webhooks:** Fallback URL in `quasar-provisioning.service.ts` set to `https://api.invify.org/webhooks/quasar`.
5. **Password Reset Redirect:** Dynamic agent forgot-password flow directs users to `PROD_AGENT_PORTAL_URL`, which will be injected as `https://app.invify.org/agent/reset-password`.
6. **Health Monitors:** probes route locally to `/livez` and `/readyz` within the cluster, avoiding external DNS lookups.

---

## 3. Staging Isolation Safety

- **Staging Mapping:** Staging routing is restricted to `staging-api.invify.local` and `staging.invify.local` (Offline loopback domains).
- **Safety Guards:** **PASS** (Staging runtime verification in `security-boot.ts` actively rejects startup if staging configurations contain `invify.org` or `IIPS.app` patterns).
- **Unit Tests:** **PASS** (Staging isolation tests in `test/phase3.environment.test.ts` verify the fail-closed behavior).

---

## 4. TLS & Cert-Manager Readiness

- **SSL Redirects:** Enforced at the NGINX ingress controller level (`ssl-redirect: "true"`, `force-ssl-redirect: "true"`).
- **HSTS:** Enabled with a 1-year duration (`nginx.ingress.kubernetes.io/hsts-max-age: "31536000"`).
- **ACME Issuer:** Let's Encrypt production endpoint (`https://acme-v02.api.letsencrypt.org/directory`) configured in the `letsencrypt-production` ClusterIssuer.
- **Verification status:** **READY (Certificates Not Issued)**. Cert-manager is ready to solve HTTP-01 challenges once DNS records are created.

---

## 5. DNS Records Required in Namecheap

To complete the domain provisioning, the operator must create the following DNS records in the Namecheap dashboard:

| Record Type | Host | Target/Value | TTL | Purpose / Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** (or CNAME) | `api` | `<Ingress Load Balancer Public IP / CNAME>` | `600` | Routes API gateway and webhook calls to the cluster ingress. | **BLOCKED** (Awaiting IP provisioning) |
| **A** (or CNAME) | `app` | `<Ingress Load Balancer Public IP / CNAME>` | `600` | Routes Admin Console SPA traffic to the cluster ingress. | **BLOCKED** (Awaiting IP provisioning) |

---

## 6. Validation Test Sweeps

- **TypeScript Compilation:** **PASS** (`tsc` compiled successfully).
- **Phase 2-5 Regression/Hardening tests:** **PASS** (21/21 Jest test cases passed successfully).

---

## 7. Remaining Operator Actions

1. Deploy the NGINX ingress controller Helm charts in the target Kubernetes namespace to provision the external load balancer IP.
2. Log in to Namecheap and configure the `A`/`CNAME` records with the allocated IP.
3. Allow DNS propagation, after which cert-manager will automatically complete HTTP-01 challenges and issue the TLS certificates.
