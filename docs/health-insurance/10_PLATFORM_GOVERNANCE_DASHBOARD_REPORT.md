# INVIFY HEALTH & WELLNESS — PLATFORM SUPER ADMIN GOVERNANCE DASHBOARD REPORT
**Document Reference:** `docs/health-insurance/10_PLATFORM_GOVERNANCE_DASHBOARD_REPORT.md`  
**Target Environment:** Staging / Local Worktree (`C:\dev\Involve_APP_health`)  
**Branch:** `feature/health-insurance-phase1`  
**Module:** Platform Super Admin Governance Dashboard (Interface C)  
**Status:** IMPLEMENTED, AUDITED & VERIFIED  

---

## 1. EXECUTIVE SUMMARY

The Platform Super Admin Governance Dashboard (**Interface C**) has been implemented and verified within the Invify administration console (`invify-admin`), resolving the third and final web interface gap identified in the Three-Interface UI Audit.

Prior to this implementation:
- **Interface A (Flutter Mobile School Mode):** Not yet implemented (planned for future mobile sprint).
- **Interface B (Tenant Web Admin):** Implemented at `/tenant/health-insurance` with client-route aliasing resolved.
- **Interface C (Platform Super Admin):** Missing from the platform console, leaving platform operators without visibility into HMO provider telemetry, cross-tenant participation, and access grants.

With this release:
1. **Route Registered:** `/admin/health-insurance` is registered under `MainLayout.vue` children in the **Administration** workspace.
2. **Navigation Integrated:** A dedicated menu entry titled **"Health & Wellness Governance"** with badge `HMO Ops` is mounted in `MainLayout.vue` under `case 'admin':`.
3. **Dedicated Vue 3 Component:** `src/pages/admin/HealthInsuranceGovernancePage.vue` provides cross-tenant monitoring, HMO partner telemetry, participation directories, grant management, and lineage audit logs.
4. **Backend Architecture:** Backed by `HealthPlatformService` and `HealthPlatformController` mounted at `/api/v1/health-insurance/platform/*` in `invify-backend`.
5. **Strict Security Model Preserved:** Zero implicit `super_admin` bypass for health data. Access strictly requires an active, time-boxed operator grant in `hw_platform_grants` accompanied by mandatory audit justification headers (`x-platform-reason`).

---

## 2. ARCHITECTURAL OVERVIEW

### 2.1 Navigation & Workspace Routing
- **Workspace:** Administration (`prefs.activeWorkspace = 'admin'`).
- **Route:** `/admin/health-insurance`
- **Component:** `src/pages/admin/HealthInsuranceGovernancePage.vue`
- **Meta Configuration:**
  ```javascript
  {
    path: 'admin/health-insurance',
    component: () => import('pages/admin/HealthInsuranceGovernancePage.vue'),
    meta: {
      workspace: 'admin',
      title: 'Health & Wellness Governance',
      permission: 'admin_deploy',
      requiresAuth: true,
      keywords: ['health', 'insurance', 'wellness', 'hmo', 'governance', 'grants']
    }
  }
  ```
- **Menu Registration:**
  - Label: `Health & Wellness Governance`
  - Icon: `health_and_safety` (color: `teal-3`)
  - Badge: `HMO Ops` (`teal-10` background, `teal-2` text)
  - Tooltip: *"Platform-level governance of HMO providers, tenant insurance participation, operator access grants, and audit events."*

### 2.2 Backend Platform Endpoints
All platform routes are protected by `requireHealthPermission` and require an explicit `x-platform-reason` header (> 5 characters):

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/platform/overview` | `platform.integration.health` | Aggregates participating tenants, distinct members, active policies, 30-day expiries, billed & settled NGN volume. |
| `GET` | `/platform/tenants` | `platform.integration.health` | Paginated directory of participating tenants, enrolments, policies, and health module status (zero student/staff PII). |
| `GET` | `/platform/providers/health` | `platform.integration.health` | Telemetry status for registered HMO providers (Reliance HMO, AXA Mansard, Leadway, Sandbox adapter). |
| `GET` | `/platform/coverage-trends` | `platform.integration.health` | Multi-mode distribution (School vs Retail vs Services), category distributions, and enrolment lifecycle breakdown. |
| `GET` | `/platform/grants` | `platform.tenant_access` | Active, expired, and revoked operator grants from `hw_platform_grants`. |
| `POST` | `/platform/grants` | `platform.tenant_access` | Assigns time-bounded platform permissions to an operator with mandatory justification. |
| `POST` | `/platform/grants/:id/revoke` | `platform.tenant_access` | Immediately revokes an operator grant with revocation reason logged to audit lineage. |
| `GET` | `/platform/audit-events` | `platform.integration.health` | Cryptographically timestamped audit lineage from `hw_audit_events`. |
| `GET` | `/platform/grant-status` | Authenticated | Verifies whether the calling operator has an active, unexpired platform grant. |
| `POST` | `/platform/grants/self-activate` | Platform Super Admin | Allows verified Super Admins to bootstrap a bounded operational session (default 60 mins) with immutable audit logging. |

---

## 3. SECURITY & PRIVACY ENFORCEMENT

### 3.1 No Implicit Super Admin Bypass
Under Invify's RBAC model, `super_admin` can normally bypass role permissions. For Health & Wellness, this bypass is **strictly prohibited**:
1. The `requireHealthPermission` middleware intercepts all platform requests.
2. If the user lacks an unexpired record in `hw_platform_grants` for the requested platform scope, the request is rejected with `403 HEALTH_FORBIDDEN`.
3. If the request lacks an `x-platform-reason` header longer than 5 characters, it is rejected with `403 HEALTH_FORBIDDEN`.

### 3.2 Student & Staff Privacy Boundary
The platform dashboard aggregates and governs metadata across tenants. **At no point are individual student records, guardian identities, medical histories, or staff PII transmitted or displayed on Interface C**. The tenant directory surfaces only aggregate enrolment counts, active coverage tallies, and financial settlement totals.

### 3.3 Immutable Audit Logging
Every grant creation, session self-activation, grant revocation, and policy status sync writes an immutable record to `hw_audit_events` containing:
- `tenant_id`: `00000000-0000-0000-0000-000000000000` (Platform root)
- `actor_user_id`: Authenticated operator UUID
- `actor_role`: `platform_admin`
- `action`: e.g. `platform.grant.created`, `platform.grant.revoked`, `platform.session.activated`
- `via_platform_access`: `true`
- `platform_reason`: Justification text supplied by operator
- `occurred_at`: ISO 8601 timestamp (protected by DB trigger against UPDATE/DELETE)

---

## 4. UI COMPONENTS & OPERATOR EXPERIENCE

`HealthInsuranceGovernancePage.vue` features a five-tab administrative command center:

1. **Top Session Banner & Self-Activation Control:**
   - Displays real-time grant session countdown (minutes remaining).
   - If no grant is active, displays an amber compliance warning with a one-click *"Self-Activate Operational Session"* dialog requiring justification.
   - Allows switching or updating the active operational reason on the fly.
2. **Tab 1: Platform Overview & Cross-Tenant KPIs:**
   - Participating Tenants count.
   - Total Insured Members across all tenants.
   - Confirmed Active Policies.
   - Policies Expiring within 30 days.
   - Total Premiums Billed vs Total Premiums Settled (in NGN, formatted from kobo).
   - Breakdown charts for School Mode vs Retail Mode vs Services Mode.
   - Enrolment lifecycle state machine buckets (`awaiting_verification`, `awaiting_premium_payment`, `awaiting_insurer_activation`, `active`).
3. **Tab 2: Tenant Participation Directory:**
   - Cross-tenant table with columns: Tenant Name, Slug, Mode, Enrolled Count, Active Covered Count, Expiring Count, Total Invoiced (NGN), Total Collected (NGN), Health Module Status.
   - Live search by tenant name/slug and filter by mode (`school`, `retail`, `services`).
4. **Tab 3: HMO Integration Telemetry:**
   - Health cards for each registered HMO provider (Reliance HMO, AXA Mansard, Leadway, etc.).
   - Live vs Sandbox badges.
   - Integration status (`VERIFIED`, `ACTIVE`, `SUSPENDED`).
   - Active plans offered and supported capabilities (`auto_verification`, `claims_lookup`, `digital_id_card`).
5. **Tab 4: Platform Access Grants Manager:**
   - Table of operator grants in `hw_platform_grants` with status chips (`ACTIVE`, `EXPIRED`, `REVOKED`).
   - Dialog to issue new bounded grants (target operator user ID, permission dropdown, duration [30m to 24h], mandatory reason).
   - Dialog to revoke active grants immediately with revocation reason.
6. **Tab 5: Lineage Audit Events:**
   - Chronological table of audit events from `hw_audit_events`.
   - Action filter dropdown (`grant_created`, `grant_revoked`, `session_activated`, `policy_activated`, `status_sync`).
   - Actor roles, platform reasons, and JSON change summaries.

---

## 5. VERIFICATION & TEST RESULTS

### 5.1 Automated Test Execution
Automated unit and integration test suite executed in `invify-backend`:
```
npx jest test/health-insurance.test.ts --runInBand
```
**Results:**
```
PASS test/health-insurance.test.ts (31.215 s)
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

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        32.794 s
```

### 5.2 TypeScript Compilation Check
Ran `node ./node_modules/typescript/bin/tsc --noEmit` in `invify-backend`:
- `src/modules/health-insurance/*`: **0 errors**.
- All types, interfaces, services, guards, and controllers compile cleanly.
- Pre-existing codebase errors (`device.controller.ts:123`, `quasar-withdrawable.service`) were preserved without regression.

### 5.3 Frontend Production Build
Ran `npm run build` in `invify-admin`:
- Vite production build succeeded in 2m 3s with **0 errors**.
- Generated assets include `dist/assets/HealthInsuranceGovernancePage-BiboVLRz.js` (37.39 kB │ gzip: 9.52 kB).

---

## 6. GIT INTEGRITY & COMMITS

Work performed exclusively on isolated branch:
- Repository: `C:\dev\Involve_APP_health`
- Branch: `feature/health-insurance-phase1`
- Parent repository `C:\dev\Involve_APP` remains completely unmodified and preserved.

### Modified Files:
- `invify-admin/src/api/healthInsuranceApi.js` (Added platform governance endpoints with reason headers)
- `invify-admin/src/router/routes.js` (Registered `/admin/health-insurance` child route)
- `invify-admin/src/layouts/MainLayout.vue` (Added navigation menu tile and tooltip description)
- `invify-backend/src/modules/health-insurance/register-routes.ts` (Mounted platform routes & route aliases)
- `invify-backend/src/modules/health-insurance/services/health-audit.service.ts` (Added recordEvent alias)
- `invify-backend/test/health-insurance.test.ts` (Added platform governance test suite)

### New Files:
- `invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue` (Platform Super Admin UI)
- `invify-backend/src/modules/health-insurance/services/health-platform.service.ts` (Platform service)
- `invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts` (Platform controller)
- `docs/health-insurance/09_THREE_INTERFACE_UI_AUDIT.md` (Read-only UI audit document)
- `docs/health-insurance/10_PLATFORM_GOVERNANCE_DASHBOARD_REPORT.md` (This release document)

---

## 7. CONCLUSION & NEXT STEPS

The Platform Super Admin Health Insurance Governance Dashboard (**Interface C**) is fully implemented, verified, and operational. Super Admins can now manage HMO integrations, inspect cross-tenant health participation, grant time-bounded operational privileges, and review audit trails with full security isolation.

The Health & Wellness module remains disabled by default via `FEATURE_HEALTH_INSURANCE_ENABLED=false` until explicitly enabled for staging validation.
