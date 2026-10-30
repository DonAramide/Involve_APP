export interface AuditEntry {
    id: string;
    timestamp: string;
    module: 'TERMINAL' | 'FINANCIAL' | 'DEVICE' | 'AUTH' | 'GOVERNANCE' | 'MAKER_CHECKER' | 'SYSTEM' | 'USER_MGMT';
    action: string;
    user_email: string;
    user_name: string;
    ip_address: string;
    location: string;
    target: string;
    status: 'success' | 'failed' | 'pending' | 'approved' | 'rejected' | 'blocked';
    metadata?: Record<string, any>;
    tenant_id?: string | null;
    tenant_name?: string | null;
}
export declare class GovAuditService {
    /**
     * Logs a high-risk RBAC permission grant to guarantee an immutable audit trail.
     */
    static logRbacGrant(actorId: string, targetUserId: string, oldRole: string, newRole: string, reqIp?: string): Promise<void>;
    /**
     * Log a governance/maker-checker action with IP and location context.
     * Uses a real UUID for audit_logs.id (DB column is UUID).
     */
    static logAction(entry: Omit<AuditEntry, 'location'> & {
        location?: string;
        tenant_id?: string | null;
    }): Promise<void>;
    /**
     * Get a unified, paginated, filtered audit ledger from all activity sources.
     */
    static getLedger(filters?: {
        module?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
        action?: string;
        status?: string;
        page?: string | number;
        limit?: string | number;
        tenantId?: string;
        target?: string;
    }): Promise<{
        data: AuditEntry[];
        total: number;
        stats: any;
    }>;
    static seedSampleLogs(): Promise<void>;
}
