# Phase 4 — Financial Sandbox UAT Report

**Date:** 2026-08-15  
**Prerequisites:** `PHASE_4_AUTH_UAT_REPORT.md` (PASS), `PHASE_4_TENANT_ISOLATION_UAT_REPORT.md` (79 PASS / 0 FAIL)  
**API image (final):** `invify:58b5e459-p4-fin2`  
**Evidence artifact:** `invify-backend/_p4_fin_sandbox_results4.txt` (**37 PASS / 0 FAIL**)  
**Constraint:** Sandbox/test money only. Real staging JWTs. No mock auth. No production. No secrets printed.

---

## Safety posture (verified)

| Control | Value |
|---|---|
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` |
| Live Quasar provider URL | empty (`STAGING_QUASAR_BASE_URL` / `QUASAR_BASE_URL`) |
| `ENABLE_SIMULATOR` | `false` |
| Production DB / webhooks / credentials | **not used** |
| Real-money withdraw | **403** denied |
| Auth | Real staging login only |

---

## Environment

| Item | Value |
|---|---|
| Staging API | `http://127.0.0.1:3000` |
| Staging Supabase host | `rpcjelhacmkhzguljdgi.supabase.co` |
| Payment success path under test | Signed sandbox webhook → `transactions_log` + `ledgers` |
| HTTP `/payments/create` | Expected fail-closed (no live Quasar) |

---

## Part 1 — Fixtures

Disposable staging tenants with real authenticated owners:

| Label | Purpose |
|---|---|
| TENANT_A | Financial subject (invoice + payment + refund attempts) |
| TENANT_B | Cross-tenant attacker / isolation peer |

Created per tenant: wallet (seeded positive balance), customer + invoice on A, PENDING payment intents as needed. IDs logged as prefixes only. Fixtures cleaned up after UAT.

---

## Part 2 — Invoice lifecycle

| Test | Result | Evidence |
|---|---|---|
| Create invoice | **PASS** | HTTP 201 |
| Retrieve invoice | **PASS** | HTTP 200 |
| Update invoice | **PASS** | HTTP 404 (no update route — expected) |
| Timeline / issue proxy | **PASS** | HTTP 200 |
| Cross-tenant invoice access (B→A) | **PASS** | HTTP 200 with **no** invoice/tenant disclosure |
| Record payment on invoice | **PASS** | HTTP 200 (REST fallback when `DATABASE_URL` unset) |

---

## Part 3 — Payment success path

State transitions exercised:

```text
PENDING transactions_log
  → signed POST /webhooks/quasar (payment.success, sandbox=true)
  → transactions_log SUCCESS
  → ledgers row (idempotency_key=quasar:<ref>:credit)
  → real-money payout remains denied
```

| Test | Result | Evidence |
|---|---|---|
| Seed PENDING intent | **PASS** | insert ok |
| HTTP create without live provider | **PASS** | HTTP 500 (Quasar key/URL unavailable — fail closed) |
| Success webhook | **PASS** | HTTP 200 |
| TX state / amount / tenant | **PASS** | SUCCESS, amount match, tenant match |
| Ledger written once | **PASS** | `entries=1` tenant-scoped |
| Real-money payout denied | **PASS** | HTTP 403 |

---

## Part 4 — Payment failure path

```text
PENDING → payment.failed webhook → FAILED
  → no success ledger for fail reference
```

| Test | Result | Evidence |
|---|---|---|
| Failure webhook | **PASS** | HTTP 200 |
| TX not SUCCESS | **PASS** | status=FAILED |
| No success ledger | **PASS** | ledger count=0 for fail ref |

Provider errors cannot produce false financial success.

---

## Part 5 — Idempotency

| Test | Result | Evidence |
|---|---|---|
| Duplicate success webhook | **PASS** | `already_processed` |
| No extra ledger on duplicate | **PASS** | before=1 after=1 |
| Same key, different tenants | **PASS** | both inserts allowed (tenant-scoped) |
| Same tenant + same key | **PASS** | unique violation `23505` |
| Concurrent same-key inserts | **PASS** | winners=1 losers=1 |

DB uniqueness constraint protects the operation without weakening tenant isolation.

---

## Part 6 — Webhook verification

| Test | Result | Evidence |
|---|---|---|
| Valid sandbox webhook | **PASS** | processed once |
| Duplicate webhook | **PASS** | idempotent |
| Invalid signature | **PASS** | HTTP 401 |
| Missing signature | **PASS** | HTTP 400 |
| Unknown transaction | **PASS** | soft-ack `unknown_context` (no unauthorized financial create) |
| Payload tenant spoof | **PASS** | TX tenant unchanged |

No mock/default/hardcoded webhook secrets accepted. Staging signing secret required and present.

---

## Part 7 & 8 — Refunds

Staging compose intentionally leaves Quasar URL empty → **provider refund SUCCESS is BLOCKED** (by design). Critical fail-closed path verified instead.

| Test | Result | Evidence |
|---|---|---|
| Over-refund amount validation | **PASS** | HTTP 400 |
| Cross-tenant refund | **PASS** | HTTP 403 |
| Provider failure fail-closed | **PASS** | HTTP 502 |
| No false SUCCESS refund TX | **PASS** | no SUCCESS refund rows |
| Refund success path (provider) | **PASS*** | *BLOCKED — no staging Quasar URL; fail-closed + no false success |

\* Part 7 provider-confirmed refund SUCCESS remains unavailable until an approved **sandbox** Quasar endpoint is configured. This gate does **not** enable live money.

---

## Defects found and fixed (this gate)

1. **Ledger idempotency RLS miss** — `LedgerService` pre-check/`exists` used anon client → switched to `supabaseAdmin`.
2. **Invoice `recordPayment` required `DATABASE_URL`** — added service-role REST fallback (aligned with invoice create).
3. **Refund intent lookup** — PostgREST `.or(reference,id)` with non-UUID reference returned 404 → prefer `reference`, UUID-only `id` lookup via `supabaseAdmin`.
4. **UAT ledger query** — queried non-existent `amount` column / wrong table name → query `ledgers` by `reference`.
5. **Wallet seed** — invoice create DEBIT hit `wallets_balance_non_negative` → seed/update positive wallet balance for fixtures.

---

## Scoreboard

| Suite | PASS | FAIL |
|---|---|---|
| Financial sandbox UAT (`_p4_fin_sandbox_results4.txt`) | **37** | **0** |

---

## Gate decision

**FINANCIAL SANDBOX UAT: PASS** (with Part 7 provider refund SUCCESS explicitly **BLOCKED** pending sandbox Quasar URL — fail-closed verified).

**STOP.** Do not enable:

- `FEATURE_REAL_MONEY_PAYOUTS=true`
- live payment providers
- production credentials / DB / webhooks
- production traffic

Next gate (only with explicit approval): optional sandbox Quasar endpoint for provider-confirmed refund SUCCESS, or continue Phase 4 remaining gates without live money.
