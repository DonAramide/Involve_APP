"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretAuditService = void 0;
const SecretDatabaseService_1 = require("./SecretDatabaseService");
class SecretAuditService {
    static async log(action, provider, keyVersion, status, details, operator = 'system') {
        await SecretDatabaseService_1.SecretDatabaseService.insertAudit({
            action,
            provider,
            key_version: keyVersion,
            status,
            details,
            operator,
        });
    }
}
exports.SecretAuditService = SecretAuditService;
//# sourceMappingURL=SecretAuditService.js.map