export declare class AuditArchiveService {
    /**
     * Run the archival process. Logs older than configured X hours are shifted
     * to the database-backed audit_log_archive table and pruned from active databases.
     */
    static runArchiving(): Promise<{
        archivedCount: number;
    }>;
}
