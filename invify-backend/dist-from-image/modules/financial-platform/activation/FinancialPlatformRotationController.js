"use strict";
// invify-backend/src/modules/financial-platform/activation/FinancialPlatformRotationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformRotationController = void 0;
const uuid_1 = require("uuid");
class FinancialPlatformRotationController {
    rotationService;
    constructor(rotationService) {
        this.rotationService = rotationService;
    }
    /**
     * POST /api/v1/tenants/:id/financial-platform/rotate
     */
    async rotate(req, res) {
        try {
            const tenantId = req.params.id;
            const context = {
                correlationId: req.headers['x-correlation-id'] || (0, uuid_1.v4)(),
                requestId: req.headers['x-request-id'] || (0, uuid_1.v4)(),
                traceId: req.headers['x-trace-id'] || (0, uuid_1.v4)(),
                auditId: (0, uuid_1.v4)(),
                actorId: req.user?.id || 'system',
                tenantId: tenantId
            };
            const result = await this.rotationService.rotateCredentials(tenantId, context);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Rotation Error:', error);
            if (error.message.includes('already in progress') || error.message.includes('must be ACTIVE')) {
                return res.status(409).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Failed to rotate credentials', details: error.message });
        }
    }
}
exports.FinancialPlatformRotationController = FinancialPlatformRotationController;
//# sourceMappingURL=FinancialPlatformRotationController.js.map