import { agentRepository } from '../repositories/agent.repository';
import { v4 as uuidv4 } from 'uuid';

export class AgentService {
  
  /**
   * Onboards a new agent
   */
  async onboardAgent(
    creatorId: string, 
    data: { 
      email: string; 
      first_name: string; 
      last_name: string; 
      phone?: string; 
      role_id: string; 
      territory_id: string; 
      supervisor_agent_id?: string;
      commission_plan_id?: string;
    },
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Generate auth_user_id (In reality this requires a call to Supabase Admin Auth API to create the user)
    // For this milestone, we simulate the auth provisioning:
    const authUserId = uuidv4(); 
    
    // 2. Generate Agent Code
    const agentCode = `AG-${Math.floor(100000 + Math.random() * 900000)}`;

    const agentData = {
      auth_user_id: authUserId,
      agent_code: agentCode,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      role_id: data.role_id,
      territory_id: data.territory_id,
      supervisor_agent_id: data.supervisor_agent_id,
      commission_plan_id: data.commission_plan_id,
      created_by: creatorId,
      updated_by: creatorId
    };

    const profileData = {
      // Missing profile data defaults
      kyc_status: 'PENDING'
    };

    const newAgent = await agentRepository.createAgent(agentData, profileData);

    // 3. Log Audit
    await agentRepository.logAudit(
      creatorId, 
      'AGENT', 
      newAgent.id, 
      'ONBOARD_AGENT', 
      null, 
      newAgent, 
      ipAddress, 
      userAgent
    );

    return newAgent;
  }

  /**
   * List all agents
   */
  async listAgents(filters?: { status?: string; territory_id?: string }) {
    return agentRepository.findAll(filters);
  }

  /**
   * Get specific agent
   */
  async getAgent(id: string) {
    return agentRepository.findById(id);
  }

  /**
   * Update Agent Status
   */
  async updateStatus(
    id: string, 
    newStatus: string, 
    reason: string, 
    actorId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingAgent = await agentRepository.findById(id);
    if (!existingAgent) throw new Error('Agent not found');

    const updatedAgent = await agentRepository.updateStatus(id, newStatus, existingAgent.status, actorId, reason);

    // Log Audit
    await agentRepository.logAudit(
      actorId,
      'AGENT_STATUS',
      id,
      'UPDATE_STATUS',
      { status: existingAgent.status },
      { status: newStatus, reason },
      ipAddress,
      userAgent
    );

    return updatedAgent;
  }
}

export const agentService = new AgentService();
