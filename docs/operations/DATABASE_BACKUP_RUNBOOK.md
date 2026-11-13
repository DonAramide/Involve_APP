# INVIFY — Database Backup Runbook

**Audience:** Recovery owner / platform operator  
**Related:** `DATABASE_BACKUP_ARCHITECTURE.md`, `DATABASE_BACKUP_VERIFICATION.md`, `DATABASE_RESTORE_RUNBOOK.md`  
**Install state:** Scripts and timer **not yet deployed** — follow Phase B only after architecture approval.

---

## 1. Prerequisites (operator checklist)

Complete before first live backup:

| # | Action | Done |
|---|---|---|
| 1 | Confirm architecture acceptance | ☐ |
| 2 | Create external bucket (R2 / B2 / S3) — private, no public ACL | ☐ |
| 3 | Create rclone access key with **put/list/delete** on that bucket only | ☐ |
| 4 | Create session-mode pooler URI for production (`postgres.<ref>@…pooler…:5432/postgres`) | ☐ |
| 5 | Optionally create staging pooler URI | ☐ |
| 6 | Generate 32-byte encryption key; store escrow offline | ☐ |
| 7 | Create OS user `invify-backup` and group; lock shell | ☐ |
| 8 | Place secrets under `/etc/invify/backup/` (`database.url`, `backup.key`, `rclone.conf`) mode `0600` | ☐ |
| 9 | Install `rclone` + PostgreSQL 16 client (already present on VPS) | ☐ |
| 10 | Copy scripts to `/usr/local/lib/invify-backup/` | ☐ |

**Never** paste the database URI or encryption key into chat, tickets, or git.

---

## 2. Secret layout (proposed)

```text
/etc/invify/backup/
  database.url          # session-mode pooler URI (production)
  database-staging.url  # optional
  backup.key            # encryption key material
  rclone.conf           # remote definition
  notify.env            # SMTP or webhook URL (no DB secrets)
```

Ownership: `root:invify-backup`, directories `0750`, files `0640` or `0600`.

Local artefacts:

```text
/var/backups/invify-db/
  production/
  staging/
  manifests/
```

---

## 3. Manual backup (first run / on-demand)

```bash
sudo -u invify-backup /usr/local/lib/invify-backup/backup.sh \
  --project production \
  --reason manual
```

Expected outputs (names illustrative):

```text
/var/backups/invify-db/production/invify_jjixrywfnaijvahmvcwj_20261106T180000Z.dump.enc
/var/backups/invify-db/production/invify_jjixrywfnaijvahmvcwj_20261106T180000Z.sha256
/var/backups/invify-db/manifests/invify_jjixrywfnaijvahmvcwj_20261106T180000Z.manifest.json
```

Then:

```bash
sudo -u invify-backup /usr/local/lib/invify-backup/verify.sh --manifest <path>
sudo -u invify-backup /usr/local/lib/invify-backup/upload.sh --manifest <path>
sudo -u invify-backup /usr/local/lib/invify-backup/retain.sh --project production
```

Logs must **redact** connection strings (print host class + project ref only).

---

## 4. Daily scheduled backup

After approval, enable:

```bash
sudo systemctl enable --now invify-db-backup.timer
sudo systemctl list-timers invify-db-backup.timer
```

Recommended schedule: **02:15 UTC** daily (`OnCalendar=*-*-* 02:15:00`).

On failure:

1. Unit exits non-zero  
2. `notify.env` sends SMTP/webhook  
3. Gate remains closed  

---

## 5. Pre-migration / pre-release backup gate

Before any production DDL or major release:

```bash
sudo /usr/local/lib/invify-backup/gate-check.sh --project production --max-age-hours 36
```

| Exit | Meaning |
|---|---|
| 0 | Latest verified backup OK locally + remote object listed |
| 1 | Missing / stale / verify failed / remote missing |
| 2 | Misconfiguration |

**Policy:** Exit ≠ 0 **blocks** migration and major release. Do not bypass without written risk acceptance by the recovery owner.

Force a fresh backup before a high-risk window:

```bash
sudo -u invify-backup /usr/local/lib/invify-backup/backup.sh \
  --project production \
  --reason pre-migration
# verify + upload + gate-check
```

---

## 6. Operational checks (weekly)

| Check | Command / evidence |
|---|---|
| Timer healthy | `systemctl status invify-db-backup.timer` |
| Latest manifest `status=verified` | Inspect JSON (no secrets) |
| Remote object exists | `rclone ls <remote>:` (names/sizes only) |
| Disk headroom | `df -h /var/backups` |
| Gate would pass | `gate-check.sh` |

---

## 7. Failure playbook

| Symptom | Action |
|---|---|
| `pg_dump` timeout / pooler error | Confirm session-mode `:5432`; check Supabase status; retry once; escalate |
| Encrypt failure | Check `backup.key` permissions; do not rewrite key without re-encrypting inventory |
| Upload failure | Backup remains local; **do not** mark gate green until remote copy exists |
| Disk full | Halt retain prune of latest verified; expand disk or prune only unverified/failed artefacts |
| Suspected key compromise | Generate new key; re-encrypt from last plaintext only if available — otherwise take fresh dumps with new key; rotate escrow |

---

## 8. What this runbook does **not** cover

- Supabase Storage (files/images)  
- Application `/srv/invify/backups` rollback directories  
- Redis  
- Changing Supabase plan or enabling PITR  

---

## 9. Contacts

| Role | Name | Channel |
|---|---|---|
| Recovery owner | _(fill)_ | |
| Escalation (Sev-1 data loss) | _(fill)_ | |
