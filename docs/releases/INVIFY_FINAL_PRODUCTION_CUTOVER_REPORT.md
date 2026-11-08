# INVIFY — FINAL PRODUCTION CUTOVER REPORT

**Report UTC:** 2026-11-08T15:05Z  
**Workspace inspected:** `C:\dev\_wt_invify_release_2026`  
**Expected / actual branch:** `release/invify-production-2026`  
**Committed release-candidate HEAD:** `bb715b9adf9f8af4c19279cdfb706af44ac1f7c1`  
**Production API:** `https://api.invify.org`  
**Production Supabase:** `jjixrywfnaijvahmvcwj`  
**Staging Supabase:** `rpcjelhacmkhzguljdgi`  
**Scope of this exercise:** readiness / verification only — **no** production deploy, **no** migrations applied, **no** service restarts, **no** push/merge, **no** live financial enablement, **no** Play publish, **no** WIP discard.

---

## FINAL VERDICT: **NO-GO**

Production cutover is **not authorised**. Multiple hard blockers remain open. Staging physical validation on Samsung succeeded for the internal debug APK surface, but that does **not** clear production signing, database recovery, migration, or release-config gates.

**Separate explicit owner authorisation is still required before any production deployment.**

---

## 1. Release-candidate revalidation (Workstream 1)

### 1.1 Git identity (verified 2026-11-08)

| Item | Value |
|---|---|
| Branch | `release/invify-production-2026` |
| HEAD | `bb715b9adf9f8af4c19279cdfb706af44ac1f7c1` |
| HEAD subject | `docs(release): point audit release-candidate tip at final Phase 1 HEAD` |
| Ahead of `origin/main` | **19** commits (local only; **not pushed**) |
| Dirty tree | **56** porcelain lines — **47** modified, **9** untracked |
| WIP preservation | **Intact** — no stash / reset / clean / discard performed |

### 1.2 Uncommitted WIP present on release worktree (do not discard)

**Modified (selected release-critical):**

- School gate / ID card: `school-card.*`, `school-gate.scan.ts`, Flutter gate/ID/parent/teacher pages, print/preview widgets  
- Email / notify path: `email.service.ts`  
- Soft keyboard / MainActivity, `build-apk.ps1`  
- Admin `supabase.js`, assorted admin/backend/Flutter tests  
- Release docs: `INVIFY_PRODUCTION_RELEASE_AUDIT.md`, `INVIFY_PRODUCTION_MIGRATION_MANIFEST.md`

**Untracked (selected release-critical):**

- `invify-backend/src/modules/school-gate/school-gate.notify.ts`  
- `invify-backend/src/utils/mail-identity.ts` (+ smoke test)  
- Gate offline: `gate_clock_offline_service.dart`, `gate_clock_offline_store.dart`  
- `gate_notify_section.dart`, `soft_keyboard.dart`  
- `docs/operations/` (backup/restore runbooks)  
- `phase2-staging-extra-probe.json`

**Implication:** Samsung-tested behaviour (offline Gate Clock, parent/staff gate-notify UI, ID-card HMO name/Enrollee ID, mail-identity) is **largely in WIP**, not fully frozen into committed HEAD `bb715b9a`. Cutover must not treat committed tip alone as the tested artifact set until curated commits are authorised.

### 1.3 Samsung physical-test outcome (recorded)

| Item | Result |
|---|---|
| Device | Samsung tablet serial `52002fbb8d2316af` (prior session SM-T397U) |
| Owner statement (2026-11-08) | **All tested functionality worked as expected** on the Invify internal APK |
| Artifact class | **Internal / debug-signed / staging API** — not a production distribution |
| Latest packaged APK | `docs/releases/artifacts/phase3_6/samsung/invify-samsung-internal-staging-1.0.5-39-id-hmo.apk` |
| SHA-256 | `b27a4b0c0adb4fb637ea8cc20ebc0b2fc691de1586382bbedef7574c73c6ca09` |
| Signing | Android Debug (`CN=Android Debug`) |
| API / Supabase | `staging.invify.org` / `rpcjelhacmkhzguljdgi` |
| Prior related status docs | `GATE_NOTIFY_APK_STATUS.md`, `OFFLINE_GATE_APK_STATUS.md`, `ID_HMO_APK_STATUS.md`, `INVIFY_PHASE3_6_SAMSUNG_TEST_BUILD.md` |

**Gate contribution:** Staging device UAT = **PASS (owner-attested)**.  
**Does not clear:** production signing, production DB schema, production admin/mobile distribution.

---

## 2. Completed release gates (evidence-backed)

| Gate | Status | Evidence |
|---|---|---|
| Release branch created from `origin/main` + feature merges | **Done** | Audit §13; merges `3ca198fd`, `398ec7e2`; curated commits through `bb715b9a` |
| Production / staging Supabase project refs identified | **Done** | Prod `jjixrywfnaijvahmvcwj`; staging `rpcjelhacmkhzguljdgi` |
| Host topology mapped (shared VPS) | **Done** | Staging `:3004` / prod `:3005`; units documented in release audit |
| Migration manifest prepared (not applied) | **Done** | `INVIFY_PRODUCTION_MIGRATION_MANIFEST.md` |
| Baseline strategy designed (not executed) | **Done** | `INVIFY_PRODUCTION_MIGRATION_BASELINE_STRATEGY.md` |
| Phase 2 object-presence reconciliation | **Done (partial)** | Exports under `docs/releases/exports/` |
| Phase 2.6 OpenAPI RPC diff | **Done (partial)** | Staging 48 / prod 20 RPCs; gate RPCs staging-only |
| Financial safety flags on live prod (last observed) | **Done / safe posture** | Phase 3: `FEATURE_REAL_MONEY_PAYOUTS=false`; `FEE_ORCHESTRATION_LIVE` unset; `HMO_FEE_OWNERSHIP_APPROVED` unset |
| Backend TypeScript production build | **Pass (Phase 3)** | `docs/releases/artifacts/phase3/backend-build.log` |
| Flutter production-target config file present | **Present** | `config/app_targets/production.local.json` → `api.invify.org` + prod Supabase host |
| Admin `.env.production` now present | **Improved since Phase 3** | Points at prod Supabase; see §4 for remaining API URL gap |
| Staging Samsung physical test | **Pass (owner-attested)** | This report §1.3 |
| Backup/restore **runbooks authored** | **Docs only** | `docs/operations/DATABASE_BACKUP_*.md`, `DATABASE_RESTORE_RUNBOOK.md` — **not** attested recoverability |
| `build-apk.ps1` refuses production debug re-sign without keystore | **Remediated in WIP** | Signing audit §5; `key.properties` still absent |

---

## 3. Outstanding blockers (hard)

| ID | Blocker | Severity | Required evidence / action |
|---|---|---|---|
| B1 | Production Android upload / release keystore unavailable | **HARD** | Provide gitignored `android/key.properties` + upload keystore; verify cert SHA-256 vs Play Console upload key; rebuild APK/AAB; `apksigner` must **not** show Android Debug |
| B2 | Production backup / PITR / restore attestation empty | **HARD** | Complete `INVIFY_PRODUCTION_RECOVERY_READINESS.md` §1 checklist with owner name, timestamps, PITR window, restore-test record |
| B3 | Production `supabase_migrations.schema_migrations` missing | **HARD** | Approve baseline tracker initialisation **method** (strategy exists; **do not** blind `db push`) |
| B4 | Pending production schema for Gate / ID / registry / portal / entitlements / offerings | **HARD** | After B2–B3 + catalog review, apply ordered migrations under separate authorisation |
| B5 | Operator pg catalog inventory (functions/ACLs/triggers/RLS) incomplete | **HARD** | Run & attach `docs/releases/exports/phase2_6-operator-inventory.sql` on staging **and** production |
| B6 | Committed RC tip incomplete vs Samsung-tested WIP | **HARD (release freeze)** | Curated commit of approved WIP (no `git add -A`); exclude APKs / monetisation proposals / build junk |
| B7 | Admin production Vite API URL empty | **HIGH** | Set `VITE_API_URL=https://api.invify.org` (or equivalent authorised value); rebuild admin; verify bundle has no `your-project.supabase.co` |
| B8 | Phase 3 automated test failures unresolved in release record | **HIGH** | Backend identity/notify tests; admin fee-profile/engines; Flutter HMO fakes / sync / license — fix without weakening; re-run and attach logs |
| B9 | Production Redis / `DATABASE_URL` unset on live process (last observed) | **MEDIUM–HIGH** | Owner confirms worker topology; no silent assumption of Redis-backed jobs |
| B10 | Release branch not pushed / no deploy authorisation | **PROCESS** | Owner authorises push for review; deploy remains a **separate** explicit step |

---

## 4. Production signing verification (Workstream 2)

| Check | Result |
|---|---|
| `android/key.properties` | **Absent** |
| `android/upload-keystore.jks` (or non-debug keystore) | **Absent** |
| Prior “production” Phase 3.5 APK/AAB cert | **Android Debug** (`da2fed50…bb1c`) — see `INVIFY_ANDROID_PRODUCTION_SIGNING_AUDIT.md` |
| Samsung internal APKs | Intentionally **debug-signed** — allowed for internal staging only |
| Play Console upload certificate comparison | **Impossible** — production identity not in environment |
| Production-signed APK/AAB built this session | **Not attempted** (credentials unavailable; safeguards intact) |

**Signing verdict:** **BLOCKED.** Debug certificate must never ship as production distribution.

---

## 5. Database / Phase 2–2.6 (Workstream 3)

### 5.1 Backup & restore

| Item | Status |
|---|---|
| Runbooks | Present under `docs/operations/` |
| Owner attestation checklist | **Empty** (`INVIFY_PRODUCTION_RECOVERY_READINESS.md`) |
| Restore-test evidence | **None** |
| Gate eligibility | **CLOSED** |

### 5.2 Security inventory

| Item | Status |
|---|---|
| OpenAPI RPC inventory | Done (partial surface) |
| Full `pg_proc` / triggers / RLS / grants | **Outstanding** |
| Tenant isolation at SQL policy level | **Unverified** for pending school/registry tables |

### 5.3 Migration execution order (planning only — **DO NOT APPLY**)

Prerequisites: B2 + B5 complete; baseline method approved; owner SQL authorisation.

1. `20261020000000_institution_registry_and_routing_policy.sql`  
2. `20261022000000_hw_60_hmo_institution_portal.sql`  
3. `20261023000000_hw_70_tenant_mobile_hmo_experience.sql`  
4. `20261025000000_hw_facility_logo_and_coordinates.sql`  
5. `20261026120000_hw_platform_entitlements.sql`  
6. `20261026220000_hw_bank_hmo_offerings.sql`  
7. `20261026233000_school_id_cards_and_entry_exit.sql`  
8. `20261105060000_school_id_card_invify_code.sql`  
9. `20261105130000_school_gate_notify_defaults_on.sql`  

**Excluded / ON HOLD:** category no-op; `hw_00`–`hw_40` / attendance reapply; `hw_50` reapply; all `proposals/DO_NOT_APPLY_*`.

**Backfills after apply (when authorised):** Invify codes; gate notify defaults; hw_70 assignment updates; optional staging history repair without re-DDL.

---

## 6. Phase 3 / 3.5 validation (Workstream 4)

| Area | Last recorded result | Cutover impact |
|---|---|---|
| Backend `npm run build` | **PASS** | Buildable |
| Backend focused Jest | 16 pass / 2 fail suites | Must close before GO |
| Admin Vite build | **PASS** but Phase 3 baked **placeholder** Supabase | `.env.production` now points at prod host; **`VITE_API_URL` still empty** — rebuild & re-verify required |
| Admin tests | 15 pass / 5 fail suites | Must close or owner-waive with written risk |
| Flutter analyze `lib` | 0 error-severity (Phase 3) | OK for analyze gate |
| Flutter tests | 162 pass / 6 fail | Must close |
| Flutter release APK/AAB (Phase 3) | Built; later proven **debug-signed** | Not distributable as production |
| Production DB deps for Gate/ID/portal | **Absent** | Feature cutover blocked until migrations |
| Placeholder endpoints | Admin API URL gap remains | Blocker B7 |

**Note:** Full Phase 3 suites were **not re-executed** in this 2026-11-08 pass (readiness consolidation only). Post-HEAD WIP may change some assertions; failures remain open until re-proven.

---

## 7. Financial and security controls (Workstream 5)

| Control | Required | Status |
|---|---|---|
| `FEATURE_REAL_MONEY_PAYOUTS` | `false` | Last live prod observation: **false**; code paths gated |
| `FEE_ORCHESTRATION_LIVE` | disabled / unset | Last live prod observation: **unset** |
| `HMO_FEE_OWNERSHIP_APPROVED` | unset | Last live prod observation: **unset** |
| HMO monetisation / live fee ownership | disabled | `DO_NOT_APPLY_*` + `hw_50` ON HOLD |
| Live tenant wallet debits / payouts | disabled | Keep off through cutover |
| Card-processing / settlement activation | not authorised | Not enabled by this package |

**No financial flags were changed in this exercise.**

---

## 8. Test results & build evidence index

| Artifact / report | Path |
|---|---|
| Production release audit | `docs/releases/INVIFY_PRODUCTION_RELEASE_AUDIT.md` |
| Phase 2 reconciliation | `docs/releases/INVIFY_PHASE2_DATABASE_RECONCILIATION.md` |
| Phase 2.5 gate | `docs/releases/INVIFY_PHASE2_FINAL_GATE_REPORT.md` |
| Phase 2.6 security inventory | `docs/releases/INVIFY_PHASE2_6_DATABASE_SECURITY_INVENTORY.md` |
| Recovery readiness | `docs/releases/INVIFY_PRODUCTION_RECOVERY_READINESS.md` |
| Migration manifest | `docs/releases/INVIFY_PRODUCTION_MIGRATION_MANIFEST.md` |
| Baseline strategy | `docs/releases/INVIFY_PRODUCTION_MIGRATION_BASELINE_STRATEGY.md` |
| Phase 3 validation | `docs/releases/INVIFY_PHASE3_RELEASE_VALIDATION_REPORT.md` |
| Android signing audit | `docs/releases/INVIFY_ANDROID_PRODUCTION_SIGNING_AUDIT.md` |
| Samsung build notes | `docs/releases/INVIFY_PHASE3_6_SAMSUNG_TEST_BUILD.md` |
| Samsung id-hmo APK status | `docs/releases/artifacts/phase3_6/samsung/ID_HMO_APK_STATUS.md` |
| Phase 3 build/test logs | `docs/releases/artifacts/phase3/*.log` |
| Ops backup docs | `docs/operations/*` |

---

## 9. Rollback strategy (for when deploy is later authorised)

| Layer | Action |
|---|---|
| App/backend | Re-point `/srv/invify/current/production` to prior release (`production-20261004-support-mc` or documented rollback path); restart **only** `invify-production-backend` |
| Nginx | Restore prior site files only if changed |
| Database | Prefer forward-fix; no blind DROP; irreversible DDL requires stop + owner decision |
| Feature flags | Disable new capabilities via env without schema rollback where possible |
| Mobile | Retain prior production-signed APK; do not rely on debug internal builds |
| Staging | Leave `candidate-20261028` / `:3004` untouched during prod rollback |
| Historical rollback path (verify before use) | `/srv/invify/backups/production/rollback-pre-full-release-20261002-151739` |

---

## 10. Production deployment steps (NOT authorised to execute now)

When **all** hard blockers are closed and owner issues a separate deploy authorisation:

1. Freeze curated commits on `release/invify-production-2026`; push for review if authorised.  
2. Confirm recovery attestation + pre-migration backup gate-eligible.  
3. Apply pending SQL in §5.3 order with recording method from baseline strategy; verify Appendix A catalog.  
4. Build backend from TypeScript source (`dist/`, not image-dist).  
5. Rebuild admin with production Vite env (API + Supabase publishable).  
6. Build **production-signed** APK/AAB; verify non-debug cert vs Play upload key.  
7. Stage versioned dir under `/srv/invify/releases/production-<stamp>-invify-2026/`.  
8. Flip `/srv/invify/current/production` symlink; restart **production** unit only.  
9. Smoke: `/livez`, `/readyz`, Gate/ID/HMO operational paths, financial flags still off.  
10. Hold staging candidate path untouched.

**This report does not authorise steps 3–9.**

---

## 11. Required owner approvals

| # | Approval | Blocking? |
|---|---|---|
| 1 | Production backup / PITR / restore attestation signed | **Yes** |
| 2 | Operator catalog inventory attached (stg + prod) | **Yes** |
| 3 | Migration baseline method + SQL apply order approved | **Yes** |
| 4 | Production upload keystore / Play cert SHA provided out-of-band | **Yes** (for Android distribution) |
| 5 | Curated WIP commit set approved (include/exclude list) | **Yes** (to match Samsung-tested surface) |
| 6 | Admin production Vite env values confirmed | **Yes** |
| 7 | Test-failure remediation or written waive | **Yes** |
| 8 | Confirm Redis/worker topology | Recommended before GO |
| 9 | Keep financial flags disabled through cutover | **Mandatory** |
| 10 | Explicit production **deploy** authorisation (separate from this report) | **Yes** before any cutover action |
| 11 | Push of `release/invify-production-2026` | Separate; currently local-only |

---

## 12. GO / NO-GO summary

| Dimension | Ready? |
|---|---|
| Release branch / RC SHA identified | Yes |
| Staging Samsung physical UAT | Yes (owner-attested; staging/debug only) |
| Production signing | **No** |
| Production DB recovery attestation | **No** |
| Production schema for Gate/ID/portal features | **No** |
| Migration tracker / apply method approved | **No** |
| RLS/trigger/function catalog proven | **No** |
| Admin production config complete | **Partial** (Supabase host OK; API URL empty) |
| Automated test gate clean | **No** |
| Financial controls held | **Yes** (observed / required posture) |
| WIP frozen into release commits | **No** |
| Deploy authorisation | **Not granted** |

### Verdict

# **NO-GO**

Do **not** deploy to production, apply production migrations, publish to Play, enable live financial features, or treat debug-signed Samsung APKs as production artifacts.

**Next minimum path to reconsider GO:** close B1–B8 with attached evidence, freeze approved WIP into the release branch, re-run Phase 3 focused builds/tests, then request a **separate** production deploy authorisation.

---

## 13. Non-actions honoured this session

- No production or staging migrations applied  
- No production service restarts  
- No production env changes  
- No live financial feature enablement  
- No Play Store publish  
- No push / merge  
- No stash / reset / clean / discard of WIP  
- No checkout of `feature/va-institution-provider-routing` into this release worktree  
