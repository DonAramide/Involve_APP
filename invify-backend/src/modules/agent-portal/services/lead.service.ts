import { leadRepository } from '../repositories/lead.repository';
import { agentRepository } from '../repositories/agent.repository';
export class LeadService {
  async createLead(data: any, actorId: string, ip: string, ua: string) {
    const l = await leadRepository.create({ ...data, created_by: actorId, updated_by: actorId });
    await agentRepository.logAudit(actorId, 'LEAD', l.id, 'CREATE', null, l, ip, ua);
    return l;
  }
  async getLeadsByAgent(agentId: string) {
    return await leadRepository.findByAgent(agentId);
  }
  async getAllLeads() {
    return await leadRepository.findAll();
  }
}
export const leadService = new LeadService();