# Phase 2C Walkthrough
## Unified Banking Gateway & Execution Layer

This document details the DDL structures and validation parameters for Phase 2C.

---

## 1. Banking Platform Architecture Design

The execution layer provides multi-provider adapters, automatic timeout retry failover, and dynamic SLA routing:

```
                  [BankingGatewayService]
                            │
               (Acquire Distributed Lock)
                            │
                            ▼
              [RoutingEngineService (SLA)]
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
        [Providus] (Failed: Timeout)      [Wema] (Success: Failover Target)
```

### Key Security Safeguards
1.  **Dynamic SLA Routing Engine**: Calculations score providers dynamically based on latency weights, flat costs, and health scores, automatically excluding inactive, OPEN circuit, or under-funded provider channels.
2.  **Heartbeated Distributed Locks**: Employs an execution locking system with a 120s TTL and a 30s background renewal interval to block concurrent payout double-spends.
3.  **Automatic Failover Orchestration**: Outward transfers retry up to 3 times, automatically shifting providers, registering new attempt records, and logging health status changes on failure.
4.  **Sandbox Simulation Layer**: Seamless integration mocks Providus, Wema, Paystack, and Flutterwave operations to validate pipeline integrity.

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_2c_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2c_staging_migration.sql): Complete DDL schema containing capabilities, fee profiles, and balance snapshots.
-   [phase_2c_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2c_staging_rollback.sql): Reverts all created tables.

### Test Suites
-   [verify_p05l.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05l.ts): Verification script asserting all 10 banking execution checks.

---

## 3. Staging Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_2c_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2c_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05l.ts
    ```
4.  Verify that all 10 checks return `PASS`.
5.  Execute [phase_2c_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2c_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
