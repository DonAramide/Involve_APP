# INVIFY — Independent Database Backup Architecture

**Status:** DESIGN APPROVED FOR IMPLEMENTATION — **not installed / not scheduled yet**  
**Date:** 2026-11-06 (UTC)  
**Production project:** `jjixrywfnaijvahmvcwj`  
**Staging project:** `rpcjelhacmkhzguljdgi`  
**Supabase plan:** Free (unchanged; no PITR / no platform scheduled backups)

This document is the architecture and implementation plan. No packages, timers, or dumps are installed until an authorised operator explicitly approves Phase B.

---

## 1. Inspection findings (VPS `vmi3100956`)

| Area | Finding |
|---|---|
| Disk | Single 150 G volume; **~115 G free** on `/` |
| Local backup dirs | `/srv/invify/backups` (~21 M, **app rollback trees**, not DB dumps); `/var/backups/invify` (fee-distribution artefacts); `/etc/invify/backups` empty |
| Clients | `pg_dump` / `pg_restore` / `psql` **16.15**; `openssl`; `gzip`; `gpg` |
| Missing | `rclone`, `aws`, `restic`, `borg`, `age`, Supabase CLI |
| Automation | No backup systemd timers / matching cron |
| Secrets | `/etc/invify/production-database.url` exists (root `0600`, 110 B); production process has **no** `DATABASE_URL`; deploy **cannot** sudo-read without password |
| Network | `db.<ref>.supabase.co` resolves **IPv6-only** → direct `:5432` **unreachable** from this VPS; **`aws-0-eu-central-1.pooler.supabase.com:5432` and `:6543` reachable (IPv4)** |
| External object store | **None** configured (no MinIO container, no rclone remotes) |
| Notify path | SMTP credentials present on production backend process; `curl` + `jq` available |
| Users | system `backup` (nologin); `deploy` has sudo group but password required for privileged reads |

**Implication:** Logical backups must use the **Supabase connection pooler in session mode** (port **5432**), not the IPv6-only direct host, until IPv4 add-on or dual-stack egress exists.

---

## 2. Goals

1. Daily full logical backup of production (and optionally staging).  
2. Mandatory pre-migration and pre-release backup gates.  
3. Custom-format (`pg_dump -Fc`) compressed dumps preserving schema, data, functions, triggers, constraints, indexes, RLS, grants, and migration history tables where present.  
4. Encryption at rest; keys outside backup trees.  
5. Dual location: **local encrypted copy on VPS** + **encrypted copy on independent external object storage**.  
6. Retention: 7 daily / 4 weekly / 3 monthly; never delete latest verified backup.  
7. Verification + restore drill into an **isolated** target (never production).  
8. Failed backup blocks production migrations and major releases.

---

## 3. Target architecture

```
┌─────────────────────┐     session-mode pooler      ┌──────────────────────┐
│ Supabase Postgres   │◄────────────────────────────►│ invify-db-backup     │
│ jjixrywfnaijvahmvcwj│   (IPv4, :5432)              │ operator + systemd   │
└─────────────────────┘                              └──────────┬───────────┘
                                                                │
                     pg_dump -Fc ──► .dump ──► openssl enc ──► .dump.enc
                                                                │
                              ┌─────────────────────────────────┼────────────────┐
                              ▼                                 ▼                │
                    /var/backups/invify-db/            External object store     │
                    (local encrypted)                  (B2 / R2 / S3 via rclone) │
                              │                                 │                │
                              └──────── manifest.json + SHA-256 ┘                │
                                                                                 │
                                                         SMTP / webhook on fail ─┘
```

### Components (to install only after approval)

| Component | Role |
|---|---|
| Dedicated OS user `invify-backup` | Runs dumps; no app deploy rights |
| Secrets: `/etc/invify/backup/` | `database.url`, `backup.key`, rclone config — mode `0600`, owner root:`invify-backup` |
| Scripts under `/usr/local/lib/invify-backup/` | `backup.sh`, `verify.sh`, `retain.sh`, `upload.sh`, `gate-check.sh` |
| Local store | `/var/backups/invify-db/{production,staging}/` mode `0750` |
| External store | rclone remote (recommended: **Cloudflare R2** or **Backblaze B2**) — **required** for independence |
| systemd | `invify-db-backup.service` + `invify-db-backup.timer` (daily) |
| Gate hook | `invify-db-backup-gate` exit 0 only if latest verified backup age ≤ configured max (e.g. 36 h) |

### Dump profile

```text
pg_dump --format=custom --compress=9 \
  --no-owner --no-acl=false \
  --verbose \
  "$DATABASE_URL_SESSION_POOLER"
```

- Prefer **session-mode pooler** URL form:  
  `postgresql://postgres.<project_ref>@aws-0-<region>.pooler.supabase.com:5432/postgres`  
- Do **not** use transaction pooler (`:6543`) for `pg_dump`.  
- Capture companion artefacts:  
  - `*.dump.enc` — encrypted dump  
  - `*.manifest.json` — metadata (no secrets)  
  - `*.sha256` — checksum of ciphertext  
  - optional `roles.sql.enc` via `pg_dumpall --roles-only` if privileges allow (often limited on Supabase)

### Encryption

- AES-256-CBC or AES-256-GCM via `openssl enc` (or `age` if installed later).  
- Key file: `/etc/invify/backup/backup.key` (32+ bytes random), **never** under `/var/backups`.  
- Key escrow: offline copy held by recovery owner (password manager / HSM), not in git.

---

## 4. Independent storage decision

| Option | Fit | Notes |
|---|---|---|
| Second folder on same VPS | **Rejected** | Not independent |
| Hostinger / Contabo volume snapshot alone | Insufficient | Still couples to provider failure modes |
| **rclone → Cloudflare R2** | **Recommended** | S3-compatible, no egress fees typical, cheap |
| rclone → Backblaze B2 | Strong alternative | Well-proven for backups |
| rclone → AWS S3 | Acceptable | Higher cost if not already used |
| Existing MinIO on VPS | **Unavailable** | No MinIO container found |

**Operator must provision** an external bucket + access key before Phase B can satisfy the dual-location requirement.

---

## 5. Retention policy

| Class | Keep | Selection rule |
|---|---|---|
| Daily | 7 | Last 7 successful verified dailies |
| Weekly | 4 | Sunday (or first success of ISO week) |
| Monthly | 3 | First verified success of calendar month |
| Pin | 1+ | **Latest verified** never deleted by retain job |

Retention runs after successful verify + upload. Failures do not prune.

---

## 6. Verification (mandatory per backup)

A dump exit code alone is **not** success. Each run must:

1. `pg_dump` exit 0  
2. Ciphertext size ≥ configured minimum  
3. SHA-256 of `.dump.enc` recorded and re-hashed  
4. `openssl` decrypt dry-run to temp + `pg_restore -l` list TOC (schema inventory)  
5. Manifest fields: timestamp UTC, project ref, PG client version, server version (if queryable), bytes, status, local path basename, remote object key, gate-id  

See `DATABASE_BACKUP_VERIFICATION.md`.

---

## 7. Gates

| Gate | Rule |
|---|---|
| Pre-migration | `gate-check.sh production` must pass (verified backup ≤ 36 h, remote object present) |
| Pre-release | Same |
| Daily timer failure | SMTP alert; gate remains closed until success |

Application rollback dirs under `/srv/invify/backups/production` are **explicitly out of scope** for DB recovery (see Phase 2.6 recovery readiness).

---

## 8. Implementation phases (do not skip ahead)

### Phase A — Approval (this document)

- [ ] Operator accepts architecture  
- [ ] Operator chooses external store (R2 / B2 / S3)  
- [ ] Operator supplies session-mode pooler URI into root-owned secret file (no chat/git)  
- [ ] Operator confirms encryption key escrow process  

### Phase B — Install (after explicit go-ahead)

1. Create `invify-backup` user + directories + secrets perms  
2. Install scripts from repo `scripts/db-backup/`  
3. Install `rclone` + configure remote  
4. Run **one** manual production backup + verify + upload  
5. Enable systemd timer  
6. Wire gate script into migration/release checklists  

### Phase C — Restore drill

1. Create isolated Supabase project or local Docker Postgres 16  
2. Restore latest verified backup  
3. Run verification queries  
4. Destroy restore target  
5. File restore report  

**Never restore over production during routine testing.**

---

## 9. Estimated storage & cost

Assumptions (to be replaced after first measured dump):

| Item | Estimate |
|---|---|
| Logical dump size (compressed custom) | 0.5–5 GiB typical for current Free-tier footprint (measure on first run) |
| Encrypted local retention (~14 objects effective with weekly/monthly) | ~15–70 GiB worst case → fits in 115 G free with headroom |
| External store (same retention) | Same order as local |
| R2 / B2 storage | ≈ **$0.00–$1.50 / month** at &lt;50 GiB |
| rclone / openssl / pg client | $0 (OSS) |
| Operator time | ~4–8 h install + first drill; ~15 min/week review |

---

## 10. Remaining recovery gaps (until Phase C complete)

1. **No verified independent DB backup exists today.**  
2. **No external object store** configured.  
3. **No automated timer.**  
4. **No restore drill evidence.**  
5. Direct DB host IPv6-only — pooler dependency; document failover if pooler region changes.  
6. Supabase Free: **no PITR** — RPO is “last verified dump” only (up to ~24 h + failure window).  
7. `production-database.url` not readable by deploy — root must place a **session-pooler** URI for the backup operator.  
8. Roles/global objects may be incomplete under Supabase restricted roles.  
9. Storage buckets (Supabase Storage files) are **out of scope** of `pg_dump` — separate object backup needed later if required.

---

## 11. Safety constraints (unchanged)

- Do not change Supabase plan.  
- Do not apply migrations as part of backup work.  
- Do not restart production services.  
- Do not modify production data.  
- Do not expose credentials, URLs with passwords, or public download links.  
- Keep `FEATURE_REAL_MONEY_PAYOUTS=false` during any restore drill.
