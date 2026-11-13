# HMO registration_channel — Post-deploy verification

**Date:** 2026-10-30  
**Scope:** Staging only (`staging.invify.org`, Supabase `rpcjelhacmkhzguljdgi`)  
**Restrictions observed:** No production deploy; no `SCHOOL_ID_CARD_SQL`; no unrelated migrations applied in this pass; `dist-from-image/` not overwritten; real-money / fee posting unchanged.

---

## 1. Deploy / restart identity

| Item | Value |
|------|--------|
| Release id | `20261030T1639Z-ddf7e192-channel` |
| Git sha (manifest) | `ddf7e192` |
| Archive | `/srv/invify/releases/staging-20261030T1639Z-ddf7e192-channel` |
| Backend `app.js` sha256 | `75c3ea2f1e986ab4dc7eb93c1c72831c87e243619e18ce6dca09b7963a64f3fd` |
| Admin index | `index-6RfcEDRN.js` |
| Admin index sha256 | `9a7454fb0d34f021cdf43c91ddca32e9be41e56a1c0bbf5b269a55ca117ce562` |
| Backend file marker | `registration_channel` present in governance service JS (16 hits) |
| Service | `invify-staging-backend.service` **active** |
| Restart timestamp | **2026-10-30 18:12:19 CET** (MainPID **308235**) |

---

## 2. Health results

| Check | Result |
|-------|--------|
| Staging `http://127.0.0.1:3004/livez` | **200** `{"status":"ok","check":"livez"}` |
| Staging `http://127.0.0.1:3004/readyz` | **200** `{"status":"ready","variant":"STAGING"}` |
| Production `http://127.0.0.1:3005/livez` | **200** `{"status":"ok","check":"livez"}` (untouched) |
| Public admin bundle | Serves `index-6RfcEDRN.js` |
| Platform providers API (unauth) | **401** (route present, auth enforced) |
| Provider statistics API (unauth) | **401** |
| Journal since restart | **0** matches for `Error:` / `FATAL` / `protected-flag` / `refusing` |

---

## 3. Migration investigation (NOT applied in this verification pass)

**File:** `invify-backend/proposals/DO_NOT_APPLY_hw_provider_registration_channel.sql`

### What it changes

| Object | Change |
|--------|--------|
| Table | `public.hw_providers` only |
| Column | `ADD COLUMN IF NOT EXISTS registration_channel text` |
| Backfill | `UPDATE … SET registration_channel = 'platform' WHERE registration_channel IS NULL` |
| Default | `DEFAULT 'platform'` |
| Nullability | `SET NOT NULL` after backfill |
| Constraint | `hw_providers_registration_channel_check` → `IN ('platform','self_service','agent')` (add if missing) |
| Index | `ix_hw_providers_registration_channel` (`IF NOT EXISTS`) |
| Triggers / policies / other tables | **None** |

### Target environment

- Header: **DO NOT APPLY** without approval; staging project for this release is `rpcjelhacmkhzguljdgi`.
- Does **not** reference production project `jjixrywfnaijvahmvcwj`.
- This verification did **not** execute the SQL file.

### Staging schema probe (read-only via service role)

Host confirmed: `rpcjelhacmkhzguljdgi.supabase.co`

| Probe | Result |
|-------|--------|
| Select `id, registration_channel` | **Succeeds** (column exists) |
| Provider count | **6** |
| Sample values | All sampled rows = `'platform'` |
| Existing providers still readable | **Yes** (codes include `hhmo`, `3op0kk`, `mhmo`, sandbox test HMOs) |

### Safety / compatibility / idempotency

| Question | Answer |
|----------|--------|
| Safe with existing rows? | **Yes** — additive column; backfill sets historical rows to `platform` |
| Idempotent? | **Mostly yes** — `IF NOT EXISTS` on column/constraint/index; re-run UPDATE only touches NULLs |
| Data backfill required? | **Yes, built into the script** (NULL → `platform`); already reflected on staging rows |
| Already present on staging? | **Yes** — schema appears **already applied** (column + values observed) |
| Re-apply needed? | **No** for staging unless you want a no-op idempotent re-run for audit trail |

### Recommendation

**Do not re-apply on staging unless you explicitly want a documented re-run.** Schema is already live.  
**Do not apply to production** without a separate change window.

If you still want formal approval language: *approval would only be needed for a first-time apply; staging first-time apply appears to have already occurred outside this verification agent turn.*

---

## 4. HMO Registry acceptance

| Check | Result |
|-------|--------|
| Hard-refresh public site loads new admin | **Pass** (`index-6RfcEDRN.js`) |
| Channel UI markers in deployed admin assets | **Pass** (server-side grep for `self_service` / `registrationChannel` / channel labels) |
| Authenticated Registry UI (Channel column visible in browser) | **Blocked** — browser redirected to `/admin/login`; no credentials available to this agent |
| Existing provider records in DB | **Pass** — 6 rows remain |
| Channel values for existing rows | **Pass** — `platform` |
| Governance route auth still enforced | **Pass** — providers/statistics return **401** without token |
| Browser console / authenticated API errors | **Not fully verified** (login required) |

**Operator ask:** Sign in at https://staging.invify.org/hmo/registry, hard-refresh, confirm Channel column + filter, open a provider, and confirm no console/network failures. Report any anomaly.

---

## 5. Outstanding blockers

1. **Authenticated UI walkthrough** still needs a human operator session (Channel column visual confirm).  
2. Migration **already present** on staging — treat as done; no further SQL required for this feature on staging.  
3. Optional follow-ups (unchanged / out of scope here): finance grants SQL, claims workflow SQL, `SCHOOL_ID_CARD_SQL`.

---

## 6. Verdict

| Area | Verdict |
|------|---------|
| Backend restart + health | **PASS** |
| Production untouched | **PASS** |
| Code deploy identity | **PASS** (`…-channel` + `index-6RfcEDRN.js`) |
| Migration apply (this pass) | **NOT RUN** (correctly held) |
| Migration needed on staging | **NO** — already applied |
| HMO Registry full UAT | **PARTIAL** — DB + unauth API + static assets OK; logged-in UI pending operator |

*End of report. No production changes. No migration applied during this verification.*
