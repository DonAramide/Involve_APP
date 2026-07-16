"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentController = void 0;
const student_service_1 = require("../services/student.service");
class StudentController {
    /**
     * GET /api/finance/virtual-account/:studentId
     * Provisions or retrieves a student's virtual account.
     */
    static async getVirtualAccount(req, res) {
        try {
            const { studentId } = req.params;
            const tenantId = req.user?.tenantId;
            if (!studentId) {
                return res.status(400).json({ error: "Student ID is required" });
            }
            if (!tenantId) {
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            }
            const virtualAccount = await student_service_1.StudentService.getOrCreateVirtualAccount(studentId, tenantId);
            return res.status(200).json(virtualAccount);
        }
        catch (error) {
            console.error('[StudentController] getVirtualAccount Error:', error.message);
            return res.status(500).json({ error: "Failed to provision virtual account" });
        }
    }
}
exports.StudentController = StudentController;
//# sourceMappingURL=student.controller.js.map