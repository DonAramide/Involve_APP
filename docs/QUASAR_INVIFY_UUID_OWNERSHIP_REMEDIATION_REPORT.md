# QUASAR–Invify UUID Ownership Remediation Report

**Phase:** 2B — Invify implementation  
**Date:** 2026-10-31  
**Design:** `QUASAR_INVIFY_UUID_OWNERSHIP_REMEDIATION_DESIGN.md`  
**Branch:** `feature/va-institution-provider-routing`  
**QUASAR:** unchanged at `de4c33aa8287d38b98938cee2feedbbd0e2c7c8c`

---

## 1. Pre-code gate evidence

### Tenant → Quasar mapping (Verified in source)

- `quasar_integrations` stores `invify_tenant_id` and `quasar_tenant_id` separately (`quasar-integration.store.ts`).
- Quasar API keys authenticate as `quasar_tenant_id` (`quasar.service.ts` comment; `quasarContextTenantId` for transfers).
- Wallet owner IDs on VA create are **not** required to equal `quasar_tenant_id`. They are UUIDs scoped under the API-key tenant.
- Working school paths already send Invify `tenantId` as Quasar `merchantWalletOwnerId` (`student.controller.ts`, `customer.controller.ts`).

**Conclusion:** The Invify tenant UUID is the intended VA counterparty / school-wallet owner id for these flows. Staging row equality of invify vs quasar tenant ids was **not verified** (no DB access); not required for wallet-owner correctness given the working convention.

### API key selection (Verified; changes applied)

| Operation | Before | Correct key | After |
|---|---|---|---|
| Staff VA | `getQuasarService(tenantId)` | Tenant-scoped factory | Unchanged |
| Admin tenant operating VA | `getQuasarService(id, { tenantIntegrationOnly: true })` | Tenant integration only | Unchanged |
| Admin student offline/Supabase | `resolvePlatformApiKey` → env/vault `quasar` | `getQuasarService(tenantId)` (prefers `quasar_integrations`, then vault tenant secret, then env) | **Changed** |
| Admin customer offline/Supabase | same platform helper | same | **Changed** |
| Lead convert | `resolvePlatformApiKey` | `getQuasarService(tenant.id)` (new tenants may lack integration → factory fallback) | **Changed** |

`resolvePlatformApiKey` preferred `QUASAR_API_KEY` env over the tenant’s integration row — risk of creating wallets under the wrong Quasar tenant while passing the school’s UUID as owner ids. Removed unused helpers from admin/lead after the switch.

---

## 2. Files changed

- `invify-backend/src/integrations/quasar/va-institution-code.ts` — added `resolveVaCounterpartyOwnerId`
- `invify-backend/src/controllers/customer.controller.ts` — staff VA
- `invify-backend/src/controllers/admin.controller.ts` — five admin VA paths + key selection
- `invify-backend/src/modules/agent-portal/controllers/lead.controller.ts` — lead VA + key selection
- `invify-backend/test/va-institution-code.test.ts` — helper + call-site tests
- `docs/QUASAR_INVIFY_UUID_OWNERSHIP_REMEDIATION_REPORT.md` — this report

QUASAR: **not modified**.

---

## 3. Before / after ownership mapping

| # | Path | childId (unchanged) | parentId before | parentId after | share |
|---|---|---|---|---|---|
| 1 | Staff | `userId` | `platform-admin-owner-id` | `resolveVaCounterpartyOwnerId(tenantId)` | 0 |
| 2 | Admin tenant operating | `tenant.id` | sentinel | `resolveVaCounterpartyOwnerId(tenant.id)` | 0 |
| 3 | Admin student offline | `studentId` | sentinel | `resolveVaCounterpartyOwnerId(id)` | 0 |
| 4 | Admin student Supabase | `studentId` | sentinel | `resolveVaCounterpartyOwnerId(id)` | 0 |
| 5 | Admin customer offline | `customerId` | sentinel | `resolveVaCounterpartyOwnerId(id)` | 0 |
| 6 | Admin customer Supabase | `customerId` | sentinel | `resolveVaCounterpartyOwnerId(id)` | 0 |
| 7 | Lead convert | `tenant.id` | sentinel | `resolveVaCounterpartyOwnerId(tenant.id)` | 0 |

Institution codes, metadata types, idempotency keys, and `par-*` rules unchanged. Student/customer happy paths still use `parentId: tenantId` directly.

---

## 4. Helper behaviour

`resolveVaCounterpartyOwnerId(tenantId)`:

- Requires non-empty string
- Rejects sentinel `platform-admin-owner-id`
- Requires UUID v4
- Returns trimmed tenant UUID (no fabrication)

---

## 5. Tests and build

### Jest (executed)

```text
npx jest test/va-institution-code.test.ts --watchman=false --coverage=false --runInBand --forceExit
→ Test Suites: 1 passed, 1 total
→ Tests:       9 passed, 9 total
→ exit_code:   0
```

Coverage includes helper accept/reject, sentinel absence in the three controllers, student/customer `parentId: tenantId` preserved, and the seven-path mapping document.

### TypeScript

`npx tsc --noEmit` run after the change (see final status section for exit code).

### Quasar DTO

Still `@IsUUID('4')` on `merchantWalletOwnerId` / `schoolId` at locked QUASAR commit — unchanged.

---

## 6. Remaining assumptions and blockers

- **Assumption:** Product intent for share 0 on staff/tenant operating remains “no platform split.”
- **Not verified:** Staging `quasar_integrations` contents / invify↔quasar id equality.
- **Blocker (unchanged from Phase 1):** Feature branch not pushed; staging credentials/relationships not verified; no staging VA E2E yet.
- Lead convert still non-blocking on VA failure (pre-existing).

---

## 7. Git status / commit

| Item | Value |
|---|---|
| Branch | `feature/va-institution-provider-routing` |
| Commit | `d83efe01be5c47eecf750187185bcfde3cd9d4aa` |
| Parent | `ba3c002f8ebc5aed8861ea73edba25f1fdc67e4b` |
| QUASAR HEAD (untouched) | `de4c33aa8287d38b98938cee2feedbbd0e2c7c8c` |
| Push / deploy / migrate / VA create | **Not done** |

Unrelated dirty Invify working-tree files were left unstaged. SMTP hotfix on Quasar was not touched.

### TypeScript

```text
npx tsc --noEmit --pretty false
→ exit 0 after removing invalid `currency` from typed lead createVirtualAccount call
  (QuasarService already forces currency NGN)
```

### Jest (final)

```text
npx jest test/va-institution-code.test.ts --watchman=false --coverage=false --runInBand --forceExit
→ Tests: 9 passed, 9 total
→ exit_code: 0
```

**STOP.** Await approval before push, deploy, database work, or staging VA creation.
