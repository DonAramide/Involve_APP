"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationController = void 0;
const reconciliation_service_1 = require("../services/reconciliation.service");
class ReconciliationController {
    static async getReport(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        const { status, cursor, limit } = req.query;
        // tenantId defaults to global
        try {
            const report = await reconciliation_service_1.ReconciliationService.getReport({
                tenantId,
                status: status,
                cursor: cursor,
                limit: limit ? parseInt(limit) : 50
            });
            return res.status(200).json(report);
        }
        catch (error) {
            console.error('[ReconciliationController] Error:', error.message);
            return res.status(500).json({ error: 'Failed to generate reconciliation report' });
        }
    }
    // ==== Detail Tabs ====
    static async getDetails(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getDetails(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getLedger(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getLedger(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getSettlement(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getSettlement(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getWallet(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getWallet(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getCard(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getCard(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getBank(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getBank(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getAudit(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getAudit(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getTimeline(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const result = await reconciliation_service_1.ReconciliationService.getTimeline(req.params.id, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    // ==== Commands ====
    static async assign(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'ASSIGN', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async escalate(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'ESCALATE', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async resolve(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'RESOLVE', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async forceMatch(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'FORCE_MATCH', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async retry(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'RETRY', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async lock(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'LOCK', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async unlock(req, res) {
        const tenantId = req.effectiveTenantId || req.headers['x-tenant-id'] || 'global';
        // tenantId defaults to global
        try {
            const user = req.user;
            const result = await reconciliation_service_1.ReconciliationService.executeCommand(req.params.id, 'UNLOCK', req.body, user, tenantId);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.ReconciliationController = ReconciliationController;
//# sourceMappingURL=reconciliation.controller.js.map