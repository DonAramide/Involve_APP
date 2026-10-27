# INSTITUTION ROUTING — QUASAR VALIDATION REMEDIATION REPORT (PHASE 1A.3)

**Document Reference:** `docs/architecture/INSTITUTION_ROUTING_QUASAR_VALIDATION_REMEDIATION_REPORT.md`  
**Date:** October 20, 2026  
**Status:** COMPLETE (CONTRACT RECONCILIATION & REMEDIATION COMPLETE — PHASE 1B FROZEN)  
**Author:** Principal Software Architect & Technical Lead (Invify + Quasar)  
**Baseline References:**
- **Quasar Validation Report:** `C:\dev\quasar-institution-routing\docs\architecture\INSTITUTION_ROUTING_QUASAR_CONTRACT_VALIDATION_1B1.md`
- **Quasar Feature Worktree:** `C:\dev\quasar-institution-routing` (branch `feature/institution-routing-policy`, base commit `3861828f7e4b5c803128d617dfa43acb7e029457`)
- **Invify Monorepo:** `C:\dev\Involve_APP_health` (branch `feature/health-insurance-phase1`)

---

## 1. EXECUTIVE SUMMARY

Following the independent read-only validation conducted by Quasar AI on branch `feature/institution-routing-policy`, 9 critical blockers and discrepancies were identified between the preliminary canonical routing contract and Quasar's actual production financial architecture.

In Phase 1A.3, all 9 blockers have been systematically remediated and verified in the Invify codebase:
1. **Routing split by service:** Monolithic provider resolution replaced with dedicated service-specific contracts (`resolve-checkout-route`, `resolve-transfer-rail`, `resolve-virtual-account-provider`).
2. **Provider eligibility corrected:** Quasar executable enums aligned (`paystack`, `flutterwave`, `nomba`, `connectpoint`). Stubs (`providus`, `opay`) marked non-executable. Non-existent enums (`wema`, `hygeia`) eliminated from Quasar execution vocabulary.
3. **Fabricated fallback eliminated:** `AAA000` / `PROVIDUS` platform fallback removed. Unrouted or suspended tenants receive explicit `decision: 'NO_RELATIONSHIP'` / `'NO_ELIGIBLE_PROVIDER'` with `provider: null`, and Quasar safely retains its existing legacy provider selection.
4. **Tenant identity & HMAC security hardened:** Unlabeled tenant UUID replaced with `quasarTenantId`. Mutual HMAC signature renamed to `X-Invify-Routing-Signature`, signed over `${timestamp}.${nonce}.${rawBody}` with 5-minute clock drift tolerance and nonce replay defense.
5. **Freshness & failure semantics defined:** `expiresAt` (60s TTL) added alongside `policyVersion`. Safe failure rules codified (shadow observer logs `POLICY_UNAVAILABLE` without altering execution; active enforcement fails fast on financial operations).
6. **Shadow mode observer isolated:** Dropped premature binding of `ROUTING_EVALUATION_PORT` to an Invify HTTP client; defined a passive `INSTITUTION_POLICY_OBSERVER` positioned after legacy resolution with `executionChanged: false`.
7. **Transaction stickiness enforced:** Confirmed policy resolution is never executed for pending checkout retries, existing dedicated virtual accounts, transfer replays, or ledger idempotency.

All 24 contract unit tests in `invify-backend/test/institution-routing-contract.test.ts` pass cleanly.

---

## 2. DETAILED REMEDIATION OF QUASAR VALIDATION FINDINGS (THE 9 BLOCKERS)

### Blocker 1: Monolithic Routing Contract vs Quasar's Separate Financial Surfaces
- **Quasar Finding:** Quasar does not possess a single generic provider resolver. Card checkout (`PaymentService`), bank transfers (`TransferService`), and virtual accounts (`VirtualAccountService`) are distinct domains with different schemas, providers, and lifecycles. Health insurance does not exist in Quasar. Card-present acquiring is handled by an ISO8583 switch.
- **Remediation Applied:**
  - Split `institution-routing-api.v1.json` into three dedicated service endpoints:
    - `POST /routing/resolve-checkout-route` (`serviceType: 'PAYMENTS'`, `operationType: 'CHECKOUT' | 'WEB_PAYMENT'`).
    - `POST /routing/resolve-transfer-rail` (`serviceType: 'TRANSFERS'`, `operationType: 'BANK_TRANSFER' | 'NAME_ENQUIRY'`).
    - `POST /routing/resolve-virtual-account-provider` (`serviceType: 'VIRTUAL_ACCOUNTS'`, `operationType: 'VIRTUAL_ACCOUNT_CREATION'`).
  - Response schemas explicitly echo `serviceType`, `operationType`, and `quasarTenantId`.
  - Clarified that `CARD_ACQUIRING` is governed by Quasar's POS host switch (`iso8583-switch`, `iso_tcp` / `kimono_https`) and is not routed via web checkout.
  - Formally isolated `HEALTH_INSURANCE` as an Invify-exclusive domain (`invify-backend/src/modules/health-insurance/`); no routing calls are ever directed to Quasar for HMO services.

### Blocker 2: Tenant Identity Mapping (`tenantId` vs `quasarTenantId`)
- **Quasar Finding:** Accepting an unlabeled `tenantId` UUID creates tenant spoofing risk and identity ambiguity between Invify's PostgreSQL tenant ID and Quasar's MySQL tenant ID.
- **Remediation Applied:**
  - Renamed the tenant identifier field to `quasarTenantId` across all OpenAPI schemas, test fixtures, and TypeScript interfaces.
  - Specified the authoritative identity bridge: Invify maintains the cross-system mapping in `quasar_integrations` (`invify_tenant_id` $\leftrightarrow$ `quasar_tenant_id`).
  - Quasar validates `quasarTenantId` against `req.tenantId` extracted by `ApiKeyGuard`.

### Blocker 3: Shared HMAC Authentication Protocol & Header Naming
- **Quasar Finding:** Header name `X-Quasar-Service-Signature` caused confusion with Quasar's existing `x-quasar-service-secret`. The canonical signing bytes, timestamp tolerance, and replay defense were underspecified.
- **Remediation Applied:**
  - Renamed signature header to `X-Invify-Routing-Signature`.
  - Added mandatory companion headers: `X-Signature-Timestamp` (ISO 8601 UTC string) and `X-Signature-Nonce` (unique cryptographic nonce).
  - Defined canonical signing string:
    $$\text{CanonicalMessage} = \text{X-Signature-Timestamp} + "." + \text{X-Signature-Nonce} + "." + \text{RawJsonRequestBody}$$
  - Implemented and tested HMAC-SHA256 verification with 5-minute clock drift bounds and nonce cache replay prevention in `test/institution-routing-contract.test.ts`.

### Blocker 4: Fabricated Platform Fallback (`AAA000` / `PROVIDUS`)
- **Quasar Finding:** Fabricating institution `AAA000` and assigning `PROVIDUS` when a tenant has no relationship violates Quasar execution capability (Providus throws an exception in Quasar) and silently forces an unvetted institutional relationship on autonomous tenants.
- **Remediation Applied:**
  - Completely eradicated automatic assignment of `AAA000` and `PROVIDUS` for unlinked or suspended tenants.
  - When no relationship exists: return `decision: 'NO_RELATIONSHIP'`, `provider: null`, `institutionCode: null`, `precedenceTier: 'NONE'`.
  - When relationship is suspended: return `decision: 'NO_ELIGIBLE_PROVIDER'`, `provider: null`, `institutionCode: rel.institutionCode`, `precedenceTier: 'NONE'`.
  - Reconciled contract instruction: **Quasar retains its configured legacy provider selection in these cases.** No execution changes occur.

### Blocker 5: Provider Capability Alignment & Vocabulary Correction
- **Quasar Finding:** `ProvidusFinancialProviderAdapter` and `OpayFinancialProviderAdapter` are unimplemented stubs throwing `BadRequestException('not implemented yet')`. Quasar has no `wema` enum (it uses `connectpoint`). Quasar has no `hygeia` enum.
- **Remediation Applied:**
  - Added `connectpoint` as the primary executable virtual account provider in Quasar.
  - Removed `wema` and `hygeia` from Quasar's contract enums.
  - Marked `providus` and `opay` as non-executable stubs in Quasar.
  - Updated capability matrix to categorize all providers across lifecycle states.

### Blocker 6: Policy Freshness, Expiration (`expiresAt`) & Safe Failure Semantics
- **Quasar Finding:** Lack of `expiresAt` created stale cache vulnerability. Behavior during policy service outages (HTTP 500/503, timeouts) was undefined.
- **Remediation Applied:**
  - Added `expiresAt` (strictly set to `evaluatedAt + 60s`) alongside `policyVersion` and `evaluatedAt`.
  - Established 60-second maximum cache TTL in Quasar.
  - Defined explicit failure semantics:
    - On timeout (> 500ms), 5xx, or malformed JSON, Quasar shadow observer logs `POLICY_UNAVAILABLE` and safely retains the legacy provider.
    - Transport failures and 503 errors never select or alter a provider.

### Blocker 7: Shadow Mode Semantics & Telemetry Independence
- **Quasar Finding:** Preliminary contract treated `shadowMode` as an execution toggle inside the routing engine, and used `legacyComparison.match` as Quasar's match bit.
- **Remediation Applied:**
  - Clarified that `shadowMode` is an observation mode within Quasar, not an Invify execution property.
  - Quasar's legacy provider selection is 100% authoritative during shadow mode.
  - Quasar independently evaluates and logs its own comparison outcomes: `MATCH`, `DIVERGENCE`, `POLICY_UNAVAILABLE`, or `UNROUTED`.
  - `executionChanged` is invariant `false` for every shadow transaction.

### Blocker 8: Removal of `ROUTING_EVALUATION_PORT` Premature Binding
- **Quasar Finding:** Design section 9.2 incorrectly instructed implementing the policy adapter on `ROUTING_EVALUATION_PORT` and consuming it directly from `FinancialRoutingService`.
- **Remediation Applied:**
  - Removed this instruction from `INSTITUTION_REGISTRY_ROUTING_DESIGN.md`.
  - Defined the integration point as a passive `INSTITUTION_POLICY_OBSERVER` positioned after legacy provider selection.

### Blocker 9: Partner Credential Non-Execution Rule
- **Quasar Finding:** Suggesting that partner client credentials (`tenants.partner_client_id`) grant an HMAC bypass on financial routes would undermine financial security.
- **Remediation Applied:**
  - Enforced that partner client credentials remain strictly non-executing.
  - All inter-service policy communication requires valid mutual HMAC authentication.

---

## 3. UPDATED PROVIDER CAPABILITY MATRIX

| Provider Identifier | Operational Service Surface | Quasar Adapter Path | Executability in Quasar | Invify Execution Status | Canonical Contract Status |
|---|---|---|---|---|---|
| `paystack` | Checkout (CNP) | `PaystackFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Primary / Secondary |
| `flutterwave` | Checkout (CNP) | `FlutterwaveFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Failover / Override |
| `nomba` | Bank Transfers / Name Enquiry | `NombaFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Primary Rail |
| `paystack` | Bank Transfers / Name Enquiry | `PaystackFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Secondary Rail |
| `connectpoint` | Dedicated Virtual Accounts | `ConnectPointFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Primary VA Provider |
| `paystack` | Dedicated Virtual Accounts | `PaystackFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Secondary VA Provider |
| `providus` | Virtual Accounts / Transfers | `ProvidusFinancialProviderAdapter` | **NON-EXECUTABLE (STUB)** | Direct API Executable | Non-executable in Quasar; direct in Invify only |
| `opay` | Any Financial | `OpayFinancialProviderAdapter` | **NON-EXECUTABLE (STUB)** | Not Integrated | Disabled in contract |
| `wema` | Any Financial | Non-existent Enum | **VOCABULARY ERROR** | Non-executable | Replaced with `connectpoint` |
| `hygeia` / `reliance` | Health Insurance | Non-existent Enum | **NON-EXISTENT IN QUASAR** | Active (`health-platform`) | Exclusively Invify Domain |
| `kimono` / `iso_tcp` | Card-Present Acquiring | `iso8583-switch` | **POS SWITCH DOMAIN** | POS Terminal Host | Handled by POS host switch |

---

## 4. FAILURE & FALLBACK DECISION MATRIX

| Service Surface | Event / Trigger | Precedence / Tier | Resolved Provider | Quasar Shadow Mode Action | Quasar Active Mode Action (Future) | Audit & Alert Level |
|---|---|---|---|---|---|---|
| **Any** | No relationship exists for tenant | `NONE` | `null` | Logs `UNROUTED`; executes legacy provider. | Retains configured legacy default. | Info |
| **Any** | Relationship is `SUSPENDED` or `TERMINATED` | `NONE` | `null` | Logs `INELIGIBLE`; executes legacy provider. | Retains configured legacy default. | Warning |
| **Checkout** | Policy `LOCKED`; default healthy | `INSTITUTION_LOCKED` | Institution default (`paystack`) | Records match/divergence; executes legacy. | Dispatches `paystack`. | Info |
| **Checkout** | Policy `PERMITTED`; active override | `TENANT_OVERRIDE` | Approved override (`flutterwave`) | Records match/divergence; executes legacy. | Dispatches `flutterwave`. | Info |
| **Checkout** | Primary provider circuit `OPEN`; secondary healthy | `CIRCUIT_BREAKER` | Healthy secondary (`flutterwave`) | Records failover; executes legacy. | Dispatches `flutterwave`. | Warning |
| **Checkout** | ALL allowed providers down (`CIRCUIT_OPEN` / `MAINTENANCE`) | Safe Halt | `null` (503 Service Unavailable) | Logs `ALL_PROVIDERS_UNAVAILABLE`; executes legacy. | **FAIL FAST** (Abort checkout). Zero unapproved fallback. | Critical Incident |
| **Transfers** | Policy engine timeout (> 500ms) or 5xx error | Safe Halt | `null` | Logs `POLICY_UNAVAILABLE`; executes legacy. | **FAIL FAST** (Abort transfer). Zero unapproved dispatch. | High Priority Alert |
| **Virtual Accounts** | Existing student virtual account lookup | Sticky Record | Existing `virtual_accounts.provider` | Bypasses policy; returns existing record. | Bypasses policy; returns existing record. | None (Idempotent) |

---

## 5. REMAINING DECISIONS REQUIRING HUMAN CONFIRMATION

The following three architectural decisions are surfaced for final stakeholder sign-off prior to authorizing Phase 1B implementation:

1. **Commercial Fee Schedule Storage & Synchronization:**
   - When an institution establishes custom pricing (e.g. 0.75% for tuition payments), should the commercial rules be stored directly in Invify's `institution_services.commercial_terms` and referenced by Quasar, or maintained natively in Quasar's `CommercialEngineModule` indexed by `institution_id`?
   - *Architecture Recommendation:* Store commercial terms reference ID in Invify's `institution_services` and synchronize rule definitions into Quasar's `CommercialEngineModule` during policy setup.
2. **Tenant Override Maker-Checker Enforcement:**
   - Should tenant-level overrides within an institution's `PERMITTED_FROM_LIST` require dual authorization (tenant initiator + platform admin checker), or can the tenant owner activate permitted overrides autonomously?
   - *Architecture Recommendation:* Autonomous self-service activation for providers in `PERMITTED_FROM_LIST`; out-of-list requests (`OPEN` policy) require platform admin checker approval.
3. **Shadow-Mode Observation Duration:**
   - What quantitative metric gate should govern transitioning from shadow-mode observation to active enforcement in Quasar?
   - *Architecture Recommendation:* A minimum of 14 consecutive days of shadow observation with at least 1,000 recorded comparisons across all three services, achieving 0% unexplained divergence and 99.99% policy observer availability.

---

## 6. PHASE 1A.3 COMPLETION GATE ATTESTATION

- [x] All 9 Quasar validation blockers have been addressed and reconciled.
- [x] OpenAPI contract specification updated to v1.1.0 with service-specific endpoints (`resolve-checkout-route`, `resolve-transfer-rail`, `resolve-virtual-account-provider`).
- [x] All contract fixtures updated and verified.
- [x] Contract unit test suite (`invify-backend/test/institution-routing-contract.test.ts`) updated and passing (24/24 tests passed).
- [x] Design specification updated to v1.3.0 (`INSTITUTION_REGISTRY_ROUTING_DESIGN.md`).
- [x] Quasar repository files remain untouched.
- [x] Remote database migrations remain unexecuted.
- [x] All routing and financial execution flags remain disabled.
- [x] Phase 1B implementation has NOT been started.

**Phase 1A.3 Remediation Package is complete and ready for review.**
