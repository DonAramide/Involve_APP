# INVIFY PRODUCTION MIGRATION MANIFEST

**Branch:** `release/invify-production-2026`  
**Release candidate SHA:** `5465431d9b53308f28100833ecb2b9e01b763dc8`  
**Prepared (UTC):** 2026-11-05  
**Expected DB refs:** production `jjixrywfnaijvahmvcwj` · staging `rpcjelhacmkhzguljdgi`  
**Status:** **PREPARED — NOT APPLIED.** Production DB identity still requires authorised operator confirmation before any apply.

---

## How to use this manifest

1. Operator confirms production/staging `SUPABASE_URL` project refs (host only).  
2. Export `supabase_migrations.schema_migrations` (or project equivalent) from **both** environments.  
3. Fill the **Verified staging** / **Verified production** columns.  
4. Take and verify a production backup.  
5. Apply only rows classified **Pending production migration** that are also **Approved for this release**.

---

## Classification legend

| Class | Meaning |
|---|---|
| Already applied | Present in target env migration history |
| Pending production migration | In release Git; not yet confirmed on production |
| Staging-only | Applied or intended only on staging |
| Duplicate | Overlaps another migration / superseded |
| Requires data backfill | Schema alone insufficient |
| Requires explicit approval | Business/security risk beyond this release |
| Excluded | Must not run in this production release |

Until history exports exist, feature migrations below are marked **Pending verification** for both environments.

---

## A. Release-critical feature migrations (Oct–Nov 2026)

| Filename | Purpose | Dependencies | Staging | Production | Class | Data impact | Rollback | Approval |
|---|---|---|---|---|---|---|---|---|
| `20261015000000_school_attendance_management.sql` | School attendance schema | Prior school tables | Pending verification | Pending verification | Pending production migration* | Additive attendance structures | Forward-fix preferred | Included if not already applied |
| `20261015010000_hw_00_foundation.sql` | HMO foundation | — | Pending verification | Pending verification | Pending production migration* | New HMO foundation tables | Limited | Included (operational HMO) |
| `20261015020000_hw_10_people.sql` | HMO people | hw_00 | Pending verification | Pending verification | Pending production migration* | People/profile links | Limited | Included |
| `20261015030000_hw_20_policies_enrolments.sql` | Policies / enrolments | hw_10 | Pending verification | Pending verification | Pending production migration* | Enrolment rows | Limited | Included |
| `20261015040000_hw_30_billing_payments.sql` | HMO billing/payments | hw_20 | Pending verification | Pending verification | Pending production migration* | Billing artefacts | Limited | Included (preserve insurer activation rules) |
| `20261015050000_hw_40_rls_audit.sql` | HMO RLS/audit | hw_* | Pending verification | Pending verification | Pending production migration* | Policies | Limited | Included |
| `20261018000000_hw_50_profit_sharing.sql` | Profit sharing | hw_* | Pending verification | Pending verification | **Requires explicit approval** | Earnings structures | Limited | **Review before apply** — monetisation adjacency |
| `20261020000000_institution_registry_and_routing_policy.sql` | Institution registry / routing | — | Pending verification | Pending verification | Pending production migration* | Registry tables | Limited | Included |
| `20261022000000_hw_60_hmo_institution_portal.sql` | Institution portal | registry + hw_* | Pending verification | Pending verification | Pending production migration* | Portal structures | Limited | Included |
| `20261023000000_hw_70_tenant_mobile_hmo_experience.sql` | Mobile HMO experience | hw_* | Pending verification | Pending verification | Pending production migration* | Experience tables | Limited | Included |
| `20261024000000_institution_category_and_tenant_branding.sql` | Category / branding | registry | Pending verification | Pending verification | Pending production migration* | Metadata columns | Limited | Included |
| `20261025000000_hw_facility_logo_and_coordinates.sql` | Facility logo/coords | hw_* | Pending verification | Pending verification | Pending production migration* | Media/geo fields | Limited | Included |
| `20261026120000_hw_platform_entitlements.sql` | Platform entitlements | hw_* | Pending verification | Pending verification | Pending production migration* | Entitlement rows | Limited | Included |
| `20261026220000_hw_bank_hmo_offerings.sql` | Bank / HMO offerings | hw_* | Pending verification | Pending verification | Pending production migration* | Offering links | Limited | Included (governance UI may depend) |
| `20261026233000_school_id_cards_and_entry_exit.sql` | ID cards + gate entry/exit | school + settings | Pending verification (staging programme used) | Pending verification | Pending production migration* | Cards, sessions, notifications, triggers | **Difficult** (triggers/guards) | **Required** for Gate/ID |
| `20261105060000_school_id_card_invify_code.sql` | 12-char Invify identity | `20261026233000` | Staging programme applied | Pending verification | Pending production migration | New identity columns/functions | Forward-compatible | **Required** |
| `20261105130000_school_gate_notify_defaults_on.sql` | Gate notify defaults ON | `20261026233000` | Intent applied via SQL/app | Pending verification | Pending production migration | Updates settings defaults/rows | Reversible UPDATE | Included |

\*Reclassify to **Already applied** once production history export confirms.

---

## B. Explicitly excluded (do not apply this release)

| Artifact | Reason | Class |
|---|---|---|
| `proposals/DO_NOT_APPLY_hmo_monetisation_grants.sql` | Unresolved fee ownership | Excluded |
| `proposals/DO_NOT_APPLY_hmo_service_fee_catalog.sql` (+ seed) | Unresolved fee ownership | Excluded |
| `proposals/DO_NOT_APPLY_hw_platform_finance_grants.sql` | Finance grants prep | Excluded |
| `proposals/DO_NOT_APPLY_bank_account_update_requests.sql` | Needs Phase 7 explicit authorisation beyond prep | Excluded until approved |
| `proposals/DO_NOT_APPLY_hw_provider_registration_channel.sql` | Marked do-not-apply | Excluded |
| `proposals/DO_NOT_APPLY_hw_claims_workflow.sql` | Marked do-not-apply proposal | Excluded unless superseded by applied hw_* migrations |
| Other `DO_NOT_APPLY_*` / `PENDING_APPROVAL_*` | Safety | Excluded |

Runtime note: `invify-backend/src/modules/hmo-monetisation/**` is present on the release branch via `feature/va-hmo-staging-candidate` merge for **gated** bank-governance/code paths. **Do not** set `HMO_FEE_OWNERSHIP_APPROVED`, enable wallet debits, earnings posting, or live payouts.

---

## C. Pre-October baseline migrations

All earlier `invify-backend/supabase/migrations/20260*` files (fee orchestration, ledger, devices, inventory, etc.) are assumed part of the existing production lineage unless history export shows gaps.

| Action | Detail |
|---|---|
| Diff | Compare full filenames to production migration history |
| Do not | Replay entire baseline blindly |
| Flag | Any missing baseline migration as **Requires explicit approval** before apply |

---

## D. Destructive / irreversible screen

Stop and report if any pending migration:

- Drops tenant tables or truncates tenant data  
- Rewrites enums incompatibly without forward path  
- Seeds production with test data  
- Enables live fee posting / payouts  

None of the **required** ID-card / Invify-code / gate-notify migrations are intended to drop tenant data; still review SQL text before apply.

---

## E. Apply order (when authorised)

1. Confirm backups + project refs.  
2. Apply any missing `20261015*` attendance/HMO foundation chain in timestamp order.  
3. Apply institution/HMO portal chain `20261020*`–`20261026*`.  
4. Apply `20261026233000_school_id_cards_and_entry_exit.sql` if missing.  
5. Apply `20261105060000_school_id_card_invify_code.sql`.  
6. Apply `20261105130000_school_gate_notify_defaults_on.sql`.  
7. Skip all `DO_NOT_APPLY_*`.  
8. Hold `20261018000000_hw_50_profit_sharing.sql` until explicit approval.

---

## F. Verification queries (operator; no secrets)

After apply, confirm presence of:

- `public.school_id_cards` (+ Invify identity columns/functions from 20261105)  
- `public.school_entry_exit_sessions` / notifications  
- HMO foundation tables from hw_* chain  
- `school_id_card_settings.notify_*` defaults true where intended  

Do not print connection strings or keys.
