// invify-backend/src/modules/health-insurance/services/institution-classification.service.ts
import { supabaseAdmin } from '../../../db/supabase';

export type CanonicalInstitutionType = 'BANK' | 'HMO' | 'HOSPITAL' | 'AGGREGATOR' | 'PAYMENT_PROVIDER' | 'UNKNOWN';

export type HmoRole =
  | 'HMO_ADMIN'
  | 'ENROLLMENT_OFFICER'
  | 'PROVIDER_NETWORK_MANAGER'
  | 'CLAIMS_OFFICER'
  | 'AUTHORIZATION_OFFICER'
  | 'FINANCE_OFFICER'
  | 'AUDITOR';

export type HmoPermission =
  | 'hmo.dashboard.view'
  | 'hmo.profile.manage'
  | 'hmo.schools.view'
  | 'hmo.schools.manage'
  | 'hmo.plans.view'
  | 'hmo.plans.manage'
  | 'hmo.members.view'
  | 'hmo.members.manage'
  | 'hmo.batches.view'
  | 'hmo.batches.export'
  | 'hmo.batches.reconcile'
  | 'hmo.providers.view'
  | 'hmo.providers.manage'
  | 'hmo.preauth.view'
  | 'hmo.preauth.adjudicate'
  | 'hmo.claims.view'
  | 'hmo.claims.adjudicate'
  | 'hmo.billing.view'
  | 'hmo.billing.reconcile'
  | 'hmo.reports.view'
  | 'hmo.reports.export'
  | 'hmo.users.manage'
  | 'hmo.audit.view';

export const HMO_ROLE_PERMISSIONS: Record<HmoRole, HmoPermission[]> = {
  HMO_ADMIN: [
    'hmo.dashboard.view',
    'hmo.profile.manage',
    'hmo.schools.view',
    'hmo.schools.manage',
    'hmo.plans.view',
    'hmo.plans.manage',
    'hmo.members.view',
    'hmo.members.manage',
    'hmo.batches.view',
    'hmo.batches.export',
    'hmo.batches.reconcile',
    'hmo.providers.view',
    'hmo.providers.manage',
    'hmo.preauth.view',
    'hmo.preauth.adjudicate',
    'hmo.claims.view',
    'hmo.claims.adjudicate',
    'hmo.billing.view',
    'hmo.billing.reconcile',
    'hmo.reports.view',
    'hmo.reports.export',
    'hmo.users.manage',
    'hmo.audit.view',
  ],
  ENROLLMENT_OFFICER: [
    'hmo.dashboard.view',
    'hmo.schools.view',
    'hmo.schools.manage',
    'hmo.plans.view',
    'hmo.members.view',
    'hmo.members.manage',
    'hmo.batches.view',
    'hmo.batches.export',
    'hmo.batches.reconcile',
    'hmo.reports.view',
    'hmo.reports.export',
  ],
  PROVIDER_NETWORK_MANAGER: [
    'hmo.dashboard.view',
    'hmo.plans.view',
    'hmo.providers.view',
    'hmo.providers.manage',
    'hmo.reports.view',
  ],
  CLAIMS_OFFICER: [
    'hmo.dashboard.view',
    'hmo.members.view',
    'hmo.providers.view',
    'hmo.preauth.view',
    'hmo.claims.view',
    'hmo.claims.adjudicate',
    'hmo.reports.view',
  ],
  AUTHORIZATION_OFFICER: [
    'hmo.dashboard.view',
    'hmo.members.view',
    'hmo.providers.view',
    'hmo.preauth.view',
    'hmo.preauth.adjudicate',
    'hmo.claims.view',
  ],
  FINANCE_OFFICER: [
    'hmo.dashboard.view',
    'hmo.schools.view',
    'hmo.plans.view',
    'hmo.claims.view',
    'hmo.billing.view',
    'hmo.billing.reconcile',
    'hmo.reports.view',
    'hmo.reports.export',
  ],
  AUDITOR: [
    'hmo.dashboard.view',
    'hmo.schools.view',
    'hmo.plans.view',
    'hmo.members.view',
    'hmo.batches.view',
    'hmo.providers.view',
    'hmo.preauth.view',
    'hmo.claims.view',
    'hmo.billing.view',
    'hmo.reports.view',
    'hmo.audit.view',
  ],
};

export interface ResolvedInstitutionContext {
  agentId: string | null;
  authUserId: string | null;
  email: string | null;
  institutionId: string | null;
  institutionCode: string;
  institutionName: string;
  institutionType: CanonicalInstitutionType;
  portalMode: 'BANK' | 'HMO' | 'RESTRICTED';
  approvalStatus: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'RETIRED' | 'DRAFT';
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  isVerified: boolean;
  featureEnabled: boolean;
  hmoProviderId: string | null;
  hmoProviderCode: string | null;
  hmoRole: HmoRole | null;
  hmoPermissions: HmoPermission[];
  restrictionReason: string | null;
}

function normalizeCode(raw: any): string {
  return String(raw || '').trim().toUpperCase();
}

function inferFromCodeOrAgent(agent: any, code: string): CanonicalInstitutionType {
  // Explicit database columns on agent if present (never client request body/headers)
  const dbType = String(agent?.institution_type || agent?.agent_type || agent?.type || '')
    .trim()
    .toUpperCase();

  if (dbType === 'HMO' || dbType === 'HEALTH_INSURANCE' || dbType === 'INSURER') {
    return 'HMO';
  }
  if (dbType === 'HOSPITAL' || dbType === 'CLINIC' || dbType === 'HEALTH_FACILITY') {
    return 'HOSPITAL';
  }
  if (dbType === 'BANK' || dbType === 'FINANCIAL_INSTITUTION') {
    return 'BANK';
  }
  if (dbType === 'AGGREGATOR') {
    return 'AGGREGATOR';
  }
  if (dbType === 'PAYMENT_PROVIDER') {
    return 'PAYMENT_PROVIDER';
  }

  // Known HMO code pattern fallback when institutions row hasn't been synced yet
  if (code === 'MHMO' || code.startsWith('MHMO-') || code.startsWith('HMO-') || code.endsWith('HMO')) {
    return 'HMO';
  }

  // Default legacy financial agents/banks in Invify Institute Portal remain BANK
  return 'BANK';
}

export class InstitutionClassificationService {
  /**
   * Authoritatively resolves the institution classification from backend database records.
   * Never trusts client-supplied headers, query params, or localStorage flags.
   */
  async resolveForAgentOrUser(params: {
    authUserId?: string | null;
    email?: string | null;
    agentRecord?: any | null;
  }): Promise<ResolvedInstitutionContext> {
    const authUserId = params.authUserId || params.agentRecord?.auth_user_id || null;
    const email = String(params.email || params.agentRecord?.email || '').trim().toLowerCase() || null;

    let agent = params.agentRecord || null;
    if (!agent && authUserId) {
      const { data } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('auth_user_id', authUserId)
        .is('deleted_at', null)
        .maybeSingle();
      agent = data || null;
    }
    if (!agent && email) {
      const { data } = await supabaseAdmin
        .from('agents')
        .select('*')
        .ilike('email', email)
        .is('deleted_at', null)
        .maybeSingle();
      agent = data || null;
    }

    // 1. Check explicit HMO user membership first (supports multi-user HMO teams)
    let membership: any = null;
    try {
      if (authUserId) {
        const { data } = await supabaseAdmin
          .from('hw_hmo_user_memberships')
          .select('*')
          .eq('user_id', authUserId)
          .in('status', ['ACTIVE', 'SUSPENDED', 'INVITED'])
          .maybeSingle();
        membership = data || null;
      }
      if (!membership && agent?.id) {
        const { data } = await supabaseAdmin
          .from('hw_hmo_user_memberships')
          .select('*')
          .eq('agent_id', agent.id)
          .in('status', ['ACTIVE', 'SUSPENDED', 'INVITED'])
          .maybeSingle();
        membership = data || null;
      }
      if (!membership && email) {
        const { data } = await supabaseAdmin
          .from('hw_hmo_user_memberships')
          .select('*')
          .ilike('email', email)
          .in('status', ['ACTIVE', 'SUSPENDED', 'INVITED'])
          .maybeSingle();
        membership = data || null;
      }
    } catch {
      membership = null;
    }

    const rawCode = normalizeCode(agent?.agent_code || agent?.agentCode || '');

    // 2. Look up authoritative public.institutions record by institution_id (from membership) or institution_code
    let institutionRow: any = null;
    try {
      if (membership?.institution_id) {
        const { data } = await supabaseAdmin
          .from('institutions')
          .select('*')
          .eq('id', membership.institution_id)
          .is('deleted_at', null)
          .maybeSingle();
        institutionRow = data || null;
      }
      if (!institutionRow && rawCode) {
        const { data } = await supabaseAdmin
          .from('institutions')
          .select('*')
          .ilike('institution_code', rawCode)
          .is('deleted_at', null)
          .maybeSingle();
        institutionRow = data || null;
      }
    } catch {
      institutionRow = null;
    }

    // 3. Determine canonical institution type
    let institutionType: CanonicalInstitutionType = 'BANK';
    if (membership) {
      institutionType = 'HMO';
    } else if (institutionRow?.institution_type) {
      const iType = String(institutionRow.institution_type).trim().toUpperCase();
      if (iType === 'HMO') institutionType = 'HMO';
      else if (iType === 'BANK') institutionType = 'BANK';
      else if (iType === 'AGGREGATOR') institutionType = 'AGGREGATOR';
      else if (iType === 'PAYMENT_PROVIDER') institutionType = 'PAYMENT_PROVIDER';
      else if (iType === 'HOSPITAL') institutionType = 'HOSPITAL';
      else institutionType = 'UNKNOWN';
    } else {
      institutionType = inferFromCodeOrAgent(agent, rawCode);
    }

    // 4. If HMO (or matched by code in hw_providers), resolve the hw_providers record
    let providerRow: any = null;
    try {
      if (membership?.provider_id) {
        const { data } = await supabaseAdmin
          .from('hw_providers')
          .select('*')
          .eq('id', membership.provider_id)
          .maybeSingle();
        providerRow = data || null;
      }
      if (!providerRow && institutionRow?.id) {
        const { data } = await supabaseAdmin
          .from('hw_providers')
          .select('*')
          .eq('institution_id', institutionRow.id)
          .maybeSingle();
        providerRow = data || null;
      }
      if (!providerRow && rawCode) {
        const normalizedProviderCode = rawCode.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const { data } = await supabaseAdmin
          .from('hw_providers')
          .select('*')
          .in('code', [normalizedProviderCode, rawCode.toLowerCase(), 'mhmo'])
          .limit(5);
        if (data && data.length > 0) {
          providerRow =
            data.find((p: any) => p.code === normalizedProviderCode || p.code === rawCode.toLowerCase()) ||
            (institutionType === 'HMO' && rawCode.startsWith('MHMO') ? data.find((p: any) => p.code === 'mhmo') : null) ||
            null;
          if (providerRow && institutionType !== 'HMO' && providerRow.code === normalizedProviderCode) {
            institutionType = 'HMO';
          }
        }
      }
    } catch {
      providerRow = null;
    }

    // Auto-ensure MHMO / HMO provider record exists when an active HMO institution logs in
    if (institutionType === 'HMO' && !providerRow && (rawCode || institutionRow)) {
      const fallbackCode = (institutionRow?.institution_code || rawCode || 'mhmo')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 40);
      const displayName =
        institutionRow?.trading_name ||
        institutionRow?.legal_name ||
        agent?.institution_name ||
        `${ `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim() || rawCode } HMO`;
      try {
        const { data: upserted } = await supabaseAdmin
          .from('hw_providers')
          .upsert(
            {
              code: fallbackCode.length >= 2 ? fallbackCode : 'mhmo',
              display_name: displayName,
              legal_name: institutionRow?.legal_name || displayName,
              institution_id: institutionRow?.id || null,
              integration_status: 'verified',
              contact_email: institutionRow?.contact_email || email,
              contact_phone: institutionRow?.contact_phone || agent?.phone || null,
              capabilities: {
                plans: true,
                enrolmentSubmit: true,
                enrolmentStatus: true,
                eligibility: true,
                facilities: true,
                claims: true,
                renewals: true,
                excelExchange: true,
              },
              last_verified_at: new Date().toISOString(),
            },
            { onConflict: 'code' }
          )
          .select('*')
          .maybeSingle();
        if (upserted) providerRow = upserted;
      } catch {
        // Non-fatal if hw_providers is read-only or not yet migrated in unit test
      }
    }

    // 5. Compute approval & KYC statuses
    const rawAgentStatus = String(agent?.status || 'ACTIVE').toUpperCase();
    const rawInstStatus = String(institutionRow?.status || rawAgentStatus || 'ACTIVE').toUpperCase();
    let approvalStatus: ResolvedInstitutionContext['approvalStatus'] = 'ACTIVE';
    if (rawAgentStatus === 'SUSPENDED' || rawInstStatus === 'SUSPENDED' || membership?.status === 'SUSPENDED') {
      approvalStatus = 'SUSPENDED';
    } else if (
      rawAgentStatus === 'PENDING' ||
      rawAgentStatus === 'PENDING_APPROVAL' ||
      rawInstStatus === 'PENDING_APPROVAL'
    ) {
      approvalStatus = 'PENDING_APPROVAL';
    } else if (rawInstStatus === 'RETIRED' || rawAgentStatus === 'TERMINATED') {
      approvalStatus = 'RETIRED';
    } else if (rawInstStatus === 'DRAFT') {
      approvalStatus = 'DRAFT';
    }

    const rawKyc = String(
      institutionRow?.kyc_status || agent?.kyc_status || agent?.kycStatus || 'VERIFIED'
    ).toUpperCase();
    const kycStatus: ResolvedInstitutionContext['kycStatus'] =
      rawKyc === 'REJECTED' ? 'REJECTED' : rawKyc === 'PENDING' ? 'PENDING' : 'VERIFIED';

    // Feature flag check: HMO portal requires FEATURE_HEALTH_INSURANCE_ENABLED !== 'false'
    // and FEATURE_HEALTH_INSURANCE_HMO_PORTAL !== 'false'
    const envFlag = process.env.FEATURE_HEALTH_INSURANCE_ENABLED;
    const hmoPortalFlag = process.env.FEATURE_HEALTH_INSURANCE_HMO_PORTAL;
    const featureEnabled =
      (envFlag === undefined ? true : envFlag === 'true') &&
      (hmoPortalFlag === undefined ? true : hmoPortalFlag === 'true');

    // 6. Resolve HMO role & permissions
    let hmoRole: HmoRole | null = null;
    let hmoPermissions: HmoPermission[] = [];

    if (institutionType === 'HMO') {
      const candidateRole = String(membership?.hmo_role || 'HMO_ADMIN').toUpperCase() as HmoRole;
      hmoRole = HMO_ROLE_PERMISSIONS[candidateRole] ? candidateRole : 'HMO_ADMIN';
      const customPerms = Array.isArray(membership?.permissions) && membership.permissions.length > 0
        ? (membership.permissions as HmoPermission[])
        : HMO_ROLE_PERMISSIONS[hmoRole];
      hmoPermissions = Array.from(new Set(['hmo.dashboard.view' as HmoPermission, ...customPerms]));
    }

    // 7. Determine portalMode & restrictionReason
    let portalMode: 'BANK' | 'HMO' | 'RESTRICTED' = 'BANK';
    let restrictionReason: string | null = null;

    if (approvalStatus !== 'ACTIVE') {
      portalMode = 'RESTRICTED';
      restrictionReason = `Institution status is ${approvalStatus}. Access to operational modules is restricted until approved.`;
    } else if (institutionType === 'HOSPITAL' || institutionType === 'UNKNOWN') {
      portalMode = 'RESTRICTED';
      restrictionReason =
        institutionType === 'HOSPITAL'
          ? 'Hospital/Facility Provider Portal access is currently in restricted preview.'
          : 'Unrecognized institution classification. Please contact Invify Governance.';
    } else if (institutionType === 'HMO') {
      if (!featureEnabled) {
        portalMode = 'RESTRICTED';
        restrictionReason = 'Health Insurance HMO Portal feature flag is currently disabled for this environment.';
      } else if (providerRow?.integration_status === 'suspended') {
        portalMode = 'RESTRICTED';
        restrictionReason = 'HMO Provider account is currently suspended by platform governance.';
      } else {
        portalMode = 'HMO';
      }
    } else {
      // BANK, AGGREGATOR, PAYMENT_PROVIDER render the existing Bank/Agent portal
      portalMode = 'BANK';
    }

    const institutionName =
      providerRow?.display_name ||
      institutionRow?.trading_name ||
      institutionRow?.legal_name ||
      agent?.institution_name ||
      agent?.bank_name ||
      `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim() ||
      rawCode ||
      'Institution';

    return {
      agentId: agent?.id || null,
      authUserId,
      email,
      institutionId: institutionRow?.id || providerRow?.institution_id || null,
      institutionCode: institutionRow?.institution_code || rawCode || (providerRow?.code ? String(providerRow.code).toUpperCase() : ''),
      institutionName,
      institutionType,
      portalMode,
      approvalStatus,
      kycStatus,
      isVerified: approvalStatus === 'ACTIVE' && kycStatus !== 'REJECTED',
      featureEnabled,
      hmoProviderId: providerRow?.id || membership?.provider_id || null,
      hmoProviderCode: providerRow?.code || (institutionType === 'HMO' ? (rawCode.toLowerCase() || 'mhmo') : null),
      hmoRole,
      hmoPermissions,
      restrictionReason,
    };
  }
}

export const institutionClassificationService = new InstitutionClassificationService();
