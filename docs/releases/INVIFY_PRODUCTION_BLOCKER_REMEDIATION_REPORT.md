# INVIFY — PRODUCTION BLOCKER REMEDIATION REPORT

**Report UTC:** 2026-11-08T15:30Z  
**Workspace:** `C:\dev\_wt_invify_release_2026`  
**Branch:** `release/invify-production-2026`  
**HEAD (unchanged):** `bb715b9adf9f8af4c19279cdfb706af44ac1f7c1`  
**Reference:** `docs/releases/INVIFY_FINAL_PRODUCTION_CUTOVER_REPORT.md`  
**Scope:** Blocker remediation only. **No** deploy, migrations, restarts, env changes on production hosts, financial enablement, push/merge, or WIP discard. **No** commits created.

---

## Fresh verdict: **NO-GO** (improved; still blocked)

| Area | Prior cutover | This remediation |
|---|---|---|
| Admin production config (B7) | Open | **Closed for build/config** (same-origin design clarified; prod build verified) |
| Automated tests (B8) | Open | **Closed for previously failing suites** (admin / focused backend / focused Flutter **PASS**) |
| Android production signing (B1) | Open | **Still HARD BLOCKED** (upload keystore / `key.properties` absent) |
| WIP freeze (B6) | Open | **Assessment only** — commit groups proposed; **no commits** |
| DB backup / PITR / migrations / RLS catalog | Open | **Unchanged — still HARD BLOCKED** (out of this phase’s execution remit) |
| Deploy authorisation | Absent | **Absent** |

**Do not authorise production deployment from this report.**

---

## Workstream A — Admin production configuration

### A.1 Empty `VITE_API_URL` root cause

`invify-admin/src/config/env.js` implements an intentional **same-origin** strategy for staging/production:

- Empty / `/` / `/api` / `same-origin` → browser API base = `''` (relative paths).
- Even when `VITE_API_URL` is an absolute public HTTPS origin, production/staging **validates** it then still returns `''` so the SPA does not bake a second API host; Nginx on `app.invify.org` must proxy `/api`, `/admin`, `/public`, etc. to the production backend (`api.invify.org` → `:3005`).

Prior cutover treated empty `VITE_API_URL` as a misconfiguration. It is **by design**, provided the host reverse-proxy topology remains correct.

### A.2 Intended production endpoints (verified)

| Variable | Required production value | Status |
|---|---|---|
| Backend API (ops) | `https://api.invify.org` | Documented / set in `.env.production` for validation |
| Admin browser API base | Same-origin relative (`''`) | Enforced by `resolveApiBaseUrl()` |
| Supabase URL | `https://jjixrywfnaijvahmvcwj.supabase.co` | Present |
| Supabase project ref | `jjixrywfnaijvahmvcwj` | Present in URL |
| `VITE_APP_ENV` | `production` | Present |
| `VITE_BUILD_VARIANT` | `PROD` | Present |
| Publishable key | Present in `.env.production` (gitignored; not logged here) | Present |

**Change applied (local worktree only):** set  
`VITE_API_URL=https://api.invify.org`  
in `invify-admin/.env.production` (with comment). Behaviour remains same-origin bake; value documents/validates the intended origin.

### A.3 Production Admin build

| Check | Result |
|---|---|
| Command | `npm run build` in `invify-admin` |
| Result | **PASS** (~1m 16s) |
| Log | `docs/releases/artifacts/phase3_7/admin-production-build.log` |
| Main bundle | `dist/assets/index-CDasTupf.js` |

### A.4 Bundle scan

Scan artifact: `docs/releases/artifacts/phase3_7/admin-bundle-scan.txt`

| Pattern | Found? | Assessment |
|---|---|---|
| `your-project.supabase.co` | **No** | Placeholder cleared vs Phase 3 |
| `jjixrywfnaijvahmvcwj` | **Yes** | Correct production Supabase |
| `rpcjelhacmkhzguljdgi` | **No** | Staging Supabase not baked |
| `api.invify.org` | **Yes** | Present (env / constants) |
| `staging.invify.org` | **Yes** | **Only** vault webhook hostname hint (`CredentialManagerDialog.vue`: if `window.location.hostname` includes `staging`) — inactive on `app.invify.org` |
| `sb_secret_` / `service_role` | **No** | No service-role secrets in client |
| `sb_publishable_` | **Yes** | Expected client publishable key |

**Admin config gate:** **PASS** for configuration + production build evidence. Deploy still requires host Nginx same-origin proxy verification at cutover time (ops), not changed here.

---

## Workstream B — Android production signing

### B.1 Current environment

| Material | Present? |
|---|---|
| `android/key.properties` | **No** |
| `android/upload-keystore.jks` | **No** |
| `android/app/upload-keystore.jks` | **No** |
| `mobile/android/upload-keystore.jks` | **No** (historical path only) |
| Any non-debug `.jks` / `.keystore` under release worktree | **None found** |

### B.2 Historical clue (not recoverable here)

`PRODUCTION_RELEASE_SHA256.txt` records a historical file:

`C6654F12465EAEA332E5703B28BFE5FCFC68BE3A5E689F21982219F98E602475  mobile\android\upload-keystore.jks`

That path is **absent** from this worktree. Hash alone does not recover the keystore or passwords.

### B.3 Prior “production” artifacts

`docs/releases/INVIFY_ANDROID_PRODUCTION_SIGNING_AUDIT.md` and Samsung `signing-verify.txt` show **Android Debug** certificate:

- DN: `C=US, O=Android, CN=Android Debug`
- SHA-256: `da2fed50eb64056e4a54b2005b5fab6e631ffbe7d721a665f57e95d066a9bb1c`

**Must not** be used for production distribution.

### B.4 Safeguards (unchanged / not weakened)

`build-apk.ps1` still:

1. Refuses production build start without `android/key.properties`.  
2. Refuses AssetManifest re-sign for production/staging with debug keystore.  
3. Allows debug re-sign only for local/usb/debug paths.

No keystore was generated. No passwords were printed or committed.

### B.5 Play Console / recovery procedure (owner actions)

**Do not generate a replacement upload key without explicit owner approval.**

1. **Search recovery sources (preferred):** password manager, secure build machine backups, CI secret stores, release engineer offline media for `upload-keystore.jks` + matching `key.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`).  
2. **Verify Play Console upload certificate:** Play Console → App signing → **Upload key certificate** → record SHA-256 / SHA-1.  
3. **Compatibility check:** after placing recovered keystore on the secure build host only (gitignored paths), rebuild and `apksigner verify --print-certs`; SHA-256 **must match** Play upload cert.  
4. **If irrecoverable — upload key reset (owner-approved only):**  
   - Use Google Play Console “Request upload key reset” / support flow with proof of ownership.  
   - Only then generate a **new** upload keystore on a secure machine.  
   - Register the new upload certificate with Play; keep app signing key with Google Play App Signing.  
   - Update local `android/key.properties` (never commit).  
5. Re-run production APK/AAB build and attach cert evidence to this report before any store or production sideload distribution.

**Signing gate:** **FAIL / HARD BLOCKED**.

---

## Workstream C — Automated test remediation

### C.1 Prior failures → root cause → remediation

| Suite | Prior failure | Root cause | Remediation |
|---|---|---|---|
| Backend `school-id-cards` | Expected `notifyStudentArrival === false` | Product/migration intent defaults notify **on**; assertion lagged | WIP already expects `true` — **PASS** |
| Backend `school-card-identity` | `vitest` import under Jest | Wrong test runner import | WIP uses Jest globals — **PASS** |
| Admin `platform-fee-profiles` | Expected `admin_deploy` on read routes; publish regex drift | Read surfaces correctly `read_finance`; publish uses `agentPayload({ otp })` | WIP tests aligned to implementation — **PASS** |
| Admin `engines/*` | Wrong relative imports / suite load | Paths/mocks corrected in WIP | **PASS** |
| Flutter HMO fakes | Missing `admissionNumber` on `createEnrolment` | Interface extended; fakes lagged | WIP fakes updated — **PASS** |
| Flutter `license_diagnostic_test` | Constructor arity mismatch | License API evolved | WIP test updated — **PASS** |
| Flutter `flutter_sync_harness_test` | Runtime/plugin issues | Harness hardened in WIP | **PASS** |

No tests were disabled. Assertions were not weakened to force green; they were aligned to the intentional product contracts already in source.

### C.2 Results this session

| Command | Result | Log |
|---|---|---|
| `invify-admin` `npm test` | **20 suites / 150 tests PASS** | `docs/releases/artifacts/phase3_7/admin-tests.log` |
| Backend focused Jest (school-id-cards, school-card-identity, platform-fee-profiles.admin, tenant-plan-offer-sync, mail-identity.smoke) | **5 suites / 42 tests PASS** | `docs/releases/artifacts/phase3_7/backend-focused-tests.log` |
| Flutter focused (4 HMO + license + sync harness) | **All tests passed** | `docs/releases/artifacts/phase3_7/flutter-focused-tests.log` |

**Test gate (Phase 3 known failures):** **PASS**.  
Full monorepo suites beyond this focused set were not re-run end-to-end in this phase.

---

## Workstream D — WIP integration assessment

Working tree remains dirty on top of `bb715b9a`. **No staging / commits performed.**

### D.1 Classification

#### Group 1 — Release-critical product (Samsung-tested / Gate / ID / notify)

| Path | Type | Notes |
|---|---|---|
| `invify-backend/src/modules/school-gate/school-card.*` | Modified | HMO fields on CardFace; persistence/routes/service/types |
| `invify-backend/src/modules/school-gate/school-gate.scan.ts` | Modified | Guardian/family notify path |
| `invify-backend/src/modules/school-gate/school-gate.notify.ts` | **Untracked** | Gate-notify APIs |
| `invify-backend/src/services/email.service.ts` | Modified | “God Bless {family}” closing |
| `invify-backend/src/utils/mail-identity.ts` (+ smoke test) | **Untracked** | From-address identity |
| Flutter gate/ID/parent/teacher/preview/print pages & widgets | Modified | ID HMO labels; gate UX |
| `lib/features/school/presentation/widgets/gate_notify_section.dart` | **Untracked** | Profile notify UI |
| `lib/features/school/data/services/gate_clock_offline_*` | **Untracked** | Offline-first Gate Clock |
| `lib/core/utils/soft_keyboard.dart` | **Untracked** | IME sticky fix |
| `android/.../MainActivity.kt` | Modified | HID IME spoof / soft input |
| Related backend/Flutter tests for school/HMO/license/sync | Modified | Keep with product |

**Dependencies:** notify routes ↔ scan ↔ email/mail-identity; offline store ↔ gate_clock_page; soft_keyboard ↔ MainActivity ↔ invoice/staff auth focus helpers; CardFace HMO ↔ Flutter preview/print.

#### Group 2 — Release engineering / docs

| Path | Type |
|---|---|
| `build-apk.ps1` | Modified — production signing refuse safeguards |
| `docs/releases/INVIFY_PRODUCTION_*.md` | Modified |
| `docs/operations/**` | **Untracked** — backup/restore runbooks |
| Cutover / this remediation reports under `docs/releases/` | Present on disk (often gitignored by `releases/` rule — use `git add -f` when authorised) |

#### Group 3 — Admin config / test alignment

| Path | Type |
|---|---|
| `invify-admin/src/supabase.js` | Modified — stricter prod/staging Supabase URL rules |
| `invify-admin/tests/engines/*`, `platform-fee-profiles.test.ts` | Modified — suite load + contract alignment |
| `invify-admin/.env.production` | Local gitignored config (API URL documented) |

#### Group 4 — Supporting / adjacent

| Path | Type |
|---|---|
| `lib/features/invoicing/...`, `lib/main.dart`, `security_service.dart`, HMO home page | Modified — soft-keyboard / minor UX |
| `invify-backend/test/platform-fee-profiles.admin.test.ts`, `tenant-plan-offer-sync.test.ts` | Modified |
| `invify-backend/test-health-profit-sharing-agreements-staging.json` | Modified — staging fixture |
| `docs/id-cards/samples/sample-id-card-cr80.pdf` | Modified binary sample |

#### Group 5 — Generated / exclude from curated commit

| Path | Recommendation |
|---|---|
| `linux/`, `macos/`, `windows/` `generated_plugin_registrant*` / `generated_plugins.cmake` | Prefer regenerate on clean build; include only if required for CI consistency |
| `phase2-staging-extra-probe.json` | **Exclude** (probe artifact) |
| APKs under `docs/releases/artifacts/**` | **Exclude** from source commits |
| `invify-admin/dist/**` | **Exclude** (build output) |

### D.2 Safe commit grouping proposal (approval required — **do not execute**)

1. **chore(release): strengthen APK production signing refuse path** — `build-apk.ps1` only.  
2. **feat(school): gate notify + mail-identity + offline gate clock** — backend notify/scan/email/mail-identity + Flutter gate/offline/notify/soft keyboard/MainActivity + tests.  
3. **feat(school): ID card HMO name + enrollee ID on CardFace** — school-card.* + Flutter ID preview/print/admin/my card + tests.  
4. **test(admin): align engine and fee-profile contracts** — admin tests + `supabase.js` if required by those tests.  
5. **docs(release): operations backup runbooks + remediation/cutover reports** — `docs/operations/**` + force-add release reports if desired.  
6. **Optional:** invoicing soft-keyboard touch-ups if not already in (2).

**Explicit exclusions unless separately approved:** monetisation modules already on branch history remain gated; do not add `DO_NOT_APPLY_*` proposals; do not `git add -A`.

---

## Unresolved issues (still blocking GO)

1. **Production upload keystore / `key.properties` missing** — cannot produce Play-compatible production APK/AAB.  
2. **Production backup / PITR / restore attestation** — still empty (`INVIFY_PRODUCTION_RECOVERY_READINESS.md`).  
3. **Production migration tracker absent + pending Gate/ID/portal schema** — unchanged.  
4. **Operator RLS/trigger/function catalog** — still outstanding.  
5. **WIP not frozen** into curated commits on `bb715b9a`.  
6. **No production deploy authorisation.**

---

## Recommended next actions (owner)

1. Recover or (with approval) reset Android upload key; place gitignored `key.properties` + keystore on secure build host; verify vs Play upload cert.  
2. Complete Supabase backup/PITR/restore attestation checklist.  
3. Attach operator SQL catalog inventory for staging + production.  
4. Approve WIP commit groups §D.2; authorise curated commits (still no deploy).  
5. After signing recovery: production-signed APK/AAB + cert evidence.  
6. Keep `FEATURE_REAL_MONEY_PAYOUTS=false`, fee orchestration live off, HMO fee ownership unset.

---

## Non-actions honoured

- No production/staging DB migrations  
- No production service restarts  
- No production host env changes  
- No real-money / HMO monetisation / live payout enablement  
- No push / merge  
- No stash / reset / clean / discard of WIP  
- No replacement keystore generated  
- `build-apk.ps1` safeguards not weakened  
- Deployment **not** authorised  

---

## GO / NO-GO

# **NO-GO**

Progress this phase: Admin production build/config **PASS**; previously failing automated tests **PASS**; signing and database recovery/migration gates remain **HARD BLOCKERS**. Deployment remains forbidden until those close under separate explicit authorisation.
