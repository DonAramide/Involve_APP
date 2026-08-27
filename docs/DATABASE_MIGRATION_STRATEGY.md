# Database Migration Strategy

**Status:** Analysis complete — no migration systems deleted in Phase 3.  
**Authoritative production path:** `invify-backend/supabase/migrations/`

## Systems discovered

| Path | Type | Role |
|---|---|---|
| `invify-backend/supabase/migrations/*.sql` | SQL migration files (timestamped) | **Authoritative schema history** for Supabase Postgres |
| `invify-backend/src/db/migrations/*.ts` | TypeScript runners (`001`–`004`) | Operational/verification runners for specific P0 tables; **not** full schema history |
| `invify-backend/scratch/*.ts` / `scratch/*.sql` | Ad-hoc scripts | Non-authoritative; some historically targeted staging — **do not use for production** |

## Which system is authoritative?

**`supabase/migrations/` is the single production migration path.**

Rationale:
- Contains the complete chronological DDL history (P05–P20+).
- Aligns with Supabase CLI / hosted migration apply model.
- Payment idempotency DB constraint lives here: `20260813000000_p20_payment_idempotency_constraints.sql`.

## What are the TS runners?

`src/db/migrations/001_*.ts` … `004_*.ts` are **targeted verification / patch runners** for early device/onboarding tables. They:
- Require an explicit env URL (`SUPABASE_URL` or `STAGING_*` / `PROD_*` / `LOCAL_*`)
- **Refuse hardcoded remote defaults** (Phase 3 hardening)
- Must never silently default to staging

They are **not** a second competing schema catalog. Treat them as operational tooling until folded into SQL migrations or retired in a later phase.

## Environment usage

| Environment | Migration apply mechanism | Database target |
|---|---|---|
| Development | Supabase CLI / local apply against DEV project | `DEV_DATABASE` / `LOCAL_*` / `DEV_*` |
| Staging | Explicit apply of `supabase/migrations` to staging project | `STAGING_DATABASE` / `STAGING_*` only |
| Production | Explicit apply of **same** SQL files to production project after review | `PRODUCTION_DATABASE` / `PROD_*` only |

## Duplicates / only-in-one-path

| Observation | Action (Phase 3) |
|---|---|
| Full schema primarily in `supabase/migrations` | Keep as SoT |
| TS runners overlap conceptually with early device tables | Document only; do not delete yet |
| Scratch scripts with hardcoded staging URLs | Quarantine / ignore for prod; delete/clean in Phase 4 |

## Production migration path (required)

```
feature branch
  → SQL added under supabase/migrations/
  → reviewed
  → applied to STAGING (explicit target)
  → QA / UAT
  → release approval
  → applied to PRODUCTION (explicit target)
  → app image promoted
```

Rules:
1. Never apply migrations without naming the target environment.
2. Never use staging credentials against production.
3. Never default a runner to staging when env is unset — **fail fast**.
4. Do not delete either tree until a dedicated migration consolidation PR (Phase 4+) inventories applied hashes.

## Payment idempotency constraint

File: `supabase/migrations/20260813000000_p20_payment_idempotency_constraints.sql`

- Partial unique index on `transactions_log (tenant_id, metadata->>'idempotency_key')`
- Table `payment_idempotency_keys` unique on `(tenant_id, operation, idempotency_key)`
- NULL/missing keys excluded from the partial index

**Apply status:** Defined in repo; must be applied explicitly per environment. Not auto-applied by app boot.
