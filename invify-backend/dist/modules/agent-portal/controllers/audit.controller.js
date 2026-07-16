"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const audit_service_1 = require("../services/audit.service");
class AuditLogController {
    static async listLogs(req, res) {
        try {
            const { entity_type, actor_id } = req.query;
            const logs = await audit_service_1.auditLogService.listLogs({
                entity_type: entity_type,
                actor_id: actor_id
            });
            res.status(200).json({ success: true, data: logs });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.AuditLogController = AuditLogController;
//# sourceMappingURL=audit.controller.js.map