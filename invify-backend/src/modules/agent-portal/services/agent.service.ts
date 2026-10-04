import { agentRepository } from '../repositories/agent.repository';
import { agentAccessService, AgentAccessError } from './agent-access.service';
import { uploadBase64ToContabo } from '../utils/kyc-storage';

export interface OnboardAgentInput {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  passportImage?: string;
  idCard?: string;
  agentCode?: string;
  role_id?: string;
  territory_id?: string;
  supervisor_agent_id?: string;
  commission_plan_id?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalUuid(value?: string): string | undefined {
  const v = String(value || '').trim();
  return UUID_RE.test(v) ? v : undefined;
}

async function uploadKycFile(data: string | undefined, prefix: string, email: string, suffix: string): Promise<string> {
  if (!data || !data.startsWith('data:')) return '';
  try {
    return await uploadBase64ToContabo(data, prefix, `${email.replace(/[@.]/g, '_')}_${suffix}`);
  } catch (err: any) {
    console.error(`[AgentService] KYC ${suffix} upload failed:`, err?.message || err);
    return '';
  }
}

export class AgentService {
  
  /**
   * Onboards a new agent: creates the login, the agent + profile rows, and emails a welcome/set-password link.
   * Admin-provisioned agents start ACTIVE with KYC PENDING.
   */
  async onboardAgent(
    creatorId: string, 
    data: OnboardAgentInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ agent: any; welcomeEmailSent: boolean }> {
    const email = String(data.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new AgentAccessError('A valid email address is required', 400);

    const fullName = String(data.name || `${data.first_name || ''} ${data.last_name || ''}`).trim().replace(/\s+/g, ' ');
    if (!fullName) throw new AgentAccessError('Agent name is required', 400);
    const firstName = String(data.first_name || fullName.split(' ')[0]).trim();
    const lastName = String(data.last_name || fullName.split(' ').slice(1).join(' ') || 'Agent').trim();

    const requestedCode = String(data.agentCode || '').trim().toUpperCase();
    if (requestedCode && !/^[A-Z0-9-]{3,50}$/.test(requestedCode)) {
      throw new AgentAccessError('Agent code may only contain letters, numbers and dashes (3-50 characters)', 400);
    }
    const agentCode = requestedCode || `AG-${Math.floor(100000 + Math.random() * 900000)}`;

    const conflict = await agentRepository.findConflict(email, agentCode);
    if (conflict === 'email') throw new AgentAccessError('An agent with this email already exists', 409);
    if (conflict === 'code') throw new AgentAccessError('Agent code already exists', 409);

    const authUserId = await agentAccessService.createLogin(email, fullName);

    let newAgent: any;
    let passportUrl = '';
    let idCardUrl = '';
    try {
      [passportUrl, idCardUrl] = await Promise.all([
        uploadKycFile(data.passportImage, 'passports', email, 'passport'),
        uploadKycFile(data.idCard, 'ids', email, 'id'),
      ]);

      newAgent = await agentRepository.createAgent(
        {
          auth_user_id: authUserId,
          agent_code: agentCode,
          email,
          first_name: firstName,
          last_name: lastName,
          phone: data.phone || data.whatsappNumber || null,
          status: 'ACTIVE',
          role_id: optionalUuid(data.role_id),
          territory_id: optionalUuid(data.territory_id),
          supervisor_agent_id: optionalUuid(data.supervisor_agent_id),
          commission_plan_id: optionalUuid(data.commission_plan_id),
          created_by: optionalUuid(creatorId),
          updated_by: optionalUuid(creatorId),
        },
        {
          address: data.address || '',
          profile_photo_url: passportUrl || null,
          kyc_status: 'PENDING',
        },
      );
    } catch (err) {
      await agentAccessService.deleteLogin(authUserId);
      throw err;
    }

    const welcomeEmailSent = await agentAccessService.sendWelcome(email, fullName, agentCode);

    await agentRepository.logAudit(
      creatorId, 
      'AGENT', 
      newAgent.id, 
      'ONBOARD_AGENT', 
      null, 
      {
        ...newAgent,
        whatsapp_number: data.whatsappNumber || null,
        passport_url: passportUrl || null,
        id_card_url: idCardUrl || null,
        welcome_email_sent: welcomeEmailSent,
      },
      ipAddress, 
      userAgent
    );

    return { agent: newAgent, welcomeEmailSent };
  }

  /**
   * Re-sends the welcome / set-password email to an existing agent.
   */
  async resendInvite(id: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    const agent = await agentRepository.findById(id);
    if (!agent) throw new AgentAccessError('Agent not found', 404);
    if (agent.status === 'TERMINATED') throw new AgentAccessError('Cannot invite a terminated agent', 400);

    const sent = await agentAccessService.sendWelcome(
      agent.email,
      `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      agent.agent_code,
    );
    await agentRepository.logAudit(actorId, 'AGENT', id, 'RESEND_INVITE', null, { welcome_email_sent: sent }, ipAddress, userAgent);
    return sent;
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

  /**
   * Update KYC status of agent
   */
  async updateKycStatus(
    id: string,
    kycStatus: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingAgent = await agentRepository.findById(id);
    if (!existingAgent) throw new Error('Agent not found');

    const updatedProfile = await agentRepository.updateAgentProfile(id, { kyc_status: kycStatus });

    // Log Audit
    await agentRepository.logAudit(
      actorId,
      'AGENT_KYC',
      id,
      'UPDATE_KYC',
      { kyc_status: existingAgent.agent_profiles?.kyc_status || 'PENDING' },
      { kyc_status: kycStatus },
      ipAddress,
      userAgent
    );

    return updatedProfile;
  }

  /**
   * Get commissions config for agent
   */
  async getCommissions(id: string) {
    const agent = await agentRepository.findById(id);
    if (!agent) throw new Error('Agent not found');
    return {
      commission_plan_id: agent.commission_plan_id,
      tier: (agent as any).current_tier || 'TIER_1'
    };
  }

  /**
   * Update commissions config for agent
   */
  async updateCommissions(
    id: string,
    data: { commission_plan_id?: string; tier?: string },
    actorId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingAgent = await agentRepository.findById(id);
    if (!existingAgent) throw new Error('Agent not found');

    const updates: any = {};
    if (data.commission_plan_id) updates.commission_plan_id = data.commission_plan_id;
    if (data.tier) updates.current_tier = data.tier;

    const updatedAgent = await agentRepository.updateAgent(id, updates);

    // Log Audit
    await agentRepository.logAudit(
      actorId,
      'AGENT_COMMISSIONS',
      id,
      'UPDATE_COMMISSIONS',
      { commission_plan_id: existingAgent.commission_plan_id },
      updates,
      ipAddress,
      userAgent
    );

    return updatedAgent;
  }

  /**
   * Message agent
   */
  async messageAgent(id: string, message: string, actorId: string) {
    const agent = await agentRepository.findById(id);
    if (!agent) throw new Error('Agent not found');

    // Simulate system message insertion/log
    await agentRepository.logAudit(
      actorId,
      'AGENT_MESSAGE',
      id,
      'SEND_MESSAGE',
      null,
      { message }
    );
  }

  /**
   * Message all tenants managed by agent
   */
  async messageTenants(id: string, message: string, actorId: string) {
    const agent = await agentRepository.findById(id);
    if (!agent) throw new Error('Agent not found');

    // Simulate system broadcast
    await agentRepository.logAudit(
      actorId,
      'AGENT_MESSAGE',
      id,
      'BROADCAST_TENANTS',
      null,
      { message }
    );
  }
}

export const agentService = new AgentService();
