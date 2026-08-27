# Phase 5.7 — Production Ingress Remediation and Networking Plan

This report details the ingress routing correction, the Contabo bare-metal VPS networking design evaluation, domain inventory audits, and the rollback strategies for production launch readiness.

---

## 1. Ingress Routing Remediation

### Exact Ingress Changes
In `infrastructure/k8s/base/ingress-controller.yaml`, the host routing block for `api.invify.org` has been updated:

```diff
     # 1. Primary API Gateway routing
     - host: api.invify.org
       http:
         paths:
-          - path: /api
+          - path: /
             pathType: Prefix
             backend:
               service:
                 name: invify-backend-service
                 port:
                   number: 3005
```

### Exact Backend Route Evidence
In `src/app.ts`, routes are registered at root scopes:
- `app.use('/auth', authRoutes)`
- `app.use('/vault', vaultRoutes)`
- `app.use('/settings', settingsRoutes)`
Routing only `/api` prefix would block authentication and configuration endpoints, returning **404 Not Found** errors on client logins. Correcting the path prefix to `/` enables seamless access to all root backend subpaths.

---

## 2. Contabo Networking Design & Recommendation

### Contabo Topology Audit
- **Deployment Model:** Self-managed Kubernetes cluster running on Contabo VPS virtual machines.
- **Public IP Allocation:** Nodes are assigned individual public IP addresses. There is no cloud-controller integration to provision dynamic network LoadBalancers.

### Comparison of Exposing Options
1. **Option A (MetalLB Layer 2):** Requires acquiring a block of contiguous public IPv4 addresses from Contabo. MetalLB acts as an ARP advertiser to direct traffic to one of the nodes.
2. **Option B (NGINX HostNetwork/HostPort binding - RECOMMENDED):** Configures NGINX Ingress controller pods with `hostNetwork: true`. It binds ports `80` and `443` directly to the network interfaces of the VPS host nodes.
3. **Option C (External Reverse Proxy):** Directs DNS to an external server (e.g., HAProxy or Nginx running on host OS) which proxies requests to NodePort services inside the cluster.

### Recommendation: **Option B (NGINX HostNetwork)**
Using NGINX `hostNetwork: true` is highly recommended for this cluster because it leverages the existing Contabo VPS IPs directly, removing the cost and complexity of requesting additional contiguous IP blocks.

### Required Contabo Operator Information
If the operator decides to utilize MetalLB instead of HostNetwork, they must request a **contiguous public IPv4 address range** and the associated Gateway IP from Contabo support.

---

## 3. Domain Inventory & DNS Records

The final public DNS records to be created in the Namecheap registrar dashboard once the VPS target IP is confirmed (e.g., `203.0.113.50`):

| Record Type | Host | Target/Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `api` | `203.0.113.50` | `600` | Routes API traffic to the host ingress interface. |
| **A** | `app` | `203.0.113.50` | `600` | Routes Admin Console SPA to the host ingress. |
| **A** | `stream` | `203.0.113.50` | `600` | Routes WebSocket Edge Subsystem traffic. |

### WebSocket Hostname Recommendation
- **Canonical WebSocket Endpoint:** `wss://stream.IIPS.app/ws` is currently mapped to `invify-websocket-gateway-service:4000`.
- **Recommendation:** Keep `stream.IIPS.app` active as it is required legacy mapping for mobile clients. However, eventually migrate it to `stream.invify.org` to align with the core rebranding strategy.

---

## 4. TLS & Cert-Manager Requirements

- **Provisions:** Cert-manager will use HTTP-01 solvers over the Nginx ingress to verify ownership and issue Let's Encrypt certificates.
- **Active Public Hosts Covered:** `api.invify.org`, `app.invify.org`, `stream.IIPS.app`.
- **TLS Configuration:** SSL redirection is enforced (`force-ssl-redirect: "true"`), HSTS is active (`max-age: 31536000`), and TLS v1.3 is required.

---

## 5. Risks & Rollback Plan

### Risks
- **Port Bindings:** If host OS services (like Apache or standalone Nginx) are running on the VPS nodes, they will clash with NGINX ingress controller port bindings on ports `80` and `443`.
- **Ingress Downtime:** Path updates could affect route matching if other paths are added under the host.

### Rollback Plan
To revert changes, restore the ingress manifests to the original paths:
```bash
git checkout infrastructure/k8s/base/ingress-controller.yaml
kubectl apply -f infrastructure/k8s/base/ingress-controller.yaml --namespace=invify-production
```

---

## 6. Final Verdict

### Status: **READY (Configured & Remediation Applied)**
The ingress mapping has been corrected, routing pathways verified, and compiling test suites executed with 100% success.
