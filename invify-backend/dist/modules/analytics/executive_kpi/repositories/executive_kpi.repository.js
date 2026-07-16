"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executiveKpiRepository = exports.ExecutiveKpiRepository = void 0;
const supabase_1 = require("../../../../db/supabase");
class ExecutiveKpiRepository {
    async getSnapshots() {
        const { data, error } = await supabase_1.supabase.from('executive_kpi_snapshots').select('*').order('created_at', { ascending: false }).limit(30);
        if (error)
            throw error;
        return data;
    }
}
exports.ExecutiveKpiRepository = ExecutiveKpiRepository;
exports.executiveKpiRepository = new ExecutiveKpiRepository();
//# sourceMappingURL=executive_kpi.repository.js.map