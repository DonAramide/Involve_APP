import { agentRepository } from '../repositories/agent.repository';
import { agentAccessService, AgentAccessError } from './agent-access.service';
import { uploadBase64ToContabo, uploadInstitutionLogo, deleteInstitutionLogo } from '../utils/kyc-storage';

export const CANONICAL_INSTITUTION_TYPES = [
  'SCHOOL',
  'HMO',
  'BANK',
  'MERCHANT',
  'PTSP',
  'CORPORATE',
] as const;

export type CanonicalInstitutionType = (typeof CANONICAL_INSTITUTION_TYPES)[number];

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
  // Institutional Onboarding & Tenant Branding Extensions
  institutionType?: string;
  institution_type?: string;
  tradingName?: string;
  trading_name?: string;
  logoImage?: string;
  // Type-specific regulatory / KYC fields
  nhiaLicenseNumber?: string;
  cbnLicenseNumber?: string;
  ministryApprovalNumber?: string;
  schoolCode?: string;
  cacNumber?: string;
  tin?: string;
  regulatoryMetadata?: Record<string, any>;
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
   * Admin-provisioned agents start with non-active status 'PENDING' and KYC 'PENDING'.
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

    const rawType = String(data.institutionType || data.institution_type || '').trim().toUpperCase();
    let institutionType: CanonicalInstitutionType | null = null;
    if (rawType) {
      if (!CANONICAL_INSTITUTION_TYPES.includes(rawType as any)) {
        throw new AgentAccessError(
          `Invalid institution category '${rawType}'. Must be one of: ${CANONICAL_INSTITUTION_TYPES.join(', ')}`,
          400
        );
      }
      institutionType = rawType as CanonicalInstitutionType;
    }
    const tradingName = String(data.tradingName || data.trading_name || fullName).trim();

    // Conditional regulatory requirements validation
    const nhiaRef = String(data.nhiaLicenseNumber || data.regulatoryMetadata?.nhiaLicenseNumber || data.regulatoryMetadata?.nhia_license_number || '').trim();
    const cbnRef = String(data.cbnLicenseNumber || data.regulatoryMetadata?.cbnLicenseNumber || data.regulatoryMetadata?.cbn_license_number || '').trim();
    const ministryRef = String(data.ministryApprovalNumber || data.schoolCode || data.regulatoryMetadata?.ministryApprovalNumber || data.regulatoryMetadata?.ministry_approval_number || '').trim();
    const cacRef = String(data.cacNumber || data.regulatoryMetadata?.cacNumber || data.regulatoryMetadata?.cac_registration_number || '').trim();
    const tinRef = String(data.tin || data.regulatoryMetadata?.tin || data.regulatoryMetadata?.tax_identification_number || '').trim();

    if (institutionType === 'HMO' && !nhiaRef) {
      throw new AgentAccessError('HMO onboarding requires NHIA accreditation or license number', 400);
    }
    if ((institutionType === 'BANK' || institutionType === 'PTSP') && !cbnRef) {
      throw new AgentAccessError(`${institutionType} onboarding requires a valid CBN license / approval reference`, 400);
    }
    if (institutionType === 'SCHOOL' && !ministryRef) {
      throw new AgentAccessError('School onboarding requires Ministry of Education approval or registration reference', 400);
    }
    if ((institutionType === 'MERCHANT' || institutionType === 'CORPORATE') && !cacRef && !tinRef) {
      throw new AgentAccessError(`${institutionType} onboarding requires a CAC RC number or Tax Identification Number (TIN)`, 400);
    }

    const requestedCode = String(data.agentCode || '').trim().toUpperCase();
    if (requestedCode && !/^[A-Z0-9-]{3,50}$/.test(requestedCode)) {
      throw new AgentAccessError('Agent code may only contain letters, numbers and dashes (3-50 characters)', 400);
    }
    const agentCode = requestedCode || `AG-${Math.floor(100000 + Math.random() * 900000)}`;

    const conflict = await agentRepository.findConflict(email, agentCode);
    if (conflict === 'email') throw new AgentAccessError('An agent with this email already exists', 409);
    if (conflict === 'code') throw new AgentAccessError('Agent code already exists', 409);

    let logoUrl = '';
    if (data.logoImage) {
      try {
        const uploadResult = await uploadInstitutionLogo(data.logoImage, agentCode);
        logoUrl = uploadResult.logoUrl;
      } catch (err: any) {
        throw new AgentAccessError(`Invalid institution logo: ${err?.message || 'Upload failed'}`, 400);
      }
    }

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
          status: institutionType ? 'PENDING' : 'ACTIVE',
          role_id: optionalUuid(data.role_id),
          territory_id: optionalUuid(data.territory_id),
          supervisor_agent_id: optionalUuid(data.supervisor_agent_id),
          commission_plan_id: optionalUuid(data.commission_plan_id),
          institution_type: institutionType,
          trading_name: tradingName,
          logo_url: logoUrl || null,
          created_by: optionalUuid(creatorId),
          updated_by: optionalUuid(creatorId),
        },
        {
          address: data.address || '',
          profile_photo_url: passportUrl || null,
          logo_url: logoUrl || null,
          kyc_status: 'PENDING',
          cac_registration_number: cacRef || null,
          tax_identification_number: tinRef || null,
          regulator_license_reference: nhiaRef || cbnRef || ministryRef || null,
          regulatory_metadata: {
            institution_type: institutionType,
            trading_name: tradingName,
            nhia_license_number: nhiaRef || undefined,
            cbn_license_number: cbnRef || undefined,
            ministry_approval_number: ministryRef || undefined,
            cac_registration_number: cacRef || undefined,
            tax_identification_number: tinRef || undefined,
            ...(data.regulatoryMetadata || {}),
          },
        },
      );
    } catch (err) {
      if (logoUrl) {
        await deleteInstitutionLogo(logoUrl).catch(() => {});
      }
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
        institution_type: institutionType,
        trading_name: tradingName,
        logo_url: logoUrl || null,
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

  /**
   * Uploads and updates the official institution logo for an agent.
   */
  async updateLogo(
    agentId: string,
    base64Data: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ logoUrl: string }> {
    const agent = await agentRepository.findById(agentId);
    if (!agent) throw new AgentAccessError('Agent not found', 404);

    let uploadRes: { logoUrl: string };
    try {
      uploadRes = await uploadInstitutionLogo(base64Data, agent.agent_code || agentId);
    } catch (err: any) {
      throw new AgentAccessError(`Invalid logo image: ${err?.message || 'Validation failed'}`, 400);
    }

    const previousLogoUrl = agent.logo_url || agent.agent_profiles?.logo_url;
    if (previousLogoUrl && previousLogoUrl !== uploadRes.logoUrl) {
      await deleteInstitutionLogo(previousLogoUrl);
    }

    await agentRepository.updateLogo(agentId, uploadRes.logoUrl);

    await agentRepository.logAudit(
      actorId,
      'AGENT',
      agentId,
      'UPDATE_LOGO',
      { logo_url: previousLogoUrl },
      { logo_url: uploadRes.logoUrl },
      ipAddress,
      userAgent
    );

    return { logoUrl: uploadRes.logoUrl };
  }

  /**
   * Removes an agent's institution logo.
   */
  async removeLogo(
    agentId: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean }> {
    const agent = await agentRepository.findById(agentId);
    if (!agent) throw new AgentAccessError('Agent not found', 404);

    const previousLogoUrl = agent.logo_url || agent.agent_profiles?.logo_url;
    if (previousLogoUrl) {
      await deleteInstitutionLogo(previousLogoUrl);
    }

    await agentRepository.updateLogo(agentId, null);

    await agentRepository.logAudit(
      actorId,
      'AGENT',
      agentId,
      'REMOVE_LOGO',
      { logo_url: previousLogoUrl },
      { logo_url: null },
      ipAddress,
      userAgent
    );

    return { success: true };
  }

  /**
   * Updates an agent/institution's core profile, category, trading name, and regulatory metadata.
   */
  async updateAgentProfileDetails(
    id: string,
    data: {
      institutionType?: string;
      institution_type?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      tradingName?: string;
      trading_name?: string;
      phone?: string;
      whatsappNumber?: string;
      address?: string;
      nhiaLicenseNumber?: string;
      cbnLicenseNumber?: string;
      ministryApprovalNumber?: string;
      cacNumber?: string;
      tin?: string;
      regulatoryMetadata?: Record<string, any>;
    },
    actorId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existingAgent = await agentRepository.findById(id);
    if (!existingAgent) throw new AgentAccessError('Agent not found', 404);

    const agentUpdates: Record<string, any> = {
      updated_by: optionalUuid(actorId),
    };
    const profileUpdates: Record<string, any> = {
      updated_by: optionalUuid(actorId),
    };

    // Category update & validation
    const rawType = data.institutionType || data.institution_type;
    let institutionType: CanonicalInstitutionType | undefined;
    if (rawType) {
      const normalizedType = String(rawType).trim().toUpperCase();
      if (!CANONICAL_INSTITUTION_TYPES.includes(normalizedType as any)) {
        throw new AgentAccessError(
          `Invalid institution category '${normalizedType}'. Must be one of: ${CANONICAL_INSTITUTION_TYPES.join(', ')}`,
          400
        );
      }
      institutionType = normalizedType as CanonicalInstitutionType;
      agentUpdates.institution_type = institutionType;
    }

    // Name update
    if (data.name !== undefined) {
      const fullName = String(data.name).trim().replace(/\s+/g, ' ');
      if (fullName) {
        agentUpdates.first_name = fullName.split(' ')[0].trim();
        agentUpdates.last_name = fullName.split(' ').slice(1).join(' ').trim() || 'Agent';
      }
    } else {
      if (data.first_name !== undefined) agentUpdates.first_name = String(data.first_name).trim();
      if (data.last_name !== undefined) agentUpdates.last_name = String(data.last_name).trim();
    }

    // Trading name
    if (data.tradingName !== undefined || data.trading_name !== undefined) {
      agentUpdates.trading_name = String(data.tradingName || data.trading_name || '').trim();
    }

    // Contact info
    if (data.phone !== undefined) {
      agentUpdates.phone = String(data.phone || '').trim() || null;
    }
    if (data.address !== undefined) {
      profileUpdates.address = String(data.address || '').trim() || null;
    }

    // Regulatory references & existing profile metadata
    const existingProfile = Array.isArray(existingAgent.agent_profiles)
      ? existingAgent.agent_profiles[0]
      : (existingAgent.agent_profiles || {});
    const existingMeta = existingProfile.regulatory_metadata || {};

    const nhiaRef = data.nhiaLicenseNumber !== undefined ? String(data.nhiaLicenseNumber).trim() : existingMeta.nhia_license_number;
    const cbnRef = data.cbnLicenseNumber !== undefined ? String(data.cbnLicenseNumber).trim() : existingMeta.cbn_license_number;
    const ministryRef = data.ministryApprovalNumber !== undefined ? String(data.ministryApprovalNumber).trim() : existingMeta.ministry_approval_number;
    const cacRef = data.cacNumber !== undefined ? String(data.cacNumber).trim() : existingProfile.cac_registration_number;
    const tinRef = data.tin !== undefined ? String(data.tin).trim() : existingProfile.tax_identification_number;

    // Validate conditional requirements if category is specified or changing
    const effectiveCategory = institutionType || existingAgent.institution_type || 'SCHOOL';
    if (effectiveCategory === 'HMO' && !nhiaRef && !existingProfile.regulator_license_reference) {
      throw new AgentAccessError('HMO category requires NHIA accreditation or license number', 400);
    }
    if ((effectiveCategory === 'BANK' || effectiveCategory === 'PTSP') && !cbnRef && !existingProfile.regulator_license_reference) {
      throw new AgentAccessError(`${effectiveCategory} category requires a valid CBN license / approval reference`, 400);
    }
    if (effectiveCategory === 'SCHOOL' && !ministryRef && !existingProfile.regulator_license_reference) {
      throw new AgentAccessError('School category requires Ministry of Education approval or registration reference', 400);
    }

    if (cacRef !== undefined) profileUpdates.cac_registration_number = cacRef || null;
    if (tinRef !== undefined) profileUpdates.tax_identification_number = tinRef || null;
    if (nhiaRef || cbnRef || ministryRef) {
      profileUpdates.regulator_license_reference = nhiaRef || cbnRef || ministryRef || null;
    }

    profileUpdates.regulatory_metadata = {
      ...existingMeta,
      ...(institutionType ? { institution_type: institutionType } : {}),
      ...(agentUpdates.trading_name ? { trading_name: agentUpdates.trading_name } : {}),
      ...(data.whatsappNumber !== undefined ? { whatsapp_number: String(data.whatsappNumber).trim() || null } : {}),
      ...(nhiaRef ? { nhia_license_number: nhiaRef } : {}),
      ...(cbnRef ? { cbn_license_number: cbnRef } : {}),
      ...(ministryRef ? { ministry_approval_number: ministryRef } : {}),
      ...(cacRef ? { cac_registration_number: cacRef } : {}),
      ...(tinRef ? { tax_identification_number: tinRef } : {}),
      ...(data.regulatoryMetadata || {}),
    };

    // Apply updates via repository
    await agentRepository.updateAgent(id, agentUpdates);
    await agentRepository.updateAgentProfile(id, profileUpdates);

    // Fetch refreshed agent with profile
    const refreshed = await agentRepository.findById(id);

    // Audit log
    await agentRepository.logAudit(
      actorId,
      'AGENT',
      id,
      'UPDATE_AGENT_PROFILE',
      {
        institution_type: existingAgent.institution_type,
        first_name: existingAgent.first_name,
        last_name: existingAgent.last_name,
        trading_name: existingAgent.trading_name,
      },
      {
        ...agentUpdates,
        ...profileUpdates,
      },
      ipAddress,
      userAgent
    );

    return refreshed;
  }
}

export const agentService = new AgentService();
