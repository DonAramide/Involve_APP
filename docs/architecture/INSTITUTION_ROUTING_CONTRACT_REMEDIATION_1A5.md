# INSTITUTION ROUTING — CONTRACT DEFECT REMEDIATION REPORT (PHASE 1A.5)

**Document Reference:** `docs/architecture/INSTITUTION_ROUTING_CONTRACT_REMEDIATION_1A5.md`  
**Date:** October 20, 2026  
**Status:** COMPLETE (CONTRACT DEFECT REMEDIATION & RECONCILIATION VERIFIED)  
**Verdict:** `READY FOR QUASAR REVALIDATION`  
**Author:** Principal Software Architect & Technical Lead (Invify + Quasar)  
**Baseline & Target Artifacts:**
- **Quasar Validation Report:** `C:\dev\quasar-institution-routing\docs\architecture\INSTITUTION_ROUTING_QUASAR_CONTRACT_VALIDATION_1A4.md`
- **Quasar Feature Worktree:** `C:\dev\quasar-institution-routing` (branch `feature/institution-routing-policy`, commit `3861828f7e4b5c803128d617dfa43acb7e029457`)
- **Invify Monorepo:** `C:\dev\Involve_APP_health` (branch `feature/health-insurance-phase1`, HEAD `61684e7232be5004a1ad208bcce8ea5bf9194850`)
- **Canonical Contract Version:** **`1.4.0`**

---

## 1. MANDATORY SAFEGUARDS & ENVIRONMENT COMPLIANCE

1. **Preserved Existing Changes:** All existing Invify changes across health insurance, school finance, attendance, POS, mobile Flutter, and admin dashboard remain completely untouched and intact.
2. **Quasar Repositories Untouched:** Neither `C:\dev\quasar` nor `C:\dev\quasar-institution-routing` source files, schemas, or configurations were modified in any way.
3. **No Database Executions:** No remote or local migrations were applied, rerun, or rolled back. No database connections were opened.
4. **No Execution Activation:** Real-money behavior and live routing enforcement remain strictly disabled (`ROUTING_POLICY_MODE = 'OFF'`).
5. **No Commits or Pushes:** No commits, pushes, merges, or deployments were performed.
6. **Narrow Modification Scope:** Modifications were strictly limited to the canonical OpenAPI contract (`institution-routing-api.v1.json`), canonical fixtures, design specification, and contract unit tests.

---

## 2. BLOCKER-BY-BLOCKER REMEDIATION MATRIX REFERENCING PHASE 1A.4

| Phase 1A.4 Finding / Defect | Remediation Applied in Phase 1A.5 (Canonical Contract v1.4.0) | Target Artifact & Section | Verification Status |
|---|---|---|---|
| **Defect 1: Version Label Discrepancy** (Design was 1.3.0, OpenAPI was 1.1.0) | Aligned all artifacts to **Version `1.4.0`**: OpenAPI `info.version` = 1.4.0, Design Specification Version = 1.4.0, test suite and fixtures pinned to v1.4.0. Added backward-compatibility transition rules. | `institution-routing-api.v1.json`, `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` | **Resolved & Aligned** |
| **Defect 2: Schema Nullability (`provider: null`)** (`nullable: true` invalid in strict JSON Schema; `null` missing from enum) | Updated all response schemas to JSON Schema 2020-12 / OpenAPI 3.1.0 syntax: `type: ["string", "null"]` and `enum: [..., null]`. Added `oneOf` conditional schemas: `RESOLVED` requires non-null provider and non-`NONE` tier; `NO_RELATIONSHIP`, `NO_MAPPING`, `NO_ELIGIBLE_PROVIDER` require `provider: null` and `precedenceTier: "NONE"`. | `institution-routing-api.v1.json` (`components.schemas`) | **Resolved & Tested** |
| **Defect 3: Invalid Non-UUID Tenant Identifiers** (`unlinked-tenant-uuid-0000`, `suspended-tenant-uuid-1111`) | Replaced all placeholder strings with RFC 4122 compliant UUID v4 strings: `00000000-0000-4000-8000-000000000001` and `11111111-1111-4111-8111-111111111111`. Verified against `format: uuid`. | `fixtures/resolve_provider_no_relationship.json`, `fixtures/resolve_provider_suspended_relationship.json` | **Resolved & Tested** |
| **Defect 4: Unconstrained Response `operationType`** (Response allowed any string) | Constrained response `operationType` to match request enums: `CHECKOUT\|WEB_PAYMENT` for checkout, `BANK_TRANSFER\|NAME_ENQUIRY` for transfers, `VIRTUAL_ACCOUNT_CREATION` for virtual accounts. | `institution-routing-api.v1.json` (`components.schemas`) | **Resolved & Tested** |
| **Defect 5: OpenAPI Error Schema Misplaced `$ref`** (Transfer and VA 400/401/503 responses had `$ref` on media type instead of `schema`) | Fixed OpenAPI syntax on `resolve-transfer-rail` and `resolve-virtual-account-provider` responses: wrapped all `$ref` declarations inside `schema: { "$ref": "#/components/schemas/ErrorResponse" }`. | `institution-routing-api.v1.json` (paths) | **Resolved & Validated** |
| **Defect 6: Dual Outage Shapes (`OUTAGE_FAIL_FAST` vs HTTP 503)** | Formally standardized outage behavior: REST HTTP 503 returns `ErrorResponse` (`code: "ROUTING_ALL_PROVIDERS_UNAVAILABLE"`, `details.decision: "OUTAGE_FAIL_FAST"`). Internal RPC / dry-run evaluations return 200 with `decision: "OUTAGE_FAIL_FAST"` and `provider: null`. Both shapes defined in contract. | `institution-routing-api.v1.json`, `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` §3 | **Resolved & Documented** |
| **Defect 7: In-Memory Resolver Emitting Non-Surface Providers (Providus/OPay)** | Implemented strict surface enum certification filter `SURFACE_EXECUTABLE_PROVIDERS`. Even if institution configuration or tenant override specifies an uncertified provider, the resolver rejects it and fails fast rather than emitting an illegal provider. | `invify-backend/test/institution-routing-contract.test.ts` | **Resolved & Tested** |
| **Defect 8: Capability Matrix Component Naming** (Named non-existent `ConnectPointFinancialProviderAdapter`) | Corrected Quasar baseline naming in matrix: `ConnectpointBaasService` for Wema BaaS, and `PaystackService.createDedicatedVirtualAccount` for Paystack VA. | `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` §2, this report §3 | **Resolved & Reconciled** |
| **Defect 9: Missing `NO_MAPPING` Decision** (Unknown Quasar tenant indistinguishable from no relationship) | Added `NO_MAPPING` to `RoutingDecision` enum. Corrected SQL lookup to `WHERE quasar_tenant_id = :quasarTenantId`. When `quasarTenantId` is not found in `quasar_integrations`, Invify returns `decision: 'NO_MAPPING'`, `provider: null`, and Quasar retains its legacy provider. | `institution-routing-api.v1.json`, `fixtures/resolve_provider_no_mapping.json`, test suite | **Resolved & Tested** |
| **Defect 10: Response Authenticity & Secret Key Lifecycle** (Responses unsigned; secret storage and rotation undefined) | Specified mutual HMAC response integrity: responses return `X-Invify-Routing-Signature`, signed over `${timestamp}.${nonce}.${rawResponseBody}`. Added `X-Invify-Key-Id` header to both requests and responses for zero-downtime dual-key secret rotation. Documented Vault storage, rotation overlap (48h), and immediate revocation. | `institution-routing-api.v1.json`, `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` §4, test suite | **Resolved & Tested** |
| **Defect 11: Checkout Route Semantics & Chain Comparison** (Unclear how single provider matches `ProviderRoute[]`) | Defined that `provider` is the Initial Target Route (`routes[0]`), while `allowedProviders` is the approved failover list. In shadow mode, `MATCH` evaluates `res.provider === routes[0].provider`, and failover to `routes[1]` evaluates against `allowedProviders`. Emphasized transaction stickiness: never re-evaluate on retry or webhook. | `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` §5 | **Resolved & Documented** |
| **Defect 12: Architectural Diagram Inversion** (Diagram showed Invify calling Quasar execution boxes) | Corrected architecture diagram in design §1.3: Quasar is the HTTP client invoking Invify's policy gateway (`https://api.invify.org/api/v1`). Quasar's `INSTITUTION_POLICY_OBSERVER` passively receives the signed response for telemetry. | `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` §1.3 | **Resolved & Diagrammed** |
| **Defect 13: Stale Version Rejection** (Lower policy version with future `expiresAt` accepted) | Codified stale version invalidation: if Quasar cached policy has version $V$, any response with $V' < V$ is strictly rejected as STALE even if `now < expiresAt`. | `INSTITUTION_REGISTRY_ROUTING_DESIGN.md` §5.1, test suite | **Resolved & Tested** |
| **Defect 14: Shared Rail Resolution (`NAME_ENQUIRY` vs `BANK_TRANSFER`)** | Contract unit test proves that `NAME_ENQUIRY` and `BANK_TRANSFER` for the same tenant always evaluate to the exact same payout rail (`nomba` or `paystack`). | `invify-backend/test/institution-routing-contract.test.ts` | **Resolved & Tested** |

---

## 3. UPDATED PROVIDER CAPABILITY MATRIX (RECONCILED WITH QUASAR BASELINE)

| Provider Identifier | Operational Service Surface | Quasar Baseline Implementation | Executability in Quasar | Invify Direct Status | Canonical Contract Status (v1.4.0) |
|---|---|---|---|---|---|
| `paystack` | Checkout (CNP) | `PaystackFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Primary / Secondary Route |
| `flutterwave` | Checkout (CNP) | `FlutterwaveFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Failover / Override Route |
| `nomba` | Bank Transfers / Name Enquiry | `NombaFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Primary Rail |
| `paystack` | Bank Transfers / Name Enquiry | `PaystackFinancialProviderAdapter` | **EXECUTABLE** | Supported | Approved Secondary Rail |
| `connectpoint` | Dedicated Virtual Accounts | `ConnectpointBaasService` | **EXECUTABLE** | Supported | Approved Primary VA Provider (Wema BaaS) |
| `paystack` | Dedicated Virtual Accounts | `PaystackService.createDedicatedVirtualAccount` | **EXECUTABLE** | Supported | Approved Secondary VA Provider |
| `providus` | Virtual Accounts / Transfers | `ProvidusFinancialProviderAdapter` (Stub) | **NON-EXECUTABLE (STUB)** | Direct API Executable | Throws `BadRequestException('not implemented yet')` |
| `opay` | Any Financial | `OpayFinancialProviderAdapter` (Stub) | **NON-EXECUTABLE (STUB)** | Not Integrated | Throws `BadRequestException('not implemented yet')` |
| `wema` | Any Financial | Non-existent enum | **VOCABULARY ERROR** | Non-executable | Replaced with `connectpoint` |
| `hygeia` / `reliance` | Health Insurance | Non-existent enum | **INVIFY DOMAIN** | Active (`health-platform`) | Exclusively Invify; no Quasar HMO route |
| `kimono` / `iso_tcp` | Card-Present Acquiring | `iso8583-switch` | **POS SWITCH DOMAIN** | POS Terminal Host | Handled by POS host switch |

---

## 4. TENANT DECISION RESOLUTION SPECIFICATION

```
Quasar Tenant ID received: req.quasarTenantId (UUID v4)
 │
 ├── 1. Check quasar_integrations for active mapping
 │    ├── Missing or Inactive -> RETURN decision: 'NO_MAPPING', provider: null, precedenceTier: 'NONE'
 │    │                          Quasar Action: Retain legacy provider; log NO_MAPPING
 │    └── Active mapping found -> Proceed to Step 2
 │
 ├── 2. Check tenant_institution_relationships for serviceType
 │    ├── No relationship row -> RETURN decision: 'NO_RELATIONSHIP', provider: null, precedenceTier: 'NONE'
 │    │                          Quasar Action: Retain legacy provider; log UNROUTED
 │    ├── Relationship SUSPENDED/TERMINATED -> RETURN decision: 'NO_ELIGIBLE_PROVIDER', provider: null, tier: 'NONE'
 │    │                                       Quasar Action: Retain legacy provider; log INELIGIBLE
 │    ├── Institution INACTIVE or KYC UNVERIFIED -> RETURN decision: 'NO_ELIGIBLE_PROVIDER', provider: null, tier: 'NONE'
 │    │                                            Quasar Action: Retain legacy provider; log INELIGIBLE
 │    └── Relationship ACTIVE -> Proceed to Step 3
 │
 ├── 3. Evaluate Precedence (LOCKED vs OVERRIDE vs DEFAULT)
 │    ├── Institution policy is LOCKED -> Candidate = Institution Default Provider
 │    ├── Tenant Override is ACTIVE and PERMITTED -> Candidate = Tenant Override Provider
 │    └── Default -> Candidate = Institution Default Provider
 │
 └── 4. Surface Certification & Circuit Breaker Check
      ├── Candidate not in SURFACE_EXECUTABLE_PROVIDERS -> FAIL FAST (500 Internal Configuration Error)
      ├── Candidate healthy -> RETURN decision: 'RESOLVED', provider: candidate, precedenceTier: Tier
      ├── Candidate circuit OPEN / Maintenance -> Failover to healthy certified alternate in allowedProviders
      └── ALL allowed certified providers down -> FAIL FAST (503 Service Unavailable / OUTAGE_FAIL_FAST)
```

---

## 5. BEFORE / AFTER SHA-256 HASHES & MODIFIED FILES

### 5.1 Reviewed Artifact Hashes (Phase 1A.4 Baseline vs Phase 1A.5 Remediated)

| Artifact File | Claimed Label | SHA-256 in Quasar 1A.4 Review | SHA-256 after Phase 1A.5 Remediation | Status |
|---|---|---|---|---|
| `docs/architecture/INSTITUTION_REGISTRY_ROUTING_DESIGN.md` | Version 1.4.0 | `686414f7b2f13c42c7ffad0076b4178bf6caf28e66576de4a5418aa084956393` | `dfeca46deac2db6b111fffdba4a86532e720594cd4f576701520b8539a379095` | **Updated v1.4.0** |
| `docs/architecture/contracts/institution-routing-api.v1.json` | OpenAPI 3.1.0 (v1.4.0) | `84c08655b9e0d42a6b160d7513253677f310049f36c833ed087573a5b10a020d` | `163ee7f7f5960a3411143ea169bd96c2ef5489c512a6b4781ca8b19bbcaf7ecd` | **Updated v1.4.0** |
| `invify-backend/test/institution-routing-contract.test.ts` | Test Suite v1.4.0 | `2440c2e485f0e54eaed397dd2c1cca2427257cfcbd898c4205b352afb3f0e0d6` | `1c2ffb04c137526ed284912dd5a31544195db9f2b5bc6389f5ce07871c93159c` | **Updated v1.4.0** |
| `fixtures/resolve_checkout_route_success.json` | Checkout Paystack | `dc3a4dc25d6844ebddd24cec0d565fa2ff5271900b2b950e06aec3c0cf1acc17` | `dc3a4dc25d6844ebddd24cec0d565fa2ff5271900b2b950e06aec3c0cf1acc17` | Unchanged |
| `fixtures/resolve_transfer_rail_success.json` | Transfer Nomba | `21465fb2b079b5304be2c2f5069e69b36a460bdcfca81db62e56201abbdac7a2` | `21465fb2b079b5304be2c2f5069e69b36a460bdcfca81db62e56201abbdac7a2` | Unchanged |
| `fixtures/resolve_virtual_account_provider_success.json` | VA ConnectPoint | `7d08edee33ac7f04f7b9ec057264fadfe6c13c1cc5eaf7fd6b4a11e5bc969314` | `7d08edee33ac7f04f7b9ec057264fadfe6c13c1cc5eaf7fd6b4a11e5bc969314` | Unchanged |
| `fixtures/resolve_provider_no_relationship.json` | Valid UUID v4 | `a045b12b676c99a609ef399c5c06fd3f33ebccc272747034116c61f0e5223da5` | `b0c738769748adcff25f33af5e29f3bb1295fc3c7bee463ddefd322431abcc9b` | **Updated (Valid UUID)** |
| `fixtures/resolve_provider_suspended_relationship.json` | Valid UUID v4 | `15196bb8018dc8041671ea170c5ae4cfa96209ad9b340bc50779e76af840fce1` | `78261db23551521de54f2297a10bbcc1e6c7c58ac961ba909251e42e79d113b1` | **Updated (Valid UUID)** |
| `fixtures/resolve_provider_no_relationship_platform_fallback.json` | Valid UUID v4 | `f87802428a12debc92fc8cde0eb6a1f0314242de2bde73d1884bafc958fa62a5` | `9fb620b2bc4d7b113172988ec15c37dc3d5ebbb434223edc0fff52153ce5dc98` | **Updated (Valid UUID)** |
| `fixtures/resolve_provider_institution_default.json` | Checkout Paystack | `52a7cc607e9acccc6f8ef3f5105ba2e63b1c17e6a6d310758d9fc8b9d6c1bb5f` | `52a7cc607e9acccc6f8ef3f5105ba2e63b1c17e6a6d310758d9fc8b9d6c1bb5f` | Unchanged |
| `fixtures/resolve_provider_tenant_override.json` | Checkout Flutterwave | `a319c5e5a653c00b3b9227310388118e61908173cf0cd922886cd921e769dd47` | `a319c5e5a653c00b3b9227310388118e61908173cf0cd922886cd921e769dd47` | Unchanged |
| `fixtures/resolve_provider_circuit_breaker_failover.json` | Checkout Flutterwave | `d4fd988aa58e1effcffe06d7723798130631ec90d241e9b2ee7c9cd6acf4d848` | `d4fd988aa58e1effcffe06d7723798130631ec90d241e9b2ee7c9cd6acf4d848` | Unchanged |
| `fixtures/resolve_provider_all_outage_fail_fast_error.json` | Error 503 | `c7accb9f6396b099e7ce401cbccb3e54568a49e8ca765302244665c6a9982b75` | `c7accb9f6396b099e7ce401cbccb3e54568a49e8ca765302244665c6a9982b75` | Unchanged |
| `fixtures/quasar_policy_sync_payload.json` | Telemetry | `384280ec07ce3e74e88f0ab92316d3e031d4f9c6827ee5c9e6060492910be00b` | `384280ec07ce3e74e88f0ab92316d3e031d4f9c6827ee5c9e6060492910be00b` | Unchanged |
| `fixtures/resolve_code_success.json` | Onboarding | `b613da19de42c3638665d2ba14b90a41344b96a7080287318abb0f5d444c4474` | `b613da19de42c3638665d2ba14b90a41344b96a7080287318abb0f5d444c4474` | Unchanged |
| `fixtures/resolve_code_expired_or_invalid.json` | Legacy Config Retain | `e6169de64249e6ba8daca7cc0c03f8396fd4776bba63049ca03281e6d4fccd3a` | `e6169de64249e6ba8daca7cc0c03f8396fd4776bba63049ca03281e6d4fccd3a` | Unchanged |

### 5.2 Newly Added Fixtures (Positive & Negative)

| New Fixture Path | Description / Test Intent | SHA-256 Hash |
|---|---|---|
| `fixtures/resolve_provider_no_mapping.json` | Positive: Tenant not found in `quasar_integrations` (`NO_MAPPING`) | `b7ff13251595c8ad11fba476bc2a5154bdf874afb313e42c92028bb03e106aba` |
| `fixtures/resolve_checkout_route_web_payment.json` | Positive: Checkout route for `operationType: WEB_PAYMENT` | `7d1057e52c2cacd3e954db34ee2b88ae4496d6b92e8d85c664a7d83664cfd8c1` |
| `fixtures/resolve_transfer_rail_name_enquiry.json` | Positive: Transfer rail for `operationType: NAME_ENQUIRY` | `41815c852586e860ac510710c1c89886e3939d67c40c42bf3d72136de04cf95c` |
| `fixtures/resolve_virtual_account_provider_paystack.json` | Positive: Dedicated VA route for Paystack | `0c207c70891dc06c00ccfeb822e548adb5d8021de5625160a716d199b7fbddae` |
| `fixtures/invalid_response_missing_trace_id.json` | Negative: Missing required `decisionTraceId` | `8c980142dc345af66ba23e17641741b937f1c06e3c43402e3c73516f8111a3d5` |
| `fixtures/invalid_response_provider_not_in_enum.json` | Negative: Provider `providus` returned for checkout | `93cf497464a859fd4d99a632194988c9435ac3da14a97d6e1d6ae98bbf5bf10f` |
| `fixtures/invalid_response_non_uuid_tenant.json` | Negative: Non-UUID tenant identifier string | `accc1233dad681d8e176adeb22dd5306494a8c33de5e417fb80e92deb8c574d1` |
| `fixtures/invalid_response_resolved_with_null_provider.json` | Negative: `RESOLVED` decision with `provider: null` | `c567923f43ee0c99a18a16f04e0bbdfd82cdd73a71070602e40725a0eacf02c3` |
| `fixtures/invalid_response_unrouted_with_active_provider.json` | Negative: `NO_RELATIONSHIP` decision with active provider | `cec0b57ec6531e42b06e0aea70b6d742a9aaa6bf0c30360554a6dbb0170c7946` |
| `fixtures/invalid_response_stale_policy_version.json` | Negative: Stale policy version lower than cached | `96cfa3256f206c74fd9ab1a893e7d90488280a309f198e046c28c595682e65eb` |

---

## 6. TESTS & VERIFICATION EVIDENCE

### 6.1 Contract Unit Test Results
- **Command:** `npx jest test/institution-routing-contract.test.ts`
- **Working Directory:** `C:\dev\Involve_APP_health\invify-backend`
- **Exit Code:** `0` (Success)
- **Results:** **30 Passed, 30 Total** (0 Failed)
- **Test Categories:**
  1. *OpenAPI Specification Structural & Version Integrity (3 tests)*: info.version = 1.4.0, error schema $ref structure, and mandatory `X-Invify-Key-Id`.
  2. *Strict Schema Validation of Fixtures (17 tests)*: Validated all 12 positive fixtures against OpenAPI schemas; proved rejection of all 5 negative/malformed fixtures with specific error diagnostics.
  3. *Decision Semantics (4 tests)*: Proved `NO_MAPPING` for unmapped tenant, `NO_RELATIONSHIP` for unlinked tenant, `NO_ELIGIBLE_PROVIDER` for suspended relationship and inactive institution.
  4. *Surface Enum Protection (1 test)*: Proved rejection of non-executable providers (`providus`) even under `OPEN` override policy.
  5. *Rail Parity (1 test)*: Proved identical rail resolution for `NAME_ENQUIRY` and `BANK_TRANSFER`.
  6. *Policy Freshness (1 test)*: Proved rejection of lower policy version as stale.
  7. *Mutual HMAC Response Authenticity & Secret Rotation (3 tests)*: Proved response signing, zero-downtime rotation with dual-key grace overlap, and rejection of revoked keys.

*Disclaimer: These in-memory tests prove contract schema adherence and deterministic policy logic. They are not represented as proof of Quasar financial execution.*

---

## 7. UNRESOLVED STAKEHOLDER DECISION REGISTER

The following three business and operational decisions remain open for human authorization prior to Phase 1B implementation:

1. **Commercial Fee Assignment Ownership:**
   - Store external fee rule reference ID in Invify `institution_services.commercial_terms` and synchronize with Quasar's `CommercialEngineModule`.
2. **Tenant Override Dual Authorization:**
   - Autonomous self-service for overrides within `PERMITTED_FROM_LIST`; dual maker-checker authorization required for `OPEN` out-of-list overrides.
3. **Shadow-Mode Gate Threshold:**
   - Requirement of at least 14 days and 1,000 comparisons with 0% unexplained divergence before active enforcement discussion.

---

## 8. COMPLETION GATE VERDICT

`READY FOR QUASAR REVALIDATION`

All 14 defects, schema inconsistencies, non-UUID identifiers, and semantic gaps identified in Quasar validation report 1A.4 have been fully remediated and verified in Canonical Contract Version 1.4.0. Work has stopped at this completion gate. Phase 1B remains FROZEN.
