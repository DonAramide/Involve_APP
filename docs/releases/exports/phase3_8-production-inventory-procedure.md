# Phase 3.8 — Production security inventory procedure (READ-ONLY)

**Project:** `jjixrywfnaijvahmvcwj` (`Invify_Prod`)  
**SQL pack:** `docs/releases/exports/phase2_6-operator-inventory.sql`  
**Rule:** Read-only only. **No DDL/DML. Do not initialise `schema_migrations`.**

## Steps

1. Open SQL Editor on **production**; confirm project ref `jjixrywfnaijvahmvcwj`.  
2. Execute sections **A → F** of `phase2_6-operator-inventory.sql` one block at a time.  
3. For section A: expect `42P01` / missing `supabase_migrations.schema_migrations` — **record the error**; do not create the relation.  
4. Export result sets to:

```text
docs/releases/exports/phase3_8/production/
  A_schema_migrations.json   # or A_error.txt
  B_functions.json
  C_routine_privileges.json
  D_triggers.json
  E_rls_flags.json
  F_policies.json
```

5. Record operator name, UTC timestamp, project ref screenshot (no secrets).  
6. Compare against staging exports (Gate/`school_gate_*`, `inst_*`, `hw_current_hmo_provider_ids` should be **absent** on production until pending migrations are authorised).

## Forbidden in this procedure

- Creating migration tracker  
- Applying pending SQL  
- Enabling financial flags  
- Restoring dumps into production
