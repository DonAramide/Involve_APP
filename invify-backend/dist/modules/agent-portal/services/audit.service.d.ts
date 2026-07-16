export declare class AuditLogService {
    listLogs(filters?: {
        entity_type?: string;
        actor_id?: string;
    }): Promise<any[]>;
}
export declare const auditLogService: AuditLogService;
