export declare const CANONICAL_INSTITUTION_TYPES: readonly ["SCHOOL", "HMO", "BANK", "MERCHANT", "PTSP", "CORPORATE"];
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
    institutionType?: string;
    institution_type?: string;
    tradingName?: string;
    trading_name?: string;
    logoImage?: string;
    nhiaLicenseNumber?: string;
    cbnLicenseNumber?: string;
    ministryApprovalNumber?: string;
    schoolCode?: string;
    cacNumber?: string;
    tin?: string;
    regulatoryMetadata?: Record<string, any>;
}
export declare class AgentService {
    /**
     * Onboards a new agent: creates the login, the agent + profile rows, and emails a welcome/set-password link.
     * Admin-provisioned agents start with non-active status 'PENDING' and KYC 'PENDING'.
     */
    onboardAgent(creatorId: string, data: OnboardAgentInput, ipAddress?: string, userAgent?: string): Promise<{
        agent: any;
        welcomeEmailSent: boolean;
    }>;
    /**
     * Re-sends the welcome / set-password email to an existing agent.
     */
    resendInvite(id: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
    /**
     * List all agents
     */
    listAgents(filters?: {
        status?: string;
        territory_id?: string;
    }): Promise<any[]>;
    /**
     * Get specific agent
     */
    getAgent(id: string): Promise<any>;
    /**
     * Update Agent Status
     */
    updateStatus(id: string, newStatus: string, reason: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<any>;
    /**
     * Update KYC status of agent
     */
    updateKycStatus(id: string, kycStatus: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<any>;
    /**
     * Get commissions config for agent
     */
    getCommissions(id: string): Promise<{
        commission_plan_id: any;
        tier: any;
    }>;
    /**
     * Update commissions config for agent
     */
    updateCommissions(id: string, data: {
        commission_plan_id?: string;
        tier?: string;
    }, actorId: string, ipAddress?: string, userAgent?: string): Promise<any>;
    /**
     * Message agent
     */
    messageAgent(id: string, message: string, actorId: string): Promise<void>;
    /**
     * Message all tenants managed by agent
     */
    messageTenants(id: string, message: string, actorId: string): Promise<void>;
    /**
     * Uploads and updates the official institution logo for an agent.
     */
    updateLogo(agentId: string, base64Data: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<{
        logoUrl: string;
    }>;
    /**
     * Removes an agent's institution logo.
     */
    removeLogo(agentId: string, actorId: string, ipAddress?: string, userAgent?: string): Promise<{
        success: boolean;
    }>;
    /**
     * Updates an agent/institution's core profile, category, trading name, and regulatory metadata.
     */
    updateAgentProfileDetails(id: string, data: {
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
    }, actorId: string, ipAddress?: string, userAgent?: string): Promise<any>;
}
export declare const agentService: AgentService;
