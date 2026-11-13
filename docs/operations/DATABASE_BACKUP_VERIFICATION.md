# INVIFY — Database Backup Verification

**Rule:** A successful `pg_dump` exit code alone is **not** a verified backup.

---

## 1. Per-backup verification steps

| Step | Requirement | Fail action |
|---|---|---|
| 1 | `pg_dump` exit status = 0 | Abort; notify; leave gate closed |
| 2 | Plaintext dump size ≥ `MIN_DUMP_BYTES` (config; start 1 MiB) | Abort |
| 3 | Encryption exit 0; ciphertext exists | Abort; shred plaintext |
| 4 | SHA-256(ciphertext) written to `.sha256` | Abort |
| 5 | Re-hash ciphertext; must match `.sha256` | Abort |
| 6 | Decrypt to secure temp; `pg_restore -l` exit 0 and TOC non-empty | Abort |
| 7 | TOC contains sentinel relations (configurable list) | Abort if missing |
| 8 | Manifest written with `status=verified` | Else `status=failed` |
| 9 | Remote upload lists object; size matches | Gate stays closed until remote OK |
| 10 | Shred plaintext temp files | Always |

Sentinel relations (initial set — revise after first successful TOC):

- `public.tenants`  
- `public.users`  
- Migration history table **if present** in TOC (`supabase_migrations.schema_migrations` or equivalent)

---

## 2. Manifest schema (no secrets)

```json
{
  "schema_version": 1,
  "backup_id": "invify_jjixrywfnaijvahmvcwj_20261106T180000Z",
  "project_ref": "jjixrywfnaijvahmvcwj",
  "environment": "production",
  "reason": "daily|pre-migration|pre-release|manual",
  "started_at": "2026-11-06T18:00:00Z",
  "finished_at": "2026-11-06T18:07:12Z",
  "status": "verified",
  "pg_client_version": "16.15",
  "pg_server_version": "15.x",
  "dump_format": "custom",
  "encryption": "openssl-aes-256-cbc-pbkdf2",
  "ciphertext_bytes": 0,
  "sha256": "...",
  "local_basename": "...dump.enc",
  "remote_key": "production/....dump.enc",
  "remote_verified": true,
  "toc_entries": 0,
  "sentinels_ok": true,
  "gate_eligible": true,
  "notes": ""
}
```

Do **not** store database URLs, passwords, or encryption keys in the manifest.

---

## 3. Gate eligibility

A backup is gate-eligible when:

- `status=verified`  
- `remote_verified=true`  
- Age ≤ `MAX_BACKUP_AGE_HOURS` (default **36**)  
- Project ref matches requested environment  

`gate-check.sh` must enforce all four.

---

## 4. Integrity re-check (ad-hoc)

```bash
sha256sum -c "$BASENAME.sha256"
# decrypt + pg_restore -l (temp) — see restore runbook
rclone lsjson "$REMOTE:$REMOTE_KEY"   # size compare only
```

---

## 5. Quarterly restore verification

At least once per quarter (and before major production DDL waves):

1. Full restore into isolated target (`DATABASE_RESTORE_RUNBOOK.md`)  
2. Complete row-count / RLS / function checklist  
3. Attach report to release evidence pack  
4. Update `INVIFY_PRODUCTION_RECOVERY_READINESS.md` attestation rows  

Until the first drill completes, production migration gates remain **blocked** for DB recoverability (Phase 2.6).

---

## 6. Failure notification content (safe)

Include:

- Backup ID, project ref, reason, UTC timestamp  
- Failed step number  
- Host class (`supabase_pooler` / `unknown`) — **not** full URI  

Exclude:

- Passwords, tokens, encryption keys, signed URLs  
