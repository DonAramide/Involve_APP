"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executiveKpiService = exports.ExecutiveKpiService = void 0;
const executive_kpi_repository_1 = require("../repositories/executive_kpi.repository");
class ExecutiveKpiService {
    async getSnapshots() {
        return executive_kpi_repository_1.executiveKpiRepository.getSnapshots();
    }
}
exports.ExecutiveKpiService = ExecutiveKpiService;
exports.executiveKpiService = new ExecutiveKpiService();
//# sourceMappingURL=executive_kpi.service.js.map