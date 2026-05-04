// backend/src/api/controllers/billing.controller.js
const { supabase } = require('../../config/supabase');

class BillingController {
    /**
     * Get AI usage quota status for the current tenant
     */
    static async getStatus(req, res) {
        try {
            // Simulated payload for MVP integration. 
            // In a real scenario, this would aggregate tokens from ai_usage table.
            const usageData = {
                usage: 13,
                limit: 20,
                percentage: 65,
                plan: "basic"
            };

            res.json(usageData);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = BillingController;
