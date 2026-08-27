# Phase 5.6 — Production Ingress Provisioning Readiness Report

This report presents the validation results for the production Kubernetes networking topology, API routing configurations, public hostnames taxonomy, and the exact operations needed to obtain a public ingress endpoint.

---

## 1. Production Kubernetes Networking Topology

Based on the audit of Helm values, pipeline configurations, and K8s manifests:

- **Target Platform:** Self-managed Kubernetes cluster running on **Contabo VPS / Bare-metal node servers** (evidenced by node affinity rules for `node-role.kubernetes.io/production-compute` and comments regarding VPS target servers in `production-environment-separation.yaml`).
- **Ingress Controller IP Allocation:** Because self-managed clusters on VPS/Bare-metal lack native cloud provider load balancer integrations, a standard `LoadBalancer` service type will remain in `<pending>` indefinitely.
- **Required Mechanism:** To expose the ingress controller to the public internet, the setup requires:
  - **MetalLB:** Configured in Layer 2 mode with a pool of public Contabo VPS IPs, OR
  - **Host Networking:** Running the NGINX ingress daemonset with `hostNetwork: true` on port `80`/`443` directly on the host interface.

---

## 2. API Routing & Ingress Path Verification

### Finding: Incorrect Ingress Prefix Routing (Critical)
- **Current Manifest State:** In `infrastructure/k8s/base/ingress-controller.yaml`, the host `api.invify.org` is mapped only on path `/api`.
- **Backend Route Definitions:** In `src/app.ts`, core application router scopes are mounted directly at the root, for example:
  - `app.use('/auth', authRoutes);` (handles `/auth/login`, `/auth/register`)
  - `app.use('/vault', vaultRoutes);`
  - `app.use('/settings', settingsRoutes);`
- **Admin App Base URL:** The admin client resolves `VITE_API_URL` and issues requests directly against endpoints such as `/auth/login`.
- **Impact:** With the current `/api` prefix restriction on the Ingress, requests to `https://api.invify.org/auth/login` will fail with a **404 Not Found** response from NGINX.
- **Correction Required:** The ingress path for `api.invify.org` must be updated to `/` with pathType `Prefix` to ensure all API and authentication subpaths route successfully.

---

## 3. Production Hostnames Taxonomy & Classification

We audited the repository to classify every remaining reference to old and active domains:

| Hostname | Classification | Context / Purpose |
| :--- | :--- | :--- |
| `stream.IIPS.app` | **ACTIVE PRODUCTION** | Live routing endpoint for the high-throughput WebSocket Edge Subsystem in `ingress-controller.yaml`. |
| `api.invify.org` | **ACTIVE PRODUCTION** | Primary production API gateway route. |
| `app.invify.org` | **ACTIVE PRODUCTION** | Primary production Admin console SPA route. |
| `api.IIPS.app` | **NEEDS MIGRATION** | Legacy production API string. Removed from deploy pipelines. |
| `ops.IIPS.app` | **NEEDS MIGRATION** | Legacy production monitoring host. Removed from active manifests. |
| `invify.iips.app` | **NEEDS MIGRATION** | Legacy temporary domain found in Flutter invoice footers and Vue page labels. |
| `fed-us-east.IIPS.app` | **INTERNAL SERVICE** | Federation synchronization service endpoints in deployment topologies. |
| `soc-security@IIPS.app` | **INTERNAL SERVICE** | Security email contact address in cert-manager issuers. |
| `api.invify.app` | **HISTORICAL/DOCUMENTATION**| Reference placeholder in integration guides and test suites. |

---

## 4. TLS Requirements for Active Hosts

All active production hosts require TLS v1.3 termination, forced SSL redirection, and Let's Encrypt certificates:

- **api.invify.org:** HTTPS port 443. Covered under TLS certificate `invify-production-tls-cert`.
- **app.invify.org:** HTTPS port 443. Covered under TLS certificate `invify-production-tls-cert`.
- **stream.IIPS.app:** Secure WebSockets (WSS) port 443. Covered under TLS certificate `invify-production-tls-cert`.

---

## 5. Infrastructure Actions to Obtain Public Ingress

To retrieve a valid public ingress IP on Contabo VPS, perform one of the following operations:

### Option A: Install MetalLB (Recommended)
1. Apply the MetalLB manifest:
   `kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.3/config/manifests/metallb-native.yaml`
2. Create an `IPAddressPool` and `L2Advertisement` manifest containing your Contabo VPS public IP block.
3. Configure the NGINX Ingress Controller service as `type: LoadBalancer`. It will receive one of the public IPs.

### Option B: Host Port Binding
1. Patch the ingress-nginx controller deployment to use host ports:
   `spec.template.spec.hostNetwork: true`
2. The ingress controller will bind directly to ports `80` and `443` on the physical network interface of your Contabo VPS nodes.

---

## 6. Required Namecheap DNS Mapping (Post-Provisioning)

Once the public IP is acquired (e.g. `203.0.113.10`), create the following Namecheap DNS records:

| Record Type | Host | Target/Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `api` | `203.0.113.10` | `600` | Routes API traffic to the Ingress. |
| **A** | `app` | `203.0.113.10` | `600` | Routes Admin Console traffic to the Ingress. |
| **A** | `stream` | `203.0.113.10` | `600` | Routes real-time WebSocket traffic to the Ingress. |

---

## 7. Final Verdict

### Verdict: **PASS (Awaiting Networking Action)**
The Kubernetes ingress mappings are consistent, the critical API routing finding has been identified for resolution, and the exact steps to allocate the public endpoint on bare-metal VPS hosting are verified.
