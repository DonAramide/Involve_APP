export declare const INVIFY_DEFAULT_AGENT_CODE = "AAA000";
export type InstitutionCategory = 'BANK' | 'HMO' | 'PAYMENT_PROVIDER' | 'AGGREGATOR' | 'INVIFY_DEFAULT' | 'AGENT';
export type HmoAssignmentMode = 'LOCKED' | 'SELECTABLE';
export type InstitutionOverridePolicy = 'LOCKED' | 'PERMITTED_FROM_LIST' | 'OPEN';
export type AgentCodeLookup = {
    valid: boolean;
    exists: boolean;
    isDefault: boolean;
    code: string;
    agentName?: string | null;
    status?: string | null;
    error?: string;
    institutionId?: string | null;
    institutionType?: InstitutionCategory | null;
    hmoProviderId?: string | null;
    hmoProviderCode?: string | null;
    hmoProviderName?: string | null;
    hmoAssignmentMode?: HmoAssignmentMode | null;
    overridePolicy?: InstitutionOverridePolicy | null;
    allowedProviders?: string[];
};
export declare function normalizeAgentCode(raw: unknown): string;
export declare function isInvifyDefaultAgentCode(code: unknown): boolean;
export declare function isValidAgentCodeFormat(code: string): boolean;
/**
 * Confirms an onboarding agent or institution code against the authoritative
 * institutions registry and agents table.
 * AAA000 is always accepted as Invify's default agent.
 */
export declare function lookupAgentCode(raw: unknown): Promise<AgentCodeLookup>;
