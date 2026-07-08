# Invify Platform Partner API (Client ID + Client Secret)

Quasar issues **long-lived platform credentials** to Invify so your **backend** can provision tenants and API keys **without** admin username/password or expiring admin JWTs.

| Auth model | Who | Headers / token | Purpose |
|------------|-----|-----------------|---------|
| **Platform partner** | Invify backend | `X-Quasar-Client-Id` + `X-Quasar-Client-Secret` | Create tenants, create `sk_*` keys |
| **Tenant API key** | MPOS app / runtime | `Authorization: Bearer sk_*` | POS, payments, MPOS webhook |
| **Admin JWT** | Quasar operators only | `Authorization: Bearer <jwt>` | Internal ops (not for Invify automation) |

**See also:** [INVIFY_ENTERPRISE_API_REFERENCE.md](./INVIFY_ENTERPRISE_API_REFERENCE.md) (full endpoint catalog)

---

## 1. One-time setup (Quasar operator)

A Quasar **super_admin** issues Invify credentials once:

```http
POST /api/v1/admin/platform-partners
Authorization: Bearer <admin_jwt>
Content-Type: application/json
```

```json
{
  "clientId": "INVIFY",
  "name": "Invify Platform Integration",
  "capabilities": [
    "tenant:provision",
    "tenant:read",
    "api_key:create"
  ],
  "allowedVerticals": ["invify_retail", "invify_school", "invify_services"],
  "defaultTenantApiKeyScopes": [
    "payments:create",
    "payments:read",
    "wallets:read",
    "transfers:create",
    "transfers:read",
    "virtual_accounts:read",
    "virtual_accounts:write",
    "webhooks:endpoints:manage",
    "webhooks:read",
    "integration:read",
    "pos:icc:write",
    "pos:card:execute"
  ]
}
```

**Response (secret shown once):**

```json
{
  "responseCode": "00",
  "responseMessage": "Success",
  "data": {
    "clientId": "INVIFY",
    "clientSecret": "qpc_a8f3k2...",
    "name": "Invify Platform Integration",
    "capabilities": ["tenant:provision", "tenant:read", "api_key:create"]
  }
}
```

**Invify must store securely:**

- `clientId` → e.g. `INVIFY` (public, non-secret)
- `clientSecret` → `qpc_*` prefix, **does not expire**

Revoke compromised credentials: `POST /api/v1/admin/platform-partners/{id}/revoke`

---

## 2. Invify backend — tenant creation per service

Each Invify product line provisions **its own merchants** as Quasar tenants:

```
Invify Retail app  → INVIFY_RETAIL credentials → POST /integration/platform/tenants → Quasar tenant (invify_retail)
Invify School app  → INVIFY_SCHOOL credentials → POST /integration/platform/tenants → Quasar tenant (invify_school)
Invify Services    → INVIFY_SERVICES credentials → POST /integration/platform/tenants → Quasar tenant (invify_services)
```

Quasar **rejects** cross-service provisioning (e.g. `INVIFY_RETAIL` cannot create `invify_school` tenants).

## 3. Invify backend — all provisioning calls

**Base URL:** `https://api-quasar.iips.app/api/v1` (or your environment)

**Required headers on every platform call:**

```http
X-Quasar-Client-Id: INVIFY
X-Quasar-Client-Secret: qpc_your_secret_here
Content-Type: application/json
Accept: application/json
```

No `POST /admin/auth/login` required.

---

### Step A — Create tenant

```http
POST /api/v1/integration/platform/tenants
X-Quasar-Client-Id: INVIFY
X-Quasar-Client-Secret: qpc_...
```

```json
{
  "name": "Acme Retail",
  "slug": "tenant-acme-retail-001",
  "vertical": "invify_retail",
  "defaultCurrency": "NGN"
}
```

**Response:**

```json
{
  "responseCode": "00",
  "responseMessage": "Success",
  "data": {
    "data": {
      "id": "8838236e-5664-4a28-86f7-233194437a64",
      "name": "Acme Retail",
      "slug": "tenant-acme-retail-001",
      "code": "ACM001",
      "vertical": "invify_retail",
      "defaultCurrency": "NGN",
      "status": "active"
    }
  }
}
```

**Persist:** `id`, `slug`, `code`

---

### Step B — Create tenant API key (for MPOS runtime)

```http
POST /api/v1/integration/platform/tenants/{tenantId}/api-keys
X-Quasar-Client-Id: INVIFY
X-Quasar-Client-Secret: qpc_...
```

```json
{
  "name": "Invify MPOS — Acme Retail",
  "environment": "test"
}
```

Omit `scopes` to use partner `defaultTenantApiKeyScopes` (includes `pos:card:execute`).

**Response (secret once):**

```json
{
  "responseCode": "00",
  "responseMessage": "Success",
  "data": {
    "tenantId": "8838236e-5664-4a28-86f7-233194437a64",
    "publicKey": "pk_test_...",
    "secretKey": "sk_test_...",
    "scopes": ["pos:card:execute", "..."],
    "warning": "Store secretKey securely..."
  }
}
```

Deliver `secretKey` to the MPOS device via your secure provisioning channel.

---

### Step C — Get tenant (optional)

```http
GET /api/v1/integration/platform/tenants/{tenantId}
X-Quasar-Client-Id: INVIFY
X-Quasar-Client-Secret: qpc_...
```

---

## 3. MPOS app — runtime (unchanged)

Use the **tenant** `sk_*` key, not platform credentials:

```http
POST /api/v1/pos/transactionFromMpos
Authorization: Bearer sk_test_...
Content-Type: application/json
```

Platform `qpc_*` secrets must **never** be embedded in the mobile app.

---

## 4. What Invify stores

### Platform vault (Invify backend only)

```json
{
  "quasarPlatform": {
    "baseUrl": "https://api-quasar.iips.app/api/v1",
    "clientId": "INVIFY",
    "clientSecret": "qpc_..."
  }
}
```

### Per merchant (after provisioning)

```json
{
  "quasarTenant": {
    "tenantId": "uuid",
    "tenantSlug": "tenant-acme-retail-001",
    "tenantCode": "ACM001",
    "apiKeySecret": "sk_test_...",
    "environment": "test"
  }
}
```

---

## 5. Security rules

| Rule | Detail |
|------|--------|
| Platform secret | Invify **server only** — never on device, never in APK |
| Tenant `sk_*` | Secure enclave on MPOS after provisioning |
| HTTPS | Required in production |
| Rotation | Revoke partner or API key via admin; reissue |
| No admin password | Invify never stores Quasar admin credentials |

---

## 6. Errors

| HTTP | Meaning |
|------|---------|
| 401 | Missing/invalid `X-Quasar-Client-Id` or `X-Quasar-Client-Secret` |
| 403 | Partner lacks capability or vertical not allowed |
| 422 | Duplicate `clientId` when creating partner |

---

## 7. cURL example (full Invify onboarding)

```bash
# Create tenant
curl -X POST "$BASE/integration/platform/tenants" \
  -H "X-Quasar-Client-Id: INVIFY" \
  -H "X-Quasar-Client-Secret: $QPC_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","slug":"tenant-acme-001","vertical":"invify_retail"}'

# Create API key
curl -X POST "$BASE/integration/platform/tenants/$TENANT_ID/api-keys" \
  -H "X-Quasar-Client-Id: INVIFY" \
  -H "X-Quasar-Client-Secret: $QPC_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"MPOS Key","environment":"test"}'
```

---

## 8. Migration

Run after deploy:

```bash
cd iips-pay && npm run migration:run
```

Then issue INVIFY credentials via `POST /admin/platform-partners`.
