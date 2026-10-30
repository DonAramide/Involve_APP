export interface LogAuditEventParams {
    tenantId: string;
    actorUserId?: string;
    actorRole?: string;
    action: string;
    resourceType: string;
    resourceId: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    viaPlatformAccess?: boolean;
    platformReason?: string;
}
/**
 * Health Insurance Audit Logger.
 * Writes to hw_audit_events, an append-only table protected by DB trigger against mutations.
 */
export declare class HealthAuditService {
    static log(params: LogAuditEventParams): Promise<void>;
    static recordEvent(params: LogAuditEventParams): Promise<void>;
    /**
     * Tenant-scoped health audit. Do not use for Invify catalogue writes:
     * hw_audit_events.tenant_id is NOT NULL and references tenants(id).
     * Catalogue mutations use hw_catalogue_apply_mutation instead.
     */
    static recordEventOrThrow(params: LogAuditEventParams): Promise<void>;
}
