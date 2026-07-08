export type AuditEventType =
  | 'POLICY_CREATED'
  | 'POLICY_ACTIVATED'
  | 'POLICY_SUPERSEDED'
  | 'POLICY_EXPIRED'
  | 'POLICY_REVOKED'
  | 'CHANGE_REQUEST_SUBMITTED'
  | 'CHANGE_REQUEST_APPROVED'
  | 'CHANGE_REQUEST_REJECTED'
  | 'CHANGE_REQUEST_CANCELLED'
  | 'EMERGENCY_APPROVAL'
  | 'KILL_SWITCH_ACTIVATED'
  | 'KILL_SWITCH_DEACTIVATED'
  | 'GOVERNANCE_DECISION'
  | 'ROLLBACK_INITIATED'
  | 'POLICY_DIFF_GENERATED'
  | 'CAPABILITY_RESOLVED';

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface GovernanceAuditEvent {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  actor: string;
  targetId: string;
  description: string;
  correlationId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class GovernanceAuditService {
  private static events: GovernanceAuditEvent[] = [];
  private static seq = 0;

  static clearEvents() {
    this.events = [];
    this.seq = 0;
  }

  static record(input: {
    eventType: AuditEventType;
    severity: AuditSeverity;
    actor?: string;
    targetId?: string;
    description: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): GovernanceAuditEvent {
    const event: GovernanceAuditEvent = {
      id: `GAE-${++this.seq}`,
      eventType: input.eventType,
      severity: input.severity,
      actor: input.actor ?? 'SYSTEM',
      targetId: input.targetId ?? '',
      description: input.description,
      correlationId: input.correlationId ?? `CORR-${this.seq}`,
      timestamp: new Date().toISOString(),
      metadata: input.metadata,
    };
    this.events.push(event);
    return event;
  }

  static getEvents(): GovernanceAuditEvent[] { return [...this.events]; }

  static getByType(type: AuditEventType): GovernanceAuditEvent[] {
    return this.events.filter((e) => e.eventType === type);
  }

  static getBySeverity(severity: AuditSeverity): GovernanceAuditEvent[] {
    return this.events.filter((e) => e.severity === severity);
  }

  static getSeverityCounts(): Record<AuditSeverity, number> {
    return {
      INFO:     this.events.filter((e) => e.severity === 'INFO').length,
      WARN:     this.events.filter((e) => e.severity === 'WARN').length,
      CRITICAL: this.events.filter((e) => e.severity === 'CRITICAL').length,
    };
  }
}
