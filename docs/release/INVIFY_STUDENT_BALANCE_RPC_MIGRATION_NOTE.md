# Student-balance RPC — dedicated migration (NOT APPLIED)

**Branch:** `remediate/student-balance-rpc-c7e336ea`  
**Base:** `origin/main` = `c7e336eaec18820c7b741eeff18b985014540d45`  
**SQL:** `invify-backend/proposals/DO_NOT_APPLY_validate_student_balances_tenant.sql`  
**Status:** **UNAPPLIED**. No production/staging SQL APPLY.

## Source findings (static)

| Item | Evidence |
|---|---|
| Canonical `supabase/migrations` | **No** `validate_student_balances` function |
| Non-canonical SQL | `backend/database/student_balance_sync.sql` — 0-arg, no tenant, not SECURITY DEFINER, no `search_path`, no GRANTs |
| HTTP caller (candidate) | `IntegrityController.validateStudentBalances` called `supabase.rpc('validate_student_balances')` with **no arguments** after resolving tenant |
| Live production function | **UNKNOWN** — no authorized read-only `pg_proc` inventory |

## Why this is a separate branch

Application fail-closed lives on `remediate/authz-tenant-jwt-c7e336ea` (stops calling the 0-arg RPC). Database shape changes require independent DB authorization and must not ride the authz PR.

## Required before APPLY

1. Read-only production/staging `pg_proc` / grants / owner / `prosecdef` / `proconfig`.
2. Confirm `ledgers.student_id` / `ledgers.amount` / `ledgers.school_id` exist on the target (p10 `ledgers` is a different financial table).
3. Separate APPLY authorization naming the exact database.
