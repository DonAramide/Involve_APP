# Institution routing contract remediation — Phase 1A.9

**Contract candidate:** 1.6.0  
**Status:** `READY_FOR_QUASAR_REVALIDATION`

This status asks only for another independent read-only Quasar review. It does not authorize Phase 1B implementation, migration apply, or routing enforcement. Passing tests are evidence that the edited artifacts agree with each other. They are not by themselves the reason for this status.

## 1. Baseline

| Item | Value |
|---|---|
| Repository | `C:\dev\Involve_APP_health` |
| Branch | `feature/health-insurance-phase1` |
| HEAD at start and at the end | `61684e7232be5004a1ad208bcce8ea5bf9194850` |
| Previous candidate | v1.5.0 |
| Review answered | Quasar Phase 1A.8, `NOT_READY_FOR_PHASE_1B_REVIEW` |

HEAD matches the expected baseline. The v1.5.0 contract files were already untracked, so this HEAD still does not contain the contract. v1.6.0 is pinned by the hashes below.

Quasar `C:\dev\quasar` and `C:\dev\quasar-institution-routing` remained at `3861828f7e4b5c803128d617dfa43acb7e029457`. The worktree status stayed `?? docs/`. No Quasar file was edited.

### Git status

Initial status was the pre-existing health-insurance, school, and dashboard work, plus untracked `docs/architecture/`, the institution-routing migration, and `institution-routing-contract.test.ts`.

Final HEAD is unchanged. Newly or additionally modified tracked files from this remediation:

- `invify-backend/package.json` — devDependencies `ajv@8.20.0` and `ajv-formats@3.0.1`
- `invify-backend/package-lock.json` — 71 added lines for those packages

Untracked contract paths, updated in place or added:

- `docs/architecture/INSTITUTION_REGISTRY_ROUTING_DESIGN.md`
- `docs/architecture/contracts/institution-routing-api.v1.json`
- `docs/architecture/contracts/fixtures/` (four new fixtures; existing fixtures unchanged)
- `docs/architecture/INSTITUTION_ROUTING_CONTRACT_REMEDIATION_1A9.md` (this report)
- `invify-backend/supabase/migrations/20261020000000_institution_registry_and_routing_policy.sql`
- `invify-backend/test/institution-routing-contract.test.ts`

Unrelated dirty files were left as they were. No commit, push, or deploy.

## 2. Files changed for the three defects

| File | Change |
|---|---|
| Proposed migration | Platform-default provider seed rewritten to Quasar's lowercase executable tokens. Institution code `AAA000` unchanged. |
| OpenAPI `institution-routing-api.v1.json` | Version 1.6.0. Response signature headers required on policy 200, 400, 401, and 503, and on the sync acknowledgement. New `OutageFailFastError` schema. Generic `ErrorResponse` rejects the outage code. |
| Design 1.6.0 | Seed table, response-verification rules, unsigned-503 rule, and transport-failure rule. |
| Fixtures | Added missing-decision, wrong-decision, code/decision mismatch, and a non-outage error. The existing outage fixture already matched the strict schema and was not rewritten. |
| Contract tests | Ajv validates the published schemas. Tests parse the SQL seed text. Local signature helper rejects an unsigned outage body. |
| `package.json` / lockfile | Ajv added so those tests do not depend on the hand-rolled walker. |

## 3. Defect A — platform-default provider seed

Institution code `AAA000` stays uppercase. Provider identifiers in the `institution_services` seed are the lowercase tokens Quasar executes.

| Service | Default | Allowed, in order | Quasar selector |
|---|---|---|---|
| `PAYMENTS` | `paystack` | `paystack`, `flutterwave` | `RoutingService` checkout chain |
| `TRANSFERS` | `nomba` | `nomba`, `paystack` | `TransferPspResolver` |
| `VIRTUAL_ACCOUNTS` | `connectpoint` | `connectpoint`, `paystack` | `VirtualAccountService` |

Removed from this routing seed:

- `PROVIDUS`, `WEMA`, and uppercase `CONNECTPOINT` on virtual accounts
- uppercase `PAYSTACK`, `FLUTTERWAVE`, `NOMBA`
- `KIMONO` and `ISO8583` (`CARD_ACQUIRING` is card-present, not one of the three routing selectors)
- `HYGEIA`, `RELIANCE`, and `LEADWAY` (`HEALTH_INSURANCE` is not a Quasar routing selector)

`CARD_ACQUIRING` and `HEALTH_INSURANCE` remain legal service-type values in the CHECK constraints. The platform-default routing seed does not assign them providers.

The migration was not executed. Tests read the SQL file from disk and parse the seed tuples. They do not use a second in-memory copy of the seed.

## 4. Defect B — response signatures

Design section 4.2 and the OpenAPI file now agree:

- Policy routes `/routing/resolve-checkout-route`, `/routing/resolve-transfer-rail`, and `/routing/resolve-virtual-account-provider` require `X-Invify-Routing-Signature`, `X-Invify-Key-Id`, `X-Signature-Timestamp`, and `X-Signature-Nonce` on HTTP 200, 400, 401, and 503.
- `/routing/quasar-sync` 200 requires the same headers.
- `/institutions/resolve-code` stays unsigned. It is a public onboarding lookup, not a routing decision.
- The tenant override route stays on `InvifyTenantJwtAuth`. It is not the Quasar HMAC channel.

Response canonical string: `X-Signature-Timestamp + "." + X-Signature-Nonce + "." + exact raw response bytes`.

Client outcomes, specified for a future verifier:

| Condition | Result | Routing effect |
|---|---|---|
| Missing signature, key id, timestamp, or nonce | `UNSIGNED_RESPONSE` | Body discarded. An unsigned 503 is not `OUTAGE_FAIL_FAST`. |
| Signature is not 64 lowercase hex characters | `MALFORMED_RESPONSE_SIGNATURE` | Body discarded. |
| Timestamp skew greater than 300 seconds | `RESPONSE_TIMESTAMP_OUT_OF_BOUNDS` | Body discarded. |
| Unknown or revoked key id | `UNKNOWN_OR_REVOKED_RESPONSE_KEY` | Body discarded. No fallback key. |
| HMAC mismatch | `INVALID_RESPONSE_SIGNATURE` | Body discarded. |
| No HTTP response (timeout, reset, DNS, TLS) | `TRANSPORT_FAILURE` | Not an outage decision and not a provider selection. |

Quasar still has no policy client, HMAC verifier, nonce store, or key manager. Those are future implementation dependencies. The tests below exercise a helper in the Invify contract test file. They are not an HTTP integration test and they are not a Quasar verifier.

## 5. Defect C — outage schema

HTTP 503 on the three policy routes references `OutageFailFastError`:

- `code` must be `ROUTING_ALL_PROVIDERS_UNAVAILABLE`
- `details.decision` is required and must be `OUTAGE_FAIL_FAST`
- `details.safeHalt` must be `true`
- there is no dispatch `provider` field
- `details.allowedProviders` is diagnostic and limited to `paystack`, `flutterwave`, `nomba`, and `connectpoint`

`ErrorResponse` is for other signed errors. It rejects `code = ROUTING_ALL_PROVIDERS_UNAVAILABLE`, so a generic error does not have to carry `OUTAGE_FAIL_FAST`.

Ajv results:

| Fixture | `OutageFailFastError` | `ErrorResponse` |
|---|---|---|
| `resolve_provider_all_outage_fail_fast_error.json` | valid | rejected |
| `invalid_outage_missing_decision.json` | rejected | — |
| `invalid_outage_wrong_decision.json` | rejected | — |
| `invalid_outage_code_decision_mismatch.json` | rejected | — |
| `valid_non_outage_error.json` | rejected | valid |

An outage body still does not authorize a fallback provider. Shadow mode, after a verified signature, keeps the legacy provider. Active mode, after a verified signature, aborts. Enforcement remains off.

## 6. Validation that ran

Node `v24.19.0`. Jest `29.7.0`. Ajv `8.20.0`. ajv-formats `3.0.1`.

Command, from `invify-backend`:

`npx jest test/institution-routing-contract.test.ts --watchman=false --coverage=false --cacheDirectory C:\Users\HP\AppData\Local\Temp\jest-cache-1a9 --forceExit`

Exit code `0`. 51 tests passed, 1 suite, 13.928 s. Jest printed `Force exiting Jest` because of an open handle. The process still exited 0.

What those 51 tests cover:

- OpenAPI version 1.6.0, HMAC-only policy security, and required signature headers on 200, 400, 401, and 503
- Ajv validation of the published component schemas for the route fixtures, the outage schema, the generic error schema, and the negative fixtures
- SQL text parse of the platform-default seed
- In-memory decision, failover, and rail-parity helpers carried forward from v1.5.0
- Local HMAC helper on the raw outage fixture bytes: unsigned, malformed, unknown key, expired timestamp, and a matching signature

The local HMAC helper is not a Quasar HTTP client. No test claims that Quasar verified a signature.

### Not run

- The migration was not executed.
- No production or staging database was queried or modified.
- No HTTP call was made to Invify or Quasar.
- Quasar unit tests were not run.
- No routing flag was enabled.

## 7. Remaining implementation dependencies

- Quasar policy HTTP client
- Quasar HMAC verifier over raw response bytes
- Nonce store and key-id overlap / revocation store
- Shadow observer that cannot change the legacy provider
- A decision, separate from this candidate, before any enforcement

## 8. SHA-256 manifest

Hashes are SHA-256 of the raw file bytes. This report is not in the list: embedding its own digest would change the digest.

| Path | SHA-256 |
|---|---|
| `docs/architecture/INSTITUTION_REGISTRY_ROUTING_DESIGN.md` | `733bf76c63a41c169572b97d6ad7a0c6d6c37c26a0eea732465382be4c06a174` |
| `docs/architecture/contracts/institution-routing-api.v1.json` | `fd8fd9be26b38c9a0afe48bd21b3503eb41501c8e70d896586e60705a18d5c84` |
| `invify-backend/supabase/migrations/20261020000000_institution_registry_and_routing_policy.sql` | `83982bd94dc4d29d8e2ec64e9dae5e4b6fa6fa8f901716d1c3794c748df128cb` |
| `invify-backend/test/institution-routing-contract.test.ts` | `0ad7d51da9ac92715ad10315a9845c210b25fa0e783195d190e99ada5e581420` |
| `invify-backend/package.json` | `b3c81d053a9d4d2c21f1dfaafdee9d2d85a1b9548a76f8434d8b32bdd2da65a8` |
| `invify-backend/package-lock.json` | `d4123438be66c52f33a1e3dd064a09b0f653b9ab1dc51acc40c28ef956f48379` |
| `fixtures/invalid_outage_code_decision_mismatch.json` | `e616a74d56f96fe5bb83fc45eb893bb8ef8d97653c14bc61d83b125857065db7` |
| `fixtures/invalid_outage_missing_decision.json` | `fecdd8a3c61b0d66d049fb8053c129117a40bf2eb0d3ee0b81af9e569963f5af` |
| `fixtures/invalid_outage_wrong_decision.json` | `43071e4160fe2830fdeba23142fe460114e473ecdc378936d88404d1909cd94c` |
| `fixtures/invalid_response_missing_allowed_providers.json` | `880fad194f55a3bd7833486cb6706e793884ed2460d51ad4d6c945025c1e6035` |
| `fixtures/invalid_response_missing_trace_id.json` | `d2462f79f8516afe105059c96e1bc76e2aa6eae57e76d21d6f5e3cc859a81e1c` |
| `fixtures/invalid_response_non_uuid_tenant.json` | `e26c0cb691b98009715d9ceafab9d731ab5ed67e5dd812e2f84bb664a1c30f7f` |
| `fixtures/invalid_response_provider_not_in_enum.json` | `1c166a4ea0186191eed306927e524fdc678c2381f2ed0e35c69cd76b0eccec21` |
| `fixtures/invalid_response_resolved_with_null_provider.json` | `d06aabce58023be640259712539489e5bcff65302c2303ef45c65e77f0c23428` |
| `fixtures/invalid_response_stale_policy_version.json` | `c0f7504645b158bebd79731bb2819fcbbce5f9dd4f053bd77e190b7c0b87eaf0` |
| `fixtures/invalid_response_unrouted_with_active_provider.json` | `070061248d15a6580a28449b072eb605d2adc191b6cb13fdc4d785c2fc06436e` |
| `fixtures/quasar_policy_sync_payload.json` | `384280ec07ce3e74e88f0ab92316d3e031d4f9c6827ee5c9e6060492910be00b` |
| `fixtures/resolve_checkout_route_success.json` | `8aaf2d51b31e6689bcde37ebda44d44dbf14a67efcccacf6f1a5b0187fc52bb7` |
| `fixtures/resolve_checkout_route_web_payment.json` | `4495d9921220482166cb481f19f7e390c979153dfa48ad6243d31cd6ca2c3200` |
| `fixtures/resolve_code_expired_or_invalid.json` | `e6169de64249e6ba8daca7cc0c03f8396fd4776bba63049ca03281e6d4fccd3a` |
| `fixtures/resolve_code_success.json` | `b613da19de42c3638665d2ba14b90a41344b96a7080287318abb0f5d444c4474` |
| `fixtures/resolve_provider_all_outage_fail_fast_error.json` | `ea327f0a0c8afebc2e0b0fc1c98e8bf0f1a8ef37abdae02be01dfe3dfba83a87` |
| `fixtures/resolve_provider_circuit_breaker_failover.json` | `eeba124fe1adf1dcc6ca76c0dcf69d49821235407bc65d7e48370b4b6ebe7d8c` |
| `fixtures/resolve_provider_institution_default.json` | `c3af31d613335d66519d580fb429caed334e1d99060ee4469fe55dd08256e5d0` |
| `fixtures/resolve_provider_no_mapping.json` | `ee76acd138fde5599fb1d84fca3c2fd2d5e3fa6e6fc9987446e404ea2cbba2c7` |
| `fixtures/resolve_provider_no_relationship.json` | `b258f8f86bdc2e38b4c325eea0a02ba299a3dddd22e3ecec9f4e6a81384c6c30` |
| `fixtures/resolve_provider_no_relationship_platform_fallback.json` | `14ddbd3777e6e54c3aa4b388bc4670a01d913694721b9b9f568c3d4eb0d07e92` |
| `fixtures/resolve_provider_suspended_relationship.json` | `6c8164f778be72d2e67005d6698c96d45b818e6d3f3bb794cfea45e7a9669993` |
| `fixtures/resolve_provider_tenant_override.json` | `8dadfcbb2074527e9fd19821623d1e48b621b39554dbbda580fb80ac2eace3e6` |
| `fixtures/resolve_transfer_rail_name_enquiry.json` | `7b976c76c4126ccca7a4e3030e7abd1f54696b23c0756ffd7d11fda08d2538e5` |
| `fixtures/resolve_transfer_rail_success.json` | `322f5136a0510bceff4d3c7c6bf7a7e63baf496276f731f08f8983353af119a6` |
| `fixtures/resolve_virtual_account_provider_paystack.json` | `d269cc27926953a7b5249326b335ce9e64c806095777caa6104d502cb8a6f6aa` |
| `fixtures/resolve_virtual_account_provider_success.json` | `961b58fe2a46c65df5bbd60fc5b3ee051b1147dc0bef0a22801d077301317e59` |
| `fixtures/valid_non_outage_error.json` | `1829744181d45cd6ff03805b9619d6e4bcce1d81a3472ec8ceb59a1c336fc3eb` |

Fixture paths are under `docs/architecture/contracts/fixtures/`.

## 9. Safety confirmation

No database was queried or modified. The migration was not executed. No Quasar file, credential, ledger record, feature flag, or runtime route was changed. No commit or deployment occurred.

## 10. Status

`READY_FOR_QUASAR_REVALIDATION`

Phase 1B remains frozen.
