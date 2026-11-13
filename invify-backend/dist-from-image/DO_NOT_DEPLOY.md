# DO NOT DEPLOY — stale image extract

**Directory:** `invify-backend/dist-from-image/`  
**Provenance:** Snapshot of compiled backend extracted from a container `/app` tree (approx. **2026-10-29**).  
**Not** produced by `npm run build` on the current feature branch.

## Why it exists

Historical staging/candidate reference: comparing an image-extracted tree to a workstation `tsc` output, and packing older release candidates. Staging runbook still allows “extract `/app` from a **pinned image digest**” as an alternate to `npm run build`, but that extract must be from the **approved commit’s image**, not this folder.

## Why it is unsafe for VA remediation

This tree still contains the obsolete Quasar VA counterparty sentinel `platform-admin-owner-id` in compiled controllers. Source under `src/` was remediated in `d83efe01+`. Deploying this directory would reintroduce that bug.

## Correct clean build

From repo root / `invify-backend` on `feature/va-institution-provider-routing` (or the approved SHA):

```bash
cd invify-backend
npm ci
npm run build
# output: invify-backend/dist/  (gitignored)
```

Verify before packing:

```bash
# PowerShell
Select-String -Path dist\controllers\*.js,dist\modules\agent-portal\controllers\*.js -Pattern 'platform-admin-owner-id'
# expect: no matches in VA creation paths
```

Promote **`dist/`** (or a fresh `_build_candidates/...` copy of it), never this `dist-from-image/` tree.

## Preservation policy

Do **not** delete or overwrite this directory casually — other local docs and comparisons may still reference it. Treat it as **read-only archival**. Refresh only by intentional re-extract from a newly approved image digest, never by copying a half-built tree over it without labeling the new provenance.
