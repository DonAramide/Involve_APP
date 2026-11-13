import { supabaseAdmin } from '../../../db/supabase';
import { collectedPremiumMinor, outstandingPremiumMinor } from './finance-summary';

export type InstitutionLinkSource =
  | 'tenant_institution_relationships'
  | 'hw_tenant_settings'
  | 'hw_hmo_school_links'
  | 'hw_providers'
  | 'tenant_code'
  | 'agent_code';

export interface LinkedInstitution {
  id: string | null;
  code: string | null;
  name: string;
  mode: string | null;
  source: InstitutionLinkSource;
  serviceType?: string | null;
  relationshipStatus?: string | null;
}

export interface TenantInstitutionContext {
  institutions: LinkedInstitution[];
  primary: LinkedInstitution | null;
  institutionName: string;
  institutionCode: string | null;
  unresolved: boolean;
  resolution: 'resolved' | 'unlinked' | 'unavailable';
}

const HEALTH_SERVICE = 'HEALTH_INSURANCE';

export function relationMissing(error: unknown): boolean {
  const code = String((error as { code?: string } | null)?.code || '');
  const message = String((error as { message?: string } | null)?.message || '');
  return (
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    code === '42703' ||
    code === '42883' ||
    /schema cache/i.test(message) ||
    /does not exist/i.test(message) ||
    /Could not find the table/i.test(message) ||
    /Could not find the .* column/i.test(message) ||
    /could not find the function/i.test(message)
  );
}

export function pickPrimaryInstitution(links: LinkedInstitution[]): LinkedInstitution | null {
  if (!links.length) return null;
  const healthActive = links.find(
    (row) =>
      row.source === 'tenant_institution_relationships' &&
      String(row.serviceType || '').toUpperCase() === HEALTH_SERVICE &&
      String(row.relationshipStatus || '').toUpperCase() === 'ACTIVE'
  );
  if (healthActive) return healthActive;
  const registry = links.find((row) => row.source === 'tenant_institution_relationships' && row.id);
  if (registry) return registry;
  const assigned = links.find((row) => row.source === 'hw_tenant_settings' && row.id);
  if (assigned) return assigned;
  const assignedHmo = links.find((row) => row.source === 'hw_providers' && (row.id || row.code));
  if (assignedHmo) return assignedHmo;
  const schoolLink = links.find((row) => row.source === 'hw_hmo_school_links' && row.id);
  if (schoolLink) return schoolLink;
  const onboarded = links.find((row) => row.source === 'tenant_code' && (row.id || row.code));
  if (onboarded) return onboarded;
  return links[0];
}

export function rememberProviderTenant(
  map: Map<string, Set<string>>,
  providerId: string | null | undefined,
  tenantId: string | null | undefined
) {
  const provider = String(providerId || '').trim();
  const tenant = String(tenantId || '').trim();
  if (!provider || !tenant) return;
  const current = map.get(provider) || new Set<string>();
  current.add(tenant);
  map.set(provider, current);
}

export function providerTenantCounts(map: Map<string, Set<string>>): Map<string, number> {
  return new Map([...map.entries()].map(([id, tenants]) => [id, tenants.size]));
}

function rememberHmo(
  linksByTenant: Map<string, LinkedInstitution[]>,
  tenantId: string | null | undefined,
  provider: { id?: string | null; code?: string | null; display_name?: string | null } | null | undefined,
  source: InstitutionLinkSource
) {
  const name = String(provider?.display_name || '').trim();
  if (!name || !tenantId) return;
  remember(linksByTenant, tenantId, {
    id: provider?.id || null,
    code: provider?.code || null,
    name,
    mode: 'HMO',
    source
  });
}

export async function collectProviderTenantCounts(
  providers: Array<{ id: string; code?: string | null }>
): Promise<Map<string, number>> {
  const map = new Map<string, Set<string>>();
  if (!providers.length) return new Map();

  const links = await safeSelect(() =>
    supabaseAdmin.from('hw_hmo_school_links').select('provider_id, tenant_id')
  );
  for (const row of links as any[]) rememberProviderTenant(map, row.provider_id, row.tenant_id);

  const assigned = await safeSelect(() =>
    supabaseAdmin.from('hw_tenant_settings').select('assigned_provider_id, tenant_id')
  );
  for (const row of assigned as any[]) rememberProviderTenant(map, row.assigned_provider_id, row.tenant_id);

  const offers = await safeSelect(() =>
    supabaseAdmin
      .from('hw_tenant_plan_offers')
      .select('tenant_id, hw_plan_versions ( hw_plans ( provider_id ) )')
  );
  for (const row of offers as any[]) {
    const version = Array.isArray(row.hw_plan_versions) ? row.hw_plan_versions[0] : row.hw_plan_versions;
    const plan = Array.isArray(version?.hw_plans) ? version.hw_plans[0] : version?.hw_plans;
    rememberProviderTenant(map, plan?.provider_id, row.tenant_id);
  }

  const codes = [...new Set(
    providers
      .map((provider) => String(provider.code || '').trim().toLowerCase())
      .filter(Boolean)
  )];
  const codeVariants = [...new Set(codes.flatMap((code) => [code, code.toUpperCase(), code.toLowerCase()]))];
  if (codeVariants.length) {
    const byTenantCode = await safeSelect(() =>
      supabaseAdmin.from('tenants').select('id, tenant_code, agent_code').in('tenant_code', codeVariants)
    );
    const byAgentCode = await safeSelect(() =>
      supabaseAdmin.from('tenants').select('id, tenant_code, agent_code').in('agent_code', codeVariants)
    );
    const codeToProvider = new Map(
      providers.map((provider) => [String(provider.code || '').trim().toLowerCase(), provider.id])
    );
    for (const row of [...byTenantCode, ...byAgentCode] as any[]) {
      const tenantCode = String(row.tenant_code || '').trim().toLowerCase();
      const agentCode = String(row.agent_code || '').trim().toLowerCase();
      const providerId = codeToProvider.get(tenantCode) || codeToProvider.get(agentCode);
      if (providerId) rememberProviderTenant(map, providerId, row.id);
    }
  }

  return providerTenantCounts(map);
}

export function recordedInstitutionCode(
  context: TenantInstitutionContext | null | undefined,
  tenant: { tenant_code?: string | null; agent_code?: string | null } | null | undefined
): string | null {
  const linked = String(context?.institutionCode || '').trim();
  if (linked) return linked;
  const tenantCode = String(tenant?.tenant_code || '').trim();
  if (tenantCode) return tenantCode;
  const agentCode = String(tenant?.agent_code || '').trim();
  return agentCode || null;
}

export function tenantOnboardingCodes(tenant: { tenant_code?: string | null; agent_code?: string | null }): string[] {
  return [...new Set(
    [tenant?.tenant_code, tenant?.agent_code]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )];
}

export function describeInstitutions(links: LinkedInstitution[]): TenantInstitutionContext {
  const primary = pickPrimaryInstitution(links);
  if (!primary) {
    return {
      institutions: [],
      primary: null,
      institutionName: 'Not linked',
      institutionCode: null,
      unresolved: true,
      resolution: 'unlinked'
    };
  }
  const extra = Math.max(0, links.length - 1);
  return {
    institutions: links,
    primary,
    institutionName: extra ? `${primary.name} (+${extra} more)` : primary.name,
    institutionCode: primary.code,
    unresolved: false,
    resolution: 'resolved'
  };
}

function institutionLabel(row: {
  legal_name?: string | null;
  trading_name?: string | null;
  institution_code?: string | null;
}): string | null {
  const name = String(row.trading_name || row.legal_name || '').trim();
  return name || null;
}

async function safeSelect<T>(run: () => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const { data, error } = await run();
  if (error) {
    if (relationMissing(error)) return [];
    throw new Error(error.message || 'Failed to read institution context');
  }
  return data || [];
}

function remember(map: Map<string, LinkedInstitution[]>, tenantId: string, link: LinkedInstitution) {
  const key = `${link.source}:${link.id || link.code || link.name}`;
  const current = map.get(tenantId) || [];
  if (current.some((row) => `${row.source}:${row.id || row.code || row.name}` === key)) return;
  current.push(link);
  map.set(tenantId, current);
}

export async function resolveInstitutionsForTenants(
  tenants: { id: string; tenant_code?: string | null; agent_code?: string | null }[]
): Promise<Map<string, TenantInstitutionContext>> {
  const result = new Map<string, TenantInstitutionContext>();
  const linksByTenant = new Map<string, LinkedInstitution[]>();
  const tenantIds = tenants.map((row) => row.id).filter(Boolean);
  if (!tenantIds.length) return result;

  const relationships = await safeSelect(() =>
    supabaseAdmin
      .from('tenant_institution_relationships')
      .select('tenant_id, institution_id, service_type, status, institutions (id, institution_code, legal_name, trading_name, institution_type, status)')
      .in('tenant_id', tenantIds)
  );

  for (const row of relationships as any[]) {
    const inst = Array.isArray(row.institutions) ? row.institutions[0] : row.institutions;
    const name = inst ? institutionLabel(inst) : null;
    if (!name || !row.tenant_id) continue;
    remember(linksByTenant, row.tenant_id, {
      id: inst?.id || row.institution_id || null,
      code: inst?.institution_code || null,
      name,
      mode: inst?.institution_type || null,
      source: 'tenant_institution_relationships',
      serviceType: row.service_type || null,
      relationshipStatus: row.status || null
    });
  }

  const settings = await safeSelect(() =>
    supabaseAdmin
      .from('hw_tenant_settings')
      .select('tenant_id, assigned_institution_id')
      .in('tenant_id', tenantIds)
  );
  const assignedIds = settings.map((row: any) => row.assigned_institution_id).filter(Boolean);
  const assignedInstitutions = assignedIds.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('institutions')
          .select('id, institution_code, legal_name, trading_name, institution_type')
          .in('id', assignedIds)
      )
    : [];
  const assignedMap = new Map(assignedInstitutions.map((row: any) => [row.id, row]));
  for (const row of settings as any[]) {
    const inst = assignedMap.get(row.assigned_institution_id);
    const name = inst ? institutionLabel(inst) : null;
    if (!name || !row.tenant_id) continue;
    remember(linksByTenant, row.tenant_id, {
      id: inst.id,
      code: inst.institution_code || null,
      name,
      mode: inst.institution_type || null,
      source: 'hw_tenant_settings'
    });
  }

  const assignedProviderRows = await safeSelect(() =>
    supabaseAdmin
      .from('hw_tenant_settings')
      .select('tenant_id, assigned_provider_id')
      .in('tenant_id', tenantIds)
  );
  const assignedProviderIds = assignedProviderRows.map((row: any) => row.assigned_provider_id).filter(Boolean);
  const assignedProviders = assignedProviderIds.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('hw_providers')
          .select('id, code, display_name')
          .in('id', assignedProviderIds)
      )
    : [];
  const assignedProviderMap = new Map(assignedProviders.map((row: any) => [row.id, row]));
  for (const row of assignedProviderRows as any[]) {
    rememberHmo(linksByTenant, row.tenant_id, assignedProviderMap.get(row.assigned_provider_id), 'hw_providers');
  }

  const schoolLinks = await safeSelect(() =>
    supabaseAdmin
      .from('hw_hmo_school_links')
      .select('tenant_id, institution_id, provider_id')
      .in('tenant_id', tenantIds)
  );
  const linkInstIds = schoolLinks.map((row: any) => row.institution_id).filter(Boolean);
  const linkInstitutions = linkInstIds.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('institutions')
          .select('id, institution_code, legal_name, trading_name, institution_type')
          .in('id', linkInstIds)
      )
    : [];
  const linkInstMap = new Map(linkInstitutions.map((row: any) => [row.id, row]));
  const linkProviderIds = schoolLinks.map((row: any) => row.provider_id).filter(Boolean);
  const linkProviders = linkProviderIds.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('hw_providers')
          .select('id, code, display_name')
          .in('id', linkProviderIds)
      )
    : [];
  const linkProviderMap = new Map(linkProviders.map((row: any) => [row.id, row]));
  for (const row of schoolLinks as any[]) {
    const inst = linkInstMap.get(row.institution_id);
    const name = inst ? institutionLabel(inst) : null;
    if (name && row.tenant_id) {
      remember(linksByTenant, row.tenant_id, {
        id: inst.id,
        code: inst.institution_code || null,
        name,
        mode: inst.institution_type || null,
        source: 'hw_hmo_school_links'
      });
    }
    rememberHmo(linksByTenant, row.tenant_id, linkProviderMap.get(row.provider_id), 'hw_providers');
  }

  const onboardingCodes = [...new Set(tenants.flatMap((row) => tenantOnboardingCodes(row)))];
  const onboardingVariants = [...new Set(onboardingCodes.flatMap((code) => [code, code.toUpperCase(), code.toLowerCase()]))];
  const codeInstitutions = onboardingVariants.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('institutions')
          .select('id, institution_code, legal_name, trading_name, institution_type')
          .in('institution_code', onboardingVariants)
      )
    : [];
  const codeProviders = onboardingVariants.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('hw_providers')
          .select('id, code, display_name')
          .in('code', onboardingVariants.map((code) => code.toLowerCase()))
      )
    : [];
  for (const tenant of tenants) {
    const wanted = tenantOnboardingCodes(tenant).map((code) => code.toUpperCase());
    if (!wanted.length) continue;
    const inst = (codeInstitutions as any[]).find((row) =>
      wanted.includes(String(row.institution_code || '').toUpperCase())
    );
    if (inst) {
      const name = institutionLabel(inst) || String(inst.institution_code || '').trim();
      if (name && tenant.id) {
        remember(linksByTenant, tenant.id, {
          id: inst.id || null,
          code: inst.institution_code || wanted[0],
          name,
          mode: inst.institution_type || null,
          source: 'tenant_code'
        });
      }
    }
    const provider = (codeProviders as any[]).find((row) =>
      wanted.includes(String(row.code || '').toUpperCase())
    );
    rememberHmo(linksByTenant, tenant.id, provider, 'hw_providers');
  }

  const planOffers = await safeSelect(() =>
    supabaseAdmin
      .from('hw_tenant_plan_offers')
      .select('tenant_id, hw_plan_versions ( hw_plans ( hw_providers ( id, code, display_name ) ) )')
      .in('tenant_id', tenantIds)
  );
  for (const row of planOffers as any[]) {
    const version = Array.isArray(row.hw_plan_versions) ? row.hw_plan_versions[0] : row.hw_plan_versions;
    const plan = Array.isArray(version?.hw_plans) ? version.hw_plans[0] : version?.hw_plans;
    const provider = Array.isArray(plan?.hw_providers) ? plan.hw_providers[0] : plan?.hw_providers;
    rememberHmo(linksByTenant, row.tenant_id, provider, 'hw_providers');
  }

  const agentCodes = [...new Set(tenants.map((row) => String(row.agent_code || '').trim()).filter(Boolean))];
  const agents = agentCodes.length
    ? await safeSelect(() =>
        supabaseAdmin
          .from('agents')
          .select('id, agent_code, name, institution_name, institution_type')
          .in('agent_code', agentCodes)
      )
    : [];
  const agentByCode = new Map(agents.map((row: any) => [String(row.agent_code || '').toUpperCase(), row]));
  for (const tenant of tenants) {
    const code = String(tenant.agent_code || '').trim();
    if (!code) continue;
    const agent = agentByCode.get(code.toUpperCase());
    const name = String(agent?.institution_name || agent?.name || '').trim();
    if (!name) continue;
    remember(linksByTenant, tenant.id, {
      id: agent?.id || null,
      code: agent?.agent_code || code,
      name,
      mode: agent?.institution_type || null,
      source: 'agent_code'
    });
  }

  for (const tenant of tenants) {
    result.set(tenant.id, describeInstitutions(linksByTenant.get(tenant.id) || []));
  }
  return result;
}

export function claimStatusBucket(status: string): 'pending' | 'approved' | 'rejected' | 'settled' | 'other' {
  const value = String(status || '').toLowerCase();
  if (['submitted', 'pending', 'under_review', 'draft'].includes(value)) return 'pending';
  if (['approved', 'partially_approved'].includes(value)) return 'approved';
  if (['rejected', 'denied'].includes(value)) return 'rejected';
  if (['settled', 'paid', 'reconciled'].includes(value)) return 'settled';
  return 'other';
}

export function summariseClaims(rows: { status?: string; authorised_amount_minor?: unknown; record_type?: string }[] | null) {
  const counts = { submitted: 0, pending: 0, approved: 0, rejected: 0, settled: 0, other: 0 };
  for (const row of rows || []) {
    counts.submitted += 1;
    const bucket = claimStatusBucket(String(row.status || ''));
    if (bucket === 'other') counts.other += 1;
    else counts[bucket] += 1;
  }
  return {
    submitted: counts.submitted,
    pending: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
    settled: counts.settled,
    paid: null as number | null,
    authorisedAmountRecorded: (rows || []).length ? true : false,
    note: 'authorised_amount_minor is not a payout. Claims paid stays unavailable until a claim payment ledger exists.'
  };
}

export function premiumSnapshot(invoices: any[] | null, payments: any[] | null) {
  let billed: number | null = 0;
  for (const row of invoices || []) {
    if (['draft', 'void'].includes(String(row?.status || ''))) continue;
    const due = Number.isInteger(row?.amount_due_minor) ? row.amount_due_minor : null;
    if (due === null) {
      billed = null;
      break;
    }
    billed += due;
  }
  if (!(invoices || []).length) billed = 0;
  return {
    currency: 'NGN',
    billedMinor: billed,
    collectedMinor: collectedPremiumMinor(payments),
    outstandingMinor: outstandingPremiumMinor(invoices),
    recognisedRevenueMinor: null,
    profitMinor: null,
    note: 'Collections are not labelled revenue. Profit is unavailable because health has no P&L posting for premiums or claims.'
  };
}

export function foldPremiums(rows: Array<ReturnType<typeof premiumSnapshot> | null>) {
  if (rows.some((row) => row == null)) return null;
  const billed = (rows as ReturnType<typeof premiumSnapshot>[]).reduce((sum, row) => {
    if (sum === null || row.billedMinor === null) return null;
    return sum + row.billedMinor;
  }, 0 as number | null);
  const collected = (rows as ReturnType<typeof premiumSnapshot>[]).reduce((sum, row) => {
    if (sum === null || row.collectedMinor === null) return null;
    return sum + row.collectedMinor;
  }, 0 as number | null);
  const outstanding = (rows as ReturnType<typeof premiumSnapshot>[]).reduce((sum, row) => {
    if (sum === null || row.outstandingMinor === null) return null;
    return sum + row.outstandingMinor;
  }, 0 as number | null);
  return {
    currency: 'NGN',
    billedMinor: billed,
    collectedMinor: collected,
    outstandingMinor: outstanding,
    recognisedRevenueMinor: null,
    profitMinor: null,
    note: 'Collections are not labelled revenue. Profit is unavailable because health has no P&L posting for premiums or claims.'
  };
}

export function foldClaims(rows: Array<ReturnType<typeof summariseClaims> | null>) {
  if (rows.some((row) => row == null)) return null;
  const start = { submitted: 0, pending: 0, approved: 0, rejected: 0, settled: 0 };
  for (const row of rows as ReturnType<typeof summariseClaims>[]) {
    start.submitted += row.submitted;
    start.pending += row.pending;
    start.approved += row.approved;
    start.rejected += row.rejected;
    start.settled += row.settled;
  }
  return {
    ...start,
    paid: null as number | null,
    note: 'authorised_amount_minor is not a payout. Claims paid stays unavailable until a claim payment ledger exists.'
  };
}

export function memberDisplayName(member: any): string {
  const student = Array.isArray(member?.students) ? member.students[0] : member?.students;
  const studentName = [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim();
  if (studentName) return studentName;
  const staff = Array.isArray(member?.hw_staff_profiles) ? member.hw_staff_profiles[0] : member?.hw_staff_profiles;
  const staffRow = Array.isArray(staff?.tenant_staff) ? staff.tenant_staff[0] : staff?.tenant_staff;
  const staffName = String(staffRow?.name || '').trim();
  if (staffName) return staffName;
  const dependant = Array.isArray(member?.hw_dependants) ? member.hw_dependants[0] : member?.hw_dependants;
  if (String(dependant?.full_name || '').trim()) return String(dependant.full_name).trim();
  return 'Name not recorded';
}
