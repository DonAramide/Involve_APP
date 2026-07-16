"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationController = void 0;
const certification_service_1 = require("../services/certification.service");
const certificationService = new certification_service_1.CertificationService();
class CertificationController {
    async getCertifications(req, res) {
        try {
            // Could pass user ID if auth middleware sets it
            const agentId = req.query.agentId;
            const certifications = await certificationService.getCertifications(agentId);
            res.json(certifications);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.CertificationController = CertificationController;
//# sourceMappingURL=certification.controller.js.map