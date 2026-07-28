// invify-backend/src/modules/financial-platform/domain/Types.ts

export type ActivationState = 
  | 'UNPROVISIONED'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'ROTATING'
  | 'DEGRADED'
  | 'FAILED'
  | 'DEACTIVATED';

export interface ObservabilityContext {
  correlationId: string;
  requestId: string;
  traceId: string;
  auditId: string;
  actorId: string;
  tenantId: string;
}

export interface DomainEventPublisher {
  publish(eventName: string, payload: any, context: ObservabilityContext): Promise<void>;
}

export interface AuditLogger {
  log(eventName: string, payload: any, context: ObservabilityContext): Promise<void>;
}

export interface MetricsExporter {
  incrementCounter(metricName: string, tags?: Record<string, string>): void;
  recordDuration(metricName: string, durationMs: number, tags?: Record<string, string>): void;
}
