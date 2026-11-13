"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantInstitutePortController = void 0;
const crypto_1 = require("crypto");
const tenant_institute_port_service_1 = require("../services/tenant-institute-port.service");
function actor(req) {
    const user = req.user || {};
    return {
        id: String(user.id || user.sub || ''),
        email: String(user.email || ''),
        name: user.name || user.email?.split('@')[0] || 'Admin',
    };
}
function clientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}
async function audit(req, action, status, metadata) {
    try {
        const { GovAuditService } = require('../services/gov-audit.service');
        const user = actor(req);
        await GovAuditService.logAction({
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            module: 'MAKER_CHECKER',
            action,
            user_email: user.email || 'unknown',
            user_name: user.name,
            ip_address: clientIp(req),
            target: String(req.params.id || ''),
            status,
            tenant_id: String(req.params.id || ''),
            metadata,
        });
    }
    catch (err) {
        console.warn('[TenantInstitutePort] audit failed:', err.message);
    }
}
function sendError(res, err) {
    const status = Number(err?.status) || 500;
    return res.status(status).json({ error: err?.message || 'Institute port failed' });
}
class TenantInstitutePortController {
    static async get(req, res) {
        try {
            const data = await tenant_institute_port_service_1.tenantInstitutePortService.getSnapshot(String(req.params.id));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async propose(req, res) {
        try {
            const user = actor(req);
            const data = await tenant_institute_port_service_1.tenantInstitutePortService.propose({
                tenantId: String(req.params.id),
                actorId: user.id,
                actorEmail: user.email,
                toAgentId: req.body?.toAgentId ?? req.body?.to_agent_id ?? req.body?.instituteId,
                reason: req.body?.reason,
            });
            await audit(req, 'INSTITUTE_PORT_PROPOSED', 'pending', {
                from: data.proposal?.from,
                to: data.proposal?.to,
            });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async approve(req, res) {
        try {
            const user = actor(req);
            const data = await tenant_institute_port_service_1.tenantInstitutePortService.approve({
                tenantId: String(req.params.id),
                actorId: user.id,
                actorEmail: user.email,
            });
            await audit(req, 'INSTITUTE_PORT_APPROVED', 'approved', {
                from: data.proposal?.from,
                to: data.proposal?.to,
                current: data.current,
            });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async reject(req, res) {
        try {
            const user = actor(req);
            const data = await tenant_institute_port_service_1.tenantInstitutePortService.reject({
                tenantId: String(req.params.id),
                actorId: user.id,
                actorEmail: user.email,
                reason: req.body?.reason,
            });
            await audit(req, 'INSTITUTE_PORT_REJECTED', 'rejected', {
                from: data.proposal?.from,
                to: data.proposal?.to,
            });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
}
exports.TenantInstitutePortController = TenantInstitutePortController;
//# sourceMappingURL=tenant-institute-port.controller.js.map