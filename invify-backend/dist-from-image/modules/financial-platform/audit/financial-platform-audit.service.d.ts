export declare enum AuditAction {
    ACTIVATE = "ACTIVATE",
    ROTATE = "ROTATE",
    DEACTIVATE = "DEACTIVATE",
    HEALTH_CHECK = "HEALTH_CHECK",
    SUSPEND = "SUSPEND"
}
export declare enum AuditStatus {
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE"
}
export declare class FinancialPlatformAuditService {
    private insertLog;
    logActivation(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void>;
    logRotation(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void>;
    logHealthCheck(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void>;
    logDeactivation(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void>;
}
