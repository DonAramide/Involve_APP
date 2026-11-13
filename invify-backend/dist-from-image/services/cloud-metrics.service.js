"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudMetricsService = void 0;
const app_1 = require("../app");
class CloudMetricsService {
    /**
     * Health Engine: Calculates dynamic system health scores.
     */
    calculateHealthScore(syncStatus, activeTerminals, pendingUploads, connectionQuality) {
        let syncScore = syncStatus === 'healthy' ? 100 : (syncStatus === 'warning' ? 80 : 50);
        let terminalScore = activeTerminals > 0 ? 100 : 50;
        let backupScore = 100; // Simulated
        let connectivityScore = connectionQuality === 'Excellent' ? 100 : (connectionQuality === 'Good' ? 80 : 50);
        // Penalties
        if (pendingUploads > 0)
            syncScore -= Math.min(10, pendingUploads);
        const overallScore = Math.floor((syncScore * 0.4) + (terminalScore * 0.3) + (backupScore * 0.2) + (connectivityScore * 0.1));
        return {
            overall: Math.max(0, Math.min(100, overallScore)),
            details: {
                sync: Math.max(0, syncScore),
                terminal: terminalScore,
                backup: backupScore,
                connectivity: connectivityScore
            }
        };
    }
    async getOverview(tenantId) {
        // In the future: Fetch actual terminal count, sync queue from Supabase.
        // For now, implementing API contract with mock real-time engine.
        const activeTerminals = 2;
        const pendingUploads = 0;
        const syncStatus = 'healthy';
        const connectionQuality = 'Excellent';
        const latencyMs = Math.floor(Math.random() * 50) + 40;
        const health = this.calculateHealthScore(syncStatus, activeTerminals, pendingUploads, connectionQuality);
        return {
            systemHealthScore: health.overall,
            healthDetails: health.details,
            syncStatus,
            activeTerminals,
            devicesOnline: 3,
            totalDevices: 3,
            pendingUploads,
            lastSyncTime: new Date(Date.now() - 30000).toISOString(),
            offlineModeActive: false,
            connectionQuality,
            latencyMs
        };
    }
    async getSyncHealth(tenantId) {
        return {
            lastSyncTime: new Date(Date.now() - 30000).toISOString(),
            syncStatus: "healthy",
            pendingSyncQueue: 0,
            offlineOps: {
                sales: 0,
                invoices: 0,
                inventory: 0
            },
            failedSyncRecords: 0,
            syncSuccessRate: 99.8,
            lastFullUpload: new Date(Date.now() - 3600000).toISOString(),
            lastFullDownload: new Date(Date.now() - 36000000).toISOString()
        };
    }
    async getTerminals(tenantId) {
        return {
            activeCount: 2,
            offlineCount: 0,
            unassignedCount: 1,
            terminals: []
        };
    }
    async getDevices(tenantId) {
        return {
            registeredDevices: [],
            mpos: {
                status: "connected",
                lastTransactionTime: new Date(Date.now() - 300000).toISOString(),
                transactionSuccessRate: 99.5,
                failedTransactionCount: 1
            },
            printer: {
                status: "connected",
                lastPrintJob: new Date(Date.now() - 300000).toISOString(),
                failedPrintJobs: 0,
                printQueueSize: 0
            }
        };
    }
    async getBackups(tenantId) {
        return {
            lastBackupTime: new Date(Date.now() - 43200000).toISOString(),
            backupStatus: "healthy",
            backupSizeBytes: 15482000,
            recoveryStatus: "healthy"
        };
    }
    async getActivityFeed(tenantId) {
        return {
            activities: [
                {
                    id: "evt-001",
                    timestamp: new Date(Date.now() - 5000).toISOString(),
                    type: "sync.success",
                    category: "sync",
                    message: "Inventory synchronized."
                },
                {
                    id: "evt-002",
                    timestamp: new Date(Date.now() - 120000).toISOString(),
                    type: "terminal.connect",
                    category: "terminal",
                    message: "Terminal INV-001 connected."
                }
            ]
        };
    }
    async getAlerts(tenantId) {
        return {
            alerts: []
        };
    }
    // --- WEBSOCKET EVENT EMITTERS ---
    emitCloudMetricsUpdate(tenantId, payload) {
        app_1.io.to(`tenant:${tenantId}`).emit('cloud.metrics.updates', payload);
    }
    emitTerminalStatus(tenantId, payload) {
        app_1.io.to(`tenant:${tenantId}`).emit('terminal.status', payload);
    }
    emitSyncEvent(tenantId, payload) {
        app_1.io.to(`tenant:${tenantId}`).emit('sync.events', payload);
    }
    emitBackupEvent(tenantId, payload) {
        app_1.io.to(`tenant:${tenantId}`).emit('backup.events', payload);
    }
    emitInventoryEvent(tenantId, payload) {
        app_1.io.to(`tenant:${tenantId}`).emit('inventory.events', payload);
    }
}
exports.CloudMetricsService = CloudMetricsService;
//# sourceMappingURL=cloud-metrics.service.js.map