export type AuditEventType = 'POLICY_CREATED' | 'POLICY_ACTIVATED' | 'POLICY_SUPERSEDED' | 'POLICY_EXPIRED' | 'POLICY_REVOKED' | 'CHANGE_REQUEST_SUBMITTED' | 'CHANGE_REQUEST_APPROVED' | 'CHANGE_REQUEST_REJECTED' | 'CHANGE_REQUEST_CANCELLED' | 'EMERGENCY_APPROVAL' | 'KILL_SWITCH_ACTIVATED' | 'KILL_SWITCH_DEACTIVATED' | 'GOVERNANCE_DECISION' | 'ROLLBACK_INITIATED' | 'POLICY_DIFF_GENERATED' | 'CAPABILITY_RESOLVED';
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
export declare class GovernanceAuditService {
    private static events;
    private static seq;
    static clearEvents(): void;
    static record(input: {
        eventType: AuditEventType;
        severity: AuditSeverity;
        actor?: string;
        targetId?: string;
        description: string;
        correlationId?: string;
        metadata?: Record<string, any>;
    }): GovernanceAuditEvent;
    static getEvents(): GovernanceAuditEvent[];
    static getByType(type: AuditEventType): GovernanceAuditEvent[];
    static getBySeverity(severity: AuditSeverity): GovernanceAuditEvent[];
    static getSeverityCounts(): Record<AuditSeverity, number>;
}
