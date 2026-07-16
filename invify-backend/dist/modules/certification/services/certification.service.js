"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationService = void 0;
const supabase_1 = require("../../../db/supabase");
class CertificationService {
    async getCertifications(agentId) {
        let query = supabase_1.supabase.from('agent_certificates').select('*');
        if (agentId) {
            query = query.eq('agent_id', agentId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data;
    }
}
exports.CertificationService = CertificationService;
//# sourceMappingURL=certification.service.js.map