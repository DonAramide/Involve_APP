# Phase 2D Walkthrough
## Real Banking Connectivity Layer (Hardened Release)

This document details the DDL structures and validation parameters for Phase 2D.

---

## 1. Banking Platform Architecture Design

The connectivity layer establishes environment-isolated registries, capability health keys, versioned banks, and logs:

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
1.  **Provider Environment Registry**: Isolation of credentials and URL routes per target space in `provider_environments`.
2.  **Environment-Isolated Health Checks**: Gating decisions on `provider_capability_health` unique keys `(provider, environment, capability)`.
3.  **Hashed Request Log Classifiers**: Includes API `request_type` constraints for detailed transactional analysis.
4.  **Quasar Decision Tracks**: Maps decisions (`APPROVED`, `RISK_REJECTED`, etc.) directly on withdrawal chains.

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_2d_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2d_staging_migration.sql): Hardened DDL schema package.
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
