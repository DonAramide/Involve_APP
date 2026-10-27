# INVIFY HEALTH & WELLNESS — LIVE DASHBOARD DATA RECONCILIATION REPORT
**Document Reference:** `docs/health-insurance/12_DASHBOARD_DATA_RECONCILIATION.md`  
**Date:** October 16, 2026  
**Target Repository:** `C:\dev\Involve_APP_health`  
**Active Git Branch:** `feature/health-insurance-phase1`  
**Target Page:** `/admin/health-insurance` (Platform Super Admin Governance Dashboard)  
**Investigation Mode:** Read-Only Diagnosis & Minimal Local Fix Proposal (Zero Data Mutation)  
**Status:** DIAGNOSIS COMPLETE — ROOT CAUSES IDENTIFIED — PROPOSAL AWAITING APPROVAL  

---

## 1. RUNTIME TARGET VERIFICATION

| Component | Target URL / Port | Process / Service | Environment & Target Project | Secrets Redacted |
|---|---|---|---|---|
| **Frontend Web App** | `http://localhost:5174` | Vite v5.4.21 (`invify-admin`) | Target: `invify-admin/src` | ✓ No secrets printed |
| **Frontend Dev Proxy** | `http://localhost:5174/api` | Vite Proxy (`vite.config.js:35`) | Proxies `/api` -> `http://127.0.0.1:3004` | ✓ Confirmed IPv4 proxy |
| **Backend API Server** | `http://127.0.0.1:3004` | Express + TypeScript (`ts-node`) | Target: `invify-backend` in `staging` mode | ✓ `Loaded .env.staging` |
| **Database Target** | `https://rpcjelhacmkhzguljdgi.supabase.co` | Staging Cloud Supabase Instance | Shared with `smoke-test-staging-acceptance.ts` | ✓ Keys & tokens redacted |
| **Feature Flag** | `FEATURE_HEALTH_INSURANCE_ENABLED` | `invify-backend/.env.staging:31` | `true` (Routes mounted at `/api/v1/health-insurance`) | ✓ Active in runtime process |

**Runtime Target Confirmation:**  
Both the running browser session (`localhost:5174`) and the automated staging smoke test (`smoke-test-staging-acceptance.ts`) point to the **exact same staging Supabase database** (`https://rpcjelhacmkhzguljdgi.supabase.co`). There is **zero environment mismatch**.

---

## 2. DISCREPANCY SUMMARY: LIVE AUDIT VS. LIVE DASHBOARD

The automated staging smoke test (`npx ts-node --transpile-only scripts/smoke-test-staging-acceptance.ts`) executed against the live staging database and reported:
- **`hw_providers`:** 3 registered HMO providers (`Staging Test HMO Provider` sandbox instances).
- **`tenants`:** 87 registered tenant institutions.
- **`hw_tenant_settings`:** 1 participating institution with health module enabled.
- **`hw_platform_grants`:** 0 active operator grants recorded.

In contrast, the live browser dashboard at `http://localhost:5174/admin/health-insurance` displayed:
- **Overview Tab:** `0 Participating institutions`, `0 Insured Members`, `0 Active Policies`, `₦0 Premiums`.
- **HMO Integration Telemetry Tab:** `No HMO Provider Registry Records Found. Providers configured in 'hw_providers' will appear here with live health telemetry.`
- **Tenant Participation Tab:** `Showing 0 participating tenants (Zero Student PII Exposed). No participating tenants found.`
- **Access Grants Manager Tab:** `No platform operator grants recorded.`

---

## 3. BROWSER NETWORK & ENDPOINT TRACE EVIDENCE

| Endpoint Path | Intended Purpose | HTTP Status | Response Shape Returned by Backend | UI Handling in `HealthInsuranceGovernancePage.vue` | Classification |
|---|---|---|---|---|---|
| `GET /api/v1/health-insurance/platform/grant-status` | Check operator session status | **404 Not Found** | `Cannot GET .../platform/grant-status` | `healthInsuranceApi.js:79` calls `/platform/grant-status`. Backend registered route is `/platform/my-grant-status`. Catches error; `grantStatus.hasActiveGrant` defaults to `false`. | **VERIFIED DEFECT** |
| `GET /api/v1/health-insurance/platform/my-grant-status` | Registered backend endpoint | **200 OK** (when authenticated) | `{ "hasActiveGrants": false, "activeGrants": [] }` | Backend returns `hasActiveGrants` (plural) without wrapper. Frontend expects `res.data.data.hasActiveGrant` (singular) inside `{ success: true }`. | **VERIFIED DEFECT** |
| `GET /api/v1/health-insurance/platform/overview` | Platform KPI metrics | **NOT SENT** (Skipped in UI) | If called without grant: **403 Forbidden** (`PLATFORM_PERMISSION_DENIED`). If called with grant: **200 OK** (`{ participatingTenants: 1, ... }`). | Call is blocked inside `if (grantStatus.value.hasActiveGrant)`. When grant is inactive, request is never issued; UI displays initial state `0`. Furthermore, response handler expects `res.data.success`, which backend does not provide. | **AUTHORIZATION BLOCK + VERIFIED DEFECT** |
| `GET /api/v1/health-insurance/platform/tenants` | Tenant directory | **NOT SENT** (Skipped in UI) | If called without grant: **403 Forbidden** (`PLATFORM_PERMISSION_DENIED`). If called with grant: **200 OK** (`{ tenants: [...], total: 87 }`). | Skipped in UI. Furthermore, line 1090 checks `tenRes.value.data?.success` and accesses `data.data?.tenants`. Backend returns `{ tenants: [...], total: 87 }`. Data is silently ignored. | **AUTHORIZATION BLOCK + VERIFIED DEFECT** |
| `GET /api/v1/health-insurance/platform/providers/health` | HMO telemetry status | **NOT SENT** (Skipped in UI) | If called without grant: **403 Forbidden** (`PLATFORM_PERMISSION_DENIED`). If called with grant: **200 OK** (`{ providers: [...3 rows], timestamp: "..." }`). | Skipped in UI. Furthermore, line 1093 checks `provRes.value.data?.success` and assigns `provRes.value.data.data`. Real backend key is `providers`. Data is silently dropped. | **AUTHORIZATION BLOCK + VERIFIED DEFECT** |
| `GET /api/v1/health-insurance/platform/grants` | Operator grants manager | **NOT SENT** (Skipped in UI) | If called without grant: **403 Forbidden** (`PLATFORM_PERMISSION_DENIED`). If called with grant: **200 OK** (`{ grants: [] }`). | Skipped in UI. Line 1099 checks `grRes.value.data?.success` and accesses `data.data?.grants`. Backend returns `{ grants: [] }`. | **AUTHORIZATION BLOCK + VERIFIED DEFECT** |
| `POST /api/v1/health-insurance/platform/grants/self-activate` | Session self-activation | **403 Forbidden** (if clicked) | `{"error":{"code":"INDEPENDENT_AUTHORIZATION_REQUIRED", ...}}` | By design: strict dual-control prohibits self-elevation. Requires pre-existing grant approved by an independent administrator (`.neq('granted_by', dbUser.id)`). | **EXPECTED SECURITY BOUNDARY** |

---

## 4. ROOT CAUSE ANALYSIS

### Root Cause 1: Route & Property Mismatch in Operator Session Checking (`getMyGrantStatus`)
- **Backend Route:** [`register-routes.ts:22`](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/register-routes.ts#L22)
  ```typescript
  router.get('/platform/my-grant-status', HealthPlatformController.getMyGrantStatus);
  ```
- **Frontend API Client:** [`healthInsuranceApi.js:79`](file:///C:/dev/Involve_APP_health/invify-admin/src/api/healthInsuranceApi.js#L79)
  ```javascript
  getMyGrantStatus: () => api.get('/api/v1/health-insurance/platform/grant-status'),
  ```
  *Defect:* The frontend client requests `/platform/grant-status`, producing a **404 Not Found**.
- **Backend Response:** [`health-platform.service.ts:501-504`](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/services/health-platform.service.ts#L501-L504)
  ```typescript
  return {
    hasActiveGrants: (grants || []).length > 0,
    activeGrants: grants || []
  };
  ```
- **Frontend Consumer:** [`HealthInsuranceGovernancePage.vue:1058-1061`](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L1058-L1061)
  ```javascript
  const res = await healthInsuranceApi.getMyGrantStatus();
  if (res.data?.success) {
    grantStatus.value = res.data.data;
  }
  ```
  *Defect:* The backend returns raw `{ hasActiveGrants, activeGrants }` without a `success: true` wrapper, and uses the plural property `hasActiveGrants`. The frontend checks `res.data?.success` and accesses `grantStatus.hasActiveGrant` (singular). Consequently, `grantStatus.value.hasActiveGrant` evaluates to `false` even if the route is resolved.

---

### Root Cause 2: Legitimate Authorization Boundary Masked as an "Empty Database"
- **Strict Permission Guard:** [`health-permission.guard.ts:57-76`](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/guards/health-permission.guard.ts#L57-L76)
  By security design, Super Admins have **zero implicit bypass** to cross-tenant health telemetry. Every query to `/platform/overview`, `/platform/tenants`, `/platform/providers/health`, and `/platform/coverage-trends` strictly requires an explicit, unexpired row in `hw_platform_grants` with `permission = 'platform.integration.health'`.
- **Frontend Guard Condition:** [`HealthInsuranceGovernancePage.vue:1074`](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L1074)
  ```javascript
  // If grant active, load platform telemetry
  if (grantStatus.value.hasActiveGrant) {
    const [ovRes, tenRes, provRes, ...] = await Promise.allSettled([...]);
  }
  ```
- **UI Presentation Defect:**  
  When an operator has no active grant (`hasActiveGrant === false`), the component completely omits the API calls, leaving local reactive variables at their initial default empty states:
  - `overview`: `{ totalEnabledTenants: 0, ... }`
  - `providersHealth`: `[]`
  - `tenantsList`: `[]`
  - `grantsList`: `[]`
  The tables then render generic empty-state labels (`"No HMO Provider Registry Records Found"`, `"Showing 0 participating tenants"`, `"No platform operator grants recorded"`).  
  **Result:** To an operator, the screen suggests that staging is empty, when in reality **telemetry access is authorization-gated**.

---

### Root Cause 3: Response Envelope & Schema Mismatch on All Platform Endpoints
- **Backend Controller Pattern:** [`health-platform.controller.ts:11,21,31,41,52,90`](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts#L11)
  The platform controller returns raw JSON payloads directly:
  - `overview`: `res.status(200).json(data)` -> `{ participatingTenants: 1, totalEnabledTenants: 1, ... }`
  - `tenants`: `res.status(200).json(data)` -> `{ tenants: [...], total: 87, limit, offset }`
  - `providers/health`: `res.status(200).json(data)` -> `{ providers: [...], timestamp }`
  - `grants`: `res.status(200).json({ grants: data })`
  - `audit-events`: `res.status(200).json(data)` -> `{ events: [...], total, limit, offset }`
- **Frontend Page Consumer:** [`HealthInsuranceGovernancePage.vue:1086-1103`](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue#L1086-L1103)
  ```javascript
  if (ovRes.status === 'fulfilled' && ovRes.value.data?.success) {
    overview.value = ovRes.value.data.data;
  }
  if (tenRes.status === 'fulfilled' && tenRes.value.data?.success) {
    tenantsList.value = tenRes.value.data.data?.tenants || [];
  }
  if (provRes.status === 'fulfilled' && provRes.value.data?.success) {
    providersHealth.value = provRes.value.data.data || [];
  }
  ```
  *Defect:* Because `ovRes.value.data?.success` is undefined, even when an active grant is present and the backend returns `200 OK`, **every single response is rejected by the frontend conditional**, keeping the overview and provider lists at zero. Additionally, `provRes.value.data.data` is looking for a nested `data` field instead of the top-level `providers` key.

---

### Root Cause 4: Definitional Difference Between Overview and Directory
- **Platform Overview (`participatingTenants`):** Counts institutions in `hw_tenant_settings` where `enabled = true`. In staging, only **1 tenant** has explicitly enabled health insurance.
- **Tenant Participation Directory (`tenants`):** Queries the root `tenants` table containing all **87 registered institutions** on staging, displaying their individual health status (`active` vs. `disabled`).
- *Explanation:* Once data loads, Overview will legitimately report `1` participating tenant while Directory lists `87` total institutions. This is an expected definitional distinction, not a calculation defect.

---

## 5. CLASSIFICATION MATRIX

| Finding | Classification | Rationale |
|---|---|---|
| **`/platform/grant-status` 404** | **VERIFIED DEFECT** | Route path mismatch in frontend API client (`/platform/grant-status` vs. `/platform/my-grant-status`). |
| **`hasActiveGrants` property mismatch** | **VERIFIED DEFECT** | Backend service returns `hasActiveGrants` (plural); frontend checks `hasActiveGrant` (singular). |
| **Missing `success: true` / nested `data` wrapper** | **VERIFIED DEFECT** | Frontend response handlers in `HealthInsuranceGovernancePage.vue` expect `{ success: true, data: { ... } }`, but backend controllers return raw objects. |
| **Zero grants in `hw_platform_grants`** | **EXPECTED EMPTY STATE** | Staging database has not had any operator grants created yet. |
| **Cross-tenant telemetry blocked without grant** | **AUTHORIZATION BLOCK** | Legitimate zero-trust security guard (`requireHealthPermission`) operating exactly as specified. |
| **UI masking authorization block as empty tables** | **VERIFIED DEFECT (UI/UX)** | Frontend silently skips fetching and renders "No records found" instead of an explicit "Operational Grant Required" locked state. |
| **1 Participating Tenant vs. 87 Institutions** | **EXPECTED DEFINITIONAL DIFFERENCE** | Overview measures active module adoption (`hw_tenant_settings.enabled = true`), whereas Directory enumerates the entire tenant estate. |

---

## 6. PROPOSED MINIMAL LOCAL FIX

To safely resolve these defects without weakening security guards, violating dual-control rules, or modifying database records, the following minimal, targeted adjustments are proposed:

### Proposed Fix 1: Route & Envelope Normalization in `HealthPlatformController`
In [`invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts`](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts):
1. Wrap successful responses in `{ success: true, data: ... }` to match standard Invify API envelopes.
2. In `getMyGrantStatus`, normalize the response:
   ```typescript
   return res.status(200).json({
     success: true,
     data: {
       hasActiveGrant: data.hasActiveGrants,
       hasActiveGrants: data.hasActiveGrants,
       activeGrants: data.activeGrants
     }
   });
   ```
3. In [`register-routes.ts`](file:///C:/dev/Involve_APP_health/invify-backend/src/modules/health-insurance/register-routes.ts), alias `/platform/grant-status` to `HealthPlatformController.getMyGrantStatus` so both route conventions resolve cleanly.

### Proposed Fix 2: Frontend API Client Alignment
In [`invify-admin/src/api/healthInsuranceApi.js`](file:///C:/dev/Involve_APP_health/invify-admin/src/api/healthInsuranceApi.js#L79):
Ensure `getMyGrantStatus` calls `/api/v1/health-insurance/platform/my-grant-status`.

### Proposed Fix 3: Resilient Data Extraction & Explicit Authorization State in UI
In [`invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue`](file:///C:/dev/Involve_APP_health/invify-admin/src/pages/admin/HealthInsuranceGovernancePage.vue):
1. Robustly extract data whether wrapped in `{ success: true, data }` or returned raw:
   ```javascript
   const extract = (res) => res?.data?.data || res?.data || {};
   overview.value = extract(ovRes.value);
   tenantsList.value = extract(tenRes.value)?.tenants || [];
   providersHealth.value = extract(provRes.value)?.providers || extract(provRes.value) || [];
   ```
2. When `grantStatus.hasActiveGrant === false`, instead of leaving tables with misleading `"No HMO Provider Registry Records Found"` labels:
   Display an explicit, clear locked card in each tab:
   > 🔒 **Operational Session Inactive**  
   > Cross-tenant telemetry and HMO provider integration status are protected under zero-trust governance. Activate an authorized operational session to view live telemetry for 3 registered providers and 87 institutions.

---

## 7. VERIFICATION TEST PLAN (ONCE APPROVED)

1. **Unit & Guard Tests:**
   Run `npm run test` in `invify-backend` to verify all 17 existing health insurance tests continue to pass without authorization regression.
2. **Endpoint Envelope Assertion:**
   Execute a read-only script validating that `/platform/my-grant-status` returns `200 OK` with `{ success: true, data: { hasActiveGrant: false } }`.
3. **Browser Verification:**
   Refresh `http://localhost:5174/admin/health-insurance`:
   - Confirm banner clearly states session status without 404 errors in browser console.
   - Confirm tabs render explicit authorization locked states rather than misleading "no records found" messages.
   - Confirm zero regression on the tenant dashboard at `/tenant/health-insurance`.

---

**Next Action:** Awaiting user review and authorization to proceed with the proposed minimal local fix.
