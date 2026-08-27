# Secrets Management

**Rule:** Never commit secret values. This document lists **names**, ownership, and handling only.

## Principles

1. DEV, STAGING, and PRODUCTION secrets are **independent**.
2. Never share JWT, DB, webhook, payment, or encryption secrets across environments.
3. Clients may receive **public** configuration only (API URL, anon key).
4. Production secrets are injected at runtime from a secret manager / CI environment — placeholders in compose only.

## Secret catalog

| Secret name | Environment | Source | Rotation | Runtime-only | Client-safe |
|---|---|---|---|---|---|
| `JWT_SECRET` | DEV / STAGING / PROD (separate) | SECRET_MANAGER | ≥ 90 days or on incident | Yes | No |
| `SUPABASE_JWT_SECRET` | per env | SECRET_MANAGER | with Supabase project rotation | Yes | No |
| `LICENSE_HMAC_SECRET` | per env | SECRET_MANAGER | ≥ 90 days | Yes | No |
| `SUPABASE_URL` | per env | SECRET_MANAGER / CONFIG | rare | Yes | Public URL OK |
| `SUPABASE_KEY` / anon | per env | SECRET_MANAGER | with project | Yes | Yes (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | per env | SECRET_MANAGER | with project | Yes | **No** |
| `QUASAR_WEBHOOK_SIGNING_SECRET` | STAGING / PROD | SECRET_MANAGER | on provider rotate | Yes | No |
| Paystack / FLW / Stripe webhook secrets | STAGING (test) / PROD (live later) | SECRET_MANAGER | on provider rotate | Yes | No |
| Payment provider API keys | STAGING test / PROD live later | SECRET_MANAGER | on provider rotate | Yes | No |
| `REDIS_URL` | per env | SECRET_MANAGER | on infrastructure change | Yes | No |
| DB connection (if separate from Supabase) | per env | SECRET_MANAGER | on rotate | Yes | No |
| Email / WhatsApp credentials | per env | SECRET_MANAGER | provider policy | Yes | No |
| Admin `VITE_API_URL` | build-time per env | CI ENVIRONMENT_VARIABLE | on hostname change | Build | Public URL |
| Mobile `API_BASE_URL` / `SUPABASE_ANON_KEY` | build-time per env | CI dart-define | on hostname change | Build | Public only |

## Environment planes

```
DEV secrets ──► local/.env (gitignored) / developer secret store
STAGING secrets ──► gitignored `.env.staging` loaded via:
                    docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
                    Compose interpolates STAGING_* secret names into the container.
                    Do not use mixed developer `.env` JWT_SECRET for staging.
PRODUCTION secrets ──► CI production environment (approval-gated) / secret manager path /production/*
```

Docker Compose also auto-loads a project-directory `.env` for **YAML substitution**. That is why a staging container can start without `.env.staging` if `JWT_SECRET` / `SUPABASE_*` exist in `.env`. Staging compose now requires `STAGING_JWT_SECRET`, `STAGING_SUPABASE_JWT_SECRET`, and `STAGING_LICENSE_HMAC_SECRET` so a mixed `.env` cannot silently inject an insecure default.

**Diagnostics:** never `docker inspect` a staging/prod container for env. Use sanitized SET/UNSET flags only.

## Forbidden practices

- Committing `.env` with real credentials
- Reusing staging JWT or DB credentials in production
- Embedding service-role keys in Flutter or admin bundles
- Using `whsec_mock_*` or dummy payment secrets outside LOCAL
- Inferring production secrets from missing variables

## Phase 3 posture

- Production compose references `${...:?required}` placeholders only.
- Live payment credentials are **not** created or connected.
- `FEATURE_REAL_MONEY_PAYOUTS` remains false.
