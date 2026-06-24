# Phase 2D Walkthrough
## Real Banking Connectivity Layer

This document details the DDL structures and validation parameters for Phase 2D.

---

## 1. Banking Platform Architecture Design

The connectivity layer establishes environment registries, capability health registries, versioned banks, and logs:

```
                  [BankingGatewayService]
                            │
               (Check Capability Certified)
                            │
                            ▼
               [Check Capability HEALTHY]
                            │
                            ▼
              [Log Hashed request/response]
```

### Key Security Safeguards
1.  **Provider Environment Registry**: Credentials, certifications, and routing are strictly isolated per environment using the `provider_environments` table.
2.  **Capability Health Registry**: Routing decisions enforce both certification checks (`certification_status = 'CERTIFIED'`) and health metrics checks (`status = 'HEALTHY'`) in `provider_capability_health`.
3.  **Versioned Bank Registers**: Supports future NIBSS bank code overrides dynamically using version and timeline fields in `banks`.
4.  **API Audit Hashing**: Request and response bodies are SHA256 hashed to prevent logging active bank accounts or secrets.

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_2d_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2d_staging_migration.sql): Complete DDL schema containing environments, certifications, capability health, hashed API logs, and Quasar result registries.
-   [phase_2d_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2d_staging_rollback.sql): Reverts all created tables.

### Test Suites
-   [verify_p05m.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05m.ts): Verification script asserting all 6 checks.

---

## 3. Staging Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_2d_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2d_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05m.ts
    ```
4.  Verify that all 6 checks return `PASS`.
5.  Execute [phase_2d_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2d_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
