# INVIFY HEALTH & WELLNESS — GOVERNANCE INTERACTIVE OPERATIONS & MANAGEMENT REPORT

**Document ID:** `docs/health-insurance/15_GOVERNANCE_INTERACTIVE_OPERATIONS_REPORT.md`  
**Repository:** `C:\dev\Involve_APP_health`  
**Branch:** `feature/health-insurance-phase1`  
**Interface:** Platform Super Admin Governance Dashboard (`/admin/health-insurance`)  
**Frontend:** `invify-admin` (Vue 3 / Quasar / Vite)  
**Backend:** `invify-backend` (Express / TypeScript / Supabase)  
**Status:** COMPLETE & VERIFIED  

---

## 1. EXECUTIVE SUMMARY

The Invify Health & Wellness Platform Super Admin Governance Dashboard has been upgraded from a passive, read-only observability monitor into a comprehensive, interactive administration console. Every card, table row, and metric has been wired to genuine backend operations, strict security controls, and audited administrative flows:

1. **HMO Integration Telemetry:** Provider cards are fully interactive, opening a detailed modal with live plan associations, redacted endpoint configuration, integration capabilities, and audit logs. A 4-step wizard permits platform operators to register new HMO integrations with built-in SSRF protection, while connection tests perform non-destructive ping health-checks with latency measurement.
2. **Platform Overview KPI Cards:** All 6 summary KPI cards (Enabled Tenants, Insured Members, Active Coverage, Expiring Soon, Premiums Billed, Premiums Settled) are clickable, opening a paginated drill-down modal connected to real backend query endpoints.
3. **Zero-PII Platform Compliance:** Student and guardian identity details (names, dates of birth, telephone numbers, emails) are strictly excluded from cross-tenant platform drill-downs. Only anonymized member identifiers, categories, policy types, and status codes are transmitted.
4. **Integer-Kobo Financial Reconciliation:** All platform monetary calculations and drill-downs preserve integer arithmetic (`amount_kobo`) and prevent floating-point drift.
5. **Tenant Participation Directory:** School tenant rows are clickable, opening a dedicated Tenant Detail drawer featuring enrollment breakdown, financial metrics, plan offers, and an audited enablement toggle.
6. **Maker-Checker & Audit Lineage:** Every administrative mutation records an immutable event in `hw_audit_events` with actor ID, IP address, user agent, and before/after state diffs.

---

## 2. PRE-IMPLEMENTATION AUDIT & ARCHITECTURE ALIGNMENT

All enhancements strictly conform to the canonical contracts and security guidelines established in previous phases (`01_ARCHITECTURE.md` through `14_LIVE_BROWSER_ACCEPTANCE_REPORT.md`):

- **Canonical Response Envelope:** All newly added endpoints return `{ success: true, data: { ... } }` or `{ success: false, error: { message, code } }`.
- **Database Schema Preservation:** No ad-hoc tables or duplicate systems were created. Operations leverage existing `hw_providers`, `hw_plans`, `hw_policies`, `hw_enrolments`, `hw_audit_events`, and `tenants`.
- **RBAC & Operator Grant Gating:** All endpoints enforce `requireHealthPermission` and require an active, Maker-Checker approved operational grant session (`x-operational-reason` and valid grant ID).

---

## 3. PART A — HMO INTEGRATION TELEMETRY & PROVIDER MANAGEMENT

### 3.1 Interactive Provider Cards & Details Drawer
- Clicking anywhere on an HMO Provider card opens the **Provider Detail Modal** (`showProviderDetailDialog`).
- **Telemetry Fields Displayed:**
  - Provider Display Name, Code, and Operational State (`active`, `suspended`, `inactive`).
  - Integration Mode (`sandbox`, `production`) and Adapter Identifier.
  - Endpoint URL with credentials and sensitive auth parameters redacted.
  - Supported Integration Capabilities (Eligibility Verification, Policy Binding, Claim Filing, Batch Sync).
  - Associated HMO Plans with category breakdown, pricing (`amount_kobo`), and active status.
  - Historical Audit Events specific to the provider (`platform.provider.created`, `platform.provider.updated`, `platform.provider.connection_tested`).

### 3.2 Add HMO Integration 4-Step Wizard
A prominent **+ Add HMO Integration** button in the HMO Telemetry header opens a multi-step guided registration workflow:
1. **Step 1: Provider Information:** Code (validated by `^[a-z0-9_]{2,40}$`), Display Name, Category, Initial Status, and Environment Mode.
2. **Step 2: Integration Configuration:** Adapter identifier, API Base URL, auth method, timeout configuration. Enforces SSRF validation before submission.
3. **Step 3: Capabilities & Supported Plans:** Configuration of supported adapter capabilities (`eligibility_verification`, `policy_binding`, `claim_filing`, `batch_sync`).
4. **Step 4: Review & Deploy:** Read-only summary before confirming creation. Triggers `POST /api/v1/health/platform/providers`, refreshes the provider list, and writes audit event `platform.provider.created`.

### 3.3 Test Connection Operation
- Triggers `POST /api/v1/health/platform/providers/:id/test-connection`.
- Performs a bounded HTTP ping or mock connectivity probe with a 5000ms timeout.
- Measures and reports round-trip latency in milliseconds.
- Never sends live payment or policy data; sandbox checks are strictly designated as sandbox probes.
- Records audit event `platform.provider.connection_tested`.

### 3.4 Provider State Management (Edit & Suspend/Enable)
- Providers can be updated via `PATCH /api/v1/health/platform/providers/:id`.
- Providers can be suspended or re-enabled with immediate state updates and audit logging (`platform.provider.updated`).

---

## 4. PART B — PLATFORM OVERVIEW KPI CARDS & DRILL-DOWN

All 6 KPI cards are interactive with hover styling, cursor indicators, and click handlers opening the **KPI Metric Drill-Down Modal** (`GET /api/v1/health/platform/drilldown/:metric`):

| KPI Card | Metric Key | Drill-Down Table Columns | Zero-PII / Financial Gating |
|---|---|---|---|
| **Enabled Tenants** | `enabled_tenants` | Tenant ID, School Name, Tier, Enabled At, Active Policies | School name & business identifier only. |
| **Insured Members** | `insured_members` | Enrolment ID, Tenant Name, Mode, Category, Policy Status, Enrolled At | **STRICT ZERO-PII:** Student/guardian names, emails, phones, and birthdates are completely suppressed. |
| **Active Coverage** | `active_coverage` | Policy Number, Tenant Name, Plan Name, Term, Member Count, Status | Anonymized policy metadata. |
| **Expiring Soon** | `expiring_soon` | Policy Number, Tenant Name, Expiration Date, Renewal Status | Identifies expiring school coverage terms. |
| **Premiums Billed** | `premiums_billed` | Reference, Tenant Name, Term, Amount (NGN), Status, Created Date | Integer `amount_kobo` reconciliation with `formatNgn`. |
| **Premiums Settled** | `premiums_settled` | Reference, Tenant Name, Settled Amount (NGN), Date Settled, Provider | Integer `amount_kobo` reconciliation with `formatNgn`. |

### Zero-PII Compliance Details
The platform service explicitly queries `hw_enrolments` and projects only:
```typescript
{
  id: row.id,
  tenant_id: row.tenant_id,
  tenant_name: row.tenants?.name || 'Unknown School',
  enrolment_mode: row.enrolment_mode,
  member_category: row.member_category,
  status: row.status,
  created_at: row.created_at
}
```
No student name, National Identity Number (NIN), guardian name, relationship, telephone, or email address is returned in platform-level drill-downs.

---

## 5. PART C — TENANT PARTICIPATION DIRECTORY & ENABLEMENT

### 5.1 Interactive Directory Table Rows
- School rows in the **Tenant Participation Directory** are clickable and include a dedicated **Manage** action button.
- Clicking a tenant opens the **Tenant Detail Drawer** (`GET /api/v1/health/platform/tenants/:id`).

### 5.2 Tenant Detail & Participation Metrics
The drawer presents:
- **Participation Overview:** Enrolled student count, staff members insured, active coverage policies count.
- **Financial Volume:** Total premiums billed (NGN) and total premiums collected (NGN) calculated via integer kobo fields.
- **Associated Plan Offers:** List of active health insurance plans available to the tenant's families.
- **Participation Status:** Operational enablement state (`active`, `suspended`, `disabled`).

### 5.3 Audited Enablement Toggle
- Authorized operators can toggle tenant enablement (`PATCH /api/v1/health/platform/tenants/:id/enablement`).
- Request requires an operational reason.
- Mutation updates `tenants.health_insurance_enabled` and records `platform.tenant.enablement_updated` in `hw_audit_events`.

---

## 6. PART D — SECURITY, AUTHORIZATION & SSRF DEFENSE

### 6.1 Server-Side Request Forgery (SSRF) Prevention
All user-entered integration endpoints and health-check URLs are validated through `validateSafeUrl`:
- Protocol whitelist: strictly `https:` (or `http:` in local dev environments).
- Blocked destinations:
  - Loopback addresses (`localhost`, `127.0.0.1`, `::1`).
  - Private RFC-1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Link-local and cloud metadata addresses (`169.254.169.254`, `metadata.google.internal`).
  - Internal network naming schemes.

### 6.2 Maker-Checker Dual-Authorization Enforcement
- Operator grant sessions require dual-party approval: a **Maker** proposes the operational grant, and an independent **Checker** approves it.
- A user cannot approve their own grant proposal, nor can a maker approve their own request.
- Unapproved or self-approved grants are rejected with HTTP 403.

---

## 7. PART E — TEST EXECUTION & BUILD VERIFICATION

### 7.1 Automated Backend Test Suite
Executed test suite: `npx jest test/health-insurance.test.ts`  
**Result:** 36 of 36 unit and security tests passed (0 failures, 100% pass rate).

```
PASS test/health-insurance.test.ts (6.903 s)
  Invify Health & Wellness — Unit & Security Verification
    1. Feature Flag Guard (Default Safety)
      √ rejects access with 503 when FEATURE_HEALTH_INSURANCE_ENABLED is absent or false
      √ allows access to proceed when FEATURE_HEALTH_INSURANCE_ENABLED is "true"
    2. Authorization & Super Admin Isolation
      √ strictly denies implicit super_admin bypass when user lacks health permissions
      √ permits platform operator access only when explicit unexpired grant and valid reason header exist
    3. Tenant Isolation Enforcement
      √ rejects cross-tenant student enrolment when student belongs to a different tenant
    4. Guardian Relationship & State Verification
      √ blocks access to student coverage while guardian link is in pending_verification
    5. Policy Activation Safety Boundary
      √ enforces that enrolment verification transitions to awaiting_premium_payment and NEVER active directly
    6. Sandbox Adapter Security Gating
      √ throws a fatal security error if instantiated in production mode
      √ throws a fatal security error if BUILD_VARIANT is prod
      √ instantiates safely in staging / test mode
    7. Platform Super Admin Governance & Operator Grants
      √ HealthPlatformService.getPlatformOverview aggregates cross-tenant counts and financial volume
      √ rejects grant creation if justification reason is shorter than 5 characters
      √ creates platform operator grant and records audit event in hw_audit_events
      √ revokes an active platform grant and records audit event in hw_audit_events
      √ enforces dual-authorization: rejects grant creation if actor tries to grant to themselves
      √ Maker-Checker: allows an administrator to propose a grant request as Maker
      √ Maker-Checker: strictly blocks Maker from approving their own proposed request
      √ Maker-Checker: strictly blocks target user from approving their own elevation request
      √ Maker-Checker: activates grant and updates status when independent Checker approves
      √ selfActivateGrant rejects session activation with 403 when no independent grant exists
      √ selfActivateGrant activates session and records audit event when independent grant exists
    8. Platform Dashboard Contract & Alignment Tests
      √ getMyGrantStatus returns canonical contract { success: true, data: { hasActiveGrant: false } } when no grants exist
      √ getMyGrantStatus returns { hasActiveGrant: true } when active grant is present
      √ getProvidersHealth wraps payload in { success: true, data: { providers } } with name and isActive
      √ getOverview and listTenants wrap outputs in canonical { success: true, data } envelope
      √ requireHealthPermission strictly rejects expired and revoked grants with 403
    9. Interactive Operations & Management Verification
      A. Provider Management & Security Gating
        √ rejects provider registration if code violates ^[a-z0-9_]{2,40}$ regex
        √ rejects duplicate provider codes
        √ strictly blocks SSRF endpoints (loopback, metadata, link-local)
        √ creates provider and logs platform.provider.created audit event
        √ tests provider connection, records latency and logs audit event
      B. Platform KPI Drill-Down & Zero-PII Compliance
        √ rejects unsupported KPI drilldown metrics
        √ enforces Zero PII leakage in insured_members drill-down
        √ reconciles integer-kobo sums in financial drill-downs (premiums_billed & premiums_settled)
      C. Tenant Participation Details & Enablement
        √ fetches tenant details with participation metrics and plan offers
        √ updates tenant health enablement and logs platform.tenant.enablement_updated

Test Suites: 1 passed, 1 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        7.212 s
```

### 7.2 Frontend Production Build
Executed command: `npm run build` in `invify-admin`  
**Result:** Vite production compilation completed in 21.13s with **exit code 0** and zero build errors.
- Output bundle: `dist/assets/HealthInsuranceGovernancePage-DMFj_Vd4.js` (104.76 kB │ gzip: 22.35 kB).

---

## 8. SUMMARY MATRIX OF DELIVERABLES

| Component | Status | Verification Evidence |
|---|---|---|
| **Interactive HMO Telemetry Cards** | VERIFIED | Detail modal displays plans, redacted credentials, capabilities, and audit logs. |
| **+ Add HMO Integration Wizard** | VERIFIED | 4-step wizard with regex validation, duplicate checks, and SSRF blocking. |
| **Test Connection Action** | VERIFIED | Non-destructive latency check with audit logging. |
| **Interactive KPI Cards (All 6)** | VERIFIED | Clickable cards opening paginated drill-down modal for all 6 metrics. |
| **Zero-PII Compliance** | VERIFIED | All student/guardian personal details excluded from drill-downs; unit test passed. |
| **Integer-Kobo Reconciliation** | VERIFIED | Monetary fields maintain integer arithmetic without float inaccuracies. |
| **Tenant Participation Drawer** | VERIFIED | Row click opens drawer showing plans, counts, and financial summaries. |
| **Tenant Enablement Toggle** | VERIFIED | Audited status toggle writes to `hw_audit_events`. |
| **Backend Unit Tests** | VERIFIED | 36/36 tests passing in `test/health-insurance.test.ts`. |
| **Frontend Production Build** | VERIFIED | Vite build completed cleanly with 0 errors. |
