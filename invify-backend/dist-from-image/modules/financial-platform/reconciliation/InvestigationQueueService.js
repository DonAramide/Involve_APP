"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestigationQueueService = void 0;
class InvestigationQueueService {
    dbStore;
    logger;
    constructor(dbStore, logger) {
        this.dbStore = dbStore;
        this.logger = logger;
    }
    async flagDiscrepancy(payload) {
        this.logger.warn(`Flagging discrepancy: ${payload.discrepancyType}`, {
            tenantId: payload.tenantId,
            targetId: payload.targetId
        });
        return await this.dbStore.createReconciliationRecord({
            tenantId: payload.tenantId,
            targetType: payload.targetType,
            targetId: payload.targetId,
            discrepancyType: payload.discrepancyType,
            invifyState: payload.invifyState,
            quasarState: payload.quasarState,
            status: 'OPEN'
        });
    }
    async resolveDiscrepancy(recordId, resolutionNotes) {
        this.logger.info(`Resolving discrepancy ${recordId}`, { resolutionNotes });
        return await this.dbStore.updateReconciliationRecord(recordId, {
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            resolutionNotes
        });
    }
}
exports.InvestigationQueueService = InvestigationQueueService;
//# sourceMappingURL=InvestigationQueueService.js.map