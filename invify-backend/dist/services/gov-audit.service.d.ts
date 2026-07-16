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
}
export declare class GovAuditService {
    /**
     * Logs a high-risk RBAC permission grant to guarantee an immutable audit trail.
     */
    static logRbacGrant(actorId: string, targetUserId: string, oldRole: string, newRole: string, reqIp?: string): Promise<void>;
    /**
     * Log a governance/maker-checker action with IP and location context.
     */
    static logAction(entry: Omit<AuditEntry, 'location'> & {
        location?: string;
    }): Promise<void>;
    /**
     * Get a unified, paginated, filtered audit ledger from all sources.
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
    }): Promise<{
        data: AuditEntry[];
        total: number;
        stats: any;
    }>;
    /**
     * Seed sample governance audit logs for demonstration purposes
     */
    static seedSampleLogs(): Promise<void>;
}
