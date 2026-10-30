"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionController = void 0;
const supabase_1 = require("../db/supabase");
const retention_service_1 = require("../services/retention.service");
class RetentionController {
    /**
     * POST /admin/retention/process
     * Manually trigger the retention scan and nudge dispatch.
     */
    static async processRetention(req, res) {
        try {
            await retention_service_1.RetentionService.scanAndNudge();
            return res.status(200).json({ message: 'Retention scan completed and nudges dispatched.' });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/retention/stats
     * Super-admin view of at-risk users.
     */
    static async getAtRiskUsers(req, res) {
        try {
            const { data: users } = await supabase_1.supabase
                .from('users')
                .select('name, email, role, last_active_at, tenants(name)')
                .lt('last_active_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
                .order('last_active_at', { ascending: true });
            return res.status(200).json(users);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /admin/retention/suggestion
     * Personal nudge for the current user.
     */
    static async getPersonalSuggestion(req, res) {
        try {
            const { tenantId } = req.user;
            const suggestion = await retention_service_1.RetentionService.getSmartSuggestion(tenantId);
            return res.status(200).json({ suggestion });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.RetentionController = RetentionController;
//# sourceMappingURL=retention.controller.js.map