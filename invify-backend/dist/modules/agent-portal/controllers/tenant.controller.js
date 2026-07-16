"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const tenant_service_1 = require("../services/tenant.service");
const supabase_1 = require("../../../db/supabase");
class TenantController {
    static async updateActivation(req, res) {
        try {
            const data = await tenant_service_1.tenantService.updateActivation(req.params.id, req.body.stage, req.user?.id || 'sys');
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async list(req, res) {
        try {
            const authUserId = req.user?.id;
            if (!authUserId)
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
            if (!agent)
                return res.status(404).json({ success: false, message: 'Agent not found' });
            const tenants = await tenant_service_1.tenantService.getTenantsByAgent(agent.id);
            res.status(200).json({ success: true, data: tenants });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
    static async listAll(req, res) {
        try {
            const tenants = await tenant_service_1.tenantService.getAllTenants();
            res.status(200).json({ success: true, data: tenants });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.TenantController = TenantController;
//# sourceMappingURL=tenant.controller.js.map