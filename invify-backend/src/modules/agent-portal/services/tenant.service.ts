import { tenantRepository } from '../repositories/tenant.repository';
export class TenantService {
  async updateActivation(agentTenantId: string, stage: string, actorId: string) {
    // In reality this updates flags dynamically based on the stage and calculates completion_percentage
    return tenantRepository.updateActivation(agentTenantId, { current_stage: stage });
  }
  async getTenantsByAgent(agentId: string) {
    return tenantRepository.findByAgent(agentId);
  }
  async getAllTenants() {
    return tenantRepository.findAll();
  }
}
export const tenantService = new TenantService();