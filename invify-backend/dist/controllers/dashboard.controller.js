"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
class DashboardController {
    static async getOverview(req, res) {
        try {
            const kpis = await dashboard_service_1.DashboardService.getOverviewKPIs();
            const hardwareResources = await dashboard_service_1.DashboardService.getHardwareResources();
            const activeModules = await dashboard_service_1.DashboardService.getActiveModules();
            return res.status(200).json({
                kpis,
                hardwareResources,
                activeModules
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getAlerts(req, res) {
        try {
            const alerts = await dashboard_service_1.DashboardService.getAlerts();
            return res.status(200).json(alerts);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getGovernance(req, res) {
        try {
            const governanceCards = await dashboard_service_1.DashboardService.getGovernance();
            return res.status(200).json(governanceCards);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getAnalytics(req, res) {
        try {
            const tenantMatrix = await dashboard_service_1.DashboardService.getTenantIntelligence();
            const systemHealth = await dashboard_service_1.DashboardService.getSystemHealth();
            const recommendations = await dashboard_service_1.DashboardService.getRecommendations();
            const infraChartSeries = await dashboard_service_1.DashboardService.getInfraChartSeries();
            // We map the same view to Map Nodes for the globe, with some mock coordinates since the DB doesn't have lat/long
            const mapNodes = tenantMatrix.map((t, i) => ({
                tenant: t.name,
                location: 'Global',
                x: 48 + i * 2,
                y: 25 + i * 5,
                status: t.risk === 'High' ? 'risk' : 'medium',
                color: t.risk === 'High' ? '#FF5252' : '#00E676',
                activity: t.score
            }));
            return res.status(200).json({
                tenantMatrix,
                tenantIntelligence: mapNodes,
                systemHealth,
                recommendations,
                infraChartSeries
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboard.controller.js.map