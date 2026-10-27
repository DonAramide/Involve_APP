# INVIFY HEALTH & WELLNESS — HMO FINANCE, PROFITABILITY & PROFIT-SHARING MODULE REPORT

**Document ID:** `DOC-HW-FINANCE-016`  
**Date:** 2026-10-18  
**Repository:** `C:\dev\Involve_APP_health`  
**Branch:** `feature/health-insurance-phase1`  
**Primary Interfaces:**  
- `/admin/health-insurance` (Vue 3 / Quasar Frontend: `invify-admin`)
- `/api/v1/health-insurance/platform/finance/*` (Express + TypeScript Backend: `invify-backend`)

---

## 1. EXECUTIVE SUMMARY

In strict accordance with the master requirements for the **HMO Finance, Profitability & Profit-Sharing Module**, the Health & Wellness Governance console has been expanded from operational telemetry into an auditable, dual-controlled financial administration system.

### Key Capabilities Delivered:
1. **Interactive Institutional Participation Detail Modal:**
   - Upgraded the Tenant Participation detail dialog into a comprehensive modal (`min-width: 90vw; max-height: 94vh;`).
   - Surfaces top institutional financial KPIs: **Students on HMO**, **Staff on HMO**, **Active Policies**, **Total Invoiced & Collected Revenue**, **HMO Base Underwriting Costs**, and **Net Profit with Margin % badge**.
   - Sub-tab 1: Full breakdown of enrolled students and staff (Name, Category, Admission/Staff ID, Underwriter HMO, Plan & Tier, Policy Number, Billed Premium, HMO Base Cost, Profit, and Policy Status).
   - Sub-tab 2: Configured HMO Underwriters & Plans table (Plan Name, Code, Underwriter, Tier, Base Cost, Charged Rate, Profit Per Member, Status).
   - Sub-tab 3: Master and sectoral enablement toggles with mandatory operational justification audit logging.
   - Sub-tab 4: Institutional audit trail.
2. **Dedicated Governance Tab — "HMO FINANCE & PROFIT-SHARING":**
   - **Consolidated Financial Overview (11 Interactive KPI Cards):** Total Billed Premiums, Total Collected Premiums, HMO Base Underwriting Cost, Gross Platform Profit, Net Profit Margin %, HMO Underwriter Share, Platform Retained Share, Partner/Beneficiary Share, Claims Incurred, Claims Loss Ratio %, and Pending Settlements.
   - **Underwriter Financial Performance:** Comparison table comparing all configured underwriters by active plans, enrolled members, revenue collected, base costs, profit generated, margin %, and outstanding obligations. Includes individual HMO drill-down ledger modal.
   - **Insurance Plan Profitability Analysis:** Plan-by-plan margin analysis comparing base cost to average retail rate charged.
   - **Visualizations & Trend Analytics (ApexCharts):**
     - Line Chart: Monthly Revenue & Net Collections Trend.
     - Grouped Bar Chart: Revenue vs. HMO Base Costs vs. Platform Profit.
     - Donut Chart: Cost & Revenue Distribution (HMO Costs vs Platform Share vs Partner Share).
     - Donut Chart: Treasury Settlement & Clearing Allocation.
   - **Commercial Profit-Sharing Agreements:**
     - Maker-Checker governed table and proposal modal.
     - Dual-control validation: Proposers (Makers) cannot approve their own agreements; allocations must strictly equal 100%.
   - **Profit-Sharing Statements Register:**
     - Periodic statement runs with live calculation preview (integer-kobo rounding residual rule).
     - Checker authorization workflow automatically queueing settlement disbursements.
   - **Treasury Settlements & Clearing Register:**
     - Read-only tracking for banking transfers, NIP reference reconciliation, and treasury desk verification.
   - **Financial Audit Lineage:**
     - Immutable audit trail recording agreement proposals, approvals, statement runs, and reconciliations in `hw_audit_events`.

---

## 2. PRE-IMPLEMENTATION SCHEMA AUDIT & DISCLOSURES

In compliance with strict data integrity standards, all calculations derive from actual database tables. No fake transactions or fabricated metrics have been introduced.

### Schema Findings & Accounting Definitions:
1. **Billed Premiums:** Derived from `hw_invoices` where status is `paid` or `issued`. Summed in integer-kobo minor units (`amount_kobo`).
2. **Collected Premiums:** Derived from `hw_payments` with status `confirmed`. Represents actual fiat received into treasury.
3. **HMO Base Underwriting Costs:** Computed per active policy (`hw_policies` joined to `hw_plans.base_premium_kobo`). Represents the non-negotiable underwriter cost incurred by the platform to maintain policy coverage.
4. **Gross Platform Profit:** Calculated as `Collected Premiums - HMO Base Costs`.
5. **Profit Margin %:** Calculated as `(Gross Platform Profit / Collected Premiums) * 100`.
6. **Claims Incurred & Loss Ratio Honest Disclosure:**
   - `hw_claims` and `hw_claim_lines` in the current schema record claims tracking IDs, diagnoses, and statuses, but do **not** store verified monetary payout amounts (`incurred_cost_kobo`).
   - Consequently, Claims Incurred and Loss Ratio are explicitly displayed as **`NOT CALCULABLE (No Claim Costs In Schema)`** rather than fabricating numbers.
7. **Zero PII Exposure Policy:** All financial drill-down queries return only anonymized policy identifiers, tenant institution names, invoice numbers, and transaction references. No National Identification Numbers (NIN), personal phone numbers, or private medical details are exposed.

---

## 3. ADDITIVE DATABASE MIGRATION SPECIFICATION

**File:** `invify-backend/supabase/migrations/20261018000000_hw_50_profit_sharing.sql`

```sql
-- 1. Commercial Profit-Sharing Agreements Table
CREATE TABLE IF NOT EXISTS public.hw_profit_sharing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_code VARCHAR(80) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform_share_percent NUMERIC(5, 2) NOT NULL CHECK (platform_share_percent >= 0 AND platform_share_percent <= 100),
  hmo_share_percent NUMERIC(5, 2) NOT NULL CHECK (hmo_share_percent >= 0 AND hmo_share_percent <= 100),
  other_beneficiary_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (other_beneficiary_share_percent >= 0 AND other_beneficiary_share_percent <= 100),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('draft', 'pending_approval', 'active', 'superseded', 'terminated')),
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  approved_by_user_id UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_hw_ps_sum_100 CHECK (platform_share_percent + hmo_share_percent + other_beneficiary_share_percent = 100.0)
);

-- 2. Periodic Profit-Sharing Statements Table
CREATE TABLE IF NOT EXISTS public.hw_profit_sharing_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number VARCHAR(80) NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES public.hw_providers(id) ON DELETE RESTRICT,
  agreement_id UUID REFERENCES public.hw_profit_sharing_agreements(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  gross_revenue_kobo BIGINT NOT NULL DEFAULT 0 CHECK (gross_revenue_kobo >= 0),
  hmo_base_cost_kobo BIGINT NOT NULL DEFAULT 0 CHECK (hmo_base_cost_kobo >= 0),
  distributable_profit_kobo BIGINT NOT NULL DEFAULT 0 CHECK (distributable_profit_kobo >= 0),
  platform_share_kobo BIGINT NOT NULL DEFAULT 0 CHECK (platform_share_kobo >= 0),
  hmo_share_kobo BIGINT NOT NULL DEFAULT 0 CHECK (hmo_share_kobo >= 0),
  other_beneficiary_share_kobo BIGINT NOT NULL DEFAULT 0 CHECK (other_beneficiary_share_kobo >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('draft', 'pending_approval', 'approved', 'partially_settled', 'settled', 'voided')),
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  approved_by_user_id UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_hw_ps_dist_sum CHECK (platform_share_kobo + hmo_share_kobo + other_beneficiary_share_kobo = distributable_profit_kobo)
);

-- 3. Read-Only Treasury Settlements Register Table
CREATE TABLE IF NOT EXISTS public.hw_profit_sharing_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.hw_profit_sharing_statements(id) ON DELETE CASCADE,
  beneficiary_type VARCHAR(40) NOT NULL CHECK (beneficiary_type IN ('hmo', 'platform', 'institution', 'partner')),
  beneficiary_id UUID,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'settled', 'rejected', 'reversed')),
  external_payment_reference VARCHAR(120),
  reconciled_by_user_id UUID REFERENCES public.users(id),
  reconciled_at TIMESTAMPTZ,
  reconciliation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. BACKEND IMPLEMENTATION

### 4.1 RBAC Permissions & Grants
Added canonical permissions to `PlatformHealthPermission` in `types/index.ts`:
- `platform.finance.view`: Read-only access to consolidated and underwriter financials.
- `platform.finance.manage`: Maker privilege to propose agreements and compile statement runs.
- `platform.agreements.approve`: Checker privilege to authorize commercial agreements.
- `platform.statements.approve`: Checker privilege to authorize statements and trigger settlement disbursement.

### 4.2 Services & Controllers
- **`HealthFinanceService` (`services/health-finance.service.ts`):**
  - `getConsolidatedOverview()`: Implements 11 KPI calculations with period and environment scoping.
  - `getFinanceDrilldown()`: Paginated Zero-PII lineage for billed, collected, costs, and settlements.
  - `getHmoPerformance()` & `getPlanProfitability()`: Provider and plan comparisons.
  - `getFinancialTrends()`: Aggregates historical metrics for ApexCharts.
  - `createAgreement()` & `approveAgreement()`: Maker-Checker four-eyes authorization. Proposers cannot approve their own agreement.
  - `previewCalculation()`, `generateStatement()`, `approveStatement()`: Automatic settlement record generation upon statement approval.
  - `reconcileSettlement()`: Non-custodial clearing reference tracking.
- **`HealthFinanceController` (`controllers/health-finance.controller.ts`):** Canonical Express route handlers.
- **Route Attachment (`register-routes.ts`):** Mounted at `/api/v1/health-insurance/platform/finance/*` guarded by `requireHealthPermission`.

---

## 5. FRONTEND CLIENT & GOVERNANCE VIEW

### 5.1 API Client (`invify-admin/src/api/healthInsuranceApi.js`)
All 14 backend finance endpoints mapped with automatic `x-platform-reason` audit headers.

### 5.2 Vue 3 Component (`invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue`)
- Multi-tab Institutional Participation Modal with Students/Staff rosters, HMO underwriters, plans, revenues, base costs, profits, and margin badges.
- Tab 4 (`HMO Finance & Profit-Sharing`) containing all 8 sections, ApexCharts, and 7 interactive Maker-Checker dialogs.

---

## 6. VERIFICATION & TEST RESULTS

### 6.1 Backend Jest Unit & Security Test Suite
Ran `npx jest test/health-insurance.test.ts`:
```
Test Suites: 1 passed, 1 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        7.662 s
```
**All 41/41 unit & security tests passed with 0 failures:**
- Section 1: Feature Flag Guard (2 tests)
- Section 2: Authorization & Super Admin Isolation (2 tests)
- Section 3: Tenant Isolation Enforcement (1 test)
- Section 4: Guardian Relationship & State Verification (1 test)
- Section 5: Policy Activation Safety Boundary (1 test)
- Section 6: Sandbox Adapter Security Gating (3 tests)
- Section 7: Platform Super Admin Governance & Operator Grants (11 tests)
- Section 8: Platform Dashboard Contract & Alignment Tests (5 tests)
- Section 9: Interactive Operations & Management Verification (10 tests)
- Section 10: HMO Finance & Profit-Sharing Module Verification (5 tests)

### 6.2 Frontend Build
Ran `npm run build` in `invify-admin`:
```
✓ built in 33.09s
Exit Code: 0
```
- Vue 3 template compilation, ApexCharts bindings, Quasar components, and CSS styles bundled cleanly with 0 errors.

---

## 7. CONCLUSION

The **HMO Finance, Profitability & Profit-Sharing Module** and the **Enhanced Institutional Participation Detail View** are complete, fully integrated, and verified against both unit test mocks and production builds without regressions.
