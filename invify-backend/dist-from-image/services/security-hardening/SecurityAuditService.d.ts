export type SecurityEventType = 'RATE_LIMIT_BLOCKED' | 'WAF_BLOCKED' | 'WAF_FLAGGED' | 'IP_DENIED' | 'GEO_BLOCKED' | 'BOT_DETECTED' | 'HSM_OPERATION' | 'PENTEST_HOOK' | 'COMPLIANCE_VIOLATION' | 'AUTH_FAILURE';
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
export declare class SecurityAuditService {
    private static events;
    static clearEvents(): void;
    static getEvents(): SecurityAuditEvent[];
    static getEventsByType(eventType: SecurityEventType): SecurityAuditEvent[];
    static getEventsBySeverity(severity: SecuritySeverity): SecurityAuditEvent[];
    /**
     * Record a security event to the audit trail.
     */
    static record(input: RecordEventInput): SecurityAuditEvent;
    /**
     * Returns a breakdown of event counts by type.
     */
    static getBreakdown(): Record<SecurityEventType, number>;
    /**
     * Returns total counts by severity.
     */
    static getSeverityCounts(): Record<SecuritySeverity, number>;
}
