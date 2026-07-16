"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executive_kpiController = void 0;
const executive_kpi_service_1 = require("../services/executive_kpi.service");
class Executive_kpiController {
    static async getSnapshots(req, res) {
        try {
            const data = await executive_kpi_service_1.executiveKpiService.getSnapshots();
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.Executive_kpiController = Executive_kpiController;
//# sourceMappingURL=executive_kpi.controller.js.map