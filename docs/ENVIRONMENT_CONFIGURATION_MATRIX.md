# Environment Configuration Matrix

**Scope:** Invify monorepo — same application code, environment-specific config only.  
**Rule:** Never place secret values in this document. Sources are references only.

| Configuration | Development | Staging | Production | Source |
|---|---|---|---|---|
| `BUILD_VARIANT` / `APP_ENV` | `LOCAL` / `development` | `STAGING` / `staging` | `PROD` / `production` | ENVIRONMENT_VARIABLE |
| `NODE_ENV` | `development` | `staging` | `production` | ENVIRONMENT_VARIABLE |
| API listen port | `3000`/`3004` local | staging port map | production port map | ENVIRONMENT_VARIABLE |
| `APP_URL` / public API URL | localhost / LAN (dev only) | staging hostname | production hostname | ENVIRONMENT_VARIABLE / CONFIG_SERVICE |
| Database (Supabase project) | DEV_DATABASE / `LOCAL_*` or `DEV_*` | STAGING_DATABASE / `STAGING_*` | PRODUCTION_DATABASE / `PROD_*` | SECRET_MANAGER + ENVIRONMENT_VARIABLE |
| `SUPABASE_URL` | local/dev project | staging project | production project | SECRET_MANAGER |
| `SUPABASE_KEY` (anon) | dev | staging | production | SECRET_MANAGER (public OK for clients) |
| `SUPABASE_SERVICE_ROLE_KEY` | dev | staging | production | SECRET_MANAGER (runtime-only) |
| `SUPABASE_JWT_SECRET` | dev | staging | production | SECRET_MANAGER |
| `JWT_SECRET` | dev | staging | production | SECRET_MANAGER |
| `LICENSE_HMAC_SECRET` | dev | staging | production | SECRET_MANAGER |
| Redis URL | local Redis / compose | staging Redis | production Redis | SECRET_MANAGER / ENVIRONMENT_VARIABLE |
| Queues / workers | in-process (LOCAL) | staging workers (same image) | production workers (same image) | ENVIRONMENT_VARIABLE + DEPLOY |
| Object storage | local/dev bucket | staging bucket | production bucket | SECRET_MANAGER |
| Authentication | local + optional offline | real JWT verify | real JWT verify | ENVIRONMENT_VARIABLE |
| Encryption / HMAC | local secrets | staging secrets | production secrets | SECRET_MANAGER |
| WhatsApp provider | mock/sandbox allowed | sandbox/test | real provider (later phase) | SECRET_MANAGER |
| Email provider | mock/local | staging provider | production provider | SECRET_MANAGER |
| Payments / Quasar | simulator allowed | sandbox/test providers | real providers **gated** (`FEATURE_REAL_MONEY_PAYOUTS`) | SECRET_MANAGER + FEATURE FLAG |
| Webhook signing secrets | optional LOCAL | required | required | SECRET_MANAGER |
| Frontend admin `VITE_API_URL` | empty (Vite proxy) or local | staging API URL | production API URL | ENVIRONMENT_VARIABLE (build-time) |
| Frontend `VITE_BUILD_VARIANT` | LOCAL | STAGING | PROD | ENVIRONMENT_VARIABLE (build-time) |
| Mobile `APP_ENV` | development | staging | production | dart-define |
| Mobile `API_BASE_URL` | debug default OK | staging API | production API | dart-define |
| Mobile Supabase public config | optional dotenv (dev) | dart-define | dart-define | dart-define |
| Monitoring / logging | debug | info | warn+ | ENVIRONMENT_VARIABLE |
| Feature flags | LOCAL defaults | staging flags | production flags | ENVIRONMENT_VARIABLE / CONFIG_SERVICE |
| External APIs | mocks/sandbox | sandbox | production endpoints | SECRET_MANAGER |

## Fail-fast rules

| Environment | Missing required config | Behavior |
|---|---|---|
| Development | often warn | may start with reduced capability |
| Staging | required secrets / URLs | **refuse to start** |
| Production | required secrets / URLs / variant | **refuse to start** |

Staging/Production must never fall back to localhost, LAN IP, ngrok, dummy keys, or another environment’s credentials.

## Client safety

| Client | Allowed secrets | Forbidden |
|---|---|---|
| Flutter | public API URL, public Supabase anon key, feature flags | service role, JWT signing, webhook, payment credentials |
| Admin (Vue) | public API URL, build variant | backend secrets |

## Payment environment separation

| Flag / secret | Dev | Staging | Production (Phase 3) |
|---|---|---|---|
| `FEATURE_REAL_MONEY_PAYOUTS` | ignored / false | **false** | **false** (not activated) |
| `ENABLE_SIMULATOR` | true allowed | optional | **forbidden** |
| Live payment credentials | not used | sandbox only | placeholders / not connected |
