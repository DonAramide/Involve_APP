"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController = void 0;
const insights_service_1 = require("../services/insights.service");
class InsightsController {
    /**
     * GET /insights/class
     * Returns attendance & lesson insights for a specific class
     */
    static async getClassInsights(req, res) {
        try {
            const { tenantId } = req.user;
            const { classLevel } = req.query;
            if (!classLevel) {
                return res.status(400).json({ error: 'classLevel is required' });
            }
            const data = await insights_service_1.InsightsService.getClassInsights(tenantId, classLevel);
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[InsightsController] Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.InsightsController = InsightsController;
//# sourceMappingURL=insights.controller.js.map