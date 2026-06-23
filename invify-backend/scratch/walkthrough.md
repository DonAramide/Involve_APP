# Phase 2B Walkthrough
## Banking Runtime & Provider Integration Layer

This document details the updated DDL structures and validation parameters for Phase 2B.

---

## 1. Banking Runtime Architecture Design

The runtime layer adds automatic circuit breakers and cryptographic handshake security controls:

```
                  [Invify Execution Engine]
                            │
               (Verify RS256 Payout Handshake)
                            │
                            ▼
              [evaluate_provider_health()]
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
        [Providus] (Circuit State: OPEN)  [Wema] (Circuit State: CLOSED)
```

### Key Security Safeguards
1.  **Webhook Idempotency Locks**: Constraints strictly reject double-processing of provider events by hashing request payloads and assigning unique keys to `provider_event_id`.
2.  **Circuit Evaluation Engine**: Function `evaluate_provider_health()` automatically trips provider status to `OPEN` on 5 consecutive failures, removing them from routing availability.
3.  **Credential Key Rotations**: Registry `provider_credentials` segregates public keys and active key versions used for webhook verification.
4.  **Quasar Request Handshakes**: Logs authorization requests and nonces inside `quasar_verification_requests` to prevent playback attack patterns.

---

## 2. Deliverables Inventory

### SQL Packages
-   [phase_2b_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_migration.sql): Complete DDL schema containing webhooks logs, health registries, health audit events, key credentials, and Quasar request registries.
-   [phase_2b_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_rollback.sql): Reverts all created tables, enums, functions, and triggers.

### Test Suites
-   [verify_p05k.ts](file:///c:/dev/Involve_APP/invify-backend/scratch/verify_p05k.ts): Verification script asserting all 4 banking runtime checks.

---

## 3. Staging Execution Instructions

1.  Open the Supabase Dashboard SQL Editor for the Staging Database.
2.  Copy and execute [phase_2b_staging_migration.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_migration.sql).
3.  Run the validation suite:
    ```bash
    npx ts-node invify-backend/scratch/verify_p05k.ts
    ```
4.  Verify that all 4 checks return `PASS`.
5.  Execute [phase_2b_staging_rollback.sql](file:///c:/dev/Involve_APP/invify-backend/scratch/phase_2b_staging_rollback.sql) in the Supabase Dashboard to test rollback integrity.
6.  Re-run migration and verify passing status.
