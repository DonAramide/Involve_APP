import { supabaseAdmin } from '../db/supabase';

export const INVIFY_DEFAULT_AGENT_CODE = 'AAA000';

const INACTIVE_STATUSES = new Set(['SUSPENDED', 'TERMINATED']);

export type InstitutionCategory =
  | 'BANK'
  | 'HMO'
  | 'PAYMENT_PROVIDER'
  | 'AGGREGATOR'
  | 'INVIFY_DEFAULT'
  | 'AGENT';

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

export function normalizeAgentCode(raw: unknown): string {
  return String(raw || '').trim().toUpperCase();
}

export function isInvifyDefaultAgentCode(code: unknown): boolean {
  return normalizeAgentCode(code) === INVIFY_DEFAULT_AGENT_CODE;
}

export function isValidAgentCodeFormat(code: string): boolean {
  return /^[A-Z0-9-]{3,20}$/.test(code);
}

function isMissingTableError(error: any, tableName?: string): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === 'PGRST205' || code === '42P01' || /schema cache/i.test(message)) {
    return true;
  }
  if (tableName) {
    const regex = new RegExp(`(Could not find the table|relation)\\s+['"]?(public\\.)?${tableName}['"]?`, 'i');
    return regex.test(message);
  }
  return /does not exist/i.test(message);
}

function defaultInvifyLookup(code: string): AgentCodeLookup {
  return {
    valid: true,
    exists: true,
    isDefault: true,
    code,
    agentName: 'Invify',
    status: 'ACTIVE',
    institutionId: null,
    institutionType: 'INVIFY_DEFAULT',
    hmoProviderId: null,
    hmoProviderCode: null,
    hmoProviderName: null,
    hmoAssignmentMode: 'SELECTABLE',
    overridePolicy: 'OPEN',
    allowedProviders: [],
  };
}

function missingLookup(code: string): AgentCodeLookup {
  return {
    valid: false,
    exists: false,
    isDefault: isInvifyDefaultAgentCode(code),
    code,
    error: 'This agent code does not exist',
  };
}

async function resolveAuthoritativeInstitutionCode(code: string): Promise<AgentCodeLookup | null> {
  if (isInvifyDefaultAgentCode(code)) {
    return null;
  }

  try {
    const instBuilder = supabaseAdmin
      .from('institutions')
      .select('id, institution_code, legal_name, display_name, institution_type, status, kyc_status, deleted_at')
      .eq('institution_code', code)
      .is('deleted_at', null);

    if (typeof (instBuilder as any)?.maybeSingle !== 'function') {
      return null;
    }

    const { data: inst, error: instError } = await instBuilder.maybeSingle();
    if (instError) {
      if (isMissingTableError(instError, 'institutions')) {
        return null;
      }
      throw instError;
    }

    if (!inst || !inst.institution_code) {
      return null;
    }

    const instStatus = String(inst.status || '').toUpperCase();
    const kycStatus = String(inst.kyc_status || '').toUpperCase();
    const instType = String(inst.institution_type || '').toUpperCase() as InstitutionCategory;
    const displayName = String(inst.display_name || inst.legal_name || code).trim();

    if (instStatus !== 'ACTIVE' || kycStatus === 'REJECTED') {
      return {
        valid: false,
        exists: true,
        isDefault: false,
        code,
        agentName: displayName,
        status: instStatus || 'INACTIVE',
        institutionId: inst.id,
        institutionType: instType,
        error: 'This institution is not active',
      };
    }

    // Fetch HEALTH_INSURANCE service policy if configured
    let serviceRow: any = null;
    try {
      const svcBuilder = supabaseAdmin
        .from('institution_services')
        .select('id, service_type, default_provider, allowed_providers, tenant_override_policy, status')
        .eq('institution_id', inst.id)
        .eq('service_type', 'HEALTH_INSURANCE');
      if (typeof (svcBuilder as any)?.maybeSingle === 'function') {
        const { data: svcData } = await svcBuilder.maybeSingle();
        serviceRow = svcData || null;
      }
    } catch {
      // Optional service metadata fallback
    }

    if (instType === 'HMO') {
      if (kycStatus && kycStatus !== 'VERIFIED') {
        return {
          valid: false,
          exists: true,
          isDefault: false,
          code,
          agentName: displayName,
          status: instStatus,
          institutionId: inst.id,
          institutionType: 'HMO',
          error: 'This HMO institution is not verified',
        };
      }

      if (serviceRow && String(serviceRow.status || '').toUpperCase() !== 'ACTIVE') {
        return {
          valid: false,
          exists: true,
          isDefault: false,
          code,
          agentName: displayName,
          status: String(serviceRow.status || 'INACTIVE').toUpperCase(),
          institutionId: inst.id,
          institutionType: 'HMO',
          error: 'Health insurance service is not active for this institution',
        };
      }

      // Resolve linked hw_providers record
      let providerRow: any = null;
      try {
        const byInstBuilder = supabaseAdmin
          .from('hw_providers')
          .select('id, code, name, integration_status, institution_id')
          .eq('institution_id', inst.id);
        if (typeof (byInstBuilder as any)?.maybeSingle === 'function') {
          const { data: byInst } = await byInstBuilder.maybeSingle();
          providerRow = byInst || null;
        }
        if (!providerRow) {
          const byCodeBuilder = supabaseAdmin
            .from('hw_providers')
            .select('id, code, name, integration_status, institution_id')
            .eq('code', code.toLowerCase());
          if (typeof (byCodeBuilder as any)?.maybeSingle === 'function') {
            const { data: byCode } = await byCodeBuilder.maybeSingle();
            providerRow = byCode || null;
          }
        }
      } catch {
        providerRow = null;
      }

      const providerStatus = String(providerRow?.integration_status || '').toLowerCase();
      if (!providerRow || providerStatus === 'suspended' || providerStatus === 'none') {
        return {
          valid: false,
          exists: true,
          isDefault: false,
          code,
          agentName: displayName,
          status: providerStatus ? providerStatus.toUpperCase() : 'UNAVAILABLE',
          institutionId: inst.id,
          institutionType: 'HMO',
          error: 'This HMO provider is not active',
        };
      }

      const overridePolicy: InstitutionOverridePolicy =
        (String(serviceRow?.tenant_override_policy || 'LOCKED').toUpperCase() as InstitutionOverridePolicy) || 'LOCKED';
      const hmoAssignmentMode: HmoAssignmentMode = overridePolicy === 'LOCKED' ? 'LOCKED' : 'SELECTABLE';
      const allowedProviders = Array.isArray(serviceRow?.allowed_providers)
        ? serviceRow.allowed_providers.map((p: any) => String(p).toLowerCase())
        : [String(providerRow.code).toLowerCase()];

      return {
        valid: true,
        exists: true,
        isDefault: false,
        code,
        agentName: displayName || providerRow.name,
        status: 'ACTIVE',
        institutionId: inst.id,
        institutionType: 'HMO',
        hmoProviderId: providerRow.id,
        hmoProviderCode: String(providerRow.code).toLowerCase(),
        hmoProviderName: providerRow.name,
        hmoAssignmentMode,
        overridePolicy,
        allowedProviders,
      };
    }

    // BANK / PAYMENT_PROVIDER / AGGREGATOR institution
    const overridePolicy: InstitutionOverridePolicy =
      serviceRow && String(serviceRow.status || '').toUpperCase() === 'ACTIVE'
        ? ((String(serviceRow.tenant_override_policy || 'OPEN').toUpperCase() as InstitutionOverridePolicy))
        : 'OPEN';
    const hmoAssignmentMode: HmoAssignmentMode = overridePolicy === 'LOCKED' ? 'LOCKED' : 'SELECTABLE';
    const allowedProviders =
      serviceRow && String(serviceRow.status || '').toUpperCase() === 'ACTIVE' && Array.isArray(serviceRow.allowed_providers)
        ? serviceRow.allowed_providers.map((p: any) => String(p).toLowerCase())
        : [];

    return {
      valid: true,
      exists: true,
      isDefault: false,
      code,
      agentName: displayName,
      status: 'ACTIVE',
      institutionId: inst.id,
      institutionType: instType,
      hmoProviderId: null,
      hmoProviderCode: serviceRow?.default_provider ? String(serviceRow.default_provider).toLowerCase() : null,
      hmoProviderName: null,
      hmoAssignmentMode,
      overridePolicy,
      allowedProviders,
    };
  } catch {
    return null;
  }
}

/**
 * Confirms an onboarding agent or institution code against the authoritative
 * institutions registry and agents table.
 * AAA000 is always accepted as Invify's default agent.
 */
export async function lookupAgentCode(raw: unknown): Promise<AgentCodeLookup> {
  const code = normalizeAgentCode(raw);
  if (!code) {
    return {
      valid: false,
      exists: false,
      isDefault: false,
      code: '',
      error: 'Agent code is required',
    };
  }
  if (!isValidAgentCodeFormat(code)) {
    return {
      valid: false,
      exists: false,
      isDefault: isInvifyDefaultAgentCode(code),
      code,
      error: 'Enter a valid agent code',
    };
  }

  // 1. Check authoritative institutions registry first for non-default codes (e.g. MHMO, BANK codes)
  const institutionLookup = await resolveAuthoritativeInstitutionCode(code);
  if (institutionLookup) {
    return institutionLookup;
  }

  // 2. Check agents table
  try {
    const { data, error } = await supabaseAdmin
      .from('agents')
      .select('id, agent_code, first_name, last_name, status, deleted_at')
      .eq('agent_code', code)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error, 'agents') && isInvifyDefaultAgentCode(code)) {
        return defaultInvifyLookup(code);
      }
      if (isMissingTableError(error, 'agents')) {
        return missingLookup(code);
      }
      throw error;
    }

    if (data) {
      const status = String(data.status || '').toUpperCase();
      const agentName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
      const isDefault = isInvifyDefaultAgentCode(code);
      if (INACTIVE_STATUSES.has(status)) {
        return {
          valid: false,
          exists: true,
          isDefault,
          code,
          agentName,
          status,
          error: 'This agent is not active',
        };
      }
      return {
        valid: true,
        exists: true,
        isDefault,
        code,
        agentName: isDefault ? (agentName || 'Invify') : agentName,
        status,
        institutionId: null,
        institutionType: isDefault ? 'INVIFY_DEFAULT' : 'AGENT',
        hmoProviderId: null,
        hmoProviderCode: null,
        hmoProviderName: null,
        hmoAssignmentMode: 'SELECTABLE',
        overridePolicy: 'OPEN',
        allowedProviders: [],
      };
    }
  } catch (error: any) {
    if (isInvifyDefaultAgentCode(code)) {
      return defaultInvifyLookup(code);
    }
    throw error;
  }

  if (isInvifyDefaultAgentCode(code)) {
    return defaultInvifyLookup(code);
  }
  return missingLookup(code);
}

