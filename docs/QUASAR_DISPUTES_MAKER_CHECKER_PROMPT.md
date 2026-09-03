# Quasar AI prompt — Invify maker-checker dispute debits

Copy everything below the line into Quasar AI. Invify will call these APIs after a **different** checker approves a case. Do not debit on draft/create.

---

You are implementing Quasar Payment APIs that Invify (platform `https://staging.invify.org`, production `https://app.invify.org`) will call for **refunds, chargebacks, and manual tenant wallet debits**.

## Why this exists

Invify finance operators must debit a merchant/tenant through Quasar from the admin screen **Refunds & Chargebacks**. Money must **not** move when the maker files the case. Only after a **second operator (checker)** approves does Invify call Quasar. If Quasar fails, Invify posts **no local ledger** (fail-closed).

Invify already has:

- `POST /payments/intents/{reference}/refunds` with `{ amount }` in **kobo** for original-payment refunds. Keep this. Invify will keep using it when `type=REFUND` and `originalPaymentReference` is set.
- Tenant auth: `Authorization: Bearer sk_test_*` / `sk_live_*`.
- Base URL shape: `{QUASAR_BASE_URL}` already includes `/api/v1` (example: `https://api-quasar.invify.org/api/v1`).
- Envelope: `{ "responseCode": "00", "responseMessage": "...", "data": { ... } }`. Non-`00` is an error.
- Header `Idempotency-Key` on mutations. Same key + same body must replay the original result, never double-debit.
- Header `X-Correlation-Id` on every request.
- Webhooks to Invify: `POST https://<invify-host>/webhooks/quasar` with `X-Quasar-Signature` HMAC (existing scheme).

## New APIs to implement (relative to `/api/v1`)

### 1. `POST /disputes/debits`

Debit the **tenant/merchant wallet** on Quasar. Invify only sends this after checker approval.

**Headers (required)**

- `Authorization: Bearer <tenant sk>`
- `Idempotency-Key: dispute-debit:<invifyCaseId>` (Invify always sends this)
- `X-Correlation-Id`

**JSON body**

```json
{
  "invifyTenantId": "uuid",
  "quasarTenantId": "quasar-tenant-uuid",
  "invifyCaseId": "uuid",
  "amount": 150000,
  "currency": "NGN",
  "type": "CHARGEBACK",
  "reason": "Card scheme chargeback — RRN 123",
  "originalPaymentReference": "optional-payment-intent-ref",
  "makerEmail": "maker@invify.org",
  "checkerEmail": "checker@invify.org",
  "metadata": {
    "makerId": "uuid",
    "checkerId": "uuid",
    "tenantName": "REVEREND PARISH"
  }
}
```

Rules:

- `amount` is **integer kobo**. Reject decimals and amounts `<= 0`.
- `type` is one of `REFUND` | `CHARGEBACK` | `MANUAL_DEBIT`.
- `makerEmail` and `checkerEmail` are required and **must not be equal** (case-insensitive). Reject with `responseCode` `91` and message `Maker-checker violation`.
- Persist on the debit record: type, reason, invifyCaseId, makerEmail, checkerEmail, originalPaymentReference, correlation id, idempotency key.
- Debit the merchant/tenant available balance. If funds are insufficient, **do not overdraft** unless an explicit product flag exists; return `responseCode` `51` `INSUFFICIENT_FUNDS`. No partial debit.
- On success return HTTP 200/201 with `responseCode: "00"` and `data`:

```json
{
  "id": "qdb_...",
  "invifyCaseId": "uuid",
  "amount": 150000,
  "currency": "NGN",
  "type": "CHARGEBACK",
  "status": "POSTED",
  "walletId": "...",
  "balanceAfter": 880000,
  "postedAt": "2026-09-03T18:00:00.000Z"
}
```

- Status values: `PENDING` (only if you post async), `POSTED`, `FAILED`. Invify treats `POSTED` / `SUCCESS` / `COMPLETED` as success.
- If you process asynchronously: accept the request, return `status: PENDING` plus `id`, then webhook `dispute.debit.posted` or `dispute.debit.failed`. Invify will wait on `APPROVED_EXECUTING` until the webhook.
- Preferred: **synchronous POSTED** so Invify can ledger immediately.

### 2. `GET /disputes/debits/{id}`

Return the debit record (same `data` shape). Used when Invify timed out and polls.

### 3. Optional `POST /disputes/debits/{id}/reverse`

Do **not** auto-reverse from Invify in v1. If you add it, require a new Invify case id + different maker/checker emails + Idempotency-Key. Emit `dispute.debit.reversed`.

## Webhooks (required)

POST to the tenant’s registered Invify webhook URL (`/webhooks/quasar`). Sign with the existing `X-Quasar-Signature` scheme.

Events:

| event | when |
| --- | --- |
| `dispute.debit.posted` | debit committed on Quasar |
| `dispute.debit.failed` | debit rejected (insufficient funds, etc.) |
| `dispute.debit.reversed` | only if reverse API exists |

Payload `data` **must** include:

```json
{
  "event": "dispute.debit.posted",
  "timestamp": "2026-09-03T18:00:01.000Z",
  "data": {
    "id": "qdb_...",
    "invifyCaseId": "<same uuid Invify sent>",
    "invifyTenantId": "uuid",
    "tenantId": "<quasar tenant id>",
    "amount": 150000,
    "currency": "NGN",
    "type": "CHARGEBACK",
    "status": "POSTED",
    "reference": "optional-quasar-ref"
  }
}
```

`invifyCaseId` is mandatory. Invify keys the case off this field.

## Quasar-side audit trail (required)

Append-only table (no updates/deletes), e.g. `dispute_debit_audit`:

- `debit_id`, `event_type` (`CREATED`, `POSTED`, `FAILED`, `REPLAYED_IDEMPOTENT`, `WEBHOOK_SENT`)
- `actor_email` (maker or checker or `system:webhook`)
- `idempotency_key`, `correlation_id`
- `amount`, `currency`, `type`
- `invify_case_id`
- `payload` JSON
- `created_at`

Every successful or failed debit must write at least one audit row. Idempotent replays write `REPLAYED_IDEMPOTENT` and return the original `data` (same `id`, no second money movement).

## What Invify will call (do not change these Invify paths)

| Invify (after checker approve) | Quasar |
| --- | --- |
| REFUND + original payment ref | existing `POST /payments/intents/{reference}/refunds` `{ amount, reason }` kobo |
| CHARGEBACK, MANUAL_DEBIT, or REFUND without original ref | **new** `POST /disputes/debits` |

Invify ledger after Quasar success:

- Debit `USER_WALLET`
- Credit `REFUNDS` / `CHARGEBACKS` / `ADJUSTMENTS`

If Quasar returns non-00 or HTTP 5xx/timeout, Invify does **not** credit/debit locally.

## Tests you should add on Quasar

1. Same `Idempotency-Key` twice → one debit, same `id`.
2. `makerEmail === checkerEmail` → rejected, no debit.
3. Insufficient funds → `51`, no debit, webhook `dispute.debit.failed` if async.
4. Happy path CHARGEBACK → wallet down by `amount`, audit row, webhook `dispute.debit.posted`.
5. HMAC webhook verifies with the tenant signing secret Invify already stores.

Implement the APIs, persistence, wallet posting, audit table, webhooks, and tests. Reply with the exact routes, request/response examples, error codes, and the SQL for the debit + audit tables.
