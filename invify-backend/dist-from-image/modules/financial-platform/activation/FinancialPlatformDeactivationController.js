"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformDeactivationController = void 0;
const uuid_1 = require("uuid");
class FinancialPlatformDeactivationController {
    deactivationService;
    constructor(deactivationService) {
        this.deactivationService = deactivationService;
    }
    async deactivate(req, res) {
        try {
            const tenantId = req.params.id;
            const { reason } = req.body;
            if (!reason) {
                return res.status(400).json({ error: 'Reason for deactivation is required' });
            }
            const context = {
                correlationId: req.headers['x-correlation-id'] || (0, uuid_1.v4)(),
                requestId: req.headers['x-request-id'] || (0, uuid_1.v4)(),
                traceId: req.headers['x-trace-id'] || (0, uuid_1.v4)(),
                auditId: (0, uuid_1.v4)(),
                actorId: req.user?.id || 'system',
                tenantId: tenantId
            };
            const result = await this.deactivationService.deactivateTenant(tenantId, reason, context);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Deactivation Error:', error);
            if (error.message.includes('already in progress') || error.message.includes('not active') || error.message.includes('Critical financial operations')) {
                return res.status(409).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to deactivate financial platform', details: error.message });
        }
    }
}
exports.FinancialPlatformDeactivationController = FinancialPlatformDeactivationController;
//# sourceMappingURL=FinancialPlatformDeactivationController.js.map