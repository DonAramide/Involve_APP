# INVIFY + QUASAR ARCHITECTURE AUDIT: INSTITUTION REGISTRY & PROVIDER ROUTING POLICY

**Document Version:** 1.0.0  
**Audit Date:** October 19, 2026  
**Auditor:** Principal Software Architect, Senior Backend Engineer, Security Engineer & Migration Engineer  
**Status:** PHASE 0 COMPLETED — READ-ONLY BASELINE AUDIT & DISCOVERY

---

## 1. REPOSITORY IDENTIFICATION & WORKTREE BASELINE

An exhaustive inspection of the multi-repository ecosystem was executed to verify branch integrity, commit history, dirty worktrees, and code ownership.

### 1.1 Invify Platform Repository
- **Path:** `C:\dev\Involve_APP_health`
- **Active Branch:** `feature/health-insurance-phase1`
- **Remote:** `https://github.com/DonAramide/Involve_APP.git`
- **Subsystem Components:**
  - `lib/`: Flutter Mobile / Tablet Client (School Mode, Health & Wellness, Pos Activation, Device Onboarding).
  - `invify-backend/`: Express / TypeScript backend powering REST APIs, Supabase PostgreSQL data persistence, Supabase Auth, Maker-Checker guards, and integrations.
  - `invify-admin/`: Vue 3 / Vite enterprise governance dashboard for platform admins and institutional operators.
- **Worktree State:** Preserved. Uncommitted modifications exist from recent School Mode Health & Wellness features (Phase 1 acceptance audit, financial governance, mobile bulk enrolment, attendance, and guardian endpoints). All existing modifications are strictly preserved and untouched.

### 1.2 Quasar Financial Engine Repository
- **Path:** `C:\dev\quasar`
- **Active Branch:** `release/production-ga`
- **Remote:** `https://github.com/DonAramide/quaser.git`
- **Subsystem Components:**
  - `iips-pay/`: NestJS / TypeORM core financial switch, ledger, dual-write engine, virtual account orchestration, payment gateway routing, and ISO8583 card switch.
  - `iips-admin/`: Next.js 14 / TypeScript platform admin panel for treasury, service verticals, provider credentials, and audit logs.
- **Worktree State:** Preserved. Uncommitted modifications exist in ISO8583 switch logs, payout auto-processing, and transfer approval policies. All existing work is preserved.

### 1.3 Documentation and Partner Assets
- **Path:** `C:\dev\invify`
- **Assets:** Accelerex PTSP/PTSA agreements, Hydrogen partnership proposal, FCMB / Access Bank integration documentation, and IIPS regulatory agreements.

---

## 2. ARCHITECTURE & COMPONENT OWNERSHIP MATRIX

The Invify + Quasar ecosystem operates as a dual-engine architecture with clear domain boundaries:

```
+--------------------------------------------------------------------------------------------------+
|                                    INVIFY APP & GOVERNANCE                                       |
|                                                                                                  |
|   +-----------------------+     +------------------------+     +-----------------------------+   |
|   | Flutter App (lib/)    |     | Invify Admin (Vue 3)   |     | Invify Backend (Node/TS)    |   |
|   | - Tablet Onboarding   |     | - Tenant Governance    |     | - Public Onboarding APIs    |   |
|   | - School Mode         |     | - Health Insurance Gov |     | - Master Institution Reg    |   |
|   | - Retail / Attendance |     | - Maker-Checker Audits |     | - Business Mode Scopes      |   |
|   +-----------+-----------+     +-----------+------------+     +--------------+--------------+   |
+---------------|-----------------------------|---------------------------------|------------------+
                |                             |                                 |
                +----------------------+------+---------------------------------+
                                       |
                     REST / HTTP / HMAC Auth Bridge
                                       |
+--------------------------------------v-----------------------------------------------------------+
|                                  QUASAR FINANCIAL ENGINE                                         |
|                                                                                                  |
|   +------------------------------------+     +-----------------------------------------------+   |
|   | Quasar Core Switch (iips-pay)      |     | Quasar Admin (iips-admin)                     |   |
|   | - Virtual Account Orchestration    |     | - Treasury & Settlement Monitoring            |   |
|   | - Payout & Transfer Rail Dispatch  |     | - Provider Health & Observability             |   |
|   | - Double-Entry Ledger (QFE)        |     | - Service Vertical Configuration              |   |
|   | - ISO8583 Terminal Switch          |     | - Merchant Credential Management              |   |
|   +------------------------------------+     +-----------------------------------------------+   |
+--------------------------------------------------------------------------------------------------+
```

### Component Responsibility Table

| Domain / Responsibility | Invify Domain Owner | Quasar Domain Owner | Architectural Boundary Contract |
|---|---|---|---|
| **Institution Registry (Master)** | `invify-backend/src/modules/institution/` (Proposed) | Consumes institution metadata / routing instructions | Invify owns legal identity, KYC accreditation, approved service profiles. |
| **Tenant Onboarding & Code Entry** | `lib/.../device_onboarding_page.dart` + `invify-backend/src/controllers/onboarding.controller.ts` | Provisioned downstream via `QuasarProvisioningService` | Invify resolves institutional code, establishes tenant-institution relation, informs Quasar of vertical & tenant code. |
| **Business Modes (School, Retail, Health)** | Invify Backend & Mobile App | Quasar `service_verticals` (`invify_school`, `invify_retail`, `invify_services`) | Tenant business mode defines operational workflows in Invify; Quasar verticals define ledger & compliance rules. |
| **Virtual Account Creation** | Initiated by Invify (fee collection, tuition, retail wallet) | `iips-pay/src/modules/virtual-account/` & `financial-virtual-account/` | Quasar executes BaaS adapter calls (ConnectPoint, Providus, Wema, Paystack) and assigns dedicated account numbers. |
| **Card Acquiring / POS Switching** | Invify terminal firmware / Dotroid / MDM | `iips-pay/src/modules/iso8583-switch/` & `dotroid-guard/` | Quasar handles ISO8583 packing/unpacking, key exchange, and Kimono/Interswitch/PTSP host communication. |
| **Provider Routing Policy Engine** | Invify Routing Engine (Policy Master) | Quasar `RoutingEvaluationPort` / `RoutingService` (Execution Rail) | Policy engine resolves authoritative provider based on institution defaults and tenant overrides; Quasar executes dispatch. |
| **Health Insurance Plan Governance** | `invify-backend/src/modules/health-insurance/` | Quasar Ledger (premium collection posting) | HMO plan catalogue, enrolment, and insurer activation reside exclusively in Invify; financial flows settle via Quasar ledger. |

---

## 3. CURRENT ONBOARDING FLOW & CODE HANDLING AUDIT

### 3.1 Mobile / Tablet Client Flow
- In `lib/features/activation/presentation/pages/device_onboarding_page.dart`:
  - The UI presents an `Institute Code` input field (line 1310), bound to `_agentCodeController`.
  - Helper text indicates: `"Required. Leave blank to choose Invify default AAA000."`.
  - Asynchronous check calls `GET /auth/check-agent-code?code=...` or `POST /api/auth/check-agent-code`.
  - The code is normalized (`uppercase`, trimmed) and serialized in the payload as `agentCode`.

### 3.2 Backend Code Handling (`invify-backend`)
- In `invify-backend/src/utils/agent-code.ts`:
  - Validates format: `/^[A-Z0-9-]{3,20}$/`.
  - `AAA000` is hardcoded as `INVIFY_DEFAULT_AGENT_CODE`.
  - Checks against the `agents` table (`SELECT id, agent_code, first_name, last_name, status FROM agents`).
  - If the `agents` table is missing, it falls back to a mock default lookup.
- In `invify-backend/src/controllers/onboarding.controller.ts`:
  - `checkAgentCode` returns `{ valid, exists, isDefault, code, agentName, status }`.
  - When creating a tenant (`tenants` table insert), the backend records `tenants.agent_code`.
  - Calls `ReferralService.trackSignup(tenant.id, email, referralCode)` if referral is present.
  - Asynchronously dispatches `QuasarProvisioningService.provisionMerchant({ invifyTenantId, tenantName, tenantType })`.

### 3.3 The Core Architectural Flaw in Current Code Handling
1. **Agent Overloading:** The current system overloads the sales `agents` table (originally designed for individual field sales agents) to represent "Institutions".
2. **Missing Institution Registry:** There is no dedicated `institutions` entity capturing:
   - Institutional corporate registration, regulatory licensing (CBN, NHIA, SEC).
   - Institution type (`BANK`, `HMO`, `PAYMENT_PROVIDER`, `AGGREGATOR`).
   - Allowed services (`PAYMENT_PROCESSING`, `VIRTUAL_ACCOUNTS`, `HEALTH_INSURANCE`, `CARD_ACQUIRING`).
   - Approved default providers per service.
   - Tenant override policies (`LOCKED`, `PERMITTED_FROM_LIST`, `OPEN`).
3. **Single Association Limitation:** A tenant currently only has a single `tenants.agent_code` string and a 1:1 link in `agent_tenants`. This directly violates **Approved Decision B** (a tenant must be able to link to Bank A for payments, Bank B for virtual accounts, and HMO C for health insurance).
4. **Security Classification:** The current `agent_code` is treated as a tracking string rather than an authoritative institutional relation key that governs downstream financial provider routing.

---

## 4. CURRENT ROUTING ARCHITECTURE AUDIT

### 4.1 Invify Backend Routing (`RoutingEngineService` & `BankingGatewayService`)
- File: `invify-backend/src/services/routing-engine.service.ts`:
  - Queries global tables: `provider_capabilities`, `provider_health_registry`, `provider_clearing_profiles`, `provider_balance_snapshots`, and `provider_daily_limits`.
  - Calculates a heuristic score: `(healthScore * 0.50) + (latencyWeight * 0.30) + (costWeight * 0.20)`.
  - **Critical Flaw:** `RoutingEngineService.selectOptimalProvider` takes `params: { requiredCapability, amount, preferredProvider, excludeProviders }`. It **does not accept `tenantId`**.
- File: `invify-backend/src/services/banking-gateway.service.ts`:
  - Line 38: In `provisionVirtualAccount(params: { tenantId, ... })`, it calls:
    ```typescript
    const provider = await RoutingEngineService.selectOptimalProvider({
      requiredCapability: 'supports_virtual_accounts',
      amount: 0
    });
    ```
  - The `tenantId` is completely discarded during provider selection! The system routes all tenants through whatever provider has the highest global capability score, completely bypassing any institution default or tenant configuration.

### 4.2 Quasar Core Routing Architecture (`iips-pay`)
- **Payment Routing (`RoutingService` in `src/modules/payment/routing.service.ts`):**
  - Implements `RoutingEvaluationPort.evaluateChain(input: RoutingEvaluationInput): Promise<RoutingEvaluationOutput>`.
  - Looks up `TenantAdminProviderCredential` rows for `tenantId` where `isActive = true`.
  - Sorts by `priority` (1 = highest), then applies a static tie-break (`paystack` -> `flutterwave`).
  - If no credentials exist for the tenant, it falls back to environment defaults.
- **Virtual Account Routing (`VirtualAccountService` in `src/modules/virtual-account/virtual-account.service.ts`):**
  - Lines 194-208: Reads `platformConfig.get('payments.virtual_account_provider')`.
  - Checks if `connectpoint` or `paystack` is enabled and configured for that tenant.
  - Uses static platform config fallback.
- **Transfer / Payout Rail Resolution (`TransferPspResolver` in `src/modules/transfer/transfer-psp.resolver.ts`):**
  - Checks `payments.transfer_psp` in `platformConfig`.
  - Checks transfer metadata overrides (`transferProvider` or `psp`).
  - Checks if tenant has active Nomba vs Paystack credentials.
- **Provider Registry (`FinancialProviderResolutionService` in `src/modules/financial-provider/`):**
  - Enforces `tenant_provider_accounts.status === 'ACTIVE'`.
  - Does not know about institutions, institutional defaults, or policy inheritance.

### 4.3 Summary of Routing Divergence
| Dimension | Invify Routing | Quasar Routing | Target Unified Precedence |
|---|---|---|---|
| **Virtual Accounts** | Global capability score (Providus/Wema) | `payments.virtual_account_provider` config | 1. Circuit Breaker -> 2. Inst. Locked -> 3. Tenant Override -> 4. Inst. Default -> 5. Platform Default |
| **Card Payments** | Unused / direct | `TenantAdminProviderCredential.priority` | 1. Circuit Breaker -> 2. Inst. Locked -> 3. Tenant Override -> 4. Inst. Default -> 5. Platform Default |
| **Bank Transfers** | Global clearing profile limits | `TransferPspResolver` (Nomba vs Paystack) | 1. Circuit Breaker -> 2. Inst. Locked -> 3. Tenant Override -> 4. Inst. Default -> 5. Platform Default |
| **Health Insurance** | Direct HMO plan provider mapping | None (Invify exclusive) | Institution HMO default -> Plan carrier assignment |

---

## 5. AUTHORIZATION, TENANT ISOLATION & SECURITY POSTURE

1. **Institutional Code as an Identifier, Not a Secret (Decision A):**
   - The institutional code (e.g., `ACC001`, `PROV01`, `HYG002`) identifies an institution in the public registry.
   - It is entered by users during onboarding or displayed on marketing materials.
   - **Audit Check:** Under no circumstances may an institutional code grant administrative permissions, bypass KYC, or decrypt provider API secrets.
2. **Multi-Tenancy & Row-Level Security (RLS):**
   - Invify Supabase uses PostgreSQL RLS with `tenant_id` claims in JWTs.
   - The new institution tables must support:
     - Platform Super-Admins: Full read/write across all institutions and policies.
     - Institutional Admins: Read/write scoped only to their own institution and linked tenant relationships.
     - Tenant Admins: Read-only access to their own assigned institution service profiles and permitted overrides.
     - Public Onboarding: Pre-authenticated read access to safe metadata (`institution_code`, `legal_name`, `logo_url`, `allowed_business_modes`).
3. **Maker-Checker & Immutability:**
   - Any creation of an institution, change of institutional status (e.g., `ACTIVE` -> `SUSPENDED`), or modification of an institution default provider MUST go through maker-checker authorization.
   - Existing maker-checker models in `invify-backend` (`TenantInstitutePortService.propose / approve`) provide an established pattern.

---

## 6. REUSABLE COMPONENTS, TABLES, AND MIGRATIONS

### 6.1 Reusable Invify Components
1. `TenantInstitutePortService` (`invify-backend/src/services/tenant-institute-port.service.ts`):
   - Proven proposal/approval/rejection maker-checker workflow.
   - Reusable for tenant-institution porting and relationship lifecycle changes.
2. `IntegrationVaultService` (`invify-backend/src/services/integration-vault.service.ts`):
   - Reusable for encrypting and managing institution-level and tenant-level provider secrets.
3. `QuasarProvisioningService` (`invify-backend/src/integrations/quasar/quasar-provisioning.service.ts`):
   - Handles tenant creation, vertical mapping, and API key provisioning in Quasar.

### 6.2 Reusable Quasar Components
1. `RoutingEvaluationPort` (`iips-pay/src/modules/financial-routing-intelligence/ports/routing-evaluation.port.ts`):
   - Standard interface for evaluating routing chains (`evaluateChain(input): Promise<RoutingEvaluationOutput>`).
2. `FinancialProviderRegistryService` & `FinancialProviderResolutionService`:
   - Enforces provider route authorization via `tenant_provider_accounts`.
3. `FinancialRoutingEventService` (`iips-pay/src/modules/financial-routing-intelligence/`):
   - Audits every routing evaluation with `decisionTraceId` and event logs.
4. `ServiceVertical` & `ServiceConfiguration`:
   - Reusable entity structure for storing vertical-scoped and institution-scoped JSON configurations.

---

## 7. GAPS, RISKS, AND FAILURE MODE ANALYSIS

| Risk / Gap ID | Severity | Description | Mitigation Strategy |
|---|---|---|---|
| **GAP-01: Agent Overloading** | HIGH | `agents` table is overloaded as institutions, causing schema confusion between sales reps and corporate banks/HMOs. | Create dedicated, clean `institutions` and `institution_services` tables. Provide an idempotent migration bridge that treats legacy `agents` as sales reps while creating default institutional entities. |
| **GAP-02: 1:1 Relationship Limitation** | HIGH | `tenants.agent_code` limits each tenant to exactly one institution. Violates Decision B. | Introduce `tenant_institution_relationships` with composite uniqueness on `(tenant_id, service_type)`. Retain `tenants.agent_code` for backward-compatible onboarding attribution. |
| **GAP-03: Provider Bypass in Invify** | CRITICAL | `RoutingEngineService` ignores `tenantId` and selects providers solely by global heuristics. | Implement `TenantRoutingPolicyResolver` that evaluates the 5-tier precedence hierarchy before falling back to capability scoring. |
| **GAP-04: Dual-System Desynchronization** | HIGH | Quasar and Invify maintain separate ideas of which provider is active for a tenant. | Invify acts as Policy Master; on relationship or override approval, Invify updates Quasar's `tenant_provider_accounts` or passes explicit routing metadata on execution requests. |
| **GAP-05: Cold Start / Invalid Code Onboarding** | MEDIUM | Mobile app crashes or fails onboarding if an entered institutional code is typoed or invalid. | Implement strict pre-validation API `GET /api/v1/institutions/resolve-code?code=...` with actionable error messages and graceful fallback to `INVIFY_DEFAULT` on user selection. |
| **GAP-06: Routing Disruption on Existing Tenants** | CRITICAL | Altering provider selection could break live settlements, webhook matching, or virtual accounts for existing merchants. | Shadow-mode execution resolver: compare new policy decisions against legacy routing in audit logs before live enforcement. |

---

## 8. PROPOSED FILE MODIFICATIONS & ADDITIVE SCHEMA ARTIFACTS

To ensure 100% backward compatibility and zero disruption, all changes will be purely additive.

### 8.1 Invify Backend Files to Add / Modify
- **New Schema Migration:**
  - `invify-backend/supabase/migrations/20261020000000_institution_registry_and_routing_policy.sql`
    - Tables: `institutions`, `institution_services`, `tenant_institution_relationships`, `tenant_service_routing_overrides`, `routing_decision_audit_logs`.
- **New Module:** `invify-backend/src/modules/institution-registry/`
  - `entities/institution.types.ts`: TypeScript contracts for institutions, service types, override policies.
  - `services/institution-registry.service.ts`: Registry management, code resolution, status lifecycle.
  - `services/tenant-institution-relationship.service.ts`: Multi-institution linking per service.
  - `services/tenant-routing-policy-resolver.service.ts`: 5-tier precedence routing engine with shadow comparison.
  - `controllers/institution.controller.ts`: Public resolution API, administrative CRUD, maker-checker operations.
- **Modifications to Existing Services:**
  - `invify-backend/src/services/banking-gateway.service.ts`: Pass `tenantId` to the resolver.
  - `invify-backend/src/controllers/onboarding.controller.ts`: Enhance `checkAgentCode` and `provision` to link tenant to institution services while maintaining backward compatibility with `agent_code`.

### 8.2 Quasar Payment Engine Files to Add / Modify
- **New Migration:**
  - `iips-pay/src/database/migrations/1762400000000-InstitutionRoutingIntegration.ts`
    - Add `institution_id` (nullable uuid) and `institution_code` (nullable varchar) to `tenants` and `tenant_provider_accounts`.
- **Module Enhancement:**
  - `iips-pay/src/modules/financial-routing-intelligence/`:
    - Bind `ROUTING_EVALUATION_PORT` to a policy-aware resolver that respects institution default accounts when present.

### 8.3 Flutter Mobile App Verification
- `lib/features/activation/presentation/pages/device_onboarding_page.dart`:
  - Continues sending `agentCode` in onboarding; backend will resolve it seamlessly against both the new `institutions` registry and legacy `agents` fallback.

---

## 9. ITEMS REQUIRING USER APPROVAL BEFORE PHASE 1 IMPLEMENTATION

Before any schema migration or code modification is executed in Phase 1, the following items are formally submitted for review and approval:

1. **Schema Design Approval:** Approval of the additive table schemas (`institutions`, `institution_services`, `tenant_institution_relationships`, `tenant_service_routing_overrides`).
2. **Default Platform Institution Seed Data:** Confirmation of seed parameters for the default platform institution (`INVIFY_DEFAULT` / `AAA000` — Type: `AGGREGATOR`, Default Payments: `PAYSTACK`, Default VA: `PROVIDUS`, Default Payouts: `NOMBA`).
3. **Rollout Strategy:** Confirmation of the two-stage rollout:
   - *Stage 1:* Shadow Mode (`ROUTING_POLICY_MODE=SHADOW`): Log all policy decisions and compare against legacy routing without changing execution rails.
   - *Stage 2:* Enforced Mode (`ROUTING_POLICY_MODE=ENFORCED`): Switch execution rails to the authoritative policy engine after audit verification.
4. **Preservation of Working Tree:** Acknowledgment that existing uncommitted changes in both `Involve_APP_health` and `quasar` will remain untouched.

---

*Phase 0 Baseline Audit Complete. Proceeding to create Target Architecture Design (`INSTITUTION_REGISTRY_ROUTING_DESIGN.md`).*
