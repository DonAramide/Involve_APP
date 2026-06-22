# Phase 1C Implementation Walkthrough

This document outlines the Phase 1C DDL migration packages, validation suites, and the system dependency graph.

---

## 1. Decoupled Authority System Dependency Graph

This graph shows the transactional relationships between Invify (System of Record) and Quasar (Independent Payment Execution/Verification Network):

```mermaid
graph TD
    subgraph Invify (System of Record)
        FE[financial_events Master] --> LE[ledger_entries]
        FE --> FT[fee_transactions]
        FE --> TM[treasury_movements]
        TM --> TJE[treasury_journal_entries Debit/Credit]
        
        FF[financial_freezes Scoped Holds]
        RF[reserved_funds Expirations]
        
        TA[treasury_accounts Ownership]
        TA -->|Derives Balance| TM
    end

    subgraph Quasar (Verification & Execution Layer)
        QVR[quasar_verification_records Independent Audit Proof]
        FL[financial_execution_locks Mutex]
        PS[provider_settlements state]
    end

    %% Pipeline linkages
    FE -->|Request Payout| FL
    FL -->|Lock Wallet| QVR
    QVR -->|Perform Independent Risk Checks| FF
    QVR -->|Verify Settlement State| PS
    QVR -->|Reserve Funds| RF
```

---

## 2. Key Architecture Rules Configured

1.  **Direct Ledger available_balance Check**:
    $$\text{Available Balance} = \text{Ledger Sum} - \text{Active Reserves} - \text{Unsettled Settlements}$$
    The wallet cache is only compared to check for drift and logs warnings if discrepant. It does not dictate transfer limit validation.
2.  **State Machine Validation**:
    Enforces that event state steps legally transition (`INITIALIZED -> PENDING -> PROCESSING -> COMPLETED/FAILED`).
3.  **Scoped Freeze Enforcement**:
    Checks account freeze scopes (`WITHDRAWALS_ONLY`, `PAYOUTS_ONLY`, `SETTLEMENTS_ONLY`, `FULL_ACCOUNT`) and throws exceptions on blocks.
4.  **Double-Entry Journal Balancing**:
    Asserts that debit totals match credit totals ($0.00$ tolerance) for every financial event.

---

## 3. Deliverables Inventory

### SQL Packages
-   [phase_1c_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1c_staging_migration.sql): Complete DDL schema containing `financial_events`, `treasury_accounts`, `treasury_movements`, `treasury_journal_entries`, `reserved_funds`, `financial_freezes`, `provider_settlements`, `quasar_verification_records`, and `financial_execution_locks` along with the validation function triggers.
-   [phase_1c_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1c_staging_rollback.sql): Reverts all created tables, indexes, custom enums, and constraint keys.

### Test Suites
-   [verify_p05h.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05h.ts): Complete validation script asserting all 12 Phase 1C runtime behaviors.

---

## 4. Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_1c_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1c_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05h.ts
    ```
4.  Verify that all 12 checks return `PASS`.
5.  Execute [phase_1c_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_1c_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
