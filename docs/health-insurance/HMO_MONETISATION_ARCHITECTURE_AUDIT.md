# HMO Monetisation — Phase 0 Architecture Audit

**Document:** `docs/health-insurance/HMO_MONETISATION_ARCHITECTURE_AUDIT.md`  
**Date:** 2026-10-31  
**Repository:** `C:\dev\Involve_APP_health`  
**Scope:** Staging design only. No production deploy. No live fee posting. No real-money payouts.

This audit is based on the current source, not on older HMO finance reports. Where `16_HMO_FINANCE_AND_PROFIT_SHARING_REPORT.md` disagrees with `hw_50` / `health-finance.service.ts`, the code and later migrations win.

---

## 1. Decision required before any HMO money is posted

**Financial ownership of the Invify HMO service fee is unresolved.**

Two unjoined money models already exist:

| Model | Split parties | Posted to tenant `USER_WALLET`? |
|---|---|---|
| Platform fee orchestration | `PLATFORM` / `PROCESSOR` / `SERVICE` / `AGENT` | Only when `FEE_ORCHESTRATION_LIVE=true` **and** not production, via `post_fee_debit_guarded` |
| HMO profit-sharing (`hw_50`) | `platform` / `hmo` / `other` | No. Premium confirmation posts `QUASAR_CLEARING` → `SETTLEMENTS` |

Unresolved:

- Whether the Invify HMO **service fee** is 100% platform revenue, shared with the school/employer tenant, shared with the HMO institution, or shared with a distributing bank (`AGENT` in fee orchestration is an **agent institute**, not an HMO).
- Whether insurer premium and Invify service fee are one debit or two.
- Whether `hw_tenant_plan_offers.default_funding` (`school` / `employer` / `member` / `shared`) decides who pays the **premium only**, or also the service fee.

**Rule applied from this point:** configuration, matching, and shadow assessment may be built. **No tenant wallet debit and no institution earnings credit will be enabled until this allocation is approved.** A failed or unapproved debit must not create payables.

Recommended default **for approval, not for posting:**

- Insurer premium: existing `hw_premium_invoices` / `hw_payments` path (unchanged).
- Invify HMO service fee: published `HMO_SERVICE` fee profile, split using existing `platform_share_bps` + `processor_share_bps` + `service_share_bps` + `agent_share_bps` = `10000`.
- Institution (HMO) earnings: **not** the same as `AGENT_FEE`. Do not credit `institutions` from this fee until a dedicated beneficiary type exists.

---

## 2. Existing reusable services (do not duplicate)

### 2.1 Platform fee orchestration

| Item | Location |
|---|---|
| Types | `invify-backend/src/modules/fee-orchestration/types.ts` |
| Calculator (integer kobo, half-even, 10_000 bps) | `FeeCalculator.ts` |
| Splitter | `FeeSplitter.ts` |
| Assess (shadow/live snapshot, no wallet by itself) | `FeeOrchestrator.assess` |
| Resolve published version | `FeeResolver.resolve` — **AGENT published, else GLOBAL** |
| Maker-checker | `PlatformFeeProfilesService.proposePublish` / `publish` / `rejectPublish` |
| Preview | `computePreview` |
| Admin screen | `invify-admin/src/pages/admin/PlatformFeeProfilesPage.vue` at **Finance & Audit → Platform Fee Orchestration** |
| HTTP | `/api/admin/platform-fees*` |

**Closed catalog today:**

`POS_WITHDRAWAL` · `VIRTUAL_ACCOUNT_INWARD_TRANSFER` · `TREASURY_WITHDRAWAL` · `TREASURY_TRANSFER` · `SMS` · `AI_TASK`

Postgres enum: `public.fee_transaction_type` (`20260926163000_fee_orchestration_phase1.sql`). No later `ALTER TYPE`. **HMO is not in the enum.**

**Scopes that exist:** `GLOBAL` and `AGENT` (`agent_id`).  
**Scopes that do not exist:** `INSTITUTION`.  
**Tenant override tables exist** (`fee_profile_overrides`) but `FeeResolver` does not read them.

Admin “Institute” picker is `agents.id`, not `institutions.id`.

Methods already supported: `FLAT` | `PERCENTAGE` | `HYBRID`, plus `min_fee_kobo` / `max_fee_kobo`, version status `DRAFT` | `PUBLISHED` | `SUPERSEDED`. Maker cannot approve own proposal (`sameOperator` → 403). Only published versions are used. Historical assessments keep their snapshot.

### 2.2 Quasar wallet and ledger

| Item | Location |
|---|---|
| Double-entry writer | `LedgerService.createDoubleEntry` |
| RPC | `process_ledger_double_entry` / `process_ledger_double_entry_text` |
| Spendable account | `USER_WALLET` only updates `wallets.balance` |
| Idempotency | `ledgers.idempotency_key` UNIQUE → `{ status: 'DE-DUPLICATED' }` |
| Insufficient funds | `INSUFFICIENT_BALANCE` |
| Tenant history | `GET /api/v1/wallet/transactions` |
| Fee debit (gated) | `FeeLedgerPoster.postAssessment` → `post_fee_debit_guarded`, key `ledger:fee:assess:{id}` |

Recognized accounts: `USER_WALLET`, `QUASAR_CLEARING`, `EXTERNAL_BANK`, `REVENUE`, `COMMISSIONS`, `TAXES`, `SETTLEMENTS`, `REFUNDS`, `CHARGEBACKS`, `ADJUSTMENTS`, `PARENT_LIABILITY`, `PLATFORM_FEE`, `PROCESSOR_FEE`, `SERVICE_FEE`, `AGENT_FEE`.

**There is no `HMO_SERVICE_FEE` account.** Do not invent one. A future HMO fee debit, if approved, must credit an existing fee account (`PLATFORM_FEE` / `SERVICE_FEE` / …).

### 2.3 HMO enrolment and premium

| Item | Location |
|---|---|
| Create enrolment | `HealthEnrolmentService.createEnrolment` inserts `enrolment_pending` |
| Verify | `verifyEnrolment` |
| Premium invoice / pay | `HealthBillingService.issuePremiumInvoice`, `initiatePayment`, `processPaymentConfirmation` |
| Coverage | Policy `active` only after insurer activation (`activation_confirmed_at`) |

**Do not charge** draft, unsubmitted, rejected, or cancelled-before-chargeable rows.

**Chargeable stage today (premium only):** after school verification, when the invoice is paid (`awaiting_premium_payment` → `awaiting_insurer_activation`). Invify service fee must be a **separate** calculation from `hw_plan_versions.premium_minor`.

`processPaymentConfirmation` currently posts `QUASAR_CLEARING` DEBIT / `SETTLEMENTS` CREDIT with key `hw:pay:{paymentId}`. **It does not debit `USER_WALLET`.** Ledger failure is non-fatal.

Enrolment statuses: `draft` · `enrolment_pending` · `awaiting_verification` · `awaiting_premium_payment` · `awaiting_insurer_activation` · `active` · `suspended` · `expired` · `cancelled` · `rejected`.

### 2.4 Existing withdrawals (not institution HMO earnings)

| Path | What it is | Live money |
|---|---|---|
| `POST /api/payout/withdraw` | Tenant treasury withdrawal (`TREASURY_WITHDRAWAL`) | Blocked unless `FEATURE_REAL_MONEY_PAYOUTS=true` **and** production; reservation RPC is `DO_NOT_APPLY` |
| `fee_withdrawal_requests` | Stakeholder **fee-share** payout | `completeSettlement` always throws `PAYOUT_DISABLED` |
| `agent_wallets` | Agent commission wallet | Ends `PAYOUT_DISABLED` |

**There is no institution HMO withdrawal API.**

### 2.5 Bank accounts today

| Entity | Settlement NUBAN fields |
|---|---|
| `tenants` | Virtual account only (`virtual_account_*`) |
| `institutions` | None |
| `hw_providers` | None |
| `beneficiaries` | `bank_code`, `account_number`, `account_name`, `is_verified` (tenant payout beneficiaries) |
| `tenant_staff` | Bank fields for salary |

There is **no** Super Admin bank-account verification queue for institutions or tenants. `MakerCheckerService` domains are `pos_switchboard`, `staff_management`, `tenant_billing` — not bank accounts.

---

## 3. Existing tables and transaction types

### 3.1 Fee orchestration

`fee_profiles`, `fee_profile_versions`, `fee_profile_overrides`, `fee_profile_override_versions`, `fee_assessments`, `fee_assessment_lines`, `fee_stakeholders`, `fee_stakeholder_payables`, `fee_settlements`, `fee_withdrawal_requests`, `fee_distribution_events`.

### 3.2 Ledger

`ledgers`, `ledger_entries`, `wallets`, `transactions_log`, `payment_idempotency_keys`.

### 3.3 HMO billing / profit share

`hw_premium_invoices`, `hw_payments`, `hw_payment_allocations`, `hw_enrolments`, `hw_policies`, `hw_profit_sharing_agreements`, `hw_profit_sharing_statements`, `hw_profit_sharing_settlements`.

Runtime profit-share **mutations still write JSON files** even when tables exist. Treat that store as non-custodial tracking, not a wallet.

### 3.4 Feature flags (must stay off for money)

| Flag | Required state |
|---|---|
| `FEE_ORCHESTRATION_LIVE` | unset / not `true` |
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` |
| Production posting | `isLiveFeePostingAllowed()` is **false in production even if env is true** |

---

## 4. Missing components

1. `HMO_SERVICE` (proposed name) on `fee_transaction_type` and UI catalog.
2. Assess hook from enrolment payment confirmation (must stay shadow until ownership approval).
3. Institution fee scope (not in CHECK constraint).
4. Resolver use of `fee_profile_overrides` (tenant).
5. Institution earnings ledger / payable owner = `institutions.id`.
6. Institution withdrawal against HMO earnings.
7. Bank account **update request** table and Super Admin review UI.
8. Business-name matching service.
9. Dedicated permissions (map to existing `read_finance` / `admin_deploy` / `approve_finance` until grants schema is expanded).
10. Tenant transaction presentation kind for HMO (today: `INBOUND_CREDIT`, `FEE_DEBIT`, `PAYOUT_PRINCIPAL`, `OTHER`).

---

## 5. Proposed database changes (proposal SQL only — do not apply)

1. `ALTER TYPE public.fee_transaction_type ADD VALUE 'HMO_SERVICE';` plus a GLOBAL `fee_profiles` row and unpublished DRAFT version.
2. Additive bank-account request tables (`bank_account_update_requests`) for `TENANT` | `INSTITUTION`, statuses `PENDING_REVIEW` … `SUPERSEDED`. Never overwrite an approved account in place.
3. Do **not** add `INSTITUTION` to `fee_profiles.scope` in the first migration. That changes a CHECK used by live POS/SMS/AI rows.

All files go under `invify-backend/proposals/DO_NOT_APPLY_*.sql`.

---

## 6. Financial posting sequence (when, and only when, approved)

1. Enrolment submitted → `enrolment_pending` (no charge).
2. School verifies → `awaiting_premium_payment` (no Invify service fee yet).
3. Premium invoice paid via existing billing (insurer premium; existing journal).
4. **Then, separately, if approved:** resolve published `HMO_SERVICE` (AGENT profile for the tenant’s owning agent, else GLOBAL). Tenant override later if resolver is wired.
5. `FeeOrchestrator.assess` in **SHADOW** until `FEE_ORCHESTRATION_LIVE` is explicitly approved on staging.
6. Only after a successful assessment **and** a successful `post_fee_debit_guarded` (or `LedgerService.createDoubleEntry` with `USER_WALLET` DEBIT + recognized fee CREDIT) may a payable be materialized.
7. Idempotency key: `ledger:fee:assess:{assessmentId}` or `hw:fee:{enrolmentId}:{invoiceId}`.
8. Retry must de-duplicate. Failed debit → no payable.
9. Insurer activation remains a separate step. Coverage is not granted by the Invify fee debit.

Until step 4 is approved, stop after configuration and shadow preview.

---

## 7. Fee distribution model (proposed, not posted)

Reuse existing 10_000 bps split:

- `platform_bps` → `PLATFORM_FEE` (Invify retained)
- `processor_bps` → `PROCESSOR_FEE`
- `service_bps` → `SERVICE_FEE`
- `agent_bps` → `AGENT_FEE` (Invify **agent institute**, not HMO institution)

Precedence that **already works:** Agent published profile → Global published profile.

Requested Institution → Tenant → Global:

- Institution: **unsupported**. Fall back to Agent/Global.
- Tenant: stored, unused. Do not claim it is live.

Do not silently change POS, VA, treasury, SMS, or AI profiles.

---

## 8. Permissions mapping (reuse, do not invent live grant rows)

| Requested code | Existing equivalent |
|---|---|
| `platform.hmo_fees.view` | `read_finance` + `checkRole(['super_admin','admin_deploy'])` on `/platform-fees` |
| `platform.hmo_fees.manage` | same roles on draft/propose |
| `platform.hmo_fees.approve` | `publish` / `reject` + `requireCheckerMfa` |
| `institution.hmo_earnings.view` | none — HMO portal has `hmo.billing.view` (invoices, not earnings) |
| `institution.withdrawals.*` | none |
| `platform.bank_accounts.*` | none |
| `tenant.bank_accounts.manage` | none (payout settings exist for tenant treasury, not this queue) |

`hw_platform_grants` CHECK still excludes `platform.finance.*` until `DO_NOT_APPLY_hw_platform_finance_grants.sql`.

---

## 9. Risks and migration dependencies

| Risk | Mitigation |
|---|---|
| Enum add is irreversible on Postgres | Proposal SQL only; apply on staging after approval |
| Changing `fee_profiles` CHECK breaks live six types | Do not add INSTITUTION scope in v1 |
| Enrolment verify / payment status skip trigger-legal transitions | Do not add a second illegal jump; keep coverage rules |
| Premium confirmation already posts a non-wallet journal | New fee must use a **new** idempotency key |
| Profit-share JSON store vs tables | Do not treat JSON as institution earnings |
| `reserve_school_withdrawal` unapplied | Institution withdrawals stay control-plane |
| Live flags | Keep `FEE_ORCHESTRATION_LIVE` unset and `FEATURE_REAL_MONEY_PAYOUTS=false` |
| Doc 16 stale columns (`hw_invoices`, `base_premium_kobo`) | Ignore for posting |

---

## 10. Phase plan after this audit

| Phase | Safe to implement now | Stop until approval |
|---|---|---|
| 1 Fee catalog + admin HMO row | Yes (draft/preview only) | Publishing against DB until enum applied |
| 2 Tenant wallet debit | Preview/assess shadow only | Live debit, institution credit |
| 3 Institution earnings UI | Read-only from existing invoices | New payable owner |
| 4 Institution withdrawals | Control-plane UI behind flags | Real payout |
| 5 Bank governance | Matcher + request model | Overwriting approved accounts |
| 6–8 Permissions, reports, tests | Map + unit tests | New grant CHECK on live DB |

---

## 11. Sources

Fee orchestration audit: [Fee orchestration](d7a8b0e9-168e-4a86-9392-cd3c2f0ea0a1)  
Wallet/ledger audit: [Wallet and ledger](70de82ff-b138-434b-be5d-754b0b8510fa)  
HMO finance/banks audit: [HMO finance and banks](c9f44ccc-49a5-4e16-b58c-f0776c6ebcc3)
