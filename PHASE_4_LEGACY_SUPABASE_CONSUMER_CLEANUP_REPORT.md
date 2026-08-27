# Phase 4 — Legacy Supabase Key Consumer Cleanup Report

This report summarizes the cleanup, classification, and hardening of remaining legacy Supabase key-name consumers outside the staging runtime. The objective was to eliminate any accidental legacy dependencies so that production readiness does not inherit insecure or deprecated credential paths.

---

## 1. Legacy Consumer Inventory & Classification

All discovered legacy key-name consumers have been evaluated and classified according to their target environment and runtime profile:

| Consumer Path / Identifier | Key Reference(s) | Env Class | Runtime Dependency? | Status / Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| `invify-backend/docker-compose.local.yml` | `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | LOCAL | Yes (Local Development) | **Retained** (Explicit Local Fallback) |
| `invify-backend/src/config/build-variant.ts` (LOCAL branch) | `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | LOCAL | Yes (Local Runtime) | **Retained** (Explicit Local Fallback) |
| `invify-admin/src/supabase.js` (LOCAL fallback) | `VITE_SUPABASE_ANON_KEY` | LOCAL | Yes (Admin App Local) | **Retained** (Explicit Local Fallback) |
| `lib/core/utils/app_config.dart` (Development fallback) | `SUPABASE_ANON_KEY` | LOCAL | Yes (Flutter App Local) | **Retained** (Explicit Local Fallback) |
| `invify-backend/docker-compose.prod.yml` | `PROD_SUPABASE_SERVICE_KEY` | PROD | Yes (Prod Compose) | **Retained** (Explicit Production Config) |
| `invify-backend/src/config/build-variant.ts` (PROD branch) | `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | PROD | Yes (Prod Runtime) | **Retained** (Explicit Prod Fallback) |
| `invify-backend/src/db/migrations/migration-env.ts` (PROD branch) | `SUPABASE_SERVICE_ROLE_KEY` | PROD | Yes (Prod Migrations) | **Retained** (Explicit Prod Fallback) |
| `invify-backend/k8s/secret.yaml` | `SUPABASE_SERVICE_ROLE_KEY: PLACEHOLDER` | PROD | No (Template Placeholder) | **Retained** (Documented Placeholder) |
| `invify-backend/src/db/migrations/migration-env.ts` (LOCAL/STAGING) | `SUPABASE_SERVICE_ROLE_KEY` | Migration Tool | Yes (Migration Runner) | **Cleaned** (Strict isolation by `BUILD_VARIANT`) |
| `invify-backend/verify.ts` | `STAGING_SUPABASE_SERVICE_KEY` | Staging Test | Yes (Staging Sanity Checks) | **Cleaned** (Strict isolation, reads `.env.staging`) |
| `invify-backend/scripts/seed_dashboard_evidence.ts` | `STAGING_SUPABASE_KEY` / `SUPABASE_KEY` | Seeding Tool | Yes (Testing Seeder) | **Cleaned** (Strict isolation by `BUILD_VARIANT`) |
| `invify-backend/test/phase3.environment.test.ts` | `PROD_SUPABASE_SERVICE_ROLE_KEY` | Test Suite | Yes (Test Mocking) | **Cleaned** (Aligned with `PROD_SUPABASE_SERVICE_KEY`) |
| `invify-backend/scratch/view_wallets_schema.ts` | `STAGING_SUPABASE_SERVICE_KEY` | Scratch | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/scratch/audit_supabase_security.ts` | `STAGING_SUPABASE_SERVICE_KEY` | Scratch | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/scratch/rls_penetration_test.ts` | `STAGING_SUPABASE_SERVICE_KEY` | Scratch | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/scratch/verify_fallback.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Scratch | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/check_vault.js` | `STAGING_SUPABASE_SERVICE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/fix_vault.js` | `STAGING_SUPABASE_SERVICE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/activate_vault.js` | `STAGING_SUPABASE_SERVICE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/fix_vault_typo.js` | `STAGING_SUPABASE_SERVICE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/audit-phase4.js` | `SUPABASE_SERVICE_ROLE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/test-tenant-code-schema.ts` | `STAGING_SUPABASE_SERVICE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |
| `invify-backend/test-tenant-code-schema.js` | `STAGING_SUPABASE_SERVICE_KEY` | One-Off | No (Obsolete) | **Deleted** (Obsolete) |

---

## 2. Removed and Retained Consumers Summary

### Removed Consumers (Obsolete Scratch & One-Off Scripts)
To enforce strict boundary security and remove insecure credential paths, **11 obsolete files** were verified as unreferenced and deleted:
1. `invify-backend/check_vault.js`
2. `invify-backend/fix_vault.js`
3. `invify-backend/activate_vault.js`
4. `invify-backend/fix_vault_typo.js`
5. `invify-backend/audit-phase4.js`
6. `invify-backend/test-tenant-code-schema.ts`
7. `invify-backend/test-tenant-code-schema.js`
8. `invify-backend/scratch/view_wallets_schema.ts`
9. `invify-backend/scratch/audit_supabase_security.ts`
10. `invify-backend/scratch/rls_penetration_test.ts`
11. `invify-backend/scratch/verify_fallback.ts`

### Retained Consumers & Justifications

- **Local Development Fallbacks (`docker-compose.local.yml`, `build-variant.ts` LOCAL, Admin/Flutter fallbacks):**
  - *Reason:* Necessary to keep local developer setups functional without requiring rotated production-like credentials. The boundary is made explicit; local fallbacks do not apply when `BUILD_VARIANT` is set to `STAGING` or `PROD`.
- **Production Configurations (`docker-compose.prod.yml`, `build-variant.ts` PROD, `migration-env.ts` PROD):**
  - *Reason:* Preserves production credentials configuration. No production changes were made in this task.
- **k8s Secret (`invify-backend/k8s/secret.yaml`):**
  - *Reason:* Retained as a deployment placeholder template (all values are set to `"PLACEHOLDER"`).

---

## 3. Hardening & Mitigation Details

### Migration Environment Isolation
`invify-backend/src/db/migrations/migration-env.ts` was refactored to isolate environments strictly via `BUILD_VARIANT`:
- **STAGING:** Exclusively resolves `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_SECRET_KEY`. No legacy fallbacks are allowed.
- **PROD:** Resolves `PROD_` values with fallbacks to preserve existing prod behavior.
- **LOCAL:** Resolves `LOCAL_` values with local fallbacks.

### Seeding Script Hardening
`invify-backend/scripts/seed_dashboard_evidence.ts` was refactored to isolate credentials by environment. In staging, it exclusively consumes `STAGING_SUPABASE_SECRET_KEY` and does not query legacy names.

### Staging Verification Hardening
`invify-backend/verify.ts` was modified to load credentials from `.env.staging` if present, requiring `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_SECRET_KEY` with no legacy fallbacks.

---

## 4. Verification & Testing

### Staging Verification Results
All staging runtime verification tools executed successfully with **PASS** status:
- **`verify.ts` Database Certification:**
  ```
  === DATABASE CERTIFICATION ===
  PASS: reconciliation_cases table exists. Sample row count: 0
  Row count validation: 0
  PASS: reconciliation_timeline table exists.
  ```
- **`phase4_post_migration_verify.ts` Check:**
  - `key_classes` = **PASS** (secret=SECRET, publishable=PUBLISHABLE)
  - `staging_host` = **PASS**
  - `db_access_secret` = **PASS**
  - `user_lookup_secret` = **PASS**
  - `tenant_scoped_secret` = **PASS**
  - `legacy_names_absent_from_staging_env` = **PASS** (legacy_present=false)
- **`phase4_supabase_rotation_verify.ts` Check:**
  - `staging_env_file` = **PASS**
  - `new_key_classes` = **PASS**
  - `legacy runtime consumers` = **0**

### Automated Test Suite Execution
All backend security, environment, and isolation test gates were run and passed:
- **Phase 2 Security Lockdown Tests:** `PASS`
- **Phase 3 Environment & Health Tests:** `PASS`
- **Phase 4 Hardening Tests:** `PASS`
- **Phase 4 Tenant Isolation Tests:** `PASS`
- **Total Test Result:** **41/41 PASS**

---

## 5. Security & Safety Compliance

> [!IMPORTANT]
> - **Legacy Provider Keys:** Staging legacy anon/service_role keys at the provider level were **NOT** disabled in this phase and remain active.
> - **Production Credentials:** No production credentials were modified or switched.
> - **Payout Safety:** `FEATURE_REAL_MONEY_PAYOUTS` is strictly set to `false`.
> - **Zero Secret Disclosures:** No actual secret credential values were logged or printed.

---

## 6. Production Readiness Impact

### Kubernetes Secret Injection Mechanism
Production deployments utilizing the `invify-backend/k8s/secret.yaml` template must configure a secure secret injection mechanism. Standard practices require:
1. **External Secret Operator (ESO):** Syncing Kubernetes secrets directly with AWS Secrets Manager or HashiCorp Vault.
2. **CI/CD Pipeline Injection:** Secure vault lookup during pipeline run-time, inserting base64-encoded values into the secret manifest before applying to production clusters.
3. **IAM Roles for Service Accounts (IRSA):** Letting the backend pod read secrets directly from the cloud secret store using cloud IAM credentials.

---

### Conclusion
**Phase 4 Legacy Supabase Key Consumer Cleanup is complete.** The staging runtime has **0** active legacy key consumers, and all insecure legacy configurations outside the runtime have been safely removed or hardened.
