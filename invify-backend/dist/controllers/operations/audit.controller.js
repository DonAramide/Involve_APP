"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const operations_facade_1 = require("../../services/operations.facade");
const response_util_1 = require("../../utils/response.util");
class AuditController {
    static async listLogs(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(401).json((0, response_util_1.createErrorResponse)(req, 'Unauthorized', 'UNAUTHORIZED'));
            const logs = await operations_facade_1.OperationsFacade.listAuditLogs(tenantId);
            return res.status(200).json((0, response_util_1.createResponse)(req, logs, { total: logs.length, page: 1, pageSize: 50 }));
        }
        catch (error) {
            return res.status(500).json((0, response_util_1.createErrorResponse)(req, error.message, 'LIST_AUDIT_ERROR'));
        }
    }
}
exports.AuditController = AuditController;
//# sourceMappingURL=audit.controller.js.map