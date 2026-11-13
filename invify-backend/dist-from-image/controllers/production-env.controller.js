"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionEnvController = void 0;
exports.requireProductionEnvGovernor = requireProductionEnvGovernor;
const production_env_governance_service_1 = require("../services/production-env-governance.service");
const gov_audit_service_1 = require("../services/gov-audit.service");
function actor(req) {
    const user = req.user || {};
    return {
        id: String(user.id || ''),
        email: String(user.email || ''),
        role: user.role,
    };
}
function clientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.ip || '127.0.0.1';
}
function requireProductionEnvGovernor(req, res, next) {
    const user = actor(req);
    if (!(0, production_env_governance_service_1.isProductionEnvGovernor)(user.email, user.role)) {
        return res.status(403).json({
            error: 'Production env is restricted to the designated super-admin governor.',
        });
    }
    return next();
}
class ProductionEnvController {
    static getSnapshot(req, res) {
        try {
            const snap = production_env_governance_service_1.productionEnvGovernance.snapshot();
            return res.status(200).json({
                confirmPhrase: production_env_governance_service_1.APPLY_CONFIRM_PHRASE,
                selfApproveAllowed: true,
                actorEmail: actor(req).email,
                actorRole: actor(req).role,
                ...snap,
                governors: snap.governors.length ? snap.governors : ['any super_admin'],
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message || 'Failed to read production env' });
        }
    }
    static async propose(req, res) {
        try {
            const user = actor(req);
            const change = production_env_governance_service_1.productionEnvGovernance.propose({
                key: req.body?.key,
                value: req.body?.value,
                reason: req.body?.reason,
                makerEmail: user.email,
                makerId: user.id,
            });
            await gov_audit_service_1.GovAuditService.logAction({
                id: change.id,
                timestamp: change.createdAt,
                module: 'MAKER_CHECKER',
                action: 'PRODUCTION_ENV_PROPOSE',
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                target: change.key,
                status: 'pending',
                metadata: { from: change.fromPreview, to: change.toPreview, reason: req.body?.reason },
            });
            return res.status(200).json({ success: true, change });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Propose failed' });
        }
    }
    static async approve(req, res) {
        try {
            const user = actor(req);
            const change = production_env_governance_service_1.productionEnvGovernance.approve(String(req.body?.id || ''), user.email, String(req.body?.confirmPhrase || ''));
            await gov_audit_service_1.GovAuditService.logAction({
                id: change.id,
                timestamp: change.decidedAt || new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: 'PRODUCTION_ENV_APPROVE',
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                target: change.key,
                status: 'approved',
                metadata: { to: change.toPreview },
            });
            return res.status(200).json({ success: true, change });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Approve failed' });
        }
    }
    static async reject(req, res) {
        try {
            const user = actor(req);
            const change = production_env_governance_service_1.productionEnvGovernance.reject(String(req.body?.id || ''), user.email, String(req.body?.reason || ''));
            await gov_audit_service_1.GovAuditService.logAction({
                id: change.id,
                timestamp: change.decidedAt || new Date().toISOString(),
                module: 'MAKER_CHECKER',
                action: 'PRODUCTION_ENV_REJECT',
                user_email: user.email,
                user_name: user.email,
                ip_address: clientIp(req),
                target: change.key,
                status: 'rejected',
            });
            return res.status(200).json({ success: true, change });
        }
        catch (error) {
            return res.status(error.status || 500).json({ error: error.message || 'Reject failed' });
        }
    }
}
exports.ProductionEnvController = ProductionEnvController;
//# sourceMappingURL=production-env.controller.js.map