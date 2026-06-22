# Phase 2A Walkthrough
## Banking Infrastructure Foundation

This document details the updated DDL structures and validation parameters for Phase 2A.

---

## 1. Banking Architecture Design

The foundation layer handles routing virtual accounts and transfer executions securely across providers:

```
                  [Invify Routing Engine]
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
        [Providus]        [Wema]        [Paystack]
```

### Key Security Safeguards
1.  **Transfer Transition Guards**: Triggers block illegal transfer log status jumps (e.g. `PENDING -> SUCCESS` directly, bypassing `PROCESSING`).
2.  **Lineage Constraint**: Employs `NOT NULL` columns to prevent transfers from bypassing `financial_event_id` registry trails.
3.  **Beneficiary Verification Trigger**: Inserts to `bank_transfer_logs` fail immediately if the target record in `beneficiaries` has `is_verified = false`.
4.  **Transfer Attempt Logs**: Tracks execution retries, status, and error details inside `bank_transfer_attempts`.

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_2a_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2a_staging_migration.sql): Complete DDL schema containing beneficiaries, routing profiles, virtual accounts, transfer logs, and retry attempts.
-   [phase_2a_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2a_staging_rollback.sql): Reverts all created tables, enums, functions, and triggers.

### Test Suites
-   [verify_p05j.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05j.ts): Verification script asserting all 6 banking validation checks.

---

## 3. Staging Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_2a_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2a_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05j.ts
    ```
4.  Verify that all 6 checks return `PASS`.
5.  Execute [phase_2a_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2a_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
