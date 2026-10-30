export declare class CloudMetricsService {
    /**
     * Health Engine: Calculates dynamic system health scores.
     */
    private calculateHealthScore;
    getOverview(tenantId: string): Promise<{
        systemHealthScore: number;
        healthDetails: {
            sync: number;
            terminal: number;
            backup: number;
            connectivity: number;
        };
        syncStatus: string;
        activeTerminals: number;
        devicesOnline: number;
        totalDevices: number;
        pendingUploads: number;
        lastSyncTime: string;
        offlineModeActive: boolean;
        connectionQuality: string;
        latencyMs: number;
    }>;
    getSyncHealth(tenantId: string): Promise<{
        lastSyncTime: string;
        syncStatus: string;
        pendingSyncQueue: number;
        offlineOps: {
            sales: number;
            invoices: number;
            inventory: number;
        };
        failedSyncRecords: number;
        syncSuccessRate: number;
        lastFullUpload: string;
        lastFullDownload: string;
    }>;
    getTerminals(tenantId: string): Promise<{
        activeCount: number;
        offlineCount: number;
        unassignedCount: number;
        terminals: never[];
    }>;
    getDevices(tenantId: string): Promise<{
        registeredDevices: never[];
        mpos: {
            status: string;
            lastTransactionTime: string;
            transactionSuccessRate: number;
            failedTransactionCount: number;
        };
        printer: {
            status: string;
            lastPrintJob: string;
            failedPrintJobs: number;
            printQueueSize: number;
        };
    }>;
    getBackups(tenantId: string): Promise<{
        lastBackupTime: string;
        backupStatus: string;
        backupSizeBytes: number;
        recoveryStatus: string;
    }>;
    getActivityFeed(tenantId: string): Promise<{
        activities: {
            id: string;
            timestamp: string;
            type: string;
            category: string;
            message: string;
        }[];
    }>;
    getAlerts(tenantId: string): Promise<{
        alerts: never[];
    }>;
    emitCloudMetricsUpdate(tenantId: string, payload: any): void;
    emitTerminalStatus(tenantId: string, payload: any): void;
    emitSyncEvent(tenantId: string, payload: any): void;
    emitBackupEvent(tenantId: string, payload: any): void;
    emitInventoryEvent(tenantId: string, payload: any): void;
}
