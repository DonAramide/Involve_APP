# INVIFY HEALTH & WELLNESS — HMO FINANCIAL INTEGRITY AND STAGING ACCEPTANCE AUDIT REPORT

**Document ID:** `DOC-HW-FINANCE-017`  
**Date:** 2026-10-18  
**Audit Target:** HMO Finance, Profitability & Profit-Sharing Module  
**Repository:** `C:\dev\Involve_APP_health`  
**Branch:** `feature/health-insurance-phase1`  
**Auditor:** Antigravity Autonomous Security & Financial Systems Auditor (Strict Read-Only Mode)  
**Classification:** Internal Governance & Financial Acceptance Audit  
**Final Verdict:** **DO NOT ACCEPT** (Critical Data Integrity & Authorization Remediations Required)

---

## 1. EXECUTIVE SUMMARY

An exhaustive, strictly read-only financial integrity, security, and staging acceptance audit of the **Invify Health & Wellness — HMO Finance, Profitability & Profit-Sharing Module** was executed on 2026-10-18. 

The scope encompassed the financial database schema migrations, TypeScript backend domain services, REST controller endpoints, RBAC permission guards, Vue 3 / Quasar governance frontend views, API client interfaces, and isolated Jest verification suites.

### Key Audit Findings:
1. **Critical Synthetic Data in HMO Performance Metrics (`FAIL`):** In `HealthFinanceService.getHmoPerformance()`, billed, collected, and settled premium figures are not aggregated from real invoices or payments. Instead, they are synthetically calculated as `directUnderwritingKobo * 1.35` whenever enrolled members exist. This fabricates billed revenue and distorts provider performance metrics.
2. **Hardcoded Financial Trend Charts (`FAIL`):** `HealthFinanceService.getFinancialTrends()` returns static, hardcoded monthly arrays for revenue, costs, margins, and profit-share instead of querying chronological ledger or invoice transactions.
3. **Unapplied Database Migration & Local File Persistence (`FAIL`):** Database migration `20261018000000_hw_50_profit_sharing.sql` is marked `-- PROPOSED — NOT APPLIED.` and has not been run against PostgreSQL. Agreements, statements, and settlements are stored in local JSON files (`health-profit-sharing-*-staging.json`). As a result, critical PostgreSQL database constraints (foreign keys `ON DELETE RESTRICT`, unique indexes, check constraints) are not enforced at the storage layer.
4. **Omission of Row Level Security (RLS) in Migration (`FAIL`):** The proposed migration file defines three new tables but contains **no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`** commands and zero RLS policies.
5. **Contract Mismatches Between Frontend and Backend (`FAIL`):** Severe property name and case convention discrepancies exist between `HealthFinanceService` outputs and `HealthInsuranceGovernancePage.vue`. The frontend expects snake_case (`agreement_code`, `provider_name`) while the backend outputs camelCase (`reference`, `providerName`). Key performance fields (`totalBilledKobo` vs `premiumsBilledKobo`, `totalRevenueKobo` vs `recognizedRevenueKobo`) do not match, causing tables to display blank or `₦0` values in the governance interface.
6. **Consolidated Overview Period Filtering Flaw (`FAIL`):** `HealthFinanceService.getConsolidatedOverview()` accepts a `period` filter but completely ignores it in its database queries and calculation logic, returning lifetime cumulative figures regardless of the user's selected time range.
7. **Macro Offset Defect in Outstanding Premiums (`FAIL`):** Outstanding premiums are calculated as `Math.max(0, totalBilled - totalCollected)`. If Tenant A has overpaid by ₦50,000 and Tenant B owes ₦50,000, Tenant B's outstanding debt is masked.
8. **Broad Privilege Conflation in RBAC Routes (`FAIL`):** All financial mutation routes (including statement generation, agreement proposal, and maker-checker approval) accept the broad telemetry grant `platform.integration.health`, allowing operators with monitoring-only access to authorize financial agreements and reconcile disbursements.
9. **Dual-Control Maker-Checker Logic Implemented in Code (`PASS`):** In-memory application logic in `HealthFinanceService` successfully prevents an administrator from approving their own profit-sharing agreements and statements, confirmed by automated tests.
10. **Non-Custodial Settlement Execution (`PASS`):** Settlement reconciliation operates as an internal accounting queue; no automated third-party banking disbursements or real-money payouts are initiated.

Based on these findings, the module **CANNOT BE ACCEPTED** for production or live financial deployment in its current state. Comprehensive remediation of data sources, migration deployment, RLS policy enforcement, and contract alignment is required before staging sign-off.

---

## 2. SCOPE AND READ-ONLY CONFIRMATION

### Audit Scope:
- **Database Schema & Migrations:** `invify-backend/supabase/migrations/20261018000000_hw_50_profit_sharing.sql`
- **Backend Services:** `invify-backend/src/modules/health-insurance/services/health-finance.service.ts`, `health-audit.service.ts`, `health-platform.service.ts`
- **Backend Controllers & Routes:** `invify-backend/src/modules/health-insurance/controllers/health-finance.controller.ts`, `register-routes.ts`
- **Guards & Authorization:** `invify-backend/src/modules/health-insurance/guards/health-permission.guard.ts`
- **Frontend Dashboard:** `invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue`
- **API Client:** `invify-admin/src/api/healthInsuranceApi.js`
- **Test Suites:** `invify-backend/test/health-insurance.test.ts`
- **Persisted Test/Staging Stores:** `invify-backend/health-profit-sharing-*.json`

### Strict Read-Only Execution Confirmation:
1. **Zero Working-Tree Modifications:** No source code, database tables, migrations, configs, environment variables, or feature flags were modified, added, or deleted during the audit.
2. **Zero Database Mutations:** No SQL queries performing `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, or `DROP` were executed against staging or production databases.
3. **Zero Financial Movements:** No payment, settlement, disbursement, or webhook transactions were triggered.
4. **Pre-Audit & Post-Audit Git Verification:** Git status was checked before beginning analysis and verified upon audit completion. All existing untracked files and working-tree modifications from previous implementation tasks were preserved untouched.

---

## 3. ENVIRONMENT AND BRANCH IDENTIFICATION

- **Repository Root:** `C:\dev\Involve_APP_health`
- **Active Branch:** `feature/health-insurance-phase1`
- **Upstream Target:** `main`
- **Node.js Environment:** Windows x64 / Node.js runtime
- **Backend Framework:** Express.js 4.x with TypeScript 5.x
- **Database Layer:** Supabase / PostgreSQL with `supabaseAdmin` client (`@supabase/supabase-js`)
- **Frontend Framework:** Vue 3 (Composition API / `<script setup>`), Vite 5.x, Quasar Framework 2.x, ApexCharts
- **Audit Execution Date:** 2026-10-18
- **Primary Prior Reports:**
  - `docs/health-insurance/12_DASHBOARD_DATA_RECONCILIATION.md`
  - `docs/health-insurance/13_DASHBOARD_CONTRACT_FIX_REPORT.md`
  - `docs/health-insurance/14_LIVE_BROWSER_ACCEPTANCE_REPORT.md`
  - `docs/health-insurance/15_GOVERNANCE_INTERACTIVE_OPERATIONS_REPORT.md`
  - `docs/health-insurance/16_HMO_FINANCE_AND_PROFIT_SHARING_REPORT.md`

---

## 4. FINDINGS SUMMARY BY VERDICT

| Category | PASS | FAIL | BLOCKED | NOT TESTED | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Financial Calculations & Formula Integrity** | 3 | 5 | 0 | 0 | 8 |
| **Database Schema, Storage & Migrations** | 0 | 3 | 0 | 0 | 3 |
| **Profit-Sharing & Maker-Checker Controls** | 3 | 2 | 0 | 0 | 5 |
| **Settlement & Ledger Reconciliation** | 2 | 2 | 0 | 0 | 4 |
| **Security, RBAC, RLS & Immutability** | 2 | 2 | 0 | 0 | 4 |
| **API & Frontend Contract Consistency** | 0 | 4 | 0 | 0 | 4 |
| **Automated Test Coverage & Reproducibility** | 2 | 1 | 0 | 1 | 4 |
| **TOTAL** | **12** | **19** | **0** | **1** | **32** |

### Verdict Distribution:
- **PASS:** 12 (37.5%)
- **FAIL:** 19 (59.4%)
- **BLOCKED:** 0 (0.0%)
- **NOT TESTED:** 1 (3.1%)

---

## 5. FINANCIAL METRIC FORMULA MATRIX

| Metric Name | Implemented Formula / Code Logic | Data Source Tables / Fields | Filters Applied | Reproducibility & Integrity Status | Verdict |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Total Premiums Billed** | `SUM(amount_due_minor)` from invoices | `hw_premium_invoices.amount_due_minor` | `.neq('status', 'void')` | Lifetime cumulative; ignores `filters.period`. Correctly excludes void invoices. | **FAIL** (Period Ignored) |
| **Total Premiums Collected** | `SUM(amount_minor \|\| amount_kobo)` from payments | `hw_payments.amount_minor` | `.eq('status', 'successful')` | Lifetime cumulative; ignores `filters.period`. Fallback logic for column naming is present. | **FAIL** (Period Ignored) |
| **Total Premiums Settled** | `SUM(amount_minor \|\| amount_kobo)` from reconciled payments | `hw_payments.amount_minor` | `.eq('status', 'successful')`, `.not('reconciled_at', 'is', null)` | Lifetime cumulative; ignores `filters.period`. Filter correctly isolates bank-reconciled receipts. | **FAIL** (Period Ignored) |
| **Outstanding Premiums** | `Math.max(0, totalBilled - totalCollected)` | Derived from macro aggregates | None | **Macro offset defect:** Netting aggregates allows overpaying tenants to cancel out debts of delinquent tenants. | **FAIL** |
| **HMO Base Underwriting Costs** | `SUM(hw_plans.base_premium_kobo)` for active policies | `hw_policies`, `hw_plans.base_premium_kobo` | `.eq('status', 'active')` | Matches active policies to plan base premium. Accurate snapshot of contracted insurer obligations. | **PASS** |
| **Recognized Revenue** | `premiumsCollectedKobo` | Derived from collected payments | None | Assumes cash-basis revenue recognition. Does not periodize or defer unearned premium across policy duration. | **PASS** (Cash Basis Defined) |
| **Gross Surplus / Profit** | `recognizedRevenue - hmoRemittances` | Derived | None | Preliminary operational cash surplus. Lacks accrual matching and claims reserve deductions. | **FAIL** (Misleading Terminology) |
| **Net Platform Profit** | `grossProfit - operatingCosts` | Derived (Operating costs = 1.5% fixed) | None | Deducts fixed 1.5% payment gateway/operational fee. Reasonable interim management estimation. | **PASS** |
| **HMO Performance Billed/Collected** | `billedKobo = directCosts * 1.35` | Hardcoded multiplier | Enrolled members > 0 | **Critical Synthetic Calculation:** 1.35 multiplier fabricates billed revenue instead of querying real invoice lines. | **FAIL** |
| **Plan Profitability Charged Premium** | `avg(custom_premium_kobo) * count(policies)` | `hw_tenant_plan_offers`, `hw_policies` | `.eq('status', 'active')` | Averages configured tenant offer prices across policies. Reasonably estimates contracted yield. | **PASS** |
| **Financial Trend Time Series** | Hardcoded arrays: `[0, 0, 150000, ...]` | Hardcoded constants | None | **Completely fabricated:** Static constants returned rather than aggregated transaction periods. | **FAIL** |
| **Claims Incurred & Loss Ratio** | Hardcoded `claimsCostsKobo: 0`, `claimsCostsCalculable: false` | `hw_claims` (schema audited) | None | Explicitly surfaced as uncalculable due to absence of finalized claim payout monetary fields. | **PASS** (Proper Non-Calculation) |

---

## 6. PROFIT-SHARING AGREEMENT AND MAKER-CHECKER FINDINGS

### 6.1 Maker-Checker Dual Control
- **Finding Ref:** `FIN-MC-001` — **Application Layer Dual Control:** `PASS`
  - *Evidence:* `HealthFinanceService.approveAgreement()` ([lines 826–828](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L826-L828)) and `approveStatement()` ([lines 1006–1008](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L1006-L1008)) verify:
    ```typescript
    if (checker.id === ag.makerUserId || (checkerEmail && checkerEmail === makerEmail)) {
      throw new Error('Maker-Checker violation: The administrator who configured this profit-sharing agreement cannot approve it.');
    }
    ```
  - *Verification:* Verified via automated Jest test in `test/health-insurance.test.ts` (Test 10.3), confirming self-approval throws a 400 error.
- **Finding Ref:** `FIN-MC-002` — **Database Layer Dual Control Enforcement:** `FAIL`
  - *Evidence:* In `supabase/migrations/20261018000000_hw_50_profit_sharing.sql` ([lines 36–40](file:///C:/dev/Involve_APP_health/invify-backend/supabase/migrations/20261018000000_hw_50_profit_sharing.sql#L36-L40)), `maker_user_id` and `checker_user_id` are defined, but there is **no database-level check constraint** (e.g. `CHECK (checker_user_id IS NULL OR checker_user_id <> maker_user_id)`). If database records were inserted directly, self-approval would not be prevented by PostgreSQL.

### 6.2 Agreement Share Allocation & Validation
- **Finding Ref:** `FIN-AG-001` — **Basis Points Allocation Integrity:** `PASS`
  - *Evidence:* `HealthFinanceService.createAgreement()` ([lines 740–744](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L740-L744)) enforces that the sum of `platformSharePercent + hmoSharePercent + otherBeneficiarySharePercent` must equal exactly 100% (within 0.01% floating-point tolerance).
  - *Migration Schema:* Migration line 43 includes `CHECK (platform_share_bps + hmo_share_bps + other_share_bps = 10000)`.

### 6.3 Agreement Lifecycle State Machine
- **Finding Ref:** `FIN-AG-002` — **Agreement Status Transitions:** `PASS`
  - *Evidence:* Agreements initialize strictly in `pending_approval` ([line 771](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L771)) and can only transition to `active` upon checker approval ([line 830](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L830)).

---

## 7. STATEMENT REPRODUCIBILITY AND IDEMPOTENCY FINDINGS

### 7.1 Historical Reproducibility & Provenance
- **Finding Ref:** `FIN-ST-001` — **Omission of Transaction Manifest Snapshot:** `FAIL`
  - *Evidence:* In `HealthFinanceService.generateStatement()` ([lines 923–965](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L923-L965)), the generated statement stores scalar totals (`totalPremiumsBilledKobo`, `totalPremiumsCollectedKobo`, `hmoBaseCostKobo`, `netProfitKobo`), but **does not persist an array of the constituent `invoice_id`s, `payment_id`s, or `policy_id`s** that contributed to those numbers.
  - *Risk:* If payments are subsequently added with backdated timestamps, or voided, the statement cannot be forensically re-verified against the underlying records.

### 7.2 Idempotency & Overwrite Prevention
- **Finding Ref:** `FIN-ST-002` — **Duplicate Statement Prevention:** `PASS`
  - *Evidence:* Line 913 checks for existing approved or pending statements:
    ```typescript
    const existing = statements.find(s => s.agreementId === agreementId && s.periodKey === periodKey && s.status !== 'void');
    if (existing) throw new Error(`A statement for ${periodKey} already exists (${existing.statementReference})`);
    ```
  - *Migration Constraint:* Line 90 defines `CONSTRAINT uq_hw_pss_agreement_period UNIQUE (agreement_id, period_key)`.

### 7.3 Date Boundary Defect
- **Finding Ref:** `FIN-ST-003` — **Naive String Interpolation for Period End:** `FAIL`
  - *Evidence:* Line 932 computes `periodEnd: \`${periodKey}-30\``. For February periods (e.g. `2026-02`), this produces `2026-02-30`, which is an invalid calendar date and will fail SQL `timestamptz` parsers upon database insertion.

### 7.4 Rounding Residual Allocation Bug
- **Finding Ref:** `FIN-ST-004` — **Unconditional Residual Assignment to Other Share:** `FAIL`
  - *Evidence:* In `previewCalculation()` ([line 882](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L882)):
    ```typescript
    const otherShareKobo = distributableSurplusKobo - hmoShareKobo - platformShareKobo;
    ```
    When `otherBeneficiarySharePercent` is 0, any 1-kobo integer rounding discrepancy between HMO share and Platform share is dumped into `otherShareKobo` rather than the platform or HMO share, creating an unintended non-zero share for an unconfigured beneficiary.

---

## 8. SETTLEMENT AND LEDGER INTEGRITY FINDINGS

### 8.1 Non-Custodial Operational Workflow
- **Finding Ref:** `FIN-SET-001` — **Non-Custodial Disbursement Safety:** `PASS`
  - *Evidence:* When a statement is approved, settlement entries are queued in `hw_profit_sharing_settlements` with status `pending` ([lines 1026–1039](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L1026-L1039)). No automated payment gateway transfer, Paystack/Quasar debit, or external bank disbursement is initiated.

### 8.2 Reconciliation State Machine
- **Finding Ref:** `FIN-SET-002` — **Settlement State Progression:** `PASS`
  - *Evidence:* `HealthFinanceService.reconcileSettlement()` ([lines 1066–1099](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L1066-L1099)) updates status from `pending` to `reconciled`, marks the timestamp, records the reconciler ID, and automatically updates the parent statement's `amountSettledKobo` and `outstandingBalanceKobo`.

### 8.3 Duplicate External Reference Vulnerability
- **Finding Ref:** `FIN-SET-003` — **Absence of External Reference Uniqueness:** `FAIL`
  - *Evidence:* Line 1073 accepts `externalReference` (e.g. Bank NIP Session ID or Treasury Reference) without validating whether that reference has already been used on another settlement record. An operator could mistakenly reconcile two distinct settlement obligations against a single bank transfer receipt.

---

## 9. RLS, AUTHORIZATION AND IMMUTABLE AUDIT FINDINGS

### 9.1 Database Migration & Storage Integrity
- **Finding Ref:** `FIN-SEC-001` — **Migration Unapplied & Missing RLS:** `FAIL`
  - *Evidence:* `invify-backend/supabase/migrations/20261018000000_hw_50_profit_sharing.sql` has not been applied to PostgreSQL. Furthermore, the migration contains **no RLS activation commands**:
    ```sql
    -- Missing from migration:
    ALTER TABLE public.hw_profit_sharing_agreements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.hw_profit_sharing_statements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.hw_profit_sharing_settlements ENABLE ROW LEVEL SECURITY;
    ```
    If applied as written, these tables would be completely unprotected by Postgres RLS.

### 9.2 API Permission Guard Conflation
- **Finding Ref:** `FIN-SEC-002` — **Privilege Escalation via Telemetry Grant:** `FAIL`
  - *Evidence:* In `invify-backend/src/modules/health-insurance/register-routes.ts` ([lines 95–136](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/register-routes.ts#L95-L136)), all finance endpoints are protected by `requireHealthPermission`:
    ```typescript
    const financePerms = ['platform.super_admin', 'platform.finance.admin', 'platform.integration.health'];
    ```
    Because `platform.integration.health` is included in `financePerms`, an operational user or integration tester with telemetry/integration permissions can:
    - Create profit-sharing agreements (`POST /agreements`)
    - Approve agreements (`POST /agreements/:id/approve`)
    - Generate statements (`POST /statements`)
    - Approve statements (`POST /statements/:id/approve`)
    - Reconcile settlements (`POST /settlements/:id/reconcile`)
    This breaks the principle of least privilege and destroys the segregation between technical monitoring and financial governance.

### 9.3 Immutable Audit Event Trail
- **Finding Ref:** `FIN-SEC-003` — **Audit Trail Completeness:** `PASS`
  - *Evidence:* Every financial mutation (creating agreements, approving agreements, generating statements, approving statements, reconciling settlements) issues an immutable audit event via `HealthAuditService.recordEvent()` ([lines 786, 835, 967, 1041, 1101](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L786)).
  - *Audit Table Security:* `hw_audit_events` is backed by database triggers that reject `UPDATE` or `DELETE` operations, ensuring tamper-resistance.

### 9.4 Zero-PII Compliance in Financial Records
- **Finding Ref:** `FIN-SEC-004` — **Financial Record PII Isolation:** `PASS`
  - *Evidence:* Financial records store only provider references, plan references, tenant IDs, and minor-unit amounts. No patient names, student records, medical diagnosis codes, or NIN identifiers are present in financial agreements, statements, or settlement lines.

---

## 10. API/FRONTEND CONSISTENCY FINDINGS

### 10.1 HMO Performance Table Contract Discrepancy
- **Finding Ref:** `FIN-UI-001` — **Field Name Mismatch in HMO Performance Table:** `FAIL`
  - *Frontend Expectation* (`HealthInsuranceGovernancePage.vue` line 437–441):
    `totalBilledKobo`, `totalCollectedKobo`, `hmoBaseCostKobo`, `platformProfitKobo`, `outstandingSettlementKobo`.
  - *Backend Response* (`HealthFinanceService.getHmoPerformance()` line 516–526):
    `premiumsBilledKobo`, `premiumsCollectedKobo`, `hmoRemittancesKobo`, `netProfitKobo`, `outstandingObligationsKobo`.
  - *Consequence:* All financial monetary columns in the HMO Performance table render as blank or ₦0 in the user interface.

### 10.2 Plan Profitability Table Contract Discrepancy
- **Finding Ref:** `FIN-UI-002` — **Field Name Mismatch in Plan Profitability Table:** `FAIL`
  - *Frontend Expectation* (`HealthInsuranceGovernancePage.vue` line 527–531):
    `planCode`, `planName`, `totalRevenueKobo`, `totalHmoCostKobo`.
  - *Backend Response* (`HealthFinanceService.getPlanProfitability()` line 597–603):
    `code`, `name`, `recognizedRevenueKobo`, `directCostsKobo`.
  - *Consequence:* Plan codes, names, and revenues fail to bind in the Plan Profitability data table.

### 10.3 Agreement, Statement & Settlement Case Discrepancy
- **Finding Ref:** `FIN-UI-003` — **snake_case vs camelCase Contract Mismatch:** `FAIL`
  - *Frontend Expectation* (`HealthInsuranceGovernancePage.vue` lines 616–760):
    Tables bind to `agreement_code`, `provider_name`, `platform_share_percent`, `statement_reference`, `period_key`, `net_surplus_kobo`, `settlement_reference`, `beneficiary_name`, `amount_payable_kobo`.
  - *Backend Response* (`HealthFinanceService.ts` lines 20–108):
    Objects return camelCase properties (`reference`, `providerName`, `platformSharePercent`, `statementReference`, `periodKey`, `netSurplusKobo`, `settlementReference`, `beneficiaryName`, `amountPayableKobo`).
  - *Consequence:* Rows in Agreements, Statements, and Settlements tables show empty cells for references, provider names, and percentages.

### 10.4 Consolidated Overview KPI Card Binding Mismatch
- **Finding Ref:** `FIN-UI-004` — **Missing Profit Share Overview Fields:** `FAIL`
  - *Frontend Expectation* (`HealthInsuranceGovernancePage.vue` lines 365–385):
    KPI cards 6, 7, and 8 read `financeOverview.totalHmoShareKobo`, `financeOverview.totalPlatformShareKobo`, and `financeOverview.totalOtherShareKobo`.
  - *Backend Response* (`HealthFinanceService.getConsolidatedOverview()` lines 236–259):
    Backend returns `recognizedRevenueKobo`, `hmoRemittancesKobo`, `claimsCostsKobo`, `operatingCostsKobo`, `grossProfitKobo`, `netProfitKobo`, `profitMarginPercent`, `profitShareObligationsKobo`. It does not calculate or return total cumulative shares.
  - *Consequence:* KPI cards for HMO Share, Platform Retained Share, and Institutional Share render as `₦0`.

---

## 11. TEST COMMANDS AND ACTUAL RESULTS

### 11.1 Backend Unit & Security Verification
- **Command Executed:**
  ```powershell
  npx jest test/health-insurance.test.ts --testNamePattern="10. HMO Finance"
  ```
- **Execution Output:**
  ```
  PASS test/health-insurance.test.ts (29.188 s)
    ● Console
      [HealthAuditService] Error recording audit log: table not found (handled gracefully)
    
    10. HMO Finance & Profit-Sharing Module Verification
      √ 10.1 Should enforce authentication on finance platform routes (82 ms)
      √ 10.2 Should fetch consolidated financial overview with non-negative minor units (65 ms)
      √ 10.3 Should reject self-approval of profit-sharing agreements (Maker-Checker violation) (48 ms)
      √ 10.4 Should prevent generation of statements for unapproved agreements (38 ms)
      √ 10.5 Should accurately calculate 60/40 profit-sharing splits in minor kobo units (42 ms)

  Test Suites: 1 passed, 1 total
  Tests:       36 skipped, 5 passed, 41 total
  Snapshots:   0 total
  Time:        29.188 s
  ```
- **Audit Interpretation:**
  The 5 isolated unit tests confirm that the in-memory JavaScript methods reject self-approval and perform 60/40 basis point integer splits. **However, passing mocked unit tests does not validate production readiness.** The tests pass because they run against the local JSON fallback store and mock responses, masking the unapplied SQL migration, the lack of PostgreSQL RLS, and the synthetic `1.35` multiplier in provider performance calculations.

---

## 12. EVIDENCE REFERENCES

| Finding Reference | Source File | Line Numbers | Description of Code / Evidence |
| :--- | :--- | :--- | :--- |
| `FIN-CALC-001` | `health-finance.service.ts` | [484–488](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L484-L488) | `billedKobo = directUnderwritingKobo * 1.35;` (Synthetic estimation). |
| `FIN-CALC-002` | `health-finance.service.ts` | [635–656](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L635-L656) | Hardcoded static monthly arrays for financial trend charts. |
| `FIN-CALC-003` | `health-finance.service.ts` | [190–259](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L190-L259) | `filters.period` is accepted as an argument but never used in SQL queries. |
| `FIN-CALC-004` | `health-finance.service.ts` | [256](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L256) | `outstandingPremiumsKobo = Math.max(0, totalBilled - totalCollected);` (Macro offset defect). |
| `FIN-CALC-005` | `health-finance.service.ts` | [882](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L882) | Rounding residual dumped into `otherShareKobo` when other beneficiary share is 0%. |
| `FIN-CALC-006` | `health-finance.service.ts` | [932](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L932) | `periodEnd: \`${periodKey}-30\`` produces invalid dates for February. |
| `FIN-DB-001` | `20261018000000_hw_50_profit_sharing.sql` | [1–118](file:///C:/dev/Involve_APP_health/invify-backend/supabase/migrations/20261018000000_hw_50_profit_sharing.sql#L1-L118) | Migration marked `-- PROPOSED — NOT APPLIED.` Completely lacks RLS and policies. |
| `FIN-DB-002` | `health-finance.service.ts` | [110–137](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L110-L137) | Financial data persisted to local JSON files (`health-profit-sharing-*.json`). |
| `FIN-SEC-001` | `register-routes.ts` | [95–136](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/register-routes.ts#L95-L136) | `platform.integration.health` included on financial maker-checker mutation routes. |
| `FIN-SEC-002` | `20261018000000_hw_50_profit_sharing.sql` | [36–40](file:///C:/dev/Involve_APP_health/invify-backend/supabase/migrations/20261018000000_hw_50_profit_sharing.sql#L36-L40) | Missing DB check constraint `checker_user_id <> maker_user_id`. |
| `FIN-SET-001` | `health-finance.service.ts` | [1073](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-finance.service.ts#L1073) | Missing uniqueness check on `externalReference` during settlement reconciliation. |
| `FIN-UI-001` | `HealthInsuranceGovernancePage.vue` | [437–441](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L437-L441) | HMO performance table property name mismatch with backend output. |
| `FIN-UI-002` | `HealthInsuranceGovernancePage.vue` | [527–531](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L527-L531) | Plan profitability table property name mismatch with backend output. |
| `FIN-UI-003` | `HealthInsuranceGovernancePage.vue` | [616–760](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L616-L760) | Agreement, Statement, Settlement tables expect snake_case; backend returns camelCase. |
| `FIN-UI-004` | `HealthInsuranceGovernancePage.vue` | [365–385](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L365-L385) | Overview KPI cards expect share breakdown fields omitted by backend overview endpoint. |

---

## 13. RISK SEVERITY AND RECOMMENDED REMEDIATION FOR EVERY `FAIL`

### Finding 1: Synthetic Billing Figures in HMO Performance (`FIN-CALC-001`)
- **Severity:** `CRITICAL`
- **Root Cause:** Provider performance calculates billed premium as `directUnderwritingKobo * 1.35` instead of querying `hw_premium_invoices` associated with the HMO's plans.
- **Financial Risk:** Misrepresents provider revenue, inflates reported margins, and distorts contractual settlement calculations.
- **Recommended Remediation:** Join `hw_premium_invoices` through `hw_tenant_plan_offers` and `hw_plans` to compute true billed and collected amounts per HMO provider.

### Finding 2: Hardcoded Time-Series Trends (`FIN-CALC-002`)
- **Severity:** `HIGH`
- **Root Cause:** `getFinancialTrends()` returns static numerical arrays.
- **Financial Risk:** Platform administrators make governance decisions based on dummy trend graphs that do not reflect actual monthly performance.
- **Recommended Remediation:** Implement SQL date-truncation queries (`date_trunc('month', created_at)`) on `hw_payments` and `hw_premium_invoices` to generate genuine chronological aggregates.

### Finding 3: Period Filter Ignored in Consolidated Overview (`FIN-CALC-003`)
- **Severity:** `HIGH`
- **Root Cause:** The `period` query parameter is parsed in the controller but ignored in `HealthFinanceService.getConsolidatedOverview()`.
- **Financial Risk:** Date range pickers on the dashboard have no effect; users believe they are viewing monthly/quarterly metrics when they are viewing lifetime totals.
- **Recommended Remediation:** Apply `.gte('created_at', periodStart)` and `.lte('created_at', periodEnd)` filters to the invoice and payment queries based on the requested period.

### Finding 4: Macro Aggregation Offset in Outstanding Premiums (`FIN-CALC-004`)
- **Severity:** `HIGH`
- **Root Cause:** `outstandingPremiumsKobo = Math.max(0, totalBilled - totalCollected)`.
- **Financial Risk:** An overpayment by one institution masks the uncollected arrears of another, understating platform credit risk.
- **Recommended Remediation:** Query `hw_premium_invoices` directly for `SUM(amount_due_minor - amount_paid_minor)` where `status IN ('issued', 'overdue', 'partially_paid')`.

### Finding 5: Local File Persistence & Unapplied Migration (`FIN-DB-001`, `FIN-DB-002`)
- **Severity:** `CRITICAL`
- **Root Cause:** Migration `20261018000000_hw_50_profit_sharing.sql` has not been applied; data resides in local JSON files.
- **Financial Risk:** In multi-instance or serverless environments, file persistence will cause data divergence, race conditions, loss of persistence on restart, and total bypass of relational integrity.
- **Recommended Remediation:** Apply migration to PostgreSQL, add strict RLS policies, and replace JSON read/write helper routines with Supabase query builders.

### Finding 6: Missing Row Level Security on Finance Tables (`FIN-SEC-001`)
- **Severity:** `CRITICAL`
- **Root Cause:** Migration lacks `ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements.
- **Security Risk:** If the migration is applied to PostgreSQL without RLS, any authenticated client using the PostgREST API could read or manipulate profit-sharing agreements and settlements.
- **Recommended Remediation:** Add explicit RLS statements to the migration:
  ```sql
  ALTER TABLE public.hw_profit_sharing_agreements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.hw_profit_sharing_statements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.hw_profit_sharing_settlements ENABLE ROW LEVEL SECURITY;
  
  -- Platform Finance Super Admin Policy:
  CREATE POLICY "Platform finance admins can manage profit sharing"
    ON public.hw_profit_sharing_agreements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'platform_finance_admin')));
  ```

### Finding 7: Privilege Conflation in Finance Routes (`FIN-SEC-002`)
- **Severity:** `HIGH`
- **Root Cause:** `platform.integration.health` is included in `financePerms` across all mutation routes.
- **Security Risk:** Operators with health telemetry inspection permissions can propose agreements, approve payouts, and reconcile financial settlements.
- **Recommended Remediation:** Restrict financial mutation routes strictly to `platform.super_admin` and `platform.finance.admin`. Create separate distinct permissions for `finance:propose`, `finance:approve`, and `finance:reconcile`.

### Finding 8: Duplicate External Reference Vulnerability (`FIN-SET-001`)
- **Severity:** `MEDIUM`
- **Root Cause:** `reconcileSettlement()` does not enforce uniqueness on `externalReference`.
- **Financial Risk:** Double-reconciliation of single bank transfer receipts against different settlement records.
- **Recommended Remediation:** Add a check in `reconcileSettlement()` verifying `externalReference` is not already attached to another reconciled settlement, and add a unique database index on `external_reference` where not null.

### Finding 9: Frontend/Backend Contract Discrepancies (`FIN-UI-001` through `FIN-UI-004`)
- **Severity:** `HIGH`
- **Root Cause:** Property naming mismatches (`premiumsBilledKobo` vs `totalBilledKobo`, camelCase vs snake_case) and missing share fields in overview response.
- **Operational Risk:** Platform administrators see blank columns and ₦0 values across tables and cards, preventing visual inspection and governance.
- **Recommended Remediation:** Standardize the backend response models and update `HealthInsuranceGovernancePage.vue` template bindings to use consistent, type-safe property names.

### Finding 10: Naive Date String Interpolation for Period End (`FIN-CALC-006`)
- **Severity:** `MEDIUM`
- **Root Cause:** `periodEnd: \`${periodKey}-30\``.
- **Operational Risk:** Database timestamp parse errors on February or 31-day months.
- **Recommended Remediation:** Use a standard date library (e.g. `date-fns` or native JavaScript `new Date(year, monthIndex + 1, 0)`) to calculate the exact calendar end-of-month date.

---

## 14. EVIDENCE REQUIRED TO RESOLVE `BLOCKED` OR `NOT TESTED` FINDINGS

| Audit Item | Status | Missing Evidence Required for Sign-Off |
| :--- | :---: | :--- |
| **Multi-Tenant RLS Policy Isolation Under Concurrent Tenant Roles** | `NOT TESTED` | 1. Application of updated migration with RLS policies enabled in Supabase PostgreSQL.<br>2. Execution of test queries using distinct tenant session tokens (`authenticated` role with tenant claims) to confirm that tenant users receive HTTP 403 / empty sets when attempting to access `/api/v1/health-insurance/platform/finance/*` and underlying `hw_profit_sharing_*` tables. |

---

## 15. FINAL ACCEPTANCE RECOMMENDATION

### Verdict: **DO NOT ACCEPT**

### Fiduciary & Technical Justification:
The HMO Finance, Profitability & Profit-Sharing Module demonstrates sound architectural intent, including non-custodial settlement design, in-memory dual-control logic, and zero-PII compliance. 

However, the implementation **CANNOT BE ACCEPTED** for staging deployment or production sign-off due to three critical disqualifying deficiencies:

1. **Financial Fabrication:** Calculating HMO performance billing via a hardcoded `1.35` multiplier and returning static arrays for trend charts violates core financial integrity principles. Financial systems must derive figures exclusively from authoritative transaction ledgers.
2. **Missing Relational Integrity & RLS:** The module relies on local JSON file persistence rather than applied PostgreSQL migrations, and the migration itself omits Row Level Security.
3. **Broken Frontend Binding Contracts:** Inconsistent property naming causes tables to display empty or zero values, rendering the module unusable for live governance in its current state.

### Required Remediations Prior to Re-Audit:
1. Replace all synthetic multipliers and hardcoded trend arrays with queries against `hw_premium_invoices`, `hw_payments`, and `hw_policies`.
2. Apply the PostgreSQL migration with proper database check constraints and comprehensive RLS policies.
3. Migrate `HealthFinanceService` from JSON file storage to Supabase database queries.
4. Align frontend table column bindings with backend response models.
5. Tighten RBAC route definitions to enforce strict segregation of duties between technical telemetry operators and financial administrators.

---
*Report produced and certified under strict read-only audit controls.*  
*Sign-off Authority: Antigravity Autonomous Security & Financial Systems Auditor*
