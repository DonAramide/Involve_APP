"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const dashboard_repository_1 = require("../repositories/dashboard.repository");
class DashboardService {
    async getMetrics(agentId) { return dashboard_repository_1.dashboardRepository.getMetrics(agentId); }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
//# sourceMappingURL=dashboard.service.js.map