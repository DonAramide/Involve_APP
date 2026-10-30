"use strict";
// invify-backend/src/modules/financial-platform/audit/FinancialPlatformAuditController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformAuditController = void 0;
const uuid_1 = require("uuid");
class FinancialPlatformAuditController {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    /**
     * GET /api/v1/tenants/:id/financial-platform/audit
     */
    async getAuditLog(req, res) {
        try {
            const tenantId = req.params.id;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const context = {
                correlationId: req.headers['x-correlation-id'] || (0, uuid_1.v4)(),
                requestId: req.headers['x-request-id'] || (0, uuid_1.v4)(),
                traceId: req.headers['x-trace-id'] || (0, uuid_1.v4)(),
                auditId: (0, uuid_1.v4)(),
                actorId: req.user?.id || 'system',
                tenantId: tenantId
            };
            const history = await this.auditService.getAuditHistory(tenantId, context, limit);
            return res.status(200).json(history);
        }
        catch (error) {
            console.error('Audit Fetch Error:', error);
            return res.status(500).json({ error: 'Failed to fetch audit history', details: error.message });
        }
    }
}
exports.FinancialPlatformAuditController = FinancialPlatformAuditController;
//# sourceMappingURL=FinancialPlatformAuditController.js.map