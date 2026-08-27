# Staging Resume Checklist (after Docker recovery)

Use only when Part 1 passes:

```text
docker version
docker info
docker compose version
```

## Immutable image

```powershell
cd invify-backend
$sha = (git rev-parse --short HEAD)
$ts = Get-Date -Format 'yyyyMMddHHmmss'
docker build -t "invify:$sha" -t "invify:staging-$ts" --target runner .
docker run --rm "invify:$sha" node -e "require('fs').accessSync('dist/app.js'); console.log('dist/app.js OK')"
```

## Staging secrets

Copy `invify-backend/.env.staging.example` → local `.env.staging` (gitignored).  
Fill staging-only values. Never paste production secrets.

## Start stack

```powershell
cd invify-backend
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml ps
curl http://127.0.0.1:3000/livez
curl http://127.0.0.1:3000/readyz
curl http://127.0.0.1:3000/health
```

## Migrations

Apply `supabase/migrations/` to the **explicit** staging database target only  
(including `20260813000000_p20_payment_idempotency_constraints.sql`).

## Required flags

```text
BUILD_VARIANT=STAGING
APP_ENV=staging
FEATURE_REAL_MONEY_PAYOUTS=false
```

## Safety

- No production DB / secrets / payment credentials
- No live money
- Prefer single API replica until workers are gated
