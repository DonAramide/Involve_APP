# Production Release Manifest

This manifest is the source-to-release mapping for `production-release/`.

## Source mappings

| Source path | Release path | Content |
| :--- | :--- | :--- |
| `invify-admin/src/` | `admin/src/` | Admin application source |
| `invify-admin/public/` | `admin/public/` | Admin static assets |
| `invify-admin/{index.html,package.json,package-lock.json,vite.config.js,tsconfig.json}` | `admin/` | Admin build inputs |
| `invify-backend/src/` | `backend/src/` | Backend production TypeScript source |
| `invify-backend/supabase/migrations/` | `backend/supabase/migrations/` | Complete Supabase migration chain, including P05–P20 |
| `invify-backend/supabase/scripts/` | `backend/supabase/scripts/` | Required Supabase operational SQL |
| `invify-backend/k8s/` | `backend/k8s/` | Backend Kubernetes configuration |
| `invify-backend/.github/workflows/` | `backend/.github/workflows/` | Backend CI/release workflow definitions |
| `invify-backend/{package.json,package-lock.json,tsconfig.json,Dockerfile,docker-compose.prod.yml}` | `backend/` | Backend build and deployment inputs |
| `lib/` | `mobile/lib/` | Flutter application source |
| `assets/` | `mobile/assets/` | Flutter runtime assets |
| `{android,ios,web,windows,linux,macos}/` | `mobile/` | Flutter platform build source |
| `{pubspec.yaml,pubspec.lock,analysis_options.yaml}` | `mobile/` | Flutter dependency/build inputs |
| `infrastructure/` | `deploy/` | Production infrastructure definitions |

## Explicit exclusions

- Root legacy `backend/`
- `invify-quasar-app/`
- Tests, coverage, build output, `dist/`, and `node_modules/`
- `.env`, `.env.*`, local credentials, service-account JSON, and Vault transfer material
- `uploads/`, `scratch/`, audit logs/reports, temporary diagnostics, and Git metadata
- Existing release directories and release archives
