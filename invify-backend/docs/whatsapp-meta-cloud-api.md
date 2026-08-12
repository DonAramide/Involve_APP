# Meta WhatsApp Cloud API (Invify)

Additive integration: does **not** replace FCM (`NotificationService`), email (`EmailService`), or existing OTP routes.

## Preferred storage: Integration Vault

Store all Meta WhatsApp settings under service identifier **`META_WHATSAPP`** (GLOBAL scope).

| Vault key | Purpose |
|-----------|---------|
| `PUBLIC_API_BASE_URL` | Public HTTPS origin for webhook callback URL |
| `WHATSAPP_GRAPH_API_VERSION` | Graph API version (default `v19.0`) |
| `WHATSAPP_ACCESS_TOKEN` | System-user / permanent access token |
| `WHATSAPP_APP_SECRET` | App secret for `X-Hub-Signature-256` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Shared secret for Meta GET handshake |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID (WABA) |
| `WHATSAPP_PHONE_NUMBER_ID` | Sending phone number ID |

Resolution order: **Integration Vault → process.env** (boot also hydrates empty env from vault).

### Upsert via API

```http
PUT /vault/meta-whatsapp
Content-Type: application/json

{
  "PUBLIC_API_BASE_URL": "https://api.invify.app",
  "WHATSAPP_GRAPH_API_VERSION": "v19.0",
  "WHATSAPP_ACCESS_TOKEN": "...",
  "WHATSAPP_APP_SECRET": "...",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN": "...",
  "WHATSAPP_BUSINESS_ACCOUNT_ID": "...",
  "WHATSAPP_PHONE_NUMBER_ID": "...",
  "environment": "PRODUCTION"
}
```

Status (never returns secrets):

```http
GET /vault/meta-whatsapp/status
```

### Seed from env

```bash
# Reads WHATSAPP_* / PUBLIC_API_BASE_URL from .env and upserts into vault
npx ts-node scratch/seed_credentials.ts
```

## Environment fallback (optional)

Same keys may also be set in `.env` for local/dev. Prefer vault in production.

```
PUBLIC_API_BASE_URL=
WHATSAPP_GRAPH_API_VERSION=v19.0
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
```

## Meta console setup

1. Create / open a Meta App with the **WhatsApp** product.
2. WhatsApp → **Configuration** → **Webhook**.
3. **Callback URL**: `{PUBLIC_API_BASE_URL}/webhooks/whatsapp`  
   Example: `https://api.invify.app/webhooks/whatsapp`
4. **Verify token**: exact value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in vault (or env).
5. Subscribe to the **`messages`** field.
6. Approve templates: `invify_auth_otp`, `invify_invoice`, `invify_receipt`, `invify_payment_reminder`.

## Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/webhooks/whatsapp` | Meta subscription verification |
| `POST` | `/webhooks/whatsapp` | Status + inbound message events |
| `PUT` | `/vault/meta-whatsapp` | Upsert vault credentials |
| `GET` | `/vault/meta-whatsapp/status` | Configured? (no secrets) |

## Migrations

```bash
npx supabase db push
# or apply: supabase/migrations/20260810230000_whatsapp_message_log.sql
```

## Tests

```bash
npm test -- --testPathPattern=whatsapp
```
