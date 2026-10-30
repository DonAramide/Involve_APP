# Staging deployment runbook

Status: proposed. Nothing in this document has been run. The one-time setup in section 3 needs root on the VPS and owner approval.

Scope: `staging.invify.org` only. Production (`api.invify.org`, `app.invify.org`, port 3005, `/srv/invify/current/production`, Supabase `jjixrywfnaijvahmvcwj`) is never touched. Do not reuse the production k8s manifest.

## 1. How staging is wired today (2026-10-29)

| Part | Current state |
|---|---|
| Backend unit | `invify-staging-backend.service`, `EnvironmentFile=/etc/invify/invify-staging.env` |
| Backend start | drop-in `20-candidate-20261028.conf` → `/usr/local/bin/invify-staging-backend-start-candidate` → `/srv/invify/releases/candidate-20261028/invify-backend/dist/app.js`. The starter fills missing keys from `/etc/invify-staging-backend.env` and refuses protected flags. |
| Admin | Nginx `invify-staging` root → `/srv/invify/releases/candidate-20261028/invify-admin/dist.next` |
| Deploy method | Manual. Files are copied over the candidate directory in place. |
| Restart | Needs root. The `deploy` user has no sudo. |
| CI | `staging-deploy` in `.github/workflows/ci.yml` only pushes `ghcr.io/<repo>:staging-<sha>`. The smoke step is skipped because `vars.STAGING_API_URL` is unset. The GitHub `staging` environment has no variables or secrets. |

Problems with the current method:

- In-place copies are not atomic. Between the copy and the restart, the files on disk and the running process differ.
- Rollback depends on someone having made a copy first.
- Releases are not tied to a pushed commit. The 2026-10-29 00:28–00:42 deploy came from local commit `b52c0fb3`, which is not on GitHub.

## 2. Target layout

```
/srv/invify/staging/
  releases/<UTC-stamp>-<git-sha8>/
    backend/            # contents of invify-backend after build: dist/, package.json, node_modules/
    admin/              # vite build --mode staging output
    MANIFEST            # git sha, image digest, sha256 of backend/dist/app.js and admin/index.html
  current  -> releases/<…>     # what is live
  previous -> releases/<…>     # last known good
```

## 3. One-time setup (root; needs approval)

1. Create `/srv/invify/staging/releases`, owned by `deploy`.
2. Seed the first release from what is live now. Copy `candidate-20261028/invify-backend` and `candidate-20261028/invify-admin/dist.next` into `releases/<stamp>-b52c0fb3/`. Point `current` at it.
3. Change the candidate starter's backend path to `/srv/invify/staging/current/backend`. Keep its protected-flag checks. Rename the drop-in to `30-staging-current.conf`.
4. Change the Nginx `invify-staging` root to `/srv/invify/staging/current/admin`. Run `nginx -t`, then reload.
5. Add one sudoers rule. `deploy` gets no other root commands.
   ```
   deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart invify-staging-backend.service, /usr/bin/systemctl is-active invify-staging-backend.service
   ```
6. GitHub, `staging` environment:
   - variable `STAGING_API_URL=https://staging.invify.org`
   - optional, only if CI should deploy: secrets `STAGING_SSH_KEY` and `STAGING_SSH_KNOWN_HOSTS`, with a required reviewer on the environment.

## 4. Build (workstation or CI)

Only from a commit that is pushed and approved.

1. Backend: `npm ci && npm run build` in `invify-backend`, or extract `/app` from the pinned image digest. Record the digest. Do not use a tag.
2. Admin: `vite build --mode staging` in `invify-admin` using `.env.staging` (staging Supabase only).
3. Preflight on the built files. Stop if any check fails.
   - The admin bundle contains `rpcjelhacmkhzguljdgi`. It contains neither `jjixrywfnaijvahmvcwj` nor `api.invify.org`.
   - Backend `dist/app.js` exists.
   - Write `MANIFEST` with the git sha, digest and sha256 values.
4. Pack `backend.tgz` and `admin.tgz`.

## 5. Deploy (as `deploy`)

```
REL=/srv/invify/staging/releases/$(date -u +%Y%m%dT%H%MZ)-<sha8>
mkdir -p "$REL" && tar -xzf backend.tgz -C "$REL" && tar -xzf admin.tgz -C "$REL"
sha256sum -c "$REL/MANIFEST.sha256"                      # hashes match the build
! grep -rqE 'jjixrywfnaijvahmvcwj|api\.invify\.org' "$REL/admin"   # no production refs

ln -sfn "$(readlink -f /srv/invify/staging/current)" /srv/invify/staging/previous
ln -sfn "$REL" /srv/invify/staging/current.new && mv -T /srv/invify/staging/current.new /srv/invify/staging/current
sudo systemctl restart invify-staging-backend.service
```

The admin switches when the symlink moves. Nginx does not need a reload.

## 6. Health checks (run within 60 seconds; any failure triggers section 7)

| Check | Expected |
|---|---|
| `systemctl is-active invify-staging-backend.service` | `active` |
| `curl -fsS https://staging.invify.org/livez` | 200 |
| `curl -fsS https://staging.invify.org/readyz` | 200 |
| `curl -s -o /dev/null -w '%{http_code}' https://staging.invify.org/api/school/id-cards` | 401 (route exists, auth enforced). A 404 means the wrong build. |
| Same for `/api/v1/health-insurance/platform/my-grant-status` | 401. A 503 `HEALTH_MODULE_DISABLED` means the flag is off. |
| `https://staging.invify.org/` index references the `index-*.js` named in `MANIFEST` | match |
| Served main JS contains `rpcjelhacmkhzguljdgi`, not `jjixrywfnaijvahmvcwj` | match |
| `curl -fsS http://127.0.0.1:3005/livez` (production, read-only) | 200, unchanged |
| Journal since restart | no `Error:` at boot; no protected-flag refusal |

## 7. Rollback

```
ln -sfn "$(readlink -f /srv/invify/staging/previous)" /srv/invify/staging/current.new && mv -T /srv/invify/staging/current.new /srv/invify/staging/current
sudo systemctl restart invify-staging-backend.service
```

Then repeat section 6. The rollback takes seconds and does not rebuild anything. Keep the last five releases.

Database migrations are separate from this runbook. A code rollback does not undo a migration. Every migration needs its own approval, preflight and rollback SQL.

## 8. Not covered here

- Env changes in `/etc/invify/invify-staging.env` (root). Feature flags such as `SCHOOL_ID_CARD_SQL` are changed there, one at a time, with approval.
- `FEATURE_REAL_MONEY_PAYOUTS` stays `false`. `FEE_ORCHESTRATION_LIVE` is never set to `true`.
- The APK (`.\build-apk.ps1 -Target staging`) is built and shared separately.
