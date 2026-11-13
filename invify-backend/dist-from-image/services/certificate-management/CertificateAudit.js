"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateAudit = void 0;
const CertificateRegistry_1 = require("./CertificateRegistry");
class CertificateAudit {
    static async log(action, certificateId, status, details, operator = 'system') {
        await CertificateRegistry_1.CertificateRegistry.insertAudit({
            action,
            certificate_id: certificateId,
            status,
            details,
            operator,
        });
    }
}
exports.CertificateAudit = CertificateAudit;
//# sourceMappingURL=CertificateAudit.js.map