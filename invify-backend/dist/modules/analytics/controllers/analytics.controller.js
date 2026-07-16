"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.M6AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
class M6AnalyticsController {
    static async getPerformance(req, res) {
        try {
            const data = await analytics_service_1.M6AnalyticsService.getPerformanceMetrics();
            return res.json({ success: true, data });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getTerritory(req, res) {
        try {
            const data = await analytics_service_1.M6AnalyticsService.getTerritoryIntelligence();
            return res.json({ success: true, data });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getRiskSignals(req, res) {
        try {
            const data = await analytics_service_1.M6AnalyticsService.getRiskSignals();
            return res.json({ success: true, data });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.M6AnalyticsController = M6AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map