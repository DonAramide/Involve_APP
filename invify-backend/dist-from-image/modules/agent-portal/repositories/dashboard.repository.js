"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRepository = exports.DashboardRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class DashboardRepository {
    async getMetrics(agentId) {
        const { data, error } = await supabase_1.supabase.from('agent_dashboard_snapshots').select('*').eq('agent_id', agentId).order('snapshot_date', { ascending: false }).limit(30);
        if (error)
            throw error;
        return data;
    }
}
exports.DashboardRepository = DashboardRepository;
exports.dashboardRepository = new DashboardRepository();
//# sourceMappingURL=dashboard.repository.js.map