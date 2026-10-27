# INVIFY HEALTH & WELLNESS — THREE-INTERFACE UI VERIFICATION AUDIT

**Audit Date:** 2026-10-15  
**Working Directory:** `C:\dev\Involve_APP_health`  
**Branch:** `feature/health-insurance-phase1`  
**Audit Scope:** Read-Only Interface Verification (Mobile, Tenant Web Admin, Platform Super-Admin)  
**Primary Invariant:** Zero mutation to source code, database records, environment configurations, or parent repository working tree during audit.

---

## 1. REPOSITORY & APPLICATION MAP

The Invify codebase consists of a unified multi-platform architecture:

```
C:\dev\Involve_APP_health\
├── lib\                          # Interface A: Mobile Application (Flutter 3.38.9 / Dart 3.10.8)
│   ├── core\                     # Shared utilities, auth token resolver, sync
│   ├── features\
│   │   ├── dashboard\            # Core dashboard grid & menu catalog (DashboardMenuCatalog)
│   │   ├── school\               # School Mode entities, BLoCs, and screens
│   │   ├── school_finance\       # School tuition, fees, virtual accounts, reconciliation
│   │   ├── services\             # Services Mode jobs and customer flows
│   │   └── stock\                # Retail Mode inventory and POS
│   └── main.dart                 # Flutter entrypoint, BLoC providers, and named routes map
│
├── invify-admin\                 # Interfaces B & C: Web Administration Portals (Vue 3 / Vite 5 / Quasar)
│   ├── src\
│   │   ├── api\                  # HTTP clients (api/index.js, healthInsuranceApi.js)
│   │   ├── domains\tenant\       # Interface B: Tenant Scoped Portals (/tenant/...)
│   │   │   └── health-insurance\ # Tenant Health & Wellness dashboard & dialogs
│   │   ├── layouts\
│   │   │   ├── MainLayout.vue    # Interface C Shell: Platform Operations Core (/...)
│   │   │   └── TenantLayout.vue  # Interface B Shell: Tenant Portal (/tenant/...)
│   │   ├── pages\                # Platform admin, governance, finance, observability pages
│   │   └── router\
│   │       └── routes.js         # Unified administrative routing table
│
└── invify-backend\               # Backend Service Engine (Express / TypeScript / Supabase PostgreSQL)
    ├── src\
    │   ├── app.ts                # Route mounting (/api/v1/health-insurance)
    │   └── modules\health-insurance\ # Guards, adapters, services, controllers, types
    └── supabase\migrations\      # 24 additive hw_* tables, triggers, and RLS policies
```

---

## 2. INTERFACE-BY-INTERFACE VERDICT SUMMARY

| Interface | Platform | Target Role / Scope | Verification Status | Verdict Summary |
| :--- | :--- | :--- | :---: | :--- |
| **Interface A: School Mode Mobile** | Flutter (Android/iOS/Desktop) | School Administrators, Staff, Parents | **NOT IMPLEMENTED** | No Dart models, BLoCs, routes, menu options, or screens exist in `lib/`. |
| **Interface B: Tenant Web Admin** | Vue 3 / Quasar (`invify-admin`) | Tenant Owners, School Admins, HR | **PARTIALLY IMPLEMENTED** | Dashboard page, route, and layout navigation exist and compile; however, API client route mismatches cause 404s on specific actions and sub-lists. |
| **Interface C: Platform Super-Admin** | Vue 3 / Quasar (`invify-admin`) | Platform Operators, Support, Underwriting | **NOT IMPLEMENTED** | Dedicated cross-tenant Health & Wellness console, routes, and UI metrics are completely absent. |

---

## 3. INTERFACE A — SCHOOL MODE MOBILE (FLUTTER)

### 3.1 Verification Findings
- **Navigation Catalog:** Inspected `lib/features/dashboard/domain/dashboard_menu_catalog.dart`. The catalog defines 28 menu options (e.g. `student_analytics`, `students`, `parents`, `teachers`, `academic_setup`, `fee_management`, `lesson_notes`). There is **no entry** for Health & Wellness, health insurance, or medical coverage.
- **Home Grid Routing:** Inspected `lib/features/dashboard/presentation/pages/dashboard_page.dart`. Lines 787–840 configure menu items for School Mode (`/student_analytics`, `/fee_management`, `/school_setup`, etc.). No Health & Wellness tile is rendered or wired.
- **App Routes Table:** Inspected `lib/main.dart` lines 920–963. Contains 44 static routes. No health insurance routes exist.
- **Student Profile Screen:** Inspected `lib/features/school/presentation/pages/student_profile_page.dart`. Line 509 contains a static text field label `Health Condition & Special Notes` used strictly for free-form allergy/medical notes. No insurance policy, provider, certificate, or premium status widgets exist.
- **API Services & Repositories:** Inspected `lib/features/school/data/` and `lib/core/network/`. Zero API endpoints targeting `/api/v1/health-insurance` exist in the Flutter codebase.
- **Quasar Direct Access Check:** The app communicates with payment providers exclusively via backend endpoints; no direct frontend-to-Quasar health calls exist.

### 3.2 Verdict & Impact
- **Status:** **NOT IMPLEMENTED**
- **Impact:** School administrators, teachers, and guardians using mobile or tablet devices cannot view student health coverage status, initiate enrolments, or track premium bills on the mobile app.

---

## 4. INTERFACE B — TENANT WEB ADMIN (`invify-admin`)

### 4.1 Verification Findings
- **Reachability & Route Definition:**
  - Route defined in `invify-admin/src/router/routes.js` (line 536):
    ```javascript
    {
      path: 'health-insurance',
      component: () => import('src/domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue'),
      meta: { title: 'Health & Wellness', requiresAuth: true }
    }
    ```
  - Reachable URL: `/tenant/health-insurance` (authenticated within tenant context).
- **Navigation Drawer Integration:**
  - Integrated into `invify-admin/src/layouts/TenantLayout.vue` under `industryNavigationTree`:
    - School Mode: Line 301 (`{ label: 'Health & Wellness', path: '/tenant/health-insurance', icon: 'health_and_safety', color: 'teal-4', mode: 'SCHOOL' }`)
    - Retail Mode: Line 315 (`mode: 'RETAIL'`)
    - Services Mode: Line 321 (`mode: 'SERVICE'`)
- **Component Implementation:**
  - File: `invify-admin/src/domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue` (998 lines).
  - Production Bundle: Verified built via Vite (`dist/assets/HealthInsuranceDashboardPage-9X0xh4l7.js`, 29.84 kB).
  - Component Features:
    - 4 Top-level KPI cards: Total Enrolments, Active Policies, Awaiting Action, Premiums Reconciled.
    - Safety & Compliance Banner: Explicit HMO partner disclaimer (Invify is not an underwriter).
    - 7 Operational Tabs: Enrolments, Policies, Guardians & Links, Billing, Plans, Facilities, Claims.
    - 4 Action Modals: New Enrolment, Invite Guardian, Issue Premium Bill, Confirm Policy Activation.
- **Mock Data Audit:**
  - Zero hardcoded mock records. All state variables (`enrolments`, `policies`, `guardianLinks`, `invoices`, `tenantOffers`, `facilities`, `claims`) are initialized as empty reactive arrays (`ref([])`).
- **Client-to-Backend Path Mismatches (GAPS IDENTIFIED):**
  A strict line-by-line comparison between `invify-admin/src/api/healthInsuranceApi.js` and `invify-backend/src/modules/health-insurance/register-routes.ts` revealed several endpoint routing discrepancies:

| Function in `healthInsuranceApi.js` | Client Request Path | Actual Backend Route (`register-routes.ts`) | Status / Issue |
| :--- | :--- | :--- | :--- |
| `getOverviewMetrics()` | `GET /api/v1/health-insurance/reports/overview` | `GET /api/v1/health-insurance/overview` | **404 Mismatch** (`/reports/overview` vs `/overview`) |
| `getPlans()` | `GET /api/v1/health-insurance/providers/:id/plans` | `GET /api/v1/health-insurance/plans` | **404 Mismatch** |
| `getTenantOffers()` | `GET /api/v1/health-insurance/plans/offers` | `GET /api/v1/health-insurance/tenant-offers` | **404 Mismatch** |
| `activatePolicy()` | `POST /api/v1/health-insurance/enrolments/:id/activate-policy` | `POST /api/v1/health-insurance/enrolments/:id/simulate-sandbox-activation` | **404 Mismatch** |
| `verifyGuardianLink()` | `POST /api/v1/health-insurance/guardians/links/:id/verify` | `POST /api/v1/health-insurance/guardians/:linkId/verify` | **404 Mismatch** (Extra `/links/` path segment) |
| `generateInvoice()` | `POST /api/v1/health-insurance/billing/invoices` | `POST /api/v1/health-insurance/invoices` | **404 Mismatch** |
| `initiatePayment()` | `POST /api/v1/health-insurance/billing/invoices/:id/initiate-payment` | `POST /api/v1/health-insurance/invoices/:id/pay` | **404 Mismatch** |

- **Missing Sub-List Invocations:**
  - `loadGuardianLinks()` is never invoked inside `refreshAll()` or on component mount; the Guardians tab remains empty even when guardian links exist.
  - `loadClaims()` is never invoked inside `refreshAll()`.
- **Disabled-Feature (503) & Authorization (403) Handling:**
  - When `FEATURE_HEALTH_INSURANCE_ENABLED=false` returns HTTP 503, the page currently logs a warning to the console (`console.warn`) and leaves metrics at 0 rather than rendering an informative, user-friendly "Module Not Activated" empty state.

### 4.2 Verdict & Impact
- **Status:** **PARTIALLY IMPLEMENTED**
- **Impact:** The tenant web admin screen is present, beautifully styled, and navigable, but interactive button actions (issuing invoices, paying premiums, activating policies, loading guardian links) will fail due to URL path drift between the frontend client and the backend router.

---

## 5. INTERFACE C — PLATFORM SUPER-ADMIN DASHBOARD

### 5.1 Verification Findings
- **Platform Navigation Inspection:** Inspected `invify-admin/src/layouts/MainLayout.vue` lines 695–768 (`workspaces`). The active platform workspaces include:
  `fleet`, `finance`, `governance`, `observability`, `ai`, `deployments`, `apps`, `incidents`, `automation`, `communications`, `admin`.
  There is **no Health & Wellness workspace or navigation entry**.
- **Platform Route Inspection:** Inspected `invify-admin/src/router/routes.js`.
  - Routes under `/` (child of `MainLayout.vue`): `admin/tenants`, `admin/users`, `admin/billing`, `admin/platform-fees`, `finance/school-payments`, etc.
  - There is **no platform route** for Health & Wellness (e.g. `/admin/health-insurance` or `/governance/health-insurance`).
- **Platform Super-Admin Screen Inspection:**
  - Inspected `invify-admin/src/pages/admin/` and `invify-admin/src/pages/governance/`.
  - Zero Vue components exist for platform-wide health insurance oversight, cross-tenant enrolment aggregation, HMO partner connectivity health, or operator grant auditing.
- **Backend Platform API Status:**
  - The backend guard `requireHealthPermission` supports platform permissions (`platform.providers.manage`, `platform.plans.manage`, `platform.tenants.onboard`, `platform.integration.health`, `platform.tenant_access`) through `hw_platform_grants`.
  - However, no cross-tenant aggregator endpoints (e.g. `GET /api/v1/health-insurance/platform/overview`) exist in `register-routes.ts`.
- **Super-Admin Bypass Guardrail:**
  - Confirmed: The backend guard strictly rejects implicit `super_admin` access to health data. An unexpired record in `hw_platform_grants` and an explicit `x-platform-reason` header are required. This security guardrail works as designed.

### 5.2 Verdict & Impact
- **Status:** **NOT IMPLEMENTED**
- **Impact:** Platform super-administrators and operations teams have no visual dashboard to monitor participating schools, aggregate enrolled students, HMO provider sync errors, or cross-tenant health premium reconciliations.

---

## 6. END-TO-END INTEGRATION & SECURITY AUDIT

| Security / Integration Aspect | Expected Behavior | Actual Verified State | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Authentication & Identity** | Resolve identity strictly from Supabase JWT | Resolved via `req.user.id` and verified against `users` table | **Compliant** |
| **Tenant Isolation** | Resolve tenant ID from DB profile; reject foreign tenant access | Tenant ID resolved strictly from `dbUser.tenant_id`. Cross-tenant mutations rejected | **Compliant** |
| **Super Admin Bypass Guard** | `super_admin` role alone cannot access health data | Verified in Jest test suite (Test 2.1 passes). Implicit access denied | **Compliant** |
| **Platform Operator Grant** | Requires explicit grant in `hw_platform_grants` + reason | Verified in Jest test suite (Test 2.2 passes). Requires `x-platform-reason` | **Compliant** |
| **Guardian Access Gate** | Guardians blocked while link is `pending_verification` | Verified in Jest test suite (Test 4.1 passes). Verified in staging | **Compliant** |
| **Tuition Balance Separation** | No mutation to `fee_structures` or tuition balances | Invoices generated strictly in `hw_premium_invoices`. Zero tuition touching | **Compliant** |
| **Insurer Confirmation Boundary** | Payment receipt != active coverage | Policy active check constraint enforced at PostgreSQL level (`hw_policies`) | **Compliant** |
| **Sandbox Adapter Guard** | Sandbox adapter rejected in production | `SandboxProviderAdapter` throws fatal error if `isProd` or `BUILD_VARIANT=PROD` | **Compliant** |
| **Quasar Direct Access** | No direct frontend-to-Quasar communication | All Quasar interactions route through backend controller and webhook HMAC | **Compliant** |

---

## 7. PRIORITISED IMPLEMENTATION SEQUENCE

To bring Invify Health & Wellness to a complete, robust, three-interface state without architectural bloat or regression, the following phased sequence is recommended:

### Sequence 1: Fix & Complete Interface B (Tenant Web Admin) — High Priority
1. **Align API Client with Backend Router:**
   - Synchronize URL paths in `invify-admin/src/api/healthInsuranceApi.js` with `invify-backend/src/modules/health-insurance/register-routes.ts` (or update router aliases in backend to support both paths).
2. **Wire Missing Sub-Lists in Dashboard:**
   - Add backend routes for listing guardian links (`GET /guardians`) and policy lists (`GET /policies`).
   - Implement `loadGuardianLinks()` and `loadClaims()` in `HealthInsuranceDashboardPage.vue`.
3. **Add Explicit Disabled & Permission Error States:**
   - Render a dedicated full-card banner if the tenant has not enabled Health & Wellness or if the user lacks permissions, preventing empty screen confusion.

### Sequence 2: Implement Interface C (Platform Super-Admin) — High Priority
1. **Backend Aggregator Endpoints:**
   - Implement `GET /api/v1/health-insurance/platform/overview` (returns total active tenants, total enrolments, active policies, aggregate premium collections, and provider sync errors).
   - Gate behind `requireHealthPermission('platform.integration.health')`.
2. **Platform Super-Admin Dashboard Page:**
   - Create `invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue`.
   - Include cross-tenant metrics, partner HMO integration health cards, and active platform grant audit logs.
3. **Platform Route & Navigation:**
   - Mount `/admin/health-insurance` in `routes.js` under `MainLayout.vue` in the `admin` workspace.
   - Add navigation entry in `MainLayout.vue`.

### Sequence 3: Implement Interface A (School Mode Mobile Flutter) — Medium Priority
1. **Domain & Data Layer:**
   - Create `HealthInsuranceRepository` and API data source calling Invify backend endpoints.
   - Define Dart models: `HealthPlan`, `HealthMember`, `HealthEnrolment`, `HealthPolicy`.
2. **BLoC & State Management:**
   - Create `HealthInsuranceBloc` with states: `Initial`, `Loading`, `Loaded`, `Disabled`, `Error`.
3. **Presentation Layer:**
   - Register tile in `DashboardMenuCatalog` (`id: 'health_wellness'`, `label: 'Health & Wellness'`, `modes: ['school']`).
   - Render `_DashboardMenuItem` in `lib/features/dashboard/presentation/pages/dashboard_page.dart`.
   - Create `lib/features/school/presentation/pages/school_health_insurance_page.dart` (showing student coverage roster, policy expiry, and guardian link verification status).
   - Add route `/health_insurance` to `lib/main.dart`.
   - Embed Health Coverage status badge on `student_profile_page.dart`.
