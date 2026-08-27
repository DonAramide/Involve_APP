# Worker Architecture

**Phase 3 scope:** Inventory + documentation. Durable queue rewrite deferred to Phase 4/5 unless noted.

## Current execution model

Critical jobs today run **in-process** inside the API Node process (`invify-backend/src/app.ts`) via `setInterval` / `setTimeout`.

Implication: multiple replicas = duplicate job execution unless external locking is added.

## Job inventory

| Job | Current mechanism | Frequency | Idempotency | Distributed locking | Failure recovery | Production recommendation |
|---|---|---|---|---|---|---|
| OS telemetry broadcast | `setInterval` | 5s | N/A (broadcast) | None | Next tick | Keep in-process OK; or push metrics to Prometheus/Datadog agent |
| Audit log archive | `setInterval` + boot `setTimeout` | 1h (+10s after boot) | Service-dependent | None | Log + retry next hour | Move to scheduled worker with lease/lock (Phase 4) |
| Governance sample seed | `setTimeout` | once @ 3s boot | N/A | None | none | **LOCAL only** (Phase 3 gated) — never staging/prod |
| Nightly reconciliation | `setInterval` | 24h | Job should be date-keyed | None | Log error | **Priority:** durable cron + lock + idempotent date run (Phase 4) |
| Settlement / card recon | module services; triggered by jobs/API | varies | partial | None | investigation queue | Durable worker + lock (Phase 4/5) |
| Webhook DLQ replay | on-demand / service | varies | ledger keys | None | DLQ | Keep API-triggered; add worker consumer later |

## Financial priority

1. **Nightly reconciliation** — must not double-run across replicas; needs distributed lock + date idempotency.
2. **Settlement / card reconciliation** — same.
3. **Audit archive** — lower financial risk; still needs single-leader semantics at scale.
4. **Telemetry** — non-financial.

## Minimal Phase 3 improvement

- `GovAuditService.seedSampleLogs()` runs only when `BUILD_VARIANT=LOCAL`.
- No broad worker rewrite in this phase (per authorization).

## Target architecture (Phase 4/5)

```
API pods (stateless HTTP)
        │
        ▼
Worker deployment (same image, WORKER_MODE=true)
        │
        ├── Redis / queue consumer
        ├── Cron triggers (reconciliation, archive)
        └── Distributed lease table / Redis lock
```

Suggested env gates (future):
- `ENABLE_INPROCESS_WORKERS=true|false`
- `WORKER_ROLE=api|worker|all`

## Interim multi-replica guidance

Until durable workers exist:
- Run **one** API replica that owns timers, **or**
- Accept duplicate non-critical jobs and gate financial jobs behind a manual/ops trigger.
