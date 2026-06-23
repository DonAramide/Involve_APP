# Phase 2B Walkthrough
## Banking Runtime & Provider Integration Layer

This document details the DDL structures and validation parameters for Phase 2B.

---

## 1. Webhook Verification Queue

Webhook events are logged to the database queue before verification:

```
[Incoming Webhook]
       │
       ▼
[incoming_webhook_logs (PENDING_VERIFICATION)]
       │
       ▼ (Asynchronous signature validation check)
[incoming_webhook_logs (VERIFIED)]
       │
       ▼
[Credit Merchant available_balance & record ledger entries]
```

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_2b_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_migration.sql): Complete DDL schema containing webhooks queues, health registries, and transition audit events.
-   [phase_2b_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_rollback.sql): Reverts all created tables, enums, functions, and triggers.

### Test Suites
-   [verify_p05k.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05k.ts): Verification script asserting all 3 banking runtime checks.

---

## 3. Staging Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_2b_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05k.ts
    ```
4.  Verify that all 3 checks return `PASS`.
5.  Execute [phase_2b_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
