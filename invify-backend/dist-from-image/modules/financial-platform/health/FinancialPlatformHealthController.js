"use strict";
// invify-backend/src/modules/financial-platform/health/FinancialPlatformHealthController.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformHealthController = void 0;
const uuid_1 = require("uuid");
class FinancialPlatformHealthController {
    healthService;
    constructor(healthService) {
        this.healthService = healthService;
    }
    /**
     * GET /api/v1/tenants/:id/financial-platform/health
     */
    async getHealth(req, res) {
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
            const diagnostics = await this.healthService.getDiagnostics(tenantId, context);
            try {
                const { loadActivationGate, evidenceForChecks, allManualChecksPassed, missingManualChecks } = await Promise.resolve().then(() => __importStar(require('../activation/activation-gate')));
                const { gate } = await loadActivationGate(tenantId);
                const evidence = await evidenceForChecks(tenantId);
                diagnostics.activationGate = {
                    ...gate,
                    allChecksPassed: allManualChecksPassed(gate),
                    missing: missingManualChecks(gate),
                    evidence,
                };
            }
            catch (gateErr) {
                diagnostics.activationGate = { error: gateErr?.message || 'unavailable' };
            }
            return res.status(200).json(diagnostics);
        }
        catch (error) {
            console.error('Health Check Error:', error);
            return res.status(500).json({ error: 'Failed to run diagnostics', details: error.message });
        }
    }
}
exports.FinancialPlatformHealthController = FinancialPlatformHealthController;
//# sourceMappingURL=FinancialPlatformHealthController.js.map