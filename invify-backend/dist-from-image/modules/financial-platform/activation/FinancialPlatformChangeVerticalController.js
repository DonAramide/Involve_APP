"use strict";
// invify-backend/src/modules/financial-platform/activation/FinancialPlatformChangeVerticalController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformChangeVerticalController = void 0;
const uuid_1 = require("uuid");
class FinancialPlatformChangeVerticalController {
    changeVerticalService;
    constructor(changeVerticalService) {
        this.changeVerticalService = changeVerticalService;
    }
    /**
     * POST /api/v1/tenants/:id/financial-platform/change-vertical
     * Body: { type: 'school'|'retail'|'services', confirmPhrase: 'CHANGE VERTICAL', reason?: string }
     */
    async changeVertical(req, res) {
        try {
            const tenantId = req.params.id;
            const { type, confirmPhrase, reason } = req.body || {};
            if (!type) {
                return res.status(400).json({ error: 'type is required (school | retail | services)' });
            }
            const context = {
                correlationId: req.headers['x-correlation-id'] || (0, uuid_1.v4)(),
                requestId: req.headers['x-request-id'] || (0, uuid_1.v4)(),
                traceId: req.headers['x-trace-id'] || (0, uuid_1.v4)(),
                auditId: (0, uuid_1.v4)(),
                actorId: req.user?.id || 'system',
                tenantId,
            };
            const result = await this.changeVerticalService.changeVertical(tenantId, type, confirmPhrase, reason, context);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Change Vertical Error:', error);
            const status = error.statusCode || (error.message?.includes('already in progress') ? 409 : 500);
            return res.status(status).json({
                error: error.message || 'Failed to change tenant vertical',
                details: error.message,
            });
        }
    }
}
exports.FinancialPlatformChangeVerticalController = FinancialPlatformChangeVerticalController;
//# sourceMappingURL=FinancialPlatformChangeVerticalController.js.map