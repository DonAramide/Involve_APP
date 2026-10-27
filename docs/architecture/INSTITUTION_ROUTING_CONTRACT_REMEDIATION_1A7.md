# INVIFY + QUASAR ARCHITECTURE CONTRACT REMEDIATION REPORT (PHASE 1A.7)
## Canonical Contract Version 1.5.0 Remediation & Verifiable Artifact Matrix

**Report Date:** October 20, 2026  
**Target Repository:** `C:\dev\Involve_APP_health`  
**Git Branch:** `feature/health-insurance-phase1`  
**Baseline Git HEAD:** `61684e7232be5004a1ad208bcce8ea5bf9194850`  
**Prior Independent Review:** Quasar Phase 1A.6 (`C:\dev\quasar-institution-routing\docs\architecture\INSTITUTION_ROUTING_QUASAR_CONTRACT_VALIDATION_1A6.md`)  
**Verdict:** **READY FOR QUASAR PHASE 1A.8 RE-VALIDATION (PHASE 1B IMPLEMENTATION REMAINS STRICTLY FROZEN)**

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

In response to Quasar AI's Phase 1A.6 contract validation audit, Invify AI conducted a root-cause remediation of all five identified defect clusters. The Canonical Routing Contract and its companion artifacts have been comprehensively reconciled and bumped to **Version 1.5.0**.

Every schema definition, SQL migration constraint, JSON fixture, and automated contract test was updated to enforce complete mutual consistency. **39 of 39 automated contract tests (100%)** execute and pass against the formal v1.5.0 specification.

---

## 2. DEFECT CLUSTER REMEDIATION SUMMARY

### 2.1 Cluster A: `allowedProviders` Array Absence & Shadow-Mode Observability
- **Identified Defect:** Quasar's shadow-mode observer evaluates failover compliance by comparing Quasar's secondary routes with the authorized failover candidates from Invify. The absence of `allowedProviders` on routing response schemas prevented deterministic `FAILOVER_MATCH` detection.
- **Root Cause:** Response payloads only surfaced the scalar primary `provider`.
- **Remediation Implemented:**
  1. Updated OpenAPI 3.1.0 specification (`docs/architecture/contracts/institution-routing-api.v1.json`):
     - Added `allowedProviders` (`type: "array"`) across `ResolveCheckoutRouteResponse`, `ResolveTransferRailResponse`, and `ResolveVirtualAccountProviderResponse`.
     - In `oneOf[0]` (`RESOLVED`): enforced `minItems: 1` with surface provider enum values.
     - In `oneOf[1]` (`NO_RELATIONSHIP`, `NO_MAPPING`, `NO_ELIGIBLE_PROVIDER`): enforced `maxItems: 0` (strictly empty array `[]`).
  2. Updated all 12 positive and negative route fixtures to include `allowedProviders`.
  3. Created negative fixture `invalid_response_missing_allowed_providers.json` to reject responses omitting the field.
  4. Added Jest test assertions validating `allowedProviders` ordering, empty array enforcement on unrouted decisions, and rejection when missing.
  5. Documented shadow observer comparison semantics in Section 5.2 of the Architecture Design Specification.

### 2.2 Cluster B: `quasar_integrations` Schema Inconsistency (`is_active` vs `status`)
- **Identified Defect:** Contract specifications assumed a boolean `is_active` column on `quasar_integrations`. In the actual Invify schema, `quasar_integrations` uses a varchar `status` column with values `'provisioned'`, `'active'`, `'suspended'`, and `'error'`.
- **Root Cause:** Discrepancy between early conceptual design notes and actual Supabase schema.
- **Remediation Implemented:**
  1. Updated `RoutingEngineContext` in `invify-backend/test/institution-routing-contract.test.ts` to reflect the authentic `quasar_integrations` schema: `status: 'provisioned' | 'active' | 'suspended' | 'error'`.
  2. Formalized decision mappings:
     - `status === 'active'`: Tenant integration verified; proceed to tenant-institution relationship resolution.
     - `status === 'provisioned'`: Returns `decision: 'NO_MAPPING'`, `reason: 'TENANT_INTEGRATION_PROVISIONING'`, `allowedProviders: []`.
     - `status === 'suspended'`: Returns `decision: 'NO_ELIGIBLE_PROVIDER'`, `reason: 'TENANT_INTEGRATION_SUSPENDED'`, `allowedProviders: []`.
     - `status === 'error'`: Returns `decision: 'NO_ELIGIBLE_PROVIDER'`, `reason: 'TENANT_INTEGRATION_ERROR'`, `allowedProviders: []`.
     - Missing row: Returns `decision: 'NO_MAPPING'`, `reason: 'TENANT_NOT_MAPPED_IN_INVIFY'`, `allowedProviders: []`.
  3. Added 4 explicit unit tests verifying all status transitions and error states.

### 2.3 Cluster C: Outage Representation Ambiguity (`OUTAGE_FAIL_FAST` vs HTTP 503)
- **Identified Defect:** `OUTAGE_FAIL_FAST` was included in the 200 OK `RoutingDecision` enum while simultaneously modeled as an HTTP 503 error response, creating ambiguity over whether an outage is a successful unrouted payload or a protocol error.
- **Root Cause:** Duplicate enum declaration during v1.3.0 consolidation.
- **Remediation Implemented:**
  1. Removed `OUTAGE_FAIL_FAST` completely from the 200 OK `RoutingDecision` enum in `institution-routing-api.v1.json`.
  2. Standardized outage handling strictly as HTTP 503 `ErrorResponse` with:
     - `code: "ROUTING_ALL_PROVIDERS_UNAVAILABLE"`
     - `message: "All candidate providers are currently offline or circuits open"`
     - `details.decision: "OUTAGE_FAIL_FAST"`
     - `details.circuitStates: { ... }`
  3. Updated fixture `resolve_provider_all_outage_fail_fast_error.json` to align with the canonical `ErrorResponse` structure.
  4. Added Jest contract tests asserting HTTP 503 generation and payload schema conformity.

### 2.4 Cluster D: Bearer Auth Bypass on Policy Endpoints
- **Identified Defect:** OpenAPI specification still listed `InvifyInternalBearerAuth` alongside `InvifyRoutingHmacAuth` under `security` for policy resolution endpoints.
- **Root Cause:** Relic of internal admin testing configuration.
- **Remediation Implemented:**
  1. Purged `InvifyInternalBearerAuth` from `/v1/routing/checkout`, `/v1/routing/transfers`, and `/v1/routing/virtual-accounts`.
  2. Inter-system routing endpoints strictly require `InvifyRoutingHmacAuth`.
  3. Explicitly specified all 4 required response HMAC headers (`X-Invify-Routing-Signature`, `X-Invify-Key-Id`, `X-Signature-Timestamp`, `X-Signature-Nonce`) as `required: true` on 200 responses.
  4. Added test asserting that no bearer auth schemes are permitted on policy endpoints.

### 2.5 Cluster E: SQL Migration Missing TRANSFERS Support
- **Identified Defect:** Database migration `20261020000000_institution_registry_and_routing_policy.sql` lacked `'TRANSFERS'` in CHECK constraints across service-related tables and omitted default seed data for transfers under the platform default institution.
- **Root Cause:** Service type was omitted during initial DDL constraint definition.
- **Remediation Implemented:**
  1. Added `'TRANSFERS'` to:
     - `institution_services` (`ck_institution_service_type`)
     - `tenant_institution_relationships` (`ck_rel_service_type`)
     - `tenant_service_routing_overrides` (`ck_override_service_type`)
     - `routing_decision_audit_logs` (`ck_audit_service_type`)
  2. Added default service seed data for `TRANSFERS` under platform default institution `AAA000`:
     - Default provider: `'NOMBA'`
     - Allowed providers: `["NOMBA", "PAYSTACK"]`
     - Override policy: `'PERMITTED_FROM_LIST'`

---

## 3. CANONICAL ARTIFACT MATRIX & SHA-256 HASH VERIFICATION

Every file below has been verified in the working tree. Hashes are computed via `Get-FileHash -Algorithm SHA256`.

| # | Artifact File Path | Version | SHA-256 Checksum |
|---|---|---|---|
| 1 | [`docs/architecture/INSTITUTION_REGISTRY_ROUTING_DESIGN.md`](file:///c:/dev/Involve_APP_health/docs/architecture/INSTITUTION_REGISTRY_ROUTING_DESIGN.md) | 1.5.0 | `e0853bdd7e0e438b478dbc65a2641752337be0dc07353bd11c386d4f4eb9e121` |
| 2 | [`docs/architecture/contracts/institution-routing-api.v1.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/institution-routing-api.v1.json) | 1.5.0 | `69f7a4545034b3b3b1fe082e27f6d723a4fd81b377f7ff2d55128057253a0691` |
| 3 | [`invify-backend/supabase/migrations/20261020000000_institution_registry_and_routing_policy.sql`](file:///c:/dev/Involve_APP_health/invify-backend/supabase/migrations/20261020000000_institution_registry_and_routing_policy.sql) | 1.5.0 | `e49a227d79e2183d247b45f199c5948f897fa402783d32c18b0a31a23c892142` |
| 4 | [`invify-backend/test/institution-routing-contract.test.ts`](file:///c:/dev/Involve_APP_health/invify-backend/test/institution-routing-contract.test.ts) | 1.5.0 | `ed8e4919fca2e8349160a3c7f4eba05656401593e1f212826290a6bfbc0723d1` |
| 5 | [`docs/architecture/contracts/fixtures/invalid_response_missing_allowed_providers.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_missing_allowed_providers.json) | 1.5.0 | `880fad194f55a3bd7833486cb6706e793884ed2460d51ad4d6c945025c1e6035` |
| 6 | [`docs/architecture/contracts/fixtures/invalid_response_missing_trace_id.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_missing_trace_id.json) | 1.5.0 | `d2462f79f8516afe105059c96e1bc76e2aa6eae57e76d21d6f5e3cc859a81e1c` |
| 7 | [`docs/architecture/contracts/fixtures/invalid_response_non_uuid_tenant.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_non_uuid_tenant.json) | 1.5.0 | `e26c0cb691b98009715d9ceafab9d731ab5ed67e5dd812e2f84bb664a1c30f7f` |
| 8 | [`docs/architecture/contracts/fixtures/invalid_response_provider_not_in_enum.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_provider_not_in_enum.json) | 1.5.0 | `1c166a4ea0186191eed306927e524fdc678c2381f2ed0e35c69cd76b0eccec21` |
| 9 | [`docs/architecture/contracts/fixtures/invalid_response_resolved_with_null_provider.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_resolved_with_null_provider.json) | 1.5.0 | `d06aabce58023be640259712539489e5bcff65302c2303ef45c65e77f0c23428` |
| 10 | [`docs/architecture/contracts/fixtures/invalid_response_stale_policy_version.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_stale_policy_version.json) | 1.5.0 | `c0f7504645b158bebd79731bb2819fcbbce5f9dd4f053bd77e190b7c0b87eaf0` |
| 11 | [`docs/architecture/contracts/fixtures/invalid_response_unrouted_with_active_provider.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/invalid_response_unrouted_with_active_provider.json) | 1.5.0 | `070061248d15a6580a28449b072eb605d2adc191b6cb13fdc4d785c2fc06436e` |
| 12 | [`docs/architecture/contracts/fixtures/quasar_policy_sync_payload.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/quasar_policy_sync_payload.json) | 1.5.0 | `384280ec07ce3e74e88f0ab92316d3e031d4f9c6827ee5c9e6060492910be00b` |
| 13 | [`docs/architecture/contracts/fixtures/resolve_checkout_route_success.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_checkout_route_success.json) | 1.5.0 | `8aaf2d51b31e6689bcde37ebda44d44dbf14a67efcccacf6f1a5b0187fc52bb7` |
| 14 | [`docs/architecture/contracts/fixtures/resolve_checkout_route_web_payment.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_checkout_route_web_payment.json) | 1.5.0 | `4495d9921220482166cb481f19f7e390c979153dfa48ad6243d31cd6ca2c3200` |
| 15 | [`docs/architecture/contracts/fixtures/resolve_code_expired_or_invalid.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_code_expired_or_invalid.json) | 1.5.0 | `e6169de64249e6ba8daca7cc0c03f8396fd4776bba63049ca03281e6d4fccd3a` |
| 16 | [`docs/architecture/contracts/fixtures/resolve_code_success.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_code_success.json) | 1.5.0 | `b613da19de42c3638665d2ba14b90a41344b96a7080287318abb0f5d444c4474` |
| 17 | [`docs/architecture/contracts/fixtures/resolve_provider_all_outage_fail_fast_error.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_all_outage_fail_fast_error.json) | 1.5.0 | `ea327f0a0c8afebc2e0b0fc1c98e8bf0f1a8ef37abdae02be01dfe3dfba83a87` |
| 18 | [`docs/architecture/contracts/fixtures/resolve_provider_circuit_breaker_failover.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_circuit_breaker_failover.json) | 1.5.0 | `eeba124fe1adf1dcc6ca76c0dcf69d49821235407bc65d7e48370b4b6ebe7d8c` |
| 19 | [`docs/architecture/contracts/fixtures/resolve_provider_institution_default.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_institution_default.json) | 1.5.0 | `c3af31d613335d66519d580fb429caed334e1d99060ee4469fe55dd08256e5d0` |
| 20 | [`docs/architecture/contracts/fixtures/resolve_provider_no_mapping.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_no_mapping.json) | 1.5.0 | `ee76acd138fde5599fb1d84fca3c2fd2d5e3fa6e6fc9987446e404ea2cbba2c7` |
| 21 | [`docs/architecture/contracts/fixtures/resolve_provider_no_relationship.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_no_relationship.json) | 1.5.0 | `b258f8f86bdc2e38b4c325eea0a02ba299a3dddd22e3ecec9f4e6a81384c6c30` |
| 22 | [`docs/architecture/contracts/fixtures/resolve_provider_no_relationship_platform_fallback.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_no_relationship_platform_fallback.json) | 1.5.0 | `14ddbd3777e6e54c3aa4b388bc4670a01d913694721b9b9f568c3d4eb0d07e92` |
| 23 | [`docs/architecture/contracts/fixtures/resolve_provider_suspended_relationship.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_suspended_relationship.json) | 1.5.0 | `6c8164f778be72d2e67005d6698c96d45b818e6d3f3bb794cfea45e7a9669993` |
| 24 | [`docs/architecture/contracts/fixtures/resolve_provider_tenant_override.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_provider_tenant_override.json) | 1.5.0 | `8dadfcbb2074527e9fd19821623d1e48b621b39554dbbda580fb80ac2eace3e6` |
| 25 | [`docs/architecture/contracts/fixtures/resolve_transfer_rail_name_enquiry.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_transfer_rail_name_enquiry.json) | 1.5.0 | `7b976c76c4126ccca7a4e3030e7abd1f54696b23c0756ffd7d11fda08d2538e5` |
| 26 | [`docs/architecture/contracts/fixtures/resolve_transfer_rail_success.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_transfer_rail_success.json) | 1.5.0 | `322f5136a0510bceff4d3c7c6bf7a7e63baf496276f731f08f8983353af119a6` |
| 27 | [`docs/architecture/contracts/fixtures/resolve_virtual_account_provider_paystack.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_virtual_account_provider_paystack.json) | 1.5.0 | `d269cc27926953a7b5249326b335ce9e64c806095777caa6104d502cb8a6f6aa` |
| 28 | [`docs/architecture/contracts/fixtures/resolve_virtual_account_provider_success.json`](file:///c:/dev/Involve_APP_health/docs/architecture/contracts/fixtures/resolve_virtual_account_provider_success.json) | 1.5.0 | `961b58fe2a46c65df5bbd60fc5b3ee051b1147dc0bef0a22801d077301317e59` |

---

## 4. AUTOMATED JEST TEST EXECUTION VERIFICATION

**Test Suite Command:**
```bash
npm test -- test/institution-routing-contract.test.ts
```

**Execution Result Summary:**
- **Status:** PASS
- **Test Suites:** 1 passed, 1 total
- **Tests:** 39 passed, 39 total (100%)
- **Snapshots:** 0 total
- **Time:** 34.966 s

### Test Breakdown by Domain

1. **OpenAPI Specification Structural & Version Integrity (5 tests)**
   - `info.version` is exactly `"1.5.0"`.
   - `InvifyRoutingHmacAuth` strictly required; no bearer bypass.
   - Response HMAC headers marked `required: true`.
   - Error schemas defined without dangling references.
   - `X-Invify-Key-Id` required on all routes.

2. **Strict OpenAPI Schema Validation of Fixtures (13 tests)**
   - All positive fixtures pass schema validation.
   - Negative fixtures properly rejected: missing trace ID, unlisted provider, non-UUID tenant ID, resolved route with null provider, unrouted response with active provider, and missing `allowedProviders`.

3. **Decision Semantics: NO_MAPPING vs NO_RELATIONSHIP vs NO_ELIGIBLE_PROVIDER (7 tests)**
   - `quasar_integrations` unmapped -> `NO_MAPPING` (`TENANT_NOT_MAPPED_IN_INVIFY`).
   - `quasar_integrations` provisioned -> `NO_MAPPING` (`TENANT_INTEGRATION_PROVISIONING`).
   - `quasar_integrations` suspended -> `NO_ELIGIBLE_PROVIDER` (`TENANT_INTEGRATION_SUSPENDED`).
   - `quasar_integrations` error -> `NO_ELIGIBLE_PROVIDER` (`TENANT_INTEGRATION_ERROR`).
   - Tenant mapped with no relationship -> `NO_RELATIONSHIP`.
   - Relationship suspended -> `NO_ELIGIBLE_PROVIDER`.
   - Institution inactive / KYC unverified -> `NO_ELIGIBLE_PROVIDER`.

4. **Strict Surface Enum Filtering (1 test)**
   - Providus strictly rejected on checkout even under open override policy.

5. **Rail Parity: NAME_ENQUIRY & BANK_TRANSFER Shared Resolution (1 test)**
   - Identical provider resolved across transfer and name enquiry for the same tenant.

6. **Policy Freshness & Stale Version Invalidation (1 test)**
   - Rejection of incoming policy responses where `policyVersion < cachedVersion`.

7. **Mutual Response Authenticity & Zero-Downtime Secret Rotation (3 tests)**
   - Response payload signing and verification with key A.
   - Seamless transition and verification with newly rotated key B during overlap window.
   - Rejection of signatures signed with revoked keys.

8. **Failover Order & Outage Fail-Fast Semantics (3 tests)**
   - Ordered population of `allowedProviders`.
   - Circuit breaker transition to secondary allowed provider.
   - HTTP 503 outage generation with `OUTAGE_FAIL_FAST` error details when all providers fail.

---

## 5. MANDATORY SAFEGUARDS & GOVERNANCE COMMITMENTS

1. **Phase 1B Implementation Freeze:** All business logic implementation, production route controllers, and dynamic provider invocation in Quasar and Invify remain strictly frozen.
2. **Zero Remote Database Alterations:** No migrations or DDL statements were executed against remote staging or production databases.
3. **Quasar Repository Isolation:** `C:\dev\quasar` and `C:\dev\quasar-institution-routing` remained untouched and read-only throughout Phase 1A.7.
4. **Clean Non-Destructive Working Tree:** All unrelated health-insurance, attendance, school-finance, and POS modifications in `C:\dev\Involve_APP_health` are preserved intact.

---

*Report prepared by Invify AI Architect. Submitted for Quasar AI Phase 1A.8 Independent Validation.*
