import { ObservabilityContext } from '../domain/Types';
export declare class FinancialPlatformAuditService {
    /**
     * Fetches financial-platform audit history.
     * Uses the real audit_logs schema: module, action, timestamp, metadata, status.
     */
    getAuditHistory(tenantId: string, _context: ObservabilityContext, limit?: number): Promise<{
        id: any;
        created_at: any;
        actor_id: any;
        event_type: any;
        status: any;
        payload: any;
    }[]>;
    private normalizeLog;
}
