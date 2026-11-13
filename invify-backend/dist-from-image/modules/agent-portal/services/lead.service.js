"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadService = exports.LeadService = void 0;
const lead_repository_1 = require("../repositories/lead.repository");
const agent_repository_1 = require("../repositories/agent.repository");
class LeadService {
    async createLead(data, actorId, ip, ua) {
        const l = await lead_repository_1.leadRepository.create({ ...data, created_by: actorId, updated_by: actorId });
        await agent_repository_1.agentRepository.logAudit(actorId, 'LEAD', l.id, 'CREATE', null, l, ip, ua);
        return l;
    }
    async getLeadsByAgent(agentId) {
        return await lead_repository_1.leadRepository.findByAgent(agentId);
    }
    async getAllLeads() {
        return await lead_repository_1.leadRepository.findAll();
    }
}
exports.LeadService = LeadService;
exports.leadService = new LeadService();
//# sourceMappingURL=lead.service.js.map