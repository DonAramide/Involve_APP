export type SecurityEventType =
  | 'RATE_LIMIT_BLOCKED'
  | 'WAF_BLOCKED'
  | 'WAF_FLAGGED'
  | 'IP_DENIED'
  | 'GEO_BLOCKED'
  | 'BOT_DETECTED'
  | 'HSM_OPERATION'
  | 'PENTEST_HOOK'
  | 'COMPLIANCE_VIOLATION'
  | 'AUTH_FAILURE';

export type SecuritySeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export interface SecurityAuditEvent {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  metadata: Record<string, any>;
  recordedAt: string;
}

export interface RecordEventInput {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  description: string;
  metadata?: Record<string, any>;
}

export class SecurityAuditService {
  private static events: SecurityAuditEvent[] = [];

  static clearEvents() {
    this.events = [];
  }

  static getEvents(): SecurityAuditEvent[] {
    return this.events;
  }

  static getEventsByType(eventType: SecurityEventType): SecurityAuditEvent[] {
    return this.events.filter((e) => e.eventType === eventType);
  }

  static getEventsBySeverity(severity: SecuritySeverity): SecurityAuditEvent[] {
    return this.events.filter((e) => e.severity === severity);
  }

  /**
   * Record a security event to the audit trail.
   */
  static record(input: RecordEventInput): SecurityAuditEvent {
    const event: SecurityAuditEvent = {
      id: Math.random().toString(36).substring(2),
      eventType: input.eventType,
      severity: input.severity,
      description: input.description,
      metadata: input.metadata ?? {},
      recordedAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  /**
   * Returns a breakdown of event counts by type.
   */
  static getBreakdown(): Record<SecurityEventType, number> {
    const breakdown = {} as Record<SecurityEventType, number>;
    for (const event of this.events) {
      breakdown[event.eventType] = (breakdown[event.eventType] || 0) + 1;
    }
    return breakdown;
  }

  /**
   * Returns total counts by severity.
   */
  static getSeverityCounts(): Record<SecuritySeverity, number> {
    return {
      INFO: this.events.filter((e) => e.severity === 'INFO').length,
      WARNING: this.events.filter((e) => e.severity === 'WARNING').length,
      HIGH: this.events.filter((e) => e.severity === 'HIGH').length,
      CRITICAL: this.events.filter((e) => e.severity === 'CRITICAL').length,
    };
  }
}
