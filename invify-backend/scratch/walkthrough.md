# Phase 1D Implementation Walkthrough
## Operational Treasury & Settlement Layer

This document details the migration structures and validation procedures for Phase 1D.

---

## 1. Reconciliation Hierarchy

The matching engine enforces a strict multi-layer reconciliation validation trace:

```
[Provider Settlement Batch]
       │
       ▼
[Settlement Records]
       │
       ▼
[Financial Events]
       │
       ▼
[Ledger Entries (Level 1 Canonical)]
       │
       ▼
[Treasury Position (Liability Sum)]
```

If any mismatch is detected in the matching sequence, it registers a `settlement_discrepancy` record for manual administrative resolution.

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_1d_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1d_staging_migration.sql): Complete DDL schema containing clearing profiles, batches, snapshots, discrepancy logs, dashboard functions, and daily ledger jobs.
-   [phase_1d_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1d_staging_rollback.sql): Reverts all created tables, enums, functions, and columns.

### Test Suites
-   [verify_p05i.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05i.ts): Verification script asserting all 6 settlement matching and reconciliation gates.

---

## 3. Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_1d_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1d_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05i.ts
    ```
4.  Verify that all 6 checks return `PASS`.
5.  Execute [phase_1d_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1d_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
