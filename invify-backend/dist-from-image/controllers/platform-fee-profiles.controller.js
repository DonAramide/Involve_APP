"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformFeeProfilesController = void 0;
const platform_fee_profiles_service_1 = require("../services/platform-fee-profiles.service");
function sendError(res, err) {
    const status = Number(err?.status) || 500;
    return res.status(status).json({
        error: err?.message || 'Platform fee profile request failed',
        blockers: err?.blockers,
    });
}
function actor(req) {
    const user = req.user || {};
    return {
        id: String(user.id || user.sub || ''),
        email: String(user.email || ''),
    };
}
function agentIdFrom(req) {
    return String(req.query.agentId || req.query.agent_id || req.body?.agentId || req.body?.agent_id || '') || null;
}
class PlatformFeeProfilesController {
    static async listAgents(_req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.listAgents();
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async list(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.listProfiles();
            return res.json({ data, agents: await platform_fee_profiles_service_1.platformFeeProfilesService.listAgents().catch(() => []) });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async get(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.getProfile(String(req.params.transactionType || ''), agentIdFrom(req));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async saveDraft(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.saveDraft(String(req.params.transactionType || ''), { ...(req.body || {}), agentId: agentIdFrom(req) });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async propose(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.proposePublish(String(req.params.transactionType || ''), actor(req), agentIdFrom(req), req.body);
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async reject(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.rejectPublish(String(req.params.transactionType || ''), actor(req), agentIdFrom(req));
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async publish(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.publish(String(req.params.transactionType || ''), actor(req), agentIdFrom(req), req.body?.versionId || req.body?.version_id || null);
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
    static async preview(req, res) {
        try {
            const data = await platform_fee_profiles_service_1.platformFeeProfilesService.preview(String(req.params.transactionType || ''), { ...(req.body || {}), agentId: agentIdFrom(req) });
            return res.json({ data });
        }
        catch (err) {
            return sendError(res, err);
        }
    }
}
exports.PlatformFeeProfilesController = PlatformFeeProfilesController;
//# sourceMappingURL=platform-fee-profiles.controller.js.map