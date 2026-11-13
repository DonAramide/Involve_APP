# INVIFY — PHASE 3.8: PRODUCTION RECOVERY AND RELEASE FREEZE

**Report UTC:** 2026-11-08T15:55Z  
**Workspace:** `C:\dev\_wt_invify_release_2026`  
**Branch:** `release/invify-production-2026`  
**HEAD (verified):** `bb715b9adf9f8af4c19279cdfb706af44ac1f7c1`  
**Reference:** `docs/releases/INVIFY_PRODUCTION_BLOCKER_REMEDIATION_REPORT.md`  
**Boundaries:** No deploy, migrations, restarts, host env changes, financial enablement, Play publish, push, stash/reset/clean, or commits without approval.

---

## Updated verdict: **NO-GO**

Phase 3.8 advanced **evidence, procedures, test confidence, and a freeze-ready commit plan**. It did **not** close Android signing recovery or demonstrated database restore. Production deployment is **not** authorised.

| Gate | Status |
|---|---|
| Admin same-origin + prod build/tests | **PASS** (prior 3.7 + this session) |
| Backend production build | **PASS** |
| Relevant backend tests | **PASS** (32 suites / 354 tests) |
| Relevant Flutter tests | **PASS** (69 tests) |
| Signing safeguards in `build-apk.ps1` | **PASS** (guards intact) |
| Financial flags posture (required) | **PASS** (keep disabled; not changed) |
| Android upload key recovered | **FAIL** |
| Independent backup + isolated restore demonstrated | **FAIL** (design only) |
| Operator SQL catalog attached (stg+prod) | **FAIL** (procedures ready; exports missing) |
| Migration tracker / pending DDL applied | **N/A — correctly not done** |
| WIP frozen into commits | **FAIL** (plan ready; awaiting approval) |

---

## A. Android signing recovery

### A.1 Searches performed (no credentials exposed)

| Location | Result |
|---|---|
| `android/key.properties` (release / Involve_APP / Involve_APP_health) | **Absent** |
| `*.jks` / non-debug `*.keystore` under those trees | **Absent** |
| `mobile/android/upload-keystore.jks` | Path missing |
| `%USERPROFILE%\.android` | **Only** `debug.keystore` present |
| `C:\secure`, `C:\keys`, `C:\dev\keys`, `C:\dev\secrets`, `D:\keys`, `E:\keys` | **Missing directories** |
| Documents / Desktop / Downloads (depth 3, keystore names) | **No upload keystore** |
| `.github/workflows/ci.yml` | **No** KEYSTORE / upload-key secrets; CI is build/test/staging-path only |

### A.2 Historical certificate clue

`PRODUCTION_RELEASE_SHA256.txt` lists:

`C6654F12465EAEA332E5703B28BFE5FCFC68BE3A5E689F21982219F98E602475  mobile\android\upload-keystore.jks`

File is not recoverable from this environment. Hash is useful only to validate a recovered blob later.

### A.3 Play Console verification

**Not performed** — requires owner login. Owner must export **Upload key certificate** SHA-256 from Play Console → App signing and compare to any recovered keystore via `keytool -list -v` / `apksigner verify --print-certs` (**never paste private keys into chat**).

### A.4 Owner-approved upload-key reset (if original unavailable)

Only after written owner approval:

1. Play Console → Request upload key reset (Google Play App Signing must already hold the app signing key).  
2. Generate new upload keystore **on a secure build host** (not in git).  
3. Submit new upload certificate to Play; wait for acceptance.  
4. Write gitignored `android/key.properties` pointing at the new store.  
5. Rebuild production APK/AAB; verify cert ≠ Android Debug (`da2fed50…bb1c`).

**This phase did not generate a replacement key.**

### A.5 Recovery readiness

**NOT READY** for production-signed distribution.

---

## B. Database backup and recovery

### B.1 Architecture reassessment

Existing docs (unchanged install state):

| Doc | Role |
|---|---|
| `docs/operations/DATABASE_BACKUP_ARCHITECTURE.md` | Dual-location encrypted logical dumps; **not installed** |
| `DATABASE_BACKUP_RUNBOOK.md` | First-run / daily ops |
| `DATABASE_BACKUP_VERIFICATION.md` | Gate eligibility rules |
| `DATABASE_RESTORE_RUNBOOK.md` | Isolated restore only |
| `docs/releases/INVIFY_PRODUCTION_RECOVERY_READINESS.md` | Owner attestation checklist — **still empty** |

Key architecture facts already recorded:

- Supabase Free: **no PITR / no platform scheduled backups**.  
- VPS app rollback dirs ≠ DB recovery.  
- Direct `db.<ref>.supabase.co` IPv6-only from VPS; use **session-mode pooler :5432**.  
- External object store (**R2 / B2 / S3 via rclone**) required for independence — **not configured**.

### B.2 Independent off-server destination (defined, not provisioned)

**Recommended:** private Cloudflare R2 or Backblaze B2 bucket via `rclone`, credentials only under `/etc/invify/backup/rclone.conf` (root:`invify-backup`, `0600`).  
Local encrypted mirror: `/var/backups/invify-db/production/`.

### B.3 Encryption and key custody (defined)

| Item | Specification |
|---|---|
| Algorithm | `openssl enc -aes-256-cbc -pbkdf2` (or `age` later) |
| Key path | `/etc/invify/backup/backup.key` (never under backup trees / never in git) |
| Escrow | Offline copy with recovery owner (password manager / HSM) |
| Manifest | SHA-256 of ciphertext only — no URLs/passwords |

### B.4 Backup / restore verification commands (do not run against production writes)

Manual backup (after install authorisation):

```bash
sudo -u invify-backup /usr/local/lib/invify-backup/backup.sh --project production --reason pre-release
sudo -u invify-backup /usr/local/lib/invify-backup/verify.sh --manifest <path>
sudo -u invify-backup /usr/local/lib/invify-backup/upload.sh --manifest <path>
```

Isolated restore drill (Docker — never production):

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in "$ENC_FILE" -out "$PLAIN_DUMP" -pass file:/etc/invify/backup/backup.key
pg_restore -l "$PLAIN_DUMP" > /tmp/restore-toc.txt
docker run -d --name invify-restore-drill -e POSTGRES_PASSWORD=drill-only-not-prod -p 127.0.0.1:55432:5432 postgres:16
pg_restore --verbose --clean --if-exists --no-owner \
  -d "postgresql://postgres:drill-only-not-prod@127.0.0.1:55432/postgres" "$PLAIN_DUMP"
```

### B.5 Recovery readiness claim

**NOT READY.** Design and runbooks exist; **no** verified dump, **no** remote upload proof, **no** isolated restore demonstration in this phase. Per charter: do not claim recoverability until an isolated restore is demonstrated.

---

## C. Database security and migration inventory

### C.1 Operator SQL pack review

File: `docs/releases/exports/phase2_6-operator-inventory.sql`

| Check | Result |
|---|---|
| Contains `INSERT`/`UPDATE`/`DELETE`/`DROP`/`ALTER`/`CREATE`/`TRUNCATE`/`GRANT`/`REVOKE` | **None** (grep clean) |
| Operations | `SELECT` catalog queries only |
| Header | Explicitly READ-ONLY |

### C.2 Separate inventory procedures (prepared this phase)

| Env | Procedure |
|---|---|
| Staging | `docs/releases/exports/phase3_8-staging-inventory-procedure.md` |
| Production | `docs/releases/exports/phase3_8-production-inventory-procedure.md` |

**Exports not yet attached** — owner must run and place JSON under `docs/releases/exports/phase3_8/{staging,production}/`.

### C.3 Capture targets

Functions / RPCs / triggers / grants / RLS flags / policies (sections A–F of the SQL pack). Prior OpenAPI gap remains: staging 48 RPCs vs production 20; Gate/`inst_*` absent on production.

### C.4 Migration baseline strategy (documented; not executed)

Canonical: `docs/releases/INVIFY_PRODUCTION_MIGRATION_BASELINE_STRATEGY.md`

- Production lacks `supabase_migrations.schema_migrations`.  
- Do **not** blind `supabase db push`.  
- Later: attest objects → create tracker → insert **only** proven versions **without** replaying baseline DDL → apply PENDING forward.

### C.5 Ordered pending production migrations (planning only)

1. `20261020000000_institution_registry_and_routing_policy.sql`  
2. `20261022000000_hw_60_hmo_institution_portal.sql`  
3. `20261023000000_hw_70_tenant_mobile_hmo_experience.sql`  
4. `20261025000000_hw_facility_logo_and_coordinates.sql`  
5. `20261026120000_hw_platform_entitlements.sql`  
6. `20261026220000_hw_bank_hmo_offerings.sql`  
7. `20261026233000_school_id_cards_and_entry_exit.sql`  
8. `20261105060000_school_id_card_invify_code.sql`  
9. `20261105130000_school_gate_notify_defaults_on.sql`  

**Excluded / ON HOLD:** category no-op; hw_00–hw_50 reapply; all `DO_NOT_APPLY_*`.  
**Not applied this phase.**

---

## D. Release WIP freeze

### D.1 Reconciliation

| Metric | Value |
|---|---|
| HEAD | `bb715b9a` (unchanged) |
| Modified | 47 |
| Untracked | 9 |
| Ahead of `origin/main` | 19 commits (still unpushed) |

No stash/reset/clean/discard performed.

### D.2 Six proposed commit groups — exact file lists

**Do not stage/commit until owner approves each group.**

#### Commit 1 — `chore(release): refuse production APK signing without upload keystore`

```
build-apk.ps1
```

**Tests:** static review of refuse paths (no Flutter rebuild required).  
**Deps:** none.

#### Commit 2 — `feat(school): gate notify, mail-identity, and offline Gate Clock`

```
invify-backend/src/modules/school-gate/school-gate.notify.ts
invify-backend/src/modules/school-gate/school-gate.scan.ts
invify-backend/src/services/email.service.ts
invify-backend/src/utils/mail-identity.ts
invify-backend/test/mail-identity.smoke.test.ts
lib/core/utils/soft_keyboard.dart
lib/features/school/data/services/gate_clock_offline_service.dart
lib/features/school/data/services/gate_clock_offline_store.dart
lib/features/school/presentation/widgets/gate_notify_section.dart
lib/features/school/presentation/pages/gate_clock_page.dart
lib/features/school/presentation/pages/parent_profile_page.dart
lib/features/school/presentation/pages/teacher_profile_page.dart
android/app/src/main/kotlin/com/invify/invoice_app/MainActivity.kt
```

**Tests already green (relevant):** backend school-gate / mail-identity suites; Flutter school/gate paths where present.  
**Deps:** soft_keyboard before/with invoice wiring in Commit 6.

#### Commit 3 — `feat(school): put HMO name and Enrollee ID on ID CardFace`

```
invify-backend/src/modules/school-gate/school-card.persistence.ts
invify-backend/src/modules/school-gate/school-card.routes.ts
invify-backend/src/modules/school-gate/school-card.service.ts
invify-backend/src/modules/school-gate/school-card.types.ts
invify-backend/test/school-card-identity.test.ts
invify-backend/test/school-id-cards.test.ts
lib/features/school/presentation/pages/id_card_admin_page.dart
lib/features/school/presentation/pages/my_id_card_page.dart
lib/features/school/presentation/widgets/id_card_landscape_print.dart
lib/features/school/presentation/widgets/school_id_card_preview.dart
docs/id-cards/samples/sample-id-card-cr80.pdf
```

**Tests:** `school-id-cards`, `school-card-identity`, Flutter school ID tests.  
**Deps:** none on Commit 2 (types/HMO fields independent of notify module).

#### Commit 4 — `test(admin): align fee-profile and engine contracts; harden Supabase URL rules`

```
invify-admin/src/supabase.js
invify-admin/tests/engines/approval-engine.test.ts
invify-admin/tests/engines/notification-engine.test.ts
invify-admin/tests/engines/sla-engine.test.ts
invify-admin/tests/engines/workflow-engine.test.ts
invify-admin/tests/platform-fee-profiles.test.ts
invify-backend/test/platform-fee-profiles.admin.test.ts
```

**Tests:** full Admin Jest (150) — **PASS** this session.  
**Deps:** none.

#### Commit 5 — `docs(release): backup/ops runbooks and production release evidence pack`

```
docs/operations/DATABASE_BACKUP_ARCHITECTURE.md
docs/operations/DATABASE_BACKUP_RUNBOOK.md
docs/operations/DATABASE_BACKUP_VERIFICATION.md
docs/operations/DATABASE_RESTORE_RUNBOOK.md
docs/releases/INVIFY_PRODUCTION_MIGRATION_MANIFEST.md
docs/releases/INVIFY_PRODUCTION_RELEASE_AUDIT.md
docs/releases/exports/phase3_8-staging-inventory-procedure.md
docs/releases/exports/phase3_8-production-inventory-procedure.md
```

Plus **force-add** when approved (gitignored by `releases/`):

```
docs/releases/INVIFY_FINAL_PRODUCTION_CUTOVER_REPORT.md
docs/releases/INVIFY_PRODUCTION_BLOCKER_REMEDIATION_REPORT.md
docs/releases/INVIFY_PHASE3_8_RECOVERY_AND_RELEASE_FREEZE_REPORT.md
```

**Tests:** n/a (docs).  
**Deps:** none.

#### Commit 6 — `fix(mobile): soft-keyboard call sites and supporting test/fixture sync`

```
lib/features/invoicing/presentation/pages/create_invoice_page.dart
lib/features/invoicing/presentation/widgets/staff_auth_dialog.dart
lib/features/health_insurance/presentation/pages/health_wellness_home_page.dart
lib/features/settings/domain/services/security_service.dart
lib/main.dart
test/features/health_insurance/health_insurance_bloc_test.dart
test/features/health_insurance/health_insurance_staging_uat_test.dart
test/features/health_insurance/health_insurance_widgets_test.dart
test/features/health_insurance/hmo_tour_and_welcome_test.dart
test/integration/flutter_sync_harness_test.dart
test/license_diagnostic_test.dart
invify-backend/test/tenant-plan-offer-sync.test.ts
invify-backend/test-health-profit-sharing-agreements-staging.json
```

**Tests:** Flutter HMO + sync + license — **PASS** this session.  
**Deps:** **Commit 2** must land first if `soft_keyboard.dart` is not already on the branch (untracked today).

### D.3 Explicit exclusions (do not add without separate approval)

```
phase2-staging-extra-probe.json
linux/flutter/generated_plugin_registrant.cc
linux/flutter/generated_plugin_registrant.h
linux/flutter/generated_plugins.cmake
macos/Flutter/GeneratedPluginRegistrant.swift
windows/flutter/generated_plugin_registrant.cc
windows/flutter/generated_plugin_registrant.h
windows/flutter/generated_plugins.cmake
invify-admin/dist/**
docs/releases/artifacts/**/*.apk
docs/releases/artifacts/**/*.aab
```

### D.4 Cross-group dependencies

```
Commit 2 (soft_keyboard + MainActivity)
    └── required before Commit 6 (invoice/staff soft-keyboard call sites)

Commit 3 (school-card.*)  ── independent of Commit 2
Commit 1, 4, 5            ── independent
```

### D.5 Commit approval plan

1. Owner reviews file lists §D.2.  
2. Approve groups in order **1 → 2 → 3 → 4 → 5 → 6** (or 1→4→5 in parallel with 2→3→6).  
3. Agent stages **only listed paths** per group (never `git add -A`).  
4. Agent commits with agreed messages; no push unless separately authorised.  
5. Re-run §E smoke after freeze.

**No commits created in Phase 3.8.**

---

## E. Final validation

### E.1 Admin same-origin / Nginx

| Requirement | Evidence |
|---|---|
| Browser API base empty in prod/staging builds | `invify-admin/src/config/env.js` → `resolveApiBaseUrl()` returns `''` |
| Intended API origin | `https://api.invify.org` (validated via `.env.production`) |
| Hosting | Admin must be served from `https://app.invify.org` with Nginx proxy of `/api`, `/admin`, `/public` → production backend `:3005` |
| Bundle scan (3.7) | Prod Supabase present; placeholder absent; no service-role secrets |

### E.2 Builds and tests (this session)

| Check | Result | Artifact |
|---|---|---|
| Backend `npm run build` | **PASS** (exit 0) | `docs/releases/artifacts/phase3_8/backend-build.log` |
| Admin `npm test` | **20 suites / 150 tests PASS** | `docs/releases/artifacts/phase3_8/admin-tests.log` |
| Backend relevant Jest | **32 suites / 354 tests PASS** | `docs/releases/artifacts/phase3_8/backend-relevant-tests.log` |
| Flutter relevant tests | **69 tests PASS** | `docs/releases/artifacts/phase3_8/flutter-relevant-tests.log` |
| Production APK signing safeguards | **Intact** (`Refuse: production release requires android/key.properties…`) | `build-apk.ps1` |
| `FEATURE_REAL_MONEY_PAYOUTS` | Keep **`false`** | Not modified; governance tests remain in suite |
| Fee orchestration / HMO monetisation | Keep **disabled** | Not enabled |

Full monorepo `npm test` / entire Flutter tree beyond the relevant set were not claimed as 100% coverage of every historical suite outside the patterns above.

---

## Outstanding owner decisions

1. **Locate or approve reset** of Android upload keystore; supply Play upload cert SHA-256.  
2. **Approve backup architecture Phase B install** (rclone remote, encryption key escrow, `invify-backup` user).  
3. **Run and attach** staging + production inventory SQL exports.  
4. **Complete** `INVIFY_PRODUCTION_RECOVERY_READINESS.md` attestation + schedule isolated restore drill.  
5. **Approve commit groups 1–6** (exact lists above) — still no deploy.  
6. Later, separate authorisation for migration baseline + pending SQL apply.  
7. Keep financial flags disabled through cutover.  
8. Explicit production **deploy** authorisation remains a future, separate step.

---

## Evidence index

| Item | Path |
|---|---|
| This report | `docs/releases/INVIFY_PHASE3_8_RECOVERY_AND_RELEASE_FREEZE_REPORT.md` |
| Prior remediation | `docs/releases/INVIFY_PRODUCTION_BLOCKER_REMEDIATION_REPORT.md` |
| Operator SQL (read-only) | `docs/releases/exports/phase2_6-operator-inventory.sql` |
| Staging inventory procedure | `docs/releases/exports/phase3_8-staging-inventory-procedure.md` |
| Production inventory procedure | `docs/releases/exports/phase3_8-production-inventory-procedure.md` |
| Backup architecture / runbooks | `docs/operations/*` |
| Session logs | `docs/releases/artifacts/phase3_8/*` |

---

## Non-actions honoured

- No production deployment  
- No migrations / tracker initialisation  
- No service restarts  
- No production environment changes  
- No live financial / HMO monetisation enablement  
- No Play Store publish  
- No branch push  
- No stash / reset / clean / discard  
- No commits without approval  
- No replacement signing key generated  

---

## GO / NO-GO

# **NO-GO**

**Ready for owner decisions on:** commit freeze, signing recovery/reset, backup install + restore drill, SQL inventory exports.  
**Not ready for:** production-signed store/sideload distribution, production DDL, or production cutover.
