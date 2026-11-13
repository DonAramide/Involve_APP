# INVIFY PRODUCTION MIGRATION MANIFEST

**Branch:** `release/invify-production-2026`  
**Release candidate SHA:** `bb715b9adf9f8af4c19279cdfb706af44ac1f7c1`  
**Updated (UTC):** 2026-11-05 (Phase 2.6)  
**DB refs:** production `jjixrywfnaijvahmvcwj` · staging `rpcjelhacmkhzguljdgi`  

**Companion docs:**

- `INVIFY_PHASE2_6_DATABASE_SECURITY_INVENTORY.md`
- `INVIFY_PRODUCTION_MIGRATION_BASELINE_STRATEGY.md`
- `INVIFY_PRODUCTION_RECOVERY_READINESS.md`
- `INVIFY_PHASE2_FINAL_GATE_REPORT.md`

**Status:** **PREPARED — NOT APPLIED. GATE BLOCKED.**

---

## Tracking

| Env | Tracker | Notes |
|---|---|---|
| Staging | `supabase_migrations.schema_migrations` (5 rows) | Incomplete vs objects → partial/manual |
| Production | **Relation does not exist** | Baseline strategy designed; **not created this phase** |

Forbidden: blind `supabase db push`; marking applied from partial objects alone.

---

## Security inventory snapshot (RPC OpenAPI)

| | Staging | Production |
|---|---|---|
| Exposed RPC count | 48 | 20 |
| Gate `school_gate_*` | Present / callable samples | Absent |
| `inst_*` | Present | Absent |
| `hw_current_hmo_provider_ids` | Present | Absent |
| Shared fee/ledger/payout RPCs | Present | Present |
| Prod-only | — | `fee_reserve_withdrawal`, `get_tenant_dashboard_stats` |

Full trigger/RLS/SECURITY DEFINER catalog: **outstanding** — run `docs/releases/exports/phase2_6-operator-inventory.sql`.

---

## Release-critical migrations

| Filename | Staging | Production | Class | Safe exec? | Notes |
|---|---|---|---|---|---|
| `20261015000000_school_attendance_management.sql` | Recorded + objects | Objects; no tracker | Partial/manual on prod | No re-apply | |
| `20261015010000`…`hw_40` | Objects; not recorded | Objects; no tracker | Partial/manual | No re-apply | |
| `20261018000000_hw_50_profit_sharing.sql` | Objects; 0 rows | Objects; empty | **ON HOLD** | No | Monetisation off |
| `20261020000000_institution_registry_and_routing_policy.sql` | Partial/manual | **Pending** | Pending prod | After review | Watch `WITH CHECK (true)` insert policy |
| `20261022000000_hw_60_hmo_institution_portal.sql` | Partial/manual | **Pending** | Pending prod | After registry | |
| `20261023000000_hw_70_tenant_mobile_hmo_experience.sql` | Partial/manual | **Pending** | Pending prod | After portal | Data backfill UPDATE |
| `20261024000000_institution_category_and_tenant_branding.sql` | NO-OP | NO-OP | **Excluded** | No | |
| `20261025000000_hw_facility_logo_and_coordinates.sql` | Partial/manual | **Pending** | Pending prod | Yes | Idempotent |
| `20261026120000_hw_platform_entitlements.sql` | Partial/manual | **Pending** | Pending prod | Review UUID constraint | |
| `20261026220000_hw_bank_hmo_offerings.sql` | Partial/manual | **Pending** | Pending prod | Yes | |
| `20261026233000_school_id_cards_and_entry_exit.sql` | Partial/manual | **Pending** | Pending prod | High scrutiny | Triggers/RLS must be proven |
| `20261105060000_school_id_card_invify_code.sql` | Partial/manual | **Pending** | Pending prod | After ID cards | Backfill codes |
| `20261105130000_school_gate_notify_defaults_on.sql` | Needs data backfill (flags false) | **Pending** | Pending + staging backfill | After settings | |
| `proposals/DO_NOT_APPLY_*` | — | — | **Excluded** | No | |

---

## Production apply order (when authorised)

Prerequisites: recovery checklist complete; operator catalog inventory attached; baseline method approved.

1. Institution registry  
2. HMO institution portal  
3. HMO mobile assignment columns  
4. Facility geolocation  
5. Platform entitlements  
6. Bank HMO offerings  
7. School ID cards + entry/exit  
8. Invify identity code  
9. Gate notification defaults  

Skip: category no-op, hw_50 reapply, DO_NOT_APPLY_*, baseline replays.

---

## Financial restrictions (unchanged)

- Do not reapply `hw_50_profit_sharing`  
- Do not apply HMO monetisation / wallet / earnings / live payout proposals  
- Preserve `FEATURE_REAL_MONEY_PAYOUTS=false`  
- Keep `HMO_FEE_OWNERSHIP_APPROVED` unset  
- Keep live fee orchestration off  

---

## Exact remaining blockers

1. **Production backup / PITR / restore-test attestation** (`INVIFY_PRODUCTION_RECOVERY_READINESS.md`).  
2. **Operator catalog inventory** (functions ACLs, triggers, RLS policies) for staging + production.  
3. **Approved baseline tracker initialisation plan** (create later — not in this phase).  
4. Explicit owner approval of pending SQL order + review of permissive institution audit INSERT policy and entitlements UUID constraint.

**Phase 2.6 verdict:** not ready for production migration execution.
