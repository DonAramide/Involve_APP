# Deployment Architecture

## Single source of truth (Phase 3 decision)

| Layer | Chosen path | Notes |
|---|---|---|
| Source repository | GitHub monorepo `Involve_APP` | Backend package: `invify-backend/` |
| CI platform | **GitHub Actions** (`invify-backend/.github/workflows/`) | Authoritative for build/test/promote |
| Container registry | GHCR (via production workflow) | Image built once, promoted |
| Deployment platform | Docker Compose foundations + `invify-backend/k8s/` manifests | Compose for env definition; k8s probes aligned to `/livez` `/readyz` |
| Aspirational / non-authoritative | `infrastructure/ci-cd/*`, `infrastructure/k8s/*` (port/probe mismatches) | Documented as legacy/aspirational — do not treat as competing truth |

Do **not** introduce a new cloud provider in this phase.

## Promotion model

```
feature/*
    ↓
  main
    ↓
 CI BUILD (once)
    ↓
 unit + integration + security tests
    ↓
 package container artifact
    ↓
 STAGING deploy (optional when secrets/URL present)
    ↓
 QA / UAT
    ↓
 RELEASE APPROVAL (GitHub Environment: production)
    ↓
 RELEASE TAG (v*.*.*)
    ↓
 PRODUCTION image push / definition
    ↓
 smoke /livez /readyz (only if PROD_API_URL configured)
    ↓
 LIVE traffic  ← NOT activated in Phase 3
```

## Health contract (mandatory)

| Endpoint | Meaning | Used by |
|---|---|---|
| `/livez` | Process alive (no dependency fail) | Docker HEALTHCHECK, k8s liveness |
| `/readyz` | Ready for traffic (config/DB as appropriate) | Compose readiness, k8s readiness, staging smoke |
| `/health` | Compatibility documentation endpoint | Optional clients |
| `/liveness` `/readiness` `/healthz` | Aliases → same handlers | Legacy compat only |

## Environment compose files

| File | Purpose | Live traffic |
|---|---|---|
| `docker-compose.local.yml` | Developer stack | N/A |
| `docker-compose.staging.yml` | Reproducible staging definition | Deploy when infra ready |
| `docker-compose.prod.yml` | Production foundation | **Not activated** |

Same application image/artifact must be promotable: build once, configure via env.

## Production approval gate

Required before any production activation (later phase):
- [ ] Staging deployment successful
- [ ] Automated tests passed
- [ ] Security tests passed (Phase 2 suite green)
- [ ] Release candidate / tag created
- [ ] Migration reviewed for target PRODUCTION_DATABASE
- [ ] Production configuration validated (boot asserts)
- [ ] Approved reviewer (GitHub Environment protection)

Ordinary commits to `main` must **not** auto-deploy production.

## Docker entrypoint

- Built artifact: `dist/app.js`
- `CMD ["node", "dist/app.js"]`
- Image build fails if `dist/app.js` missing

## Phase 3 explicit non-goals

- No production traffic
- No live payment providers
- No real customer data migration
- No declaration of production readiness
