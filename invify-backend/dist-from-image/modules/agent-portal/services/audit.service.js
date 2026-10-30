"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogService = exports.AuditLogService = void 0;
const audit_repository_1 = require("../repositories/audit.repository");
class AuditLogService {
    async listLogs(filters) {
        return audit_repository_1.auditLogRepository.listLogs(filters);
    }
}
exports.AuditLogService = AuditLogService;
exports.auditLogService = new AuditLogService();
//# sourceMappingURL=audit.service.js.map