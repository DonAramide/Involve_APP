# Invify Platform Integration Guide

**Audience:** Invify product engineering, platform integration, and Quasar operator teams  
**Status:** Production integration reference  
**Scope:** Invify as an **external product** consuming Quasar (Phase 2A → 3.5)  
**Related:** [INVIFY_ENTERPRISE_API_REFERENCE.md](./INVIFY_ENTERPRISE_API_REFERENCE.md), [INVIFY_PLATFORM_PARTNER_API.md](./INVIFY_PLATFORM_PARTNER_API.md), [INVIFY_IMPLEMENTATION_PROMPT.md](./INVIFY_IMPLEMENTATION_PROMPT.md), [ADR-001](./ADR-001-QUASAR-SERVICE-PLATFORM.md)

---

## Document conventions

| Symbol | Meaning |
|--------|---------|
| **Invify** | Invify backend, mobile, MPOS, or web clients |
| **Quasar Ops** | Quasar platform operators (admin JWT, one-time enablement) |
| **Tenant** | Merchant organization provisioned on Quasar (`tenants` table) |
| **Service** | Product boundary — Invify is service slug `invify` |
| **Vertical** | Business line within Invify — `invify_retail`, `invify_school`, `invify_services` |

**Base URL pattern:** `{ORIGIN}/api/v1`  
Examples: `https://api-quasar.iips.app/api/v1` (production), `http://localhost:4000/api/v1` (local)

**Response envelope (QFP):** Successful API responses use `responseCode: "00"` with `data` payload unless noted.

---

## Integration responsibility matrix

| Activity | Owner | Auth |
|----------|-------|------|
| Register Invify platform partner | Quasar Ops | Admin JWT |
| Create / publish Invify Service manifest | Quasar Ops | Admin JWT |
| Provision Invify Service runtime | Quasar Ops | Admin JWT |
| Assign governance plan | Quasar Ops | Admin JWT |
| Enable workspace / marketplace flags | Quasar Ops | Admin JWT |
| **Onboard merchant (tenant)** | **Invify backend** | **Platform partner headers** |
| **Issue MPOS API key** | **Invify backend** | **Platform partner headers** |
| **Payments, POS, webhooks** | **Invify MPOS / backend** | **Tenant `sk_*` API key** |
| Sandbox certification | Invify engineering | `sk_test_*` |
| Platform operations / readiness | Quasar Ops | Admin JWT (not Invify automation) |

Invify must **never** automate against admin JWT in production. Use platform partner credentials for provisioning only.

---

# Part 1 — Platform Overview

## 1.1 How Invify fits into Quasar

Quasar is a **multi-product platform**. Invify is one **Service** (`slug: invify`) with three **Verticals** (Retail, School, Services). Each Invify merchant becomes a Quasar **Tenant** scoped to one vertical.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Quasar Platform (QSP)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Service     │  │ Workspace    │  │ Shared Engines           │ │
│  │ Registry    │  │ (admin UI)   │  │ QFP · QFE · QFS · MDM    │ │
│  │ invify      │  │              │  │ Governance · Ops Center  │ │
│  └──────┬──────┘  └──────────────┘  └───────────┬────────────┘ │
│         │                                         │              │
│         │         ┌───────────────────────────────┘              │
│         ▼         ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Invify Service (manifest + runtime + vertical plugins)    │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│   invify_retail        invify_school       invify_services      │
│   (tenants)            (tenants)           (tenants)             │
└─────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │ Platform Partner API (Invify backend)
         │
┌────────┴────────────────────────────────────────────────────────┐
│ Invify product lines · MPOS · Web · Admin                      │
└─────────────────────────────────────────────────────────────────┘
```

**Invify consumes Quasar for:**

- Merchant (tenant) lifecycle and financial identity
- Wallet, payment, transfer, virtual account, and POS card rails
- Outbound webhooks (Quasar → Invify)
- Optional sandbox (QFS) for integration certification
- Optional marketplace distribution of Invify extensions (future)

**Invify does not duplicate:** ledger, treasury, reconciliation, provider routing, or platform governance engines.

## 1.2 Platform architecture (layers)

| Layer | Role for Invify |
|-------|-----------------|
| **QFP** (Platform Core) | Auth routing, correlation IDs, idempotency, rate limits, error envelope, `sk_test_*` → QFS / `sk_live_*` → QFE |
| **QFE** (Financial Engine) | Production wallets, payments, transfers, VA, ISO8583/POS live |
| **QFS** (Financial Sandbox) | Isolated TEST ledger, developer portal execution, WebSocket `/qfs` |
| **QSP Service Platform** | Service registry, manifest, runtime, workspace, provisioning, governance, marketplace |
| **Platform Operations** | Read-only cross-engine health, timeline, alerts (Quasar Ops) |
| **Platform Readiness** | Enterprise audit score (Quasar Ops) |

## 1.3 Service ownership

| Asset | Owner | Invify access |
|-------|-------|---------------|
| Service row `invify` | Quasar platform | Read via context; no direct mutation |
| Manifest definition | Quasar Ops (publish) | Indirect — defines Invify capabilities |
| Runtime configuration | Quasar Ops | Consumed at execution via tenant keys |
| Tenant rows | Invify provisions | Full lifecycle via partner API |
| Tenant API keys | Invify provisions | Delivered to MPOS securely |
| Platform partner `qpc_*` | Quasar Ops issues | Invify backend vault only |
| Financial data | Tenant-scoped | Via `sk_*` only |

**Ownership rule (ADR-005):** Invify owns product UX and merchant onboarding flows. Quasar owns financial truth, tenant isolation, and platform policy.

## 1.4 Workspace

The **Workspace** is Quasar’s admin composition layer for the Invify Service (`/services/invify` in iips-admin).

**Core platform plugins (always present when flags allow):**

| Plugin ID | Tab | Purpose |
|-----------|-----|---------|
| `core.dashboard` | Dashboard | Service overview |
| `core.verticals` | Verticals | Retail / School / Services |
| `core.manifest` | Manifest | Manifest admin (Quasar Ops) |
| `core.runtime` | Runtime | Runtime inspection |
| `core.operations` | Operations | Platform ops center embed |
| `core.readiness` | Readiness | Enterprise readiness score |

**Invify product plugins (from service template):**

| Plugin ID | Vertical / domain |
|-----------|-------------------|
| `invify.retail` | Retail operations |
| `invify.school` | School operations |
| `invify.services` | Services operations |
| `invify.pos` | POS posture (`financial.pos` capability) |

Invify MPOS **does not** call workspace APIs. Workspace is for Quasar operators and Invify platform admins with admin JWT.

## 1.5 Runtime

The **Runtime Engine** holds integration registry, secret references (not values), connectivity profiles, and execution context for service slug `invify`.

Invify runtime profile (template): `invify-runtime` with domains `invify.quasar.local`, webhook templates `financial` + `operational`, SDK `@iips/quasar-sdk`, **requiresVault: true**.

**Invify consumption path:** Tenant API keys resolve tenant → financial execution. Runtime metadata informs which integrations and PSP routes apply.

## 1.6 Manifest

The **Manifest** is the declarative contract for Invify on Quasar: plugins, applications, integrations, verticals, branding, capability hints, governance pack.

- Template engine slug: `invify` (Phase 3.2.1)
- Manifest version: `1.0.0` (extends platform base template)
- Published manifest drives workspace plugin visibility and runtime capability hints

Invify integrators **consume** manifest outcomes indirectly (scopes, features enabled per vertical). Manifest **mutation** is Quasar Ops only.

## 1.7 Provisioning

**Service provisioning** (Phase 3.2.2–3.2.3) orchestrates manifest → runtime → workspace → governance → integrations as a DAG.

Invify **merchant** provisioning uses a separate, lighter path:

`POST /integration/platform/tenants` → tenant + wallets + code  
`POST /integration/platform/tenants/{id}/api-keys` → `sk_*` for MPOS

## 1.8 Governance

**Platform Governance** (Phase 3.1) applies policies, plans, entitlements, and approval workflows at platform and service scope.

Invify template defaults:

- Policy pack: `invify-default`
- Default plan: `standard` (platform services use `platform`)
- `requiresApproval: false` (unlike betting/RWA)

Invify tenants inherit **tenant quota enforcement** and financial policies through QFE/QFP — not through direct governance API calls from Invify backend.

## 1.9 Marketplace

**Service Marketplace** (Phase 3.3.x) distributes certified packages. Invify may **publish** extensions as a publisher (Quasar Ops / partner workflow) or **install** packages into the Invify service via admin provisioning.

Public read-only catalog: `GET /marketplace/catalog` (no auth).

## 1.10 Developer Portal

**Developer Portal** (Phase 2F.5) provides API explorer, saved requests, environments, webhook inspector, and socket monitor — scoped to QFS sandbox APIs.

Invify engineers use Developer Portal for **certification**, not for production merchant flows. Production MPOS uses tenant `sk_live_*` against QFE routes directly.

---

# Part 2 — Onboarding

Onboarding has two tracks: **(A) Quasar platform enablement** (once per environment) and **(B) Invify merchant onboarding** (per merchant).

## 2.1 Track A — Register Invify (Quasar Ops)

### Step A1 — Issue platform partner credentials

```http
POST /api/v1/admin/platform-partners
Authorization: Bearer <admin_jwt>
Content-Type: application/json
```

**Recommended:** three partners for vertical isolation:

| clientId | allowedVerticals |
|----------|------------------|
| `INVIFY_RETAIL` | `["invify_retail"]` |
| `INVIFY_SCHOOL` | `["invify_school"]` |
| `INVIFY_SERVICES` | `["invify_services"]` |

**Capabilities:** `tenant:provision`, `tenant:read`, `api_key:create`

**Deliver** `clientSecret` (`qpc_*`) to Invify via secure channel (password manager — never git/Slack).

Seed script (dev): `npm run seed:invify-platform-partners` (see `scripts/seed-invify-platform-partners.cjs`).

### Step A2 — Create Service (if not seeded)

Service `invify` is seeded by QSP Service Registry. Verify:

```http
GET /api/v1/admin/services/invify
Authorization: Bearer <admin_jwt>
```

**Flags required:**

```bash
QSP_SERVICE_REGISTRY_ENABLED=true
```

### Step A3 — Create / validate Manifest

```http
GET  /api/v1/admin/services/invify/manifest
POST /api/v1/admin/services/invify/manifest/validate
POST /api/v1/admin/services/invify/manifest/publish
Authorization: Bearer <admin_jwt>
```

**Flags:**

```bash
QSP_SERVICE_REGISTRY_ENABLED=true
QSP_DATABASE_MANIFESTS_ENABLED=true
```

Permission: `manifest.view` / `manifest.manage`

### Step A4 — Create Runtime posture

Runtime is provisioned via template + provisioning job or runtime admin:

```http
GET  /api/v1/admin/services/invify/runtime
GET  /api/v1/admin/services/invify/runtime/health
POST /api/v1/admin/services/invify/runtime/validate-secrets
Authorization: Bearer <admin_jwt>
```

Ensure vault/PSP integrations configured for Invify (`requiresVault: true` in template).

### Step A5 — Provision Service (full DAG)

```http
POST /api/v1/admin/provisioning/jobs
Authorization: Bearer <admin_jwt>
```

```json
{
  "templateSlug": "invify",
  "serviceSlug": "invify",
  "environment": "production",
  "persist": true,
  "idempotencyKey": "invify-prod-bootstrap-001"
}
```

**Flags:**

```bash
QSP_SERVICE_PROVISIONING_ENABLED=true
QSP_SERVICE_PROVISIONING_PERSISTENCE_ENABLED=true
```

Poll: `GET /admin/provisioning/jobs/{id}` until `SUCCESS`.

### Step A6 — Activate Service

After provisioning persistence (Phase 3.2.3):

```http
POST /api/v1/admin/provisioning/jobs/{id}/activate
Authorization: Bearer <admin_jwt>
```

Permission: `service.activate`

### Step A7 — Assign Plan

```http
GET  /api/v1/admin/platform-governance/plans
POST /api/v1/admin/platform-governance/tenant-assignments
Authorization: Bearer <admin_jwt>
```

Assign plan `standard` (or enterprise) to tenant after merchant creation, or configure default plan in governance policy pack `invify-default`.

### Step A8 — Enable Workspace

Workspace activates when service registry + workspace context flags are on:

```bash
QSP_SERVICE_REGISTRY_ENABLED=true
NEXT_PUBLIC_QSP_SERVICE_REGISTRY_ENABLED=true
```

Verify plugins:

```http
GET /api/v1/admin/services/invify/workspace
GET /api/v1/admin/services/invify/plugins
```

### Step A9 — Enable Runtime (feature + health)

Confirm runtime engine enabled and healthy in operations dashboard:

```http
GET /api/v1/admin/platform-operations/health
```

Runtime engine status `enabled`; Invify service runtime health `healthy`.

### Step A10 — Enable Developer Portal

```bash
QSP_FINANCIAL_SANDBOX_ENABLED=true
```

Admin UI: `/admin/developer-portal`  
Permission: `financial_sandbox.view`

### Step A11 — Enable Marketplace (optional)

```bash
QSP_SERVICE_MARKETPLACE_ENABLED=true
NEXT_PUBLIC_QSP_SERVICE_MARKETPLACE_ENABLED=true
```

## 2.2 Track B — Invify merchant onboarding (Invify backend)

For **each new merchant** on Invify Retail / School / Services:

### Step B1 — Create tenant

```http
POST /api/v1/integration/platform/tenants
X-Quasar-Client-Id: INVIFY_RETAIL
X-Quasar-Client-Secret: qpc_...
Content-Type: application/json
```

```json
{
  "name": "Acme Retail Ltd",
  "slug": "tenant-acme-retail-001",
  "vertical": "invify_retail",
  "defaultCurrency": "NGN"
}
```

**Persist:** `id`, `slug`, `code`, `vertical`, `status`

### Step B2 — Create tenant API key

```http
POST /api/v1/integration/platform/tenants/{tenantId}/api-keys
X-Quasar-Client-Id: INVIFY_RETAIL
X-Quasar-Client-Secret: qpc_...
```

```json
{
  "name": "Invify MPOS — Acme Retail",
  "environment": "test"
}
```

Use `"environment": "live"` for production (`sk_live_*`).

**Persist:** `secretKey` once — deliver to device via Invify secure provisioning channel.

### Step B3 — Register webhook endpoint (recommended)

```http
POST /api/v1/webhooks/endpoints
Authorization: Bearer sk_test_...
Content-Type: application/json
```

```json
{
  "url": "https://api.invify.app/webhooks/quasar"
}
```

**Persist:** `signingSecret` for HMAC verification.

### Step B4 — MPOS activation

Device stores `sk_*` in secure enclave → calls POS/payment APIs (Part 6).

---

# Part 3 — Authentication

## 3.1 Authentication models (do not mix)

| Model | Token / header | Used by | Expires |
|-------|----------------|---------|---------|
| **Platform partner** | `X-Quasar-Client-Id` + `X-Quasar-Client-Secret` | Invify backend | No (revoke via admin) |
| **Tenant API key** | `Authorization: Bearer sk_test_*` or `sk_live_*` | MPOS, Invify server-side financial calls | Rotatable |
| **Admin JWT** | `Authorization: Bearer <jwt>` | Quasar Ops only | Yes |
| **Sandbox tenant JWT** | Tenant portal login | Invify portal sandbox views | Yes |

## 3.2 JWT (Admin — Quasar Ops only)

```http
POST /api/v1/admin/auth/login
POST /api/v1/admin/auth/2fa/verify
```

**Not for Invify automation.** Used for manifest publish, provisioning jobs, governance, operations center.

## 3.3 API Keys (Tenant — primary Invify runtime auth)

| Prefix | Environment | Routes to |
|--------|-------------|-----------|
| `sk_test_*` | TEST | QFS sandbox + test financial isolation |
| `sk_live_*` | LIVE | QFE production financial engine |
| `pk_test_*` / `pk_live_*` | Public half | Client-safe references only |

**Scopes** (least privilege — assign explicitly when needed):

| Scope | Invify use |
|-------|------------|
| `payments:create`, `payments:read` | Payment intents |
| `wallets:read` | Balance inquiry |
| `transfers:create`, `transfers:read` | Payouts |
| `virtual_accounts:read`, `virtual_accounts:write` | VA collection |
| `webhooks:endpoints:manage`, `webhooks:read` | Outbound webhooks |
| `integration:read` | Integration metadata |
| `pos:icc:write` | EMV field 55 |
| `pos:card:execute` | Card transactions + MPOS backup |
| `sandbox:read`, `sandbox:write` | QFS APIs (test keys) |

Default partner provisioning scopes include POS scopes — see [INVIFY_PLATFORM_PARTNER_API.md](./INVIFY_PLATFORM_PARTNER_API.md).

## 3.4 Sandbox Keys

- Created with `"environment": "test"` on platform API key endpoint
- Route to QFS (`/sandbox/*`) per QFP environment routing
- Use for Invify CI/CD and Developer Portal certification
- **Never** ship sandbox keys in production APK for live merchants

## 3.5 Live Keys

- Created with `"environment": "live"`
- Route to QFE production rails
- Required for production MPOS and server-side settlement flows
- Rotate via re-issue key + device reprovision

## 3.6 Partner Keys

| Property | Detail |
|----------|--------|
| Prefix | `qpc_*` (client secret) |
| Storage | Invify backend secrets manager only |
| Scope | Tenant create/read, API key create |
| Vertical lock | Partner `allowedVerticals` enforced on tenant create |

Headers:

```http
X-Quasar-Client-Id: INVIFY_RETAIL
X-Quasar-Client-Secret: qpc_...
```

## 3.7 Service Identity

Invify Service identity in Quasar:

| Field | Value |
|-------|-------|
| `slug` | `invify` |
| `serviceCode` | `INVIFY` |
| `workspaceHref` | `/services/invify` |
| Template | `invify` @ Phase 3.2.1 |

Resolved in **Platform Service Context** for admin requests (`PlatformServiceContextFactory`).

## 3.8 Tenant Identity

Each merchant tenant carries:

| Field | Example |
|-------|---------|
| `id` | UUID |
| `slug` | `tenant-acme-retail-001` |
| `code` | `RET001` (financial code) |
| `vertical` | `invify_retail` |
| `defaultCurrency` | `NGN` |

All financial API calls resolve tenant from API key — Invify must not send arbitrary tenant IDs without key scope.

**Correlation:** Send `X-Correlation-Id` (UUID) on all Invify-originated requests for timeline tracing.

---

# Part 4 — Runtime Configuration

## 4.1 Required configuration

| Setting | Source | Invify impact |
|---------|--------|---------------|
| Service slug `invify` published | Service registry | Tenant vertical mapping |
| Manifest published | Manifest engine | Plugin + capability hints |
| Runtime profile `invify-runtime` | Runtime engine | Integration + webhook templates |
| Vault secret references | Runtime secrets | PSP / ISO8583 connectivity |
| Platform partner issued | `platform_partner_clients` | Merchant provisioning |
| PSP / switch endpoints | Runtime integrations | Live card auth |

## 4.2 Optional configuration

| Setting | Purpose |
|---------|---------|
| Marketplace packages | Extend Invify via certified plugins |
| Custom governance policies | Approval on manifest/runtime changes |
| Redis (`ADMIN_REDIS_URL`) | Multi-instance ops streaming (Quasar internal) |
| QFE read-switch modes | Shadow/compare legacy vs QFE reads (Quasar Ops) |

## 4.3 Feature flags

### API (iips-pay)

| Flag | Invify dependency |
|------|-------------------|
| `QSP_SERVICE_REGISTRY_ENABLED` | Service + workspace context |
| `QSP_DATABASE_MANIFESTS_ENABLED` | DB-backed manifest |
| `QSP_SERVICE_PROVISIONING_ENABLED` | Full service DAG |
| `QSP_SERVICE_PROVISIONING_PERSISTENCE_ENABLED` | Service activation |
| `QSP_SERVICE_MARKETPLACE_ENABLED` | Marketplace install |
| `QSP_PLATFORM_OPERATIONS_ENABLED` | Ops/timeline (Quasar Ops) |
| `QSP_PLATFORM_READINESS_ENABLED` | Readiness audits |
| `QSP_FINANCIAL_SANDBOX_ENABLED` | Sandbox + Developer Portal |

### Admin UI (iips-admin)

Mirror with `NEXT_PUBLIC_QSP_*` flags for workspace tabs.

## 4.4 Capability flags

Invify template capabilities (from service template `extensions.capabilityMap`):

| Capability | Vertical plugins |
|------------|------------------|
| `financial` | All verticals |
| `financial.pos` | `invify.pos` |
| `payments` | Retail, School, Services |
| `wallets` | All |
| `webhooks` | All |

Capabilities gate workspace plugin visibility — not API key scopes (scopes are separate).

## 4.5 Secrets

| Secret type | Invify access |
|-------------|---------------|
| Platform `qpc_*` | Backend vault only |
| Tenant `sk_*` | MPOS secure storage |
| Webhook `signingSecret` | Invify webhook receiver config |
| Runtime vault refs | **No access** — Quasar resolves at execution |

Invify must never request or log runtime secret material via admin APIs.

## 4.6 Vault references

Runtime admin exposes **references only**:

```http
GET /api/v1/admin/services/invify/runtime/secrets
GET /api/v1/admin/services/invify/runtime/secret-providers
POST /api/v1/admin/services/invify/runtime/validate-secrets
```

Permission: `secret.view` / runtime manage (Quasar Ops).

## 4.7 Environment resolution (QFP)

| Key prefix | Resolved environment | Engine |
|------------|---------------------|--------|
| `sk_test_*` | TEST | QFS |
| `sk_live_*` | LIVE | QFE |

Invify MPOS must use the correct key class per build flavor (UAT vs production).

---

# Part 5 — Manifest

## 5.1 Required manifest elements (Invify template)

Published manifest for `invify` must include:

| Section | Invify content |
|---------|----------------|
| `manifestVersion` | `1.0.0` |
| `extends` | Platform base template |
| `workspace.plugins` | Core + `invify.*` product plugins |
| `applications` | invify-mobile, invify-web, invify-tablet, invify-admin, … |
| `integrations` | Financial, webhook, POS integrations |
| `verticals` | retail, school, services |
| `branding` | theme + iconKey |
| `governance` | `invify-default` policy pack |
| `runtime` | profile, domains, webhookTemplates, connectivity |

## 5.2 Plugin declarations

**Product plugins:**

```yaml
# Logical structure (published JSON equivalent)
plugins:
  - id: invify.retail
    routeKey: retail
    capabilities: [financial]
  - id: invify.school
    routeKey: school
  - id: invify.services
    routeKey: services
  - id: invify.pos
    routeKey: pos
    capabilities: [financial.pos]
```

## 5.3 Navigation

Workspace navigation built from plugin `navigation` slots:

- Tab bar: product plugins + core platform tabs
- Route pattern: `/services/invify?tab={routeKey}`
- Order: defined in template (`order` field)

## 5.4 Capabilities

Manifest `capabilityHints` inform runtime and workspace gating:

- `financial`, `payments`, `wallets`, `webhooks`, `financial.pos`

API key **scopes** must still be granted explicitly on tenant keys.

## 5.5 Branding

Template branding:

- `theme`: Invify theme key from seed
- `iconKey`: Service icon in admin hub

Does not affect MPOS UI — Invify app branding is independent.

## 5.6 Lifecycle

Manifest lifecycle states: `draft` → `validated` → `published` → `archived`

Invify integrators depend on **published** manifest version. Coordinate with Quasar Ops on publish windows.

## 5.7 Applications

Declared applications (from template):

| App ID | Name |
|--------|------|
| `invify-mobile` | Invify Mobile |
| `invify-web` | Invify Web |
| `invify-tablet` | Invify Tablet |
| `invify-admin` | Invify Admin |
| `invify-school-mobile` | Invify School Mobile |
| `invify-services-mobile` | Invify Services Mobile |

Used for ownership mapping and MDM/fleet contexts — not direct API endpoints.

## 5.8 Workspace plugins

**Core plugins** (platform): `core.dashboard`, `core.verticals`, `core.manifest`, `core.runtime`, `core.operations`, `core.readiness`, `core.marketplace` (flagged)

**Invify plugins:** `invify.retail`, `invify.school`, `invify.services`, `invify.pos`

Inspect effective set:

```http
GET /api/v1/admin/services/invify/plugins
Authorization: Bearer <admin_jwt>
```

---

# Part 6 — API Consumption

All paths prefixed with `/api/v1`.  
**Auth column:** `Partner` = platform headers, `Tenant` = `sk_*`, `Admin` = JWT (Quasar Ops), `Public` = none.

## 6.1 Invify backend — Platform partner (primary)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/integration/platform/tenants` | Partner | Create merchant tenant |
| GET | `/integration/platform/tenants/{tenantId}` | Partner | Get tenant |
| POST | `/integration/platform/tenants/{tenantId}/api-keys` | Partner | Issue `sk_*` |

## 6.2 Invify MPOS / runtime — Payments & wallets

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| GET | `/payments/meta` | Tenant | `payments:read` |
| GET | `/payments` | Tenant | `payments:read` |
| POST | `/payments/intents` | Tenant | `payments:create` |
| GET | `/payments/intents/{reference}` | Tenant | `payments:read` |
| GET | `/payments/{reference}` | Tenant | `payments:read` |
| POST | `/payments/intents/{reference}/paystack/initialize` | Tenant | `payments:create` |
| POST | `/payments/intents/{reference}/paystack/verify` | Tenant | `payments:create` |
| GET | `/wallets` | Tenant | `wallets:read` |
| GET | `/wallets/{walletId}` | Tenant | `wallets:read` |
| GET | `/wallets/{walletId}/balance` | Tenant | `wallets:read` |
| GET | `/wallets/{walletId}/transactions` | Tenant | `wallets:read` |
| POST | `/wallets/withdraw` | Tenant | `withdrawals:create` |
| POST | `/transfers` | Tenant | `transfers:create` |
| GET | `/transfers` | Tenant | `transfers:read` |

## 6.3 Invify MPOS — POS / card

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| POST | `/pos/transactionFromMpos` | Tenant | `pos:card:execute` |
| POST | `/pos/card-transaction` | Tenant | `pos:card:execute` |
| POST | `/pos/icc` | Tenant | `pos:icc:write` |
| POST | `/pos/iso8583` | Tenant | `pos:iso8583:write` |

**MPOS backup path:** `transactionFromMpos` accepts device-reported outcome when primary switch path unavailable. Idempotent replays return HTTP 200.

See [ISO8583_SWITCH.md](./ISO8583_SWITCH.md).

## 6.4 Invify — Webhooks

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| POST | `/webhooks/endpoints` | Tenant | `webhooks:endpoints:manage` |
| GET | `/webhooks/endpoints` | Tenant | `webhooks:read` |

Inbound provider webhooks (PSP → Quasar): `POST /webhooks/{provider}` — Quasar internal routing, not Invify-registered.

## 6.5 Invify — Sandbox (QFS certification)

| Method | Path | Auth | Scope |
|--------|------|------|-------|
| GET | `/sandbox` | Tenant `sk_test_*` | `sandbox:read` |
| POST | `/sandbox/accounts/generate` | Tenant | `sandbox:write` |
| GET | `/sandbox/accounts` | Tenant | `sandbox:read` |
| POST | `/sandbox/accounts/{id}/credit` | Tenant | `sandbox:write` |
| POST | `/sandbox/transfers` | Tenant | `sandbox:write` |
| GET | `/sandbox/timeline` | Tenant | `sandbox:read` |
| POST | `/sandbox/bootstrap` | Tenant | `sandbox:write` |

Full catalog: [FINANCIAL_SANDBOX_API.md](./FINANCIAL_SANDBOX_API.md)

## 6.6 Workspace (Quasar Ops — reference)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | `/admin/services/invify/workspace` | Admin | `service.view` |
| GET | `/admin/services/invify/navigation` | Admin | `service.view` |
| GET | `/admin/services/invify/plugins` | Admin | `service.view` |
| GET | `/admin/services/invify/dashboard` | Admin | `service.view` |

## 6.7 Runtime (Quasar Ops — reference)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | `/admin/services/invify/runtime` | Admin | `runtime.view` |
| GET | `/admin/services/invify/runtime/health` | Admin | `runtime.view` |
| GET | `/admin/services/invify/runtime/integrations` | Admin | `integration.view` |
| GET | `/admin/services/invify/runtime/secrets` | Admin | `secret.view` |
| GET | `/admin/services/invify/runtime/execution-context` | Admin | `runtime.view` |
| POST | `/admin/services/invify/runtime/validate-secrets` | Admin | `runtime.manage` |
| POST | `/admin/services/invify/runtime/activate` | Admin | `runtime.manage` |

Full runtime admin surface: [QSP_PHASE_2E4_RUNTIME_ADMINISTRATION.md](./QSP_PHASE_2E4_RUNTIME_ADMINISTRATION.md)

## 6.8 Developer Portal (Quasar Ops / Invify QA)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | `/admin/developer-portal/dashboard` | Admin | `financial_sandbox.view` |
| GET | `/admin/developer-portal/catalog` | Admin | `financial_sandbox.view` |
| GET | `/admin/developer-portal/saved` | Admin | `financial_sandbox.view` |
| GET | `/admin/developer-portal/environments` | Admin | `financial_sandbox.view` |

Portal executes against QFS using operator-provided test keys (client-side).

## 6.9 Marketplace

**Public (Invify marketing / discovery):**

| Method | Path | Auth |
|--------|------|------|
| GET | `/marketplace/catalog` | Public |
| GET | `/marketplace/catalog/{slug}` | Public |
| GET | `/marketplace/search` | Public |
| GET | `/marketplace/categories` | Public |
| GET | `/marketplace/discovery` | Public |

**Admin (Quasar Ops — install/publish):**

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/marketplace/catalog` | `marketplace.view` |
| POST | `/admin/marketplace/installations` | `marketplace.install` |
| GET | `/admin/marketplace/publisher/packages` | `marketplace.publish` |
| POST | `/admin/marketplace/publisher/certify` | `marketplace.certify` |

## 6.10 Operations Center (Quasar Ops — not Invify)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/platform-operations/dashboard` | `platform.operations.view` |
| GET | `/admin/platform-operations/health` | `platform.operations.view` |
| GET | `/admin/platform-operations/metrics` | `platform.operations.view` |
| GET | `/admin/platform-operations/services` | `platform.operations.view` |
| GET | `/admin/platform-operations/events` | `platform.operations.view` |
| GET | `/admin/platform-operations/audit` | `platform.operations.view` |
| GET | `/admin/platform-operations/alerts/active` | `platform.operations.view` |
| POST | `/admin/platform-operations/alerts/{id}/acknowledge` | `platform.alerts.acknowledge` |
| GET | `/admin/platform-operations/sse` | `platform.operations.view` |
| GET | `/admin/platform-operations/stream` | `platform.operations.view` |

## 6.11 Provisioning (Quasar Ops)

| Method | Path | Permission |
|--------|------|------------|
| POST | `/admin/provisioning/jobs` | `provisioning.execute` |
| GET | `/admin/provisioning/jobs` | `provisioning.view` |
| GET | `/admin/provisioning/jobs/{id}` | `provisioning.view` |
| GET | `/admin/provisioning/jobs/{id}/plan` | `provisioning.view` |
| GET | `/admin/provisioning/jobs/{id}/events` | `provisioning.view` |
| POST | `/admin/provisioning/jobs/{id}/cancel` | `provisioning.cancel` |
| POST | `/admin/provisioning/jobs/{id}/rollback` | `provisioning.rollback` |

## 6.12 Governance (Quasar Ops)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/platform-governance/dashboard` | `governance.view` |
| GET | `/admin/platform-governance/policies` | `governance.view` |
| GET | `/admin/platform-governance/approvals` | `governance.review` |
| POST | `/admin/platform-governance/approvals/{id}/approve` | `governance.approve` |
| GET | `/admin/services/invify/governance/dashboard` | `governance.view` |

## 6.13 Readiness (Quasar Ops)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/platform-readiness/dashboard` | `platform.readiness.view` |
| GET | `/admin/platform-readiness/performance` | `platform.readiness.view` |
| GET | `/admin/platform-readiness/security` | `platform.readiness.view` |
| GET | `/admin/platform-readiness/reliability` | `platform.readiness.view` |
| GET | `/admin/platform-readiness/architecture` | `platform.readiness.view` |
| GET | `/admin/platform-readiness/readiness-score` | `platform.readiness.view` |

## 6.14 Timeline & correlation (Quasar Ops)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/platform-operations/timeline` | `platform.operations.view` |
| GET | `/admin/platform-operations/timeline/search` | `platform.operations.view` |
| GET | `/admin/platform-operations/timeline/{correlationId}` | `platform.operations.view` |
| GET | `/admin/platform-operations/correlations` | `platform.operations.view` |
| GET | `/admin/platform-operations/events/live` | `platform.operations.view` |

**Invify correlation:** supply `X-Correlation-Id` on tenant API calls; Quasar projects financial events into timeline when ops enabled.

## 6.15 Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | Public |
| GET | `/health/ready` | Public |
| GET | `/admin/platform-operations/health` | Admin |
| GET | `/admin/services/invify/runtime/health` | Admin |
| GET | `/admin/platform-governance/health` | Admin |

## 6.16 Events & metrics

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/platform-operations/events` | Admin |
| GET | `/admin/platform-operations/metrics` | Admin |
| GET | `/admin/platform-operations/timeline/metrics` | Admin |
| GET | `/admin/platform-operations/stream/metrics` | Admin |
| GET | `/admin/services/invify/manifest/metrics` | Admin |
| GET | `/admin/services/invify/runtime/metrics` | Admin |

---

# Part 7 — Webhooks

## 7.1 Registration

```http
POST /api/v1/webhooks/endpoints
Authorization: Bearer sk_...
Content-Type: application/json

{ "url": "https://api.invify.app/webhooks/quasar" }
```

Requirements:

- HTTPS only in production
- Tenant-scoped — one registration per tenant per URL pattern
- Returns `signingSecret` once

## 7.2 Verification

Quasar signs raw body:

```
x-quasar-signature: HMAC-SHA256(raw_body, signingSecret) as lowercase hex
```

Invify receiver must:

1. Read raw body (before JSON parse)
2. Compute HMAC with stored secret
3. Constant-time compare with header
4. Reject if timestamp skew > 5 minutes (if timestamp in payload)

Payload shape:

```json
{
  "event": "payment.completed",
  "data": { },
  "timestamp": 1717612800
}
```

## 7.3 Retry

Quasar outbound delivery retries failed HTTP calls per delivery policy (`outbound_webhook_deliveries`):

- Exponential backoff between attempts
- Failed deliveries visible in Quasar admin webhook ops (Quasar Ops)
- Invify endpoint must be idempotent (see 7.7)

## 7.4 Signing

Algorithm: **HMAC-SHA256**  
Header: **`x-quasar-signature`**  
Secret: **`signingSecret`** from registration response  
Rotation: re-register endpoint URL to receive new secret

## 7.5 Replay

Invify should track `event` + idempotency key in `data` (e.g. payment reference) to ignore duplicate deliveries from retries.

Quasar may expose delivery ID in payload metadata — dedupe on Invify side for at-least-once semantics.

## 7.6 Ordering

Webhook delivery is **best-effort ordered** per tenant — do not assume strict global ordering across event types. Invify consumers should:

- Process financial events idempotently
- Use ledger/reference as canonical key
- Reconcile via `GET /payments/{reference}` on ambiguity

## 7.7 Idempotency

| Layer | Mechanism |
|-------|-----------|
| Outbound webhook | Invify dedupe by event reference |
| Payment API | `Idempotency-Key` header (QFP) |
| MPOS backup | Fingerprint/idempotency in `transactionFromMpos` |
| Platform tenant create | Unique `slug` per merchant |

---

# Part 8 — WebSockets

## 8.1 Authentication

| Namespace | Auth | Invify use |
|-----------|------|------------|
| `/qfs` | Sandbox session / test key handshake | Sandbox certification, Developer Portal |
| `/platform-operations` | Admin JWT | Quasar Ops only — **not Invify** |

Invify production MPOS does **not** require WebSocket for payments — use REST POS endpoints.

## 8.2 Channels (QFS `/qfs`)

Sandbox streaming channels (certification):

- Account balance updates
- Transfer state changes
- Timeline / correlation updates
- Provider simulation events

See [FINANCIAL_SANDBOX_API.md](./FINANCIAL_SANDBOX_API.md) and admin socket monitor.

## 8.3 Subscriptions

Client subscribes after connect with tenant-scoped token derived from `sk_test_*` sandbox session bootstrap.

## 8.4 Reconnect

Invify sandbox clients should:

- Exponential backoff reconnect
- Resync state via `GET /sandbox/accounts/{id}` after reconnect
- Not rely solely on socket ordering

## 8.5 Events

Example QFS envelope (conceptual):

```json
{
  "channel": "transfers",
  "event": "transfer.completed",
  "payload": { },
  "emittedAt": "2026-06-22T12:00:00.000Z"
}
```

Production financial events for Invify merchants primarily use **webhooks + REST polling**, not WebSocket.

---

# Part 9 — Error Handling

## 9.1 Response codes

| HTTP | responseCode | Invify action |
|------|--------------|---------------|
| 200 | `00` | Success |
| 400 | `01` / validation | Fix request; do not retry blindly |
| 401 | auth | Refresh key or fix partner secret |
| 403 | forbidden | Scope or vertical mismatch — alert ops |
| 404 | not found | Verify tenant/key/environment |
| 409 | conflict | Idempotency replay or duplicate slug |
| 422 | unprocessable | Business rule — surface to merchant |
| 429 | rate limit | Backoff + retry (see headers) |
| 500/503 | server | Retry with exponential backoff |

Always parse QFP envelope: `{ responseCode, responseMessage, data }`.

## 9.2 Retry strategy

| Operation | Retry |
|-----------|-------|
| GET (read) | Yes — exponential backoff, max 3–5 |
| POST payment / transfer | Only with same `Idempotency-Key` |
| POST tenant create | Only if slug unique — else 409 |
| Webhook processing | Idempotent handler + 200 ack |

## 9.3 Circuit breaker

Invify backend should implement circuit breaker on Quasar API calls:

- Open after 5 consecutive 5xx/timeout on same endpoint
- Half-open probe after 30s
- Alert Quasar Ops if open > 5 minutes

Quasar platform internal breakers (ops center) are Quasar Ops concern.

## 9.4 Timeout

| Call type | Recommended timeout |
|-----------|---------------------|
| Partner provisioning | 15s |
| Payment intent | 30s |
| POS card transaction | 60s (switch dependent) |
| Webhook delivery (Invify receiver) | Respond within 10s |

## 9.5 Rate limiting

Quasar returns rate limit headers on public and partner routes (`ApiKeyThrottlerGuard` on platform partner controller).

Invify should:

- Honor `429` with backoff
- Cache tenant metadata locally
- Avoid polling wallets more than 1/min per device unless UX requires

---

# Part 10 — Go Live Checklist

## 10.1 Quasar platform (Quasar Ops)

- [ ] All PAT cases for Invify domain passed ([PLATFORM_ACCEPTANCE_TEST_SUITE.md](./PLATFORM_ACCEPTANCE_TEST_SUITE.md))
- [ ] `npm run certify:architecture` PASSED
- [ ] Platform readiness grade ≥ B on production-flag profile
- [ ] Service `invify` provisioned and activated (`QSP_SERVICE_PROVISIONING_PERSISTENCE_ENABLED`)
- [ ] Manifest published (validated, checksum recorded)
- [ ] Runtime secrets validated (`POST .../runtime/validate-secrets`)
- [ ] Governance plan `standard` or enterprise assigned
- [ ] PSP / ISO8583 switch connectivity verified in LIVE
- [ ] Platform partners `INVIFY_RETAIL`, `INVIFY_SCHOOL`, `INVIFY_SERVICES` issued (prod secrets)
- [ ] Old/compromised `qpc_*` secrets revoked
- [ ] Operations center + alerting enabled (`QSP_PLATFORM_OPERATIONS_ENABLED`)
- [ ] Redis configured if multi-instance API (`ADMIN_REDIS_URL`)
- [ ] Database migrations through `1754500000000` applied
- [ ] TLS certificates valid on API gateway
- [ ] Admin audit logging verified

## 10.2 Invify backend

- [ ] Production `qpc_*` secrets in vault (separate per vertical)
- [ ] No admin JWT or `qpc_*` in mobile APK
- [ ] Tenant provisioning integrated in merchant signup flow
- [ ] API key issuance + secure delivery to device pipeline tested
- [ ] Webhook endpoint registered per tenant (or template on first login)
- [ ] HMAC verification implemented and tested
- [ ] Idempotency keys on payment/transfer calls
- [ ] `X-Correlation-Id` on all outbound Quasar calls
- [ ] Circuit breaker + alerting on Quasar dependency
- [ ] Error envelope parsing for all routes
- [ ] Vertical lock tests (retail client cannot create school tenant)

## 10.3 Invify MPOS / client

- [ ] `sk_live_*` only in production builds; `sk_test_*` in UAT
- [ ] Secure enclave storage for API keys
- [ ] POS backup path tested (`transactionFromMpos`)
- [ ] Primary card path tested (`/pos/card-transaction`)
- [ ] Offline / degraded mode UX when Quasar unreachable
- [ ] Key rotation procedure documented for field ops

## 10.4 Financial & compliance

- [ ] LIVE wallet funding/settlement flows verified end-to-end
- [ ] Reconciliation process between Invify ledger and Quasar wallet transactions
- [ ] VA collection flow tested (if used)
- [ ] Paystack initialize/verify flows (if used)
- [ ] Sandbox certification sign-off completed on QFS
- [ ] QFE read-switch (if enabled) shadow diff within tolerance — Quasar Ops

## 10.5 Security

- [ ] Penetration test on Invify webhook receiver
- [ ] TLS 1.2+ on all Invify → Quasar calls
- [ ] Secret rotation runbook (partner + tenant keys)
- [ ] RBAC review — no Invify automation on admin routes
- [ ] Tenant isolation verified (tenant A key cannot read tenant B)

## 10.6 Observability

- [ ] Invify logs correlation ID with Quasar requests
- [ ] Quasar timeline searchable by Invify correlation IDs (Ops)
- [ ] Alert rules active for `provisioning.failure`, `platform.high_error_rate`
- [ ] Dashboards for payment success rate, MPOS backup rate, webhook failures

## 10.7 Rollback plan

- [ ] Disable new tenant provisioning (revoke partner temporarily)
- [ ] MPOS graceful degradation message if API down
- [ ] Revert to previous manifest version (Quasar Ops) if workspace regression
- [ ] Feature flag kill switch documented for Invify-specific marketplace plugins

## 10.8 Sign-off

| Role | Sign-off |
|------|----------|
| Invify Engineering Lead | |
| Invify Security | |
| Quasar Platform Ops | |
| Quasar Financial Ops | |
| Joint go-live date | |

---

## Appendix A — Invify vertical ↔ partner mapping

| Invify product | Platform clientId | Tenant vertical | Tenant code prefix |
|----------------|-------------------|-----------------|------------------|
| Invify Retail | `INVIFY_RETAIL` | `invify_retail` | `RET*` |
| Invify School | `INVIFY_SCHOOL` | `invify_school` | `SCH*` |
| Invify Services | `INVIFY_SERVICES` | `invify_services` | `SRV*` |

## Appendix B — Related documents

| Document | Topic |
|----------|-------|
| [INVIFY_PLATFORM_PARTNER_API.md](./INVIFY_PLATFORM_PARTNER_API.md) | Partner provisioning API |
| [INVIFY_IMPLEMENTATION_PROMPT.md](./INVIFY_IMPLEMENTATION_PROMPT.md) | Copy-paste implementation brief |
| [INVIFY_DEVICE_FLEET_API.md](./INVIFY_DEVICE_FLEET_API.md) | MDM / fleet (if applicable) |
| [ISO8583_SWITCH.md](./ISO8583_SWITCH.md) | POS / switch integration |
| [FINANCIAL_SANDBOX_API.md](./FINANCIAL_SANDBOX_API.md) | QFS sandbox |
| [QFP_PLATFORM_INVARIANTS.md](./QFP_PLATFORM_INVARIANTS.md) | Envelope, idempotency, correlation |
| [ADR-001](./ADR-001-QUASAR-SERVICE-PLATFORM.md) | Service platform model |
| [ADR-004](./ADR-004-WORKSPACE-PLUGIN-ARCHITECTURE.md) | Workspace plugins |
| [PLATFORM_ACCEPTANCE_TEST_SUITE.md](./PLATFORM_ACCEPTANCE_TEST_SUITE.md) | PAT execution |

## Appendix C — Support escalation

| Severity | Channel |
|----------|---------|
| P0 — production payments down | Quasar financial ops + Invify on-call |
| P1 — provisioning broken | Quasar platform ops |
| P2 — sandbox / certification | Developer portal support |
| P3 — documentation / clarifications | Platform architecture |

---

*This guide treats Invify as an external product integrating with Quasar production infrastructure. For API schema details, use `swagger.public.json` and [INVIFY_PLATFORM_PARTNER_API.md](./INVIFY_PLATFORM_PARTNER_API.md).*
