# INVIFY PRODUCTION RELEASE AUDIT

**Document:** `docs/releases/INVIFY_PRODUCTION_RELEASE_AUDIT.md`  
**Audit started (UTC):** 2026-11-05T16:54Z  
**Auditor workspace:** `C:\dev\Involve_APP_health`  
**Release intent:** Controlled production release of registration, attendance, Gate Clock, ID Cards (incl. 12-char Invify identity), and **operational** HMO — **excluding** unresolved HMO monetisation / live payouts.  
**Current verdict:** **PHASE 1 CONSOLIDATION COMPLETE — PRODUCTION DEPLOY/MIGRATE STILL BLOCKED** pending DB identity confirmation + backup gates (§12).  
**Release candidate SHA:** `5465431d9b53308f28100833ecb2b9e01b763dc8` (`release/invify-production-2026`)

---

## 1. Host and service topology (verified)

| Item | Value | Evidence |
|---|---|---|
| Host | `vmi3100956` / `156.67.25.192` | SSH `hostname` |
| Staging domain | `staging.invify.org` → `127.0.0.1:3004` | Nginx `invify-staging` |
| Production API | `api.invify.org` → `invify_production_api_3005` | Nginx `api.invify.org.conf` |
| Production app | `app.invify.org` → `invify_production_app_3005` | Nginx `app.invify.org.conf` |
| Staging backend unit | `invify-staging-backend.service` **active** | systemd |
| Production backend unit | `invify-production-backend.service` **active** | systemd |
| Staging health | `http://127.0.0.1:3004/livez` + `/readyz` → **200** | curl |
| Production health | `http://127.0.0.1:3005/livez` + `/readyz` → **200** | curl |

**Isolation note:** Staging and production co-reside on the same VPS. Deploy scripts must never restart the wrong unit or write into the wrong release directory.

### 1.1 Staging runtime path

- Drop-in: `/etc/systemd/system/invify-staging-backend.service.d/20-candidate-20261028.conf`
- ExecStart: `/usr/local/bin/invify-staging-backend-start-candidate`
- CWD / code: `/srv/invify/releases/candidate-20261028/invify-backend`
- Env file (root-only): `/etc/invify-staging-backend.env`
- Start guard refuses `FEATURE_REAL_MONEY_PAYOUTS=true` or `FEE_ORCHESTRATION_LIVE=true`

### 1.2 Production runtime path

- Symlink: `/srv/invify/current/production` → `/srv/invify/releases/production-20261004-support-mc`
- ExecStart: `/usr/bin/node /srv/invify/current/production/backend/dist/app.js`
- WorkingDirectory: `/srv/invify/current/production`
- Env file (root-only): `/etc/invify/invify-production.env`
- Explicit `PORT=3005`, `HOST=127.0.0.1`

### 1.3 Production release markers

From `/srv/invify/releases/production-20261004-support-mc/MANIFEST.json`:

| Field | Value |
|---|---|
| `commit` | `58cfbf8519f33a96ae35ad4272bc2cd0696f1cfe+working-copy` |
| `created_utc` | `2026-10-02T15:18:37Z` |
| `release_path` (original) | `/srv/invify/releases/production-20261002-151739-full-release` |
| `rollback_path` | `/srv/invify/backups/production/rollback-pre-full-release-20261002-151739` |
| `prev_release` | `/srv/invify/releases/production-20260926-133126-ledger-blank` |

`COMMIT` file on disk: `58cfbf8519f33a96ae35ad4272bc2cd0696f1cfe+working-copy`  
Production `backend/dist/app.js` mtime: **2026-10-07** (post-dates manifest create).

---

## 2. Git state (local workspace)

| Item | Value |
|---|---|
| Remote | `https://github.com/DonAramide/Involve_APP.git` |
| Checked-out branch | `feature/va-institution-provider-routing` |
| HEAD (clean tip) | `4cdfc54a312d1322f0c39cbbb7557486cc952697` — `fix(quasar): enforce tenant-scoped VA credentials` |
| `origin/main` | `fdd830b83146e4d1d7d87e845a42a47a5008f8f8` — Merge PR #4 `fix/ghcr-staging-image-tag` |
| Local `main` | `fffad640` (**behind** `origin/main` by 2) |
| Production deployed base commit | `58cfbf8519f33a96ae35ad4272bc2cd0696f1cfe` (**ancestor of** `origin/main`) |
| Dirty tree | **~172** porcelain lines (**~106** modified, **~66** untracked) |

### 2.1 Important implication

The **approved staging feature surface is largely uncommitted** on the current branch (school-gate, ID-card identity, gate emails, HMO UI, service-mode terms, institute affiliation tile, Flutter print/CR80, migrations `20261105*`, etc.).

`git add -A` is **forbidden**. Consolidation must selectively stage approved paths and leave aside:

- `_build_candidates/`, `_staging_upload/`, APK binaries
- `invify-backend/proposals/DO_NOT_APPLY_*`
- Experimental HMO monetisation modules not authorised for live fee/payout
- Pure docs noise unless needed for the release record

---

## 3. Branch inventory and merge matrix

Counts are `git rev-list --left-right --count origin/main...<branch>` → `behind\tahead` relative to `origin/main`.

| Feature area | Source branch / tip | Ahead of main | Already on main? | Conflicts / notes | Release decision |
|---|---|---|---|---|---|
| CI / TS hygiene | `fix/ci-backend-typescript` `ea634c0a` | 0 | Yes (merged via PR #3) | — | Already included via main |
| GHCR staging tag | `fix/ghcr-staging-image-tag` `f25420bb` | 0 | Yes (PR #4 on `origin/main`) | — | Already included via main |
| HMO phase-1 mobile tile | `feature/health-insurance-phase1` `12f2cc2b` | 1 | Partially (PR #1 lineage on main) | Overlaps durable entitlement | Review; prefer main + selective WIP |
| Durable entitlement | `feature/platform-durable-entitlement` / `cursor/production-migration-remediation` `12f2cc2b` | 1 | Partially | Same tip as health-insurance-phase1 locally | Include only if not already in main tip |
| HMO management platform | `feature/hmo-management-platform` `ddf7e192` | 4 | No | Contains School ID-card ops materials | **Include** after diff vs main + WIP |
| VA / HMO staging candidate | `feature/va-hmo-staging-candidate` `b4956971` (worktree) | 10 | No | Staging runtime candidate historically | **Source of truth for staging overlays**; reconcile with dirty WIP |
| VA institution routing | `feature/va-institution-provider-routing` `4cdfc54a` + **dirty WIP** | 8 + uncommitted | Tip partially | Current workspace; holds latest gate/ID/HMO edits | **Primary integration source** after curated commit |
| Recovery staging | `recovery/staging-hmo-main` `99ced9c6` | 5 | No | Mail-identity recovery | Selective only if still needed |
| Production readiness | `cursor/production-readiness-hardening` `253717e0` | (local ahead 1) | Unknown | Checkpoint branch | Inspect; do not merge blindly |
| Historical remotes | `invify`, `onpos`, `pro_version`, `with_school`, `with_services` | — | Legacy | Not assumed for this release | **Exclude** unless proven required |
| `release/quasar-first-slice` | Not present locally | — | — | Named in brief but absent | N/A |

### 3.1 Candidate release commit (planned, not yet created)

| Role | Commit / identity |
|---|---|
| Production base (live) | `58cfbf85…` (+ working-copy overlays since 2026-10-02/07) |
| Git integration base (proposed) | `origin/main` = `fdd830b8…` (**contains** prod base) |
| Staging runtime candidate | Host path `candidate-20261028` + overlays; git tip historically `b4956971` / current dirty `4cdfc54a` |
| Release integration branch | `release/invify-production-2026` (worktree `C:\dev\_wt_invify_release_2026`) |
| Release candidate SHA | `5465431d9b53308f28100833ecb2b9e01b763dc8` |

---

## 4. Database identity (partial — migration gate)

### 4.1 Documented project refs (prior Phase 3 runbooks)

| Environment | Supabase project ref | Notes |
|---|---|---|
| Staging (app data) | `rpcjelhacmkhzguljdgi` | Phase 3H/3I/3J docs |
| Production (app data) | `jjixrywfnaijvahmvcwj` | Phase 3I runbook; **must re-confirm** |

### 4.2 Independent confirmation status

| Check | Result |
|---|---|
| Deploy user can read `/etc/invify/invify-production.env` | **No** (mode `600` root) |
| Deploy user can read `/etc/invify-staging-backend.env` | **No** |
| Production admin bundle contains `jjixrywfnaijvahmvcwj` | **Yes** (≥1 match under `/srv/invify/current/production/admin`) |
| Staging admin bundle contains staging ref in assets | **0** matches for `rpcjelhacmkhzguljdgi` in candidate admin assets at audit time (bundle may minify/host differently — **do not treat as proof**) |
| Live DB migration history queried | **Not done** — blocked until connection identity confirmed |

**Rule:** Do **not** execute migrations against production until an operator with env access confirms production `SUPABASE_URL` / DB host matches `jjixrywfnaijvahmvcwj` (or the current authorised production project), and staging remains `rpcjelhacmkhzguljdgi`.

---

## 5. Migration inventory (workspace; apply status TBD)

### 5.1 Feature migrations present under `invify-backend/supabase/migrations/` (post–Oct 2026 focus)

| Filename | Purpose (summary) | Prod apply? | Staging apply? |
|---|---|---|---|
| `20261015000000_school_attendance_management.sql` | Attendance management | **Unknown** | Assumed used in staging programme |
| `20261015010000`–`20261015050000` `hw_*` | HMO foundation → RLS audit | **Unknown** | Staging programme |
| `20261018000000_hw_50_profit_sharing.sql` | Profit sharing | **Unknown / review** | Review vs monetisation ban |
| `20261020000000_institution_registry_and_routing_policy.sql` | Institution registry | **Unknown** | Staging |
| `20261022000000_hw_60_hmo_institution_portal.sql` | Institution portal | **Unknown** | Staging |
| `20261023000000_hw_70_tenant_mobile_hmo_experience.sql` | Mobile HMO experience | **Unknown** | Staging |
| `20261024000000_institution_category_and_tenant_branding.sql` | Category / branding | **Unknown** | Staging |
| `20261025000000_hw_facility_logo_and_coordinates.sql` | Facility logo | **Unknown** | Staging |
| `20261026120000_hw_platform_entitlements.sql` | Platform entitlements | **Unknown** | Staging |
| `20261026220000_hw_bank_hmo_offerings.sql` | Bank / HMO offerings | **Unknown** | Staging |
| `20261026233000_school_id_cards_and_entry_exit.sql` | ID cards + gate entry/exit | **Unknown** | Staging (schema probe required) |
| `20261105060000_school_id_card_invify_code.sql` | 12-char Invify identity | **Unknown** | Applied in staging programme |
| `20261105130000_school_gate_notify_defaults_on.sql` | Gate notify defaults ON | **Unknown** | Staging intent |

### 5.2 Explicitly excluded proposals (`invify-backend/proposals/`)

Do **not** apply in this production release:

- `DO_NOT_APPLY_hmo_monetisation_grants.sql`
- `DO_NOT_APPLY_hmo_service_fee_catalog.sql` (+ seed)
- `DO_NOT_APPLY_hw_platform_finance_grants.sql`
- `DO_NOT_APPLY_bank_account_update_requests.sql` (until Phase 7 authorised with review)
- Other `DO_NOT_APPLY_*` / `PENDING_APPROVAL_*` files

Full per-migration staging/production checksum status → deferred to `INVIFY_PRODUCTION_MIGRATION_MANIFEST.md` after DB identity confirmation.

---

## 6. Feature flags and financial safety (required for this release)

| Flag / policy | Required production posture |
|---|---|
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` |
| `FEE_ORCHESTRATION_LIVE` | unset / false (no live fee posting) |
| `HMO_FEE_OWNERSHIP_APPROVED` | **unset** |
| HMO tenant wallet debits for unresolved service fee | **disabled** |
| Institution HMO earnings from unresolved fee | **disabled** |
| Live institution payouts | **disabled** |
| Insurer activation / premium rules | **preserve** |

Staging start script already refuses protected flags; production env must be verified the same way by an operator with file access.

---

## 7. Deployment architecture (target)

```
[Git release/invify-production-2026]
        │
        ├─ build backend dist (tsc from source; never dist-from-image)
        ├─ build admin Vite production bundle (prod API + prod Supabase)
        └─ build Flutter production APK/AAB (prod endpoints; no store publish)
                │
                ▼
[VPS 156.67.25.192]
  /srv/invify/releases/production-<stamp>-invify-2026/   ← new versioned dir
  symlink /srv/invify/current/production → new release
  systemd restart invify-production-backend ONLY
  nginx app.invify.org / api.invify.org stay on :3005
  staging candidate-20261028 / :3004 untouched
```

---

## 8. Rollback strategy (outline)

| Layer | Action |
|---|---|
| Backend/admin | Re-point `/srv/invify/current/production` to previous release (`production-20261004-support-mc` or documented rollback path); restart `invify-production-backend` |
| Nginx | Restore prior site files only if changed; otherwise no-op |
| Database | Prefer **forward-fix** migrations; do not drop enums/types; irreversible changes require stop + report |
| Feature flags | Disable new capabilities via env without schema rollback where possible |
| Mobile | Prior APK retained locally; store publish not authorised — sideload prior artifact |
| Preserve | Keep previous production release directory until post-deploy verification passes |

Documented historical rollback path from manifest:  
`/srv/invify/backups/production/rollback-pre-full-release-20261002-151739` (verify still present before cutover).

---

## 9. Branch consolidation plan (next executable steps)

1. **Gate A — Operator confirms production Supabase/DB identity** (env `SUPABASE_URL` host/ref).  
2. **Gate B — Curated WIP commit(s)** on a throwaway integration branch from current work (no `git add -A`; exclude proposals/APKs/`_build_candidates`).  
3. Create `release/invify-production-2026` from `origin/main` (`fdd830b8`).  
4. Merge/cherry-pick in order:  
   - `feature/hmo-management-platform` (if still unique vs main)  
   - curated WIP from `feature/va-institution-provider-routing`  
   - any required commits unique to `b4956971` not already in WIP  
5. Resolve conflicts preferring **newer production-safe** behaviour over older feature stubs.  
6. Produce migration manifest vs **confirmed** staging + production `schema_migrations` / equivalent.  
7. Run Phase 9 builds/tests on the release branch.  
8. Only then: backup → migrate → deploy production (Phases 10–11).

---

## 10. Service status snapshot

| Service | State | PID (at audit) | Port |
|---|---|---|---|
| `invify-staging-backend` | active | 478763 | 3004 |
| `invify-production-backend` | active | 747 | 3005 |

---

## 11. Current migration version

| Environment | Version / history export |
|---|---|
| Staging | **Not exported this audit** (env unreadable to deploy; needs operator or privileged probe) |
| Production | **Not exported this audit** (same) |

---

## 12. Hard blockers before continuing

1. **Production database identity not independently confirmed** by an authorised operator (expected ref `jjixrywfnaijvahmvcwj`).  
2. **Migration history exports** for staging + production not yet attached — see `INVIFY_PRODUCTION_MIGRATION_MANIFEST.md`.  
3. **Production backup + restore verification** not yet attested.  
4. **HMO monetisation / fee ownership** remains unresolved — keep flags off; do not apply `DO_NOT_APPLY_*` fee/monetisation SQL.  
5. Shared VPS — deployment must target production paths/units exclusively.  
6. **Not pushed / not deployed** — release branch is local only until further authorisation.

---

## 13. Phase 1 consolidation report (2026-11-05)

### Decisions applied

| Decision | Outcome |
|---|---|
| DB refs expected | prod `jjixrywfnaijvahmvcwj` · staging `rpcjelhacmkhzguljdgi` (operator confirm still required) |
| Curated commits | **Approved and executed** (4 curated commits) |
| Integration base | `origin/main` @ `fdd830b8` |

### Merges into `release/invify-production-2026`

1. `feature/va-institution-provider-routing` → merge `3ca198fd`  
2. `feature/va-hmo-staging-candidate` → merge `398ec7e2`  

(`feature/hmo-management-platform` ancestry included via the above.)

### Curated commits (staged lists reviewed before each commit)

| SHA | Summary |
|---|---|
| `3175bbee` | School ID identity, CR80/Code128, gate scan email notices + migrations `20261105*` |
| `0aa56b16` | Operational HMO enrolment/portal/mobile coverage UX |
| `a463caba` | Service-mode terms, institute affiliation, attendance UI |
| `5465431d` | Supporting inventory/sync/tenant admin + this audit doc |

**Release candidate tip:** `5465431d9b53308f28100833ecb2b9e01b763dc8`

Docs follow-up commit may advance tip (see `git rev-parse release/invify-production-2026`).

### Conflicts

No unresolved merge conflicts. Merges completed cleanly.

### Production live overlay comparison

- Live production backend **does not** contain `modules/school-gate` or `modules/health-insurance` (features are net-new to prod).  
- `+working-copy` on prod predates this feature set; no selective school/HMO hotfix port required from filesystem.  
- Older `attendance.service.js` exists on prod services — distinct from new school-gate module; left as-is in Git lineage.

### Intentionally excluded from curated commits (preserved in original workspace)

- `_build_candidates/`, `_staging_upload/`  
- Staging APK binaries  
- Phase 3 staging planning docs  
- Additional dirty copies of `DO_NOT_APPLY_*` proposals  
- HMO finance earnings/withdrawals admin pages and monetisation-only docs  

### Present on branch via staging-candidate merge (gated — do not activate)

- `invify-backend/src/modules/hmo-monetisation/**`  
- Related `DO_NOT_APPLY_*` proposal files already committed on feature history  

Keep: `FEATURE_REAL_MONEY_PAYOUTS=false`, `FEE_ORCHESTRATION_LIVE` unset/false, `HMO_FEE_OWNERSHIP_APPROVED` unset.

### Migration manifest

Created: `docs/releases/INVIFY_PRODUCTION_MIGRATION_MANIFEST.md`  
**No production migrations applied.**

---

## 14. Immediate ask of the release owner

1. Authorised operator confirms production + staging Supabase project refs (host/ref only).  
2. Export migration histories for both environments.  
3. Attest production backup/PITR readiness.  
4. Authorise (or withhold) `20261018000000_hw_50_profit_sharing.sql`.  
5. Authorise push of `release/invify-production-2026` when ready for review (still no deploy).

Until (1)–(3) pass, **no production migrations or production deploy**.

---

## 15. Audit log

| Time (UTC) | Action | Result |
|---|---|---|
| 2026-11-05T16:54 | Host/service/nginx/health probe | Staging+prod livez 200; units active |
| 2026-11-05T16:55 | Production MANIFEST/COMMIT read | `58cfbf85+working-copy` |
| 2026-11-05T16:56 | Git branch matrix | Documented; dirty WIP dominant |
| 2026-11-05T16:57 | Env identity probe | Env files unreadable; prod admin contains prod Supabase ref |
| 2026-11-05T17:00 | Initial audit written | Verdict: **BLOCKED** |
| 2026-11-05T17:05 | Phase 0 approvals received | Curated commits + `origin/main` base authorised |
| 2026-11-05T17:15 | Created `release/invify-production-2026` from `fdd830b8` | Worktree ready |
| 2026-11-05T17:25 | Merged VA/HMO feature branches | Clean merges |
| 2026-11-05T17:40 | Curated commits `3175bbee`…`5465431d` | RC SHA fixed |
| 2026-11-05T17:50 | Migration manifest prepared | Apply still blocked |
