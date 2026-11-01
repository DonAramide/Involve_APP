# HMO Monetisation — Implementation Report

**Date:** 2026-10-31  
**Branch context:** `feature/hmo-management-platform`  
**Companion audit:** `docs/health-insurance/HMO_MONETISATION_ARCHITECTURE_AUDIT.md`

---

## Architecture decisions

1. **Reuse Quasar fee orchestration, wallet, and ledger.** No second wallet or ledger was created.
2. **HMO_SERVICE is a new catalog type** on the existing six-type fee engine. Existing POS, VA, treasury, SMS, and AI profiles are unchanged.
3. **Institution fee scope is not added.** The live CHECK is GLOBAL|AGENT. Requested Institution → Tenant → Global precedence falls back to Agent published → Global published.
4. **Financial ownership is unresolved.** Invify service fee vs institution payable vs HMO profit-share is documented in the Phase 0 audit. **Wallet debit and institution earnings credit are compiled in but hard-gated off.**
5. **Premium confirmation still does not debit USER_WALLET.** It still posts `QUASAR_CLEARING` / `SETTLEMENTS` for the insurer premium and now records a **preview-only** HMO service-fee evaluation in the health audit log.
6. **Bank-account updates are requests, not profile field overwrites.** Matcher never auto-approves. Maker cannot approve their own request. Previous approved account stays active until a checker approves the replacement.
7. **Live payouts stay off.** `FEATURE_REAL_MONEY_PAYOUTS` must remain `false`. `FEE_ORCHESTRATION_LIVE` must stay unset. `HMO_FEE_OWNERSHIP_APPROVED` is not set.
8. **Proposal SQL is not applied.** Staging/production databases were not migrated.

---

## Database changes (proposal only)

| File | Purpose |
|---|---|
| `invify-backend/proposals/DO_NOT_APPLY_hmo_service_fee_catalog.sql` | `ALTER TYPE fee_transaction_type ADD VALUE 'HMO_SERVICE'` + GLOBAL unpublished DRAFT |
| `invify-backend/proposals/DO_NOT_APPLY_bank_account_update_requests.sql` | `bank_account_update_requests` |
| `invify-backend/proposals/DO_NOT_APPLY_hmo_monetisation_grants.sql` | Optional grant CHECK expansion |

Until the enum SQL is applied, Super Admin still sees `HMO_SERVICE` as a virtual catalog row (`schema_pending`). Draft persist / publish returns `409 HMO_FEE_ENUM_UNAPPLIED`.

---

## API endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/platform-fees` | Now includes `HMO_SERVICE` |
| POST | `/api/admin/hmo-service-fee/preview` | Preview only |
| GET | `/api/admin/hmo-finance-report` | Ledger-backed totals (currently empty) |
| GET/POST | `/api/admin/bank-account-requests` | Super Admin review |
| POST | `/api/admin/bank-account-requests/:id/decide` | APPROVE / REJECT / REQUEST_VERIFICATION |
| GET/POST | `/api/tenant/bank-accounts` | Tenant-isolated |
| GET | `/api/agent/hmo/earnings` | Institution-isolated, ledger-backed zeros |
| GET/POST | `/api/agent/hmo/withdrawals` | Control plane; payout never executes |
| GET/POST | `/api/agent/hmo/bank-accounts` | Institution-isolated |

---

## Permission changes

Mapped to existing roles rather than inventing a live grant table:

| Requested | Enforcement |
|---|---|
| `platform.hmo_fees.*` | `super_admin` / `admin_deploy` + existing fee maker-checker |
| `platform.bank_accounts.*` | same admin roles; frontend `platform.bank_accounts.view` |
| `institution.hmo_earnings.view` | HMO_ADMIN, FINANCE_OFFICER, AUDITOR (also accepts `hmo.billing.view`) |
| `institution.withdrawals.*` | HMO_ADMIN, FINANCE_OFFICER (create also accepts `hmo.billing.reconcile`) |
| `institution.bank_accounts.manage` | HMO_ADMIN, FINANCE_OFFICER (also accepts `hmo.profile.manage`) |
| `tenant.bank_accounts.manage` | tenant workspace permissions |

Backend authorisation is on the routes, not only the UI.

---

## Frontend screens

- Finance & Audit → Platform Fee Orchestration: `HMO_SERVICE` row.
- Finance & Audit → HMO Financial Reconciliation: `/admin/hmo-finance`.
- Governance → Bank Account Verification: `/governance/bank-accounts`.
- Institution Finance → HMO Earnings: `/institute/finance/hmo-earnings`.
- Institution Finance → Withdrawals: `/institute/finance/withdrawals`.
- Settings → Bank Accounts (tenant and institution).

---

## Financial posting sequence (current runtime)

1. Enrolment submit → no charge.
2. School approval → no Invify service fee.
3. Premium paid → existing premium journal + **preview** of `HMO_SERVICE`.
4. `evaluateHmoServiceCharge` returns `HMO_FEE_OWNERSHIP_UNRESOLVED`.
5. `wallet_debited = false`, `institution_earning_created = false`.
6. Insurer activation unchanged.

### Fee calculation examples (integer kobo)

| Input | Method | Result |
|---|---|---|
| ₦10,000 premium, 5% (500 bps) | PERCENTAGE | ₦500 (`50_000` kobo) |
| Any premium, ₦500 flat | FLAT | ₦500 (`50_000` kobo) |

Distribution still requires `platform + processor + service + agent = 10_000` bps before a version can publish. Agent share is the Invify **agent institute**, not the HMO institution.

---

## Bank account matching algorithm

1. Lowercase, strip punctuation, collapse whitespace.
2. Drop legal suffixes (`ltd`, `limited`, `plc`, `company`, …) and stopwords.
3. Tokenize and count meaningful overlaps, allowing one-character drift on tokens of length ≥ 4.
4. `< 2` registered tokens → manual review.
5. `< 2` matches → manual review.
6. Two matches but a short account name vs a longer registered name → manual review (`John Mercy`).
7. Two matches with extra unmatched account words → `PENDING_NAME_VERIFICATION`.
8. Stronger overlap → `PENDING_REVIEW`.
9. **`autoApprove` is always false.**

---

## Maker-checker flow

- Fee publish: existing `propose` / `publish` / `reject` + MFA. Maker cannot approve own proposal.
- Bank accounts: requester cannot decide their own request. Rejection reason ≥ 5 characters. Approval supersedes the previous approved row; it is not deleted.
- Withdrawals: requester cannot approve. Reserved amount is released on FAIL/REJECT/RELEASE. `settled` stays false because payout is disabled.

---

## Automated test results

Targeted suite run 2026-10-31:

| Suite | Result |
|---|---|
| `invify-backend/test/hmo-monetisation.test.ts` | Pass |
| `invify-backend/src/modules/fee-orchestration/tests/fee-orchestration.test.ts` | Pass |
| `invify-backend/test/platform-fee-profiles.admin.test.ts` | Pass |
| Combined backend | **64 passed** |
| Admin `HMO_SERVICE catalog` | Pass (screens + new routes) |
| Admin `tests/platform-fee-profiles.test.ts` | 16 passed; 2 pre-existing contract failures (`distribution.meta.permission` is `read_finance` not `admin_deploy`; publish call uses `agentPayload({ otp })`) |

---

## Outstanding risks

| Risk | Status |
|---|---|
| Fee ownership (Invify vs institution vs HMO) | **Blocked — needs product approval** |
| `HMO_SERVICE` enum not on staging | Virtual catalog only until SQL approved |
| Bank request store is in-process memory until SQL | Survives only for the running backend process |
| Institution withdrawals have ₦0 available | Correct: no ledger earnings exist |
| Tenant override tables unused | Unchanged; resolver still Agent → Global |
| Live payout / fee posting flags | Must stay off |

---

## Deployment prerequisites

1. Do **not** apply the three `DO_NOT_APPLY_*.sql` files without written approval.
2. Do **not** set `FEE_ORCHESTRATION_LIVE=true`.
3. Do **not** set `FEATURE_REAL_MONEY_PAYOUTS=true`.
4. Do **not** set `HMO_FEE_OWNERSHIP_APPROVED=true`.
5. Do **not** deploy to production from this change set without a separate release decision.
6. Restart the staging backend only after overlay approval if screens must appear on staging.

**Approval still required before any tenant wallet debit or institution earning credit.**
