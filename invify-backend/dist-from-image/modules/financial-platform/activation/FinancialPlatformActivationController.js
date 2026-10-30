"use strict";
// invify-backend/src/modules/financial-platform/activation/FinancialPlatformActivationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformActivationController = void 0;
const uuid_1 = require("uuid");
const gov_audit_service_1 = require("../../../services/gov-audit.service");
const activation_gate_1 = require("./activation-gate");
function actor(req) {
    const user = req.user || {};
    return {
        id: String(user.id || user.sub || ''),
        email: String(user.email || ''),
    };
}
function clientIp(req) {
    return String(req.ip || req.socket?.remoteAddress || '0.0.0.0');
}
class FinancialPlatformActivationController {
    activationService;
    constructor(activationService) {
        this.activationService = activationService;
    }
    async getGate(req, res) {
        try {
            const tenantId = req.params.id;
            const { gate } = await (0, activation_gate_1.loadActivationGate)(tenantId);
            const evidence = await (0, activation_gate_1.evidenceForChecks)(tenantId);
            return res.status(200).json({ gate, evidence });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Failed to load activation gate' });
        }
    }
    async recordCheck(req, res) {
        try {
            const user = actor(req);
            const key = String(req.body?.key || '');
            if (req.body?.action === 'checker_approve') {
                const gate = await (0, activation_gate_1.approveManualCheck)({
                    tenantId: req.params.id,
                    key,
                    actorId: user.id,
                    actorEmail: user.email,
                });
                await gov_audit_service_1.GovAuditService.logAction({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date().toISOString(),
                    module: 'MAKER_CHECKER',
                    action: `FP_MANUAL_CHECK_CHECKER_${String(key).toUpperCase()}`,
                    user_email: user.email,
                    user_name: user.email,
                    ip_address: clientIp(req),
                    tenant_id: req.params.id,
                    target: req.params.id,
                    status: 'approved',
                });
                return res.status(200).json({ success: true, gate });
            }
            const gate = await (0, activation_gate_1.recordManualCheck)({
                tenantId: req.params.id,
                key,
                passed: true,
                actorId: user.id,
                actorEmail: user.email,
                notes: req.body?.notes,
            });
            await gov_audit_service_1.GovAuditService.logAction({
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: `FP_MANUAL_CHECK_${String(key).toUpperCase()}`,
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                tenant_id: req.params.id,
                target: req.params.id,
                status: 'pending',
                metadata: { notes: req.body?.notes },
            });
            return res.status(200).json({ success: true, gate });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Failed to record check' });
        }
    }
    async propose(req, res) {
        try {
            const user = actor(req);
            const gate = await (0, activation_gate_1.proposeActivation)({
                tenantId: req.params.id,
                actorId: user.id,
                actorEmail: user.email,
            });
            await gov_audit_service_1.GovAuditService.logAction({
                id: gate.proposal?.id || (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: 'FP_ACTIVATION_PROPOSE',
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                tenant_id: req.params.id,
                target: req.params.id,
                status: 'pending',
            });
            return res.status(200).json({ success: true, gate });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Propose failed' });
        }
    }
    async reject(req, res) {
        try {
            const user = actor(req);
            const gate = await (0, activation_gate_1.rejectActivationProposal)({
                tenantId: req.params.id,
                actorId: user.id,
                actorEmail: user.email,
                reason: req.body?.reason,
            });
            await gov_audit_service_1.GovAuditService.logAction({
                id: gate.proposal?.id || (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: 'FP_ACTIVATION_REJECT',
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                tenant_id: req.params.id,
                target: req.params.id,
                status: 'rejected',
            });
            return res.status(200).json({ success: true, gate });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Reject failed' });
        }
    }
    /**
     * POST /api/v1/tenants/:id/financial-platform/activate
     * Checker-only after CAC / phone-call / address manual checks.
     */
    async activate(req, res) {
        try {
            const tenantId = req.params.id;
            const user = actor(req);
            await (0, activation_gate_1.assertCheckerCanActivate)({
                tenantId,
                actorId: user.id,
                actorEmail: user.email,
            });
            const context = {
                correlationId: req.headers['x-correlation-id'] || (0, uuid_1.v4)(),
                requestId: req.headers['x-request-id'] || (0, uuid_1.v4)(),
                traceId: req.headers['x-trace-id'] || (0, uuid_1.v4)(),
                auditId: (0, uuid_1.v4)(),
                actorId: user.id || 'system',
                tenantId: tenantId
            };
            const result = await this.activationService.activateTenant(tenantId, context);
            await (0, activation_gate_1.markProposalApproved)({
                tenantId,
                actorId: user.id,
                actorEmail: user.email,
            });
            await gov_audit_service_1.GovAuditService.logAction({
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: 'FP_ACTIVATION_APPROVE',
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                tenant_id: tenantId,
                target: tenantId,
                status: 'approved',
            });
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Activation Error:', error);
            if (error.status === 400 || error.status === 403) {
                return res.status(error.status).json({ error: error.message });
            }
            if (error.message.includes('already in progress') || error.message.includes('already activated')) {
                return res.status(409).json({ error: error.message });
            }
            const details = error?.response?.data?.responseMessage ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to activate financial platform';
            return res.status(500).json({ error: 'Failed to activate financial platform', details });
        }
    }
}
exports.FinancialPlatformActivationController = FinancialPlatformActivationController;
//# sourceMappingURL=FinancialPlatformActivationController.js.map