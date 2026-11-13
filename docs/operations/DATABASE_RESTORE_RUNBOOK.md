# INVIFY — Database Restore Runbook

**Critical rule:** Never restore over production during routine testing or drills.  
**Production project:** `jjixrywfnaijvahmvcwj`  
**Related:** `DATABASE_BACKUP_ARCHITECTURE.md`, `DATABASE_BACKUP_VERIFICATION.md`

---

## 1. Restore targets (allowed)

| Target | Use |
|---|---|
| New empty Supabase project (Free/temporary) | Preferred for end-to-end drill |
| Local Docker Postgres **16** | Preferred for offline TOC/schema checks |
| Staging project `rpcjelhacmkhzguljdgi` | **Only** with explicit owner approval (destructive to staging) |

| Target | Forbidden for drills |
|---|---|
| Production `jjixrywfnaijvahmvcwj` | **Never** for routine restore tests |

---

## 2. Preconditions

1. Identify manifest with `status=verified`.  
2. Confirm ciphertext SHA-256 matches `.sha256` file.  
3. Retrieve encryption key from escrow (not from backup directory).  
4. If restoring from remote: `rclone copy` object to a temp path mode `0600`.  
5. Confirm restore target URI is **not** production (compare project ref in host/user).  

---

## 3. Decrypt

```bash
# Paths illustrative — do not log key or URLs with passwords
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "$ENC_FILE" \
  -out "$PLAIN_DUMP" \
  -pass file:/etc/invify/backup/backup.key
chmod 600 "$PLAIN_DUMP"
```

Prefer GCM/`age` if that becomes the standard in a later revision; keep algorithm recorded in the manifest.

---

## 4. Inventory before restore

```bash
pg_restore -l "$PLAIN_DUMP" > /tmp/restore-toc.txt
```

Confirm TOC includes expected schemas/tables (at minimum presence of core app schemas used by Invify). Save TOC with the drill report.

---

## 5. Restore into isolated Postgres

### 5a. Docker (recommended for drills)

```bash
docker run -d --name invify-restore-drill \
  -e POSTGRES_PASSWORD=drill-only-not-prod \
  -p 127.0.0.1:55432:5432 \
  postgres:16

# Wait for ready, then:
pg_restore --verbose --clean --if-exists --no-owner \
  -d "postgresql://postgres:drill-only-not-prod@127.0.0.1:55432/postgres" \
  "$PLAIN_DUMP"
```

### 5b. Temporary Supabase project

1. Create project; note ref.  
2. Use **session pooler** URI for that project.  
3. `pg_restore` with `--no-owner` (Supabase roles differ).  
4. Expect some role/grant warnings — document them.  
5. Destroy project after verification.

---

## 6. Post-restore verification checklist

Record pass/fail for each:

| Check | Method |
|---|---|
| Schema restoration | `\dn` / information_schema.schemata |
| Table row counts | SQL counts for critical tables (see §7) |
| Functions | `pg_proc` count vs TOC / spot-check RPCs |
| Triggers | `information_schema.triggers` sample |
| RLS policies | `pg_policies` count / sample |
| Indexes | `pg_indexes` sample on hot tables |
| Migration history | Rows in `supabase_migrations.schema_migrations` or `schema_migrations` **if present** |
| Key application queries | §7 |
| Tenant integrity | Spot-check one known tenant id (non-prod data only on drill DB) |

Wipe plaintext dump and Docker volume after the drill.

---

## 7. Key application queries (drill)

Run against the **restore target only**:

```sql
-- Adjust names if restored schema differs; fail closed if relations missing.
SELECT COUNT(*) AS tenants FROM public.tenants;
SELECT COUNT(*) AS users FROM public.users;
SELECT COUNT(*) AS school_id_cards
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'school_id_cards';
-- HMO foundation (names may vary by migration set)
SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'hw_%';
```

Add wallet/ledger counts only if those relations exist in the dump. Do not invent tables.

---

## 8. Production disaster restore (Sev-1 only)

Requires written authorisation from recovery owner + escalation contact.

1. Freeze writes / announce incident.  
2. Prefer Supabase support + any platform backup **if** Free-plan limitations allow (today: platform backups unavailable).  
3. Independent path: decrypt latest verified dump → restore into **replacement** project or rebuilt DB → re-point app secrets after validation.  
4. Do **not** enable `FEATURE_REAL_MONEY_PAYOUTS` during recovery.  
5. Full verification (§6–7) before DNS/app cutover.  
6. Post-incident: new backup, new restore drill, rotate keys if exposure suspected.

Exact cutover steps depend on whether restore is in-place or into a new project — document the chosen path in the incident ticket.

---

## 9. Restore drill report template

```text
Date (UTC):
Operator:
Source manifest ID:
Source project ref:
Restore target (host class + project ref OR docker):
Decrypt OK: Y/N
pg_restore exit: 
TOC tables (count):
Row counts: tenants= users= hw_tables_present=
RLS policies count:
Issues / warnings:
Duration:
Target destroyed: Y/N
Gate status after drill:
```

File under `docs/releases/exports/` or ops evidence store (**no secrets**).
