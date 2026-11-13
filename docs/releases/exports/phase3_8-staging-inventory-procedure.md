# Phase 3.8 — Staging security inventory procedure (READ-ONLY)

**Project:** `rpcjelhacmkhzguljdgi` (`Invify-staging`)  
**SQL pack:** `docs/releases/exports/phase2_6-operator-inventory.sql`  
**Rule:** Run in Supabase SQL Editor or `psql` as a read-only role. **No DDL/DML.**

## Steps

1. Open SQL Editor on **staging** only; confirm project ref in the URL bar.  
2. Execute sections **A → F** of `phase2_6-operator-inventory.sql` one block at a time.  
3. Export each result set to:

```text
docs/releases/exports/phase3_8/staging/
  A_schema_migrations.json
  B_functions.json
  C_routine_privileges.json
  D_triggers.json
  E_rls_flags.json
  F_policies.json
```

4. Record operator name, UTC timestamp, and SQL Editor project ref screenshot (no secrets).  
5. Do **not** create `schema_migrations` rows; staging already has a partial tracker.

## Expected notes

- Tracker exists but is incomplete vs live Oct–Nov objects.  
- Gate / institution RPCs should appear in OpenAPI + function dump.  
- Attach exports before approving production DDL.
