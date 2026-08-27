# Phase 5 — Invify.org Domain Migration Report

This report documents the migration of the approved production canonical domains from `invify.iips.app` to the new official `invify.org` domains.

---

## 1. Domain Migration Mapping & Validation Results

The approved canonical production domains have been migrated:
- **Production API URL:** `https://api.invify.iips.app` → `https://api.invify.org`
- **Production Admin URL:** `https://app.invify.iips.app` → `https://app.invify.org`
- **Staging Domains:** `https://staging-api.invify.local` / `https://staging.invify.local` (unmodified).

### Verification Checklist & Results

| Validation Vector | Result | Status |
| :--- | :--- | :--- |
| **CORS Origins Validation** | **PASS** | `CORS_ORIGINS` default in `docker-compose.prod.yml` updated to `https://app.invify.org`. |
| **Ingress Hosts Validation** | **PASS** | Mapped API route host to `api.invify.org` in `k8s/ingress.yaml` and `ingress-controller.yaml`. |
| **TLS/Cert-Manager Validation**| **PASS** | Updated LetsEncrypt ClusterIssuer certificate resource `commonName` and `dnsNames` in `ssl-tls-cert-manager.yaml` to request certificates for `api.invify.org` and `app.invify.org`. |
| **Webhook Fallbacks** | **PASS** | Webhook fallback URL in `quasar-provisioning.service.ts` updated to `https://api.invify.org/webhooks/quasar`. |
| **Disaster Recovery Scripts** | **PASS** | Output messaging in `disaster-recovery.sh` updated to point to `https://app.invify.org`. |
| **Staging Safety Guards** | **PASS** | Staging environment validation in `src/config/security-boot.ts` updated to reject `invify.org` to prevent accidental staging contamination. |
| **Automated Unit Tests** | **PASS** | Added/aligned test suite `test/phase3.environment.test.ts` to assert that staging blocks `invify.org` CORS settings. Run exited with code 0 (all test runs pass). |

---

## 2. Audit of Remaining References to Old Domains

As instructed, UI presentation assets, past reports, email schemas, and documentation containing references to the old domains have been audited and left untouched to preserve history and presentation consistency.

### Remaining References: `invify.iips.app`
- **UI Footers:**
  - `invify-admin/src/pages/DeviceActivationPage.vue:358` (Displays `"Powered by www.invify.iips.app"`)
  - `invify-admin/src/pages/TenantDetailPage.vue:963` (Displays `"Powered by www.invify.iips.app"`)
  - `invify-admin/src/assets/ui-search-index.json` (Search index mappings for footer text)
- **Mobile/Flutter Templates:**
  - `lib/features/invoicing/domain/templates/concrete_templates.dart:95, 181, 323, 448, 519, 643` (Footer receipt text `"Powered by Invify.iips.app"`)
  - `lib/features/invoicing/presentation/widgets/invoice_preview_dialog.dart:516` (Displays `"Powered by Invify.iips.app"`)
  - `lib/features/printer/domain/services/receipt_service.dart:338` (Displays `"Powered by Invify.iips.app"`)
- **Historical Reports:**
  - `PHASE_5_DOMAIN_CONFIGURATION_REPORT.md` (Previous domain migration report)

### Remaining References: `IIPS.app` / `api.IIPS.app` / `ops.IIPS.app`
- **CA Config:** `ssl-tls-cert-manager.yaml:12` (Email contact `soc-security@IIPS.app`)
- **Websocket Edge System:** `ssl-tls-cert-manager.yaml:40`, `ingress-controller.yaml:47, 75` (`stream.IIPS.app`)
- **Federation Topology:** `federation-deployment-topology.yaml:66` (`https://fed-us-east.IIPS.app/sync`, `https://fed-ap-south.IIPS.app/sync`)
- **Historical Reports:**
  - `PHASE_4_CLIENT_CONNECTIVITY_UAT_REPORT.md`
  - `PRODUCTION_READINESS_AUDIT.md`

### Remaining References: `invify.app` / `api.invify.app` / `app.invify.app`
- **Historical Reports:**
  - `PHASE_4_CLIENT_CONNECTIVITY_UAT_REPORT.md`, `PHASE_4_POST_SUPABASE_MIGRATION_UAT_REPORT.md`, `PHASE_5_3_PRODUCTION_INFRASTRUCTURE_REPORT.md`, `PHASE_5_4_PRODUCTION_INFRASTRUCTURE_VALIDATION_REPORT.md`, `PRODUCTION_READINESS_AUDIT.md`
- **Backend Env Examples:**
  - `invify-backend/.env.example` / `.env_ex` (Example webhooks URLs)
- **Mock Tests:**
  - `invify-backend/test/pos.service.test.ts`, `quasar/04.provisioning.test.ts`, `quasar/07.sandbox-certification.test.ts`, `whatsapp/vault.test.ts` (Mock test endpoint strings)
- **Partner Guides:**
  - `test/fromQuasar/INVIFY_ENTERPRISE_API_REFERENCE.md`, `INVIFY_PLATFORM_INTEGRATION_GUIDE.md` (Mock code snippet URLs)

---

## 3. Remaining Operator Actions

The following DNS and certificate generation operations must be executed manually during the provisioning phase:
1. **DNS Provisioning:** Add `A`/`CNAME` records at the registrar:
   - `api.invify.org` pointing to the production ingress load balancer public IP.
   - `app.invify.org` pointing to the static web server/ingress.
2. **TLS Certificate Injection:** Let's Encrypt certificates will be automatically provisioned by `cert-manager` using the updated ACME issuer configuration in `ssl-tls-cert-manager.yaml` once DNS records propagate.

---

## 4. Final Verdict

### Verdict: **PASS**
All production environment domain configurations, Ingress controllers, LetsEncrypt cert-manager declarations, and security boot safety rules have been successfully migrated to `invify.org`.
