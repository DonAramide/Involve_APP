export declare class AuditLogRepository {
    listLogs(filters?: {
        entity_type?: string;
        actor_id?: string;
    }): Promise<any[]>;
}
export declare const auditLogRepository: AuditLogRepository;
