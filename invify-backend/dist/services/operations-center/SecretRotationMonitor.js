"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretRotationMonitor = void 0;
const SecretDatabaseService_1 = require("../secret-management/SecretDatabaseService");
class SecretRotationMonitor {
    /**
     * Reads all rotation jobs and identifies overdue/pending/completed states.
     */
    static async getSnapshot() {
        const jobs = await SecretDatabaseService_1.SecretDatabaseService.getRotationJobs();
        const now = Date.now();
        const entries = jobs.map((job) => {
            const scheduledMs = new Date(job.scheduled_at).getTime();
            const isOverdue = job.status === 'PENDING' && scheduledMs < now;
            return {
                id: job.id,
                provider: job.provider,
                status: job.status,
                scheduledAt: job.scheduled_at,
                executedAt: job.executed_at,
                isOverdue,
            };
        });
        return {
            pendingRotations: entries.filter((j) => j.status === 'PENDING').length,
            completedRotations: entries.filter((j) => j.status === 'COMPLETED').length,
            failedRotations: entries.filter((j) => j.status === 'FAILED').length,
            overdueRotations: entries.filter((j) => j.isOverdue).length,
            jobs: entries,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.SecretRotationMonitor = SecretRotationMonitor;
//# sourceMappingURL=SecretRotationMonitor.js.map