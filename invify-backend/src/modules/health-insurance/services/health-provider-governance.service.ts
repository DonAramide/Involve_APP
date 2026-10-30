/**
 * Platform Super Admin HMO provider registration and lifecycle.
 * Reuses public.hw_providers — does not introduce a second provider table.
 *
 * Lifecycle (DB integration_status ↔ governance label):
 *   none                 → DRAFT
 *   pending_verification → PENDING_APPROVAL
 *   verified             → ACTIVE
 *   rejected             → REJECTED   (requires DO_NOT_APPLY_hw_provider_governance.sql)
 *   suspended            → SUSPENDED
 *   sandbox              → SANDBOX (integration mode; not a registration destination)
 */
import { supabaseAdmin } from '../../../db/supabase';
import { validateImageBase64 } from '../../../utils/image-validator';
import { uploadBase64ToContabo } from '../../agent-portal/utils/kyc-storage';
import { HealthAuditService } from './health-audit.service';
import { HealthContext } from '../types';
import { collectProviderTenantCounts, relationMissing } from './health-institution-context';

const PLATFORM_AUDIT_TENANT = '00000000-0000-0000-0000-000000000000';
const CODE_RE = /^[a-z0-9_]{2,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PROVIDER_GOVERNANCE_STATUSES = [
  'none',
  'sandbox',
  'pending_verification',
  'verified',
  'suspended',
  'rejected'
] as const;

export type ProviderGovernanceStatus = (typeof PROVIDER_GOVERNANCE_STATUSES)[number];

/** Only verified HMO organisations are eligible for new tenant assignments / offerings. */
export const ASSIGNABLE_PROVIDER_STATUSES: ReadonlySet<string> = new Set(['verified']);

const PROVIDER_DETAIL_SELECT = [
  'id',
  'code',
  'display_name',
  'legal_name',
  'licence_reference',
  'regulator_type',
  'licence_expiry',
  'integration_status',
  'adapter_key',
  'capabilities',
  'contact_email',
  'contact_phone',
  'support_email',
  'claims_email',
  'head_office_address',
  'state',
  'lga',
  'website_url',
  'logo_url',
  'description',
  'contact_person_name',
  'contact_person_email',
  'contact_person_phone',
  'status_reason',
  'status_changed_at',
  'status_changed_by',
  'institution_id',
  'last_verified_at',
  'created_at',
  'updated_at'
].join(', ');

function httpError(message: string, status = 400, code?: string): Error {
  const err: any = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function trimOrNull(value: unknown, max = 500): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function requireText(value: unknown, label: string, max = 200): string {
  const text = trimOrNull(value, max);
  if (!text) throw httpError(`${label} is required.`);
  return text;
}

function optionalEmail(value: unknown, label: string): string | null {
  const text = trimOrNull(value, 254);
  if (!text) return null;
  if (!EMAIL_RE.test(text)) throw httpError(`${label} must be a valid email address.`);
  return text.toLowerCase();
}

function slugifyCode(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function governanceLabel(status: string | null | undefined): string {
  switch (status) {
    case 'none':
      return 'DRAFT';
    case 'pending_verification':
      return 'PENDING_APPROVAL';
    case 'verified':
      return 'ACTIVE';
    case 'rejected':
      return 'REJECTED';
    case 'suspended':
      return 'SUSPENDED';
    case 'sandbox':
      return 'SANDBOX';
    default:
      return String(status || 'UNKNOWN').toUpperCase();
  }
}

function reasonRequired(reason: unknown, action: string): string {
  const text = trimOrNull(reason, 1000);
  if (!text || text.length < 5) {
    throw httpError(`${action} requires a recorded reason (at least 5 characters).`);
  }
  return text;
}

async function auditProvider(
  ctx: HealthContext,
  action: string,
  providerId: string,
  changes: Record<string, unknown>
) {
  await HealthAuditService.recordEvent({
    tenantId: PLATFORM_AUDIT_TENANT,
    actorUserId: ctx.userId,
    actorRole: 'platform_admin',
    action,
    resourceType: 'hw_providers',
    resourceId: providerId,
    changes: { ...changes, reason: ctx.platformReason },
    viaPlatformAccess: true,
    platformReason: ctx.platformReason
  });
}

export class HealthProviderGovernanceService {
  static governanceLabel = governanceLabel;
  static isAssignable(status: string | null | undefined): boolean {
    return ASSIGNABLE_PROVIDER_STATUSES.has(String(status || ''));
  }

  static async getProviderStatistics() {
    const { data: providers, error } = await supabaseAdmin
      .from('hw_providers')
      .select('id, integration_status');
    if (error) throw httpError(`Failed to load provider statistics: ${error.message}`, 500);

    const rows = providers || [];
    const byStatus: Record<string, number> = {};
    for (const status of PROVIDER_GOVERNANCE_STATUSES) byStatus[status] = 0;
    for (const row of rows) {
      const key = String(row.integration_status || 'none');
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    const { count: planCount, error: planError } = await supabaseAdmin
      .from('hw_plans')
      .select('id', { count: 'exact', head: true });
    if (planError) throw httpError(`Failed to count plans: ${planError.message}`, 500);

    const { count: offeringCount, error: offeringError } = await supabaseAdmin
      .from('hw_invify_offerings')
      .select('id', { count: 'exact', head: true });
    // Catalogue table may be absent until catalogue migration is applied.
    const offerings = offeringError && relationMissing(offeringError) ? null : (offeringCount ?? 0);
    if (offeringError && !relationMissing(offeringError)) {
      throw httpError(`Failed to count catalogue offerings: ${offeringError.message}`, 500);
    }

    const tenantCounts = await collectProviderTenantCounts(rows.map((p) => ({ id: p.id })));
    let linkedInstitutions = 0;
    for (const count of tenantCounts.values()) linkedInstitutions += count;

    const { count: institutionLinks, error: instError } = await supabaseAdmin
      .from('hw_providers')
      .select('id', { count: 'exact', head: true })
      .not('institution_id', 'is', null);
    if (instError && !relationMissing(instError)) {
      throw httpError(`Failed to count linked institutions: ${instError.message}`, 500);
    }

    return {
      totalRegistered: rows.length,
      active: byStatus.verified || 0,
      pendingApproval: byStatus.pending_verification || 0,
      draft: byStatus.none || 0,
      suspended: byStatus.suspended || 0,
      rejected: byStatus.rejected || 0,
      sandbox: byStatus.sandbox || 0,
      linkedTenantAssignments: linkedInstitutions,
      providersWithInstitutionLink: institutionLinks ?? 0,
      totalPlans: planCount ?? 0,
      totalCatalogueOfferings: offerings,
      byStatus,
      lifecycleLabels: {
        none: 'DRAFT',
        pending_verification: 'PENDING_APPROVAL',
        verified: 'ACTIVE',
        rejected: 'REJECTED',
        suspended: 'SUSPENDED',
        sandbox: 'SANDBOX'
      }
    };
  }

  static async listProviders(query: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const offset = Math.max(Number(query.offset) || 0, 0);
    const search = String(query.search || '')
      .trim()
      .replace(/[%_\\]/g, '')
      .slice(0, 64);
    const status = String(query.status || '').trim();
    if (status && !PROVIDER_GOVERNANCE_STATUSES.includes(status as ProviderGovernanceStatus)) {
      throw httpError('status is not a recognised provider filter.');
    }

    let q: any = supabaseAdmin
      .from('hw_providers')
      .select(PROVIDER_DETAIL_SELECT, { count: 'exact' })
      .order('display_name', { ascending: true });

    if (status) q = q.eq('integration_status', status);
    if (search) {
      q = q.or(
        `display_name.ilike.%${search}%,code.ilike.%${search}%,legal_name.ilike.%${search}%,licence_reference.ilike.%${search}%`
      );
    }

    const { data, error, count } = await q.range(offset, offset + limit - 1);
    if (error) throw httpError(`Failed to list providers: ${error.message}`, 500);

    const providers: any[] = data || [];
    const tenantCounts = await collectProviderTenantCounts(providers.map((p) => ({ id: p.id, code: p.code })));
    return {
      providers: providers.map((p) => ({
        ...p,
        governance_status: governanceLabel(p.integration_status),
        assignable: this.isAssignable(p.integration_status),
        tenant_count: tenantCounts.get(p.id) || 0
      })),
      total: typeof count === 'number' ? count : providers.length,
      limit,
      offset
    };
  }

  static async getProviderDetail(providerId: string) {
    if (!UUID_RE.test(String(providerId || ''))) throw httpError('providerId must be a UUID.');

    const { data: providerRaw, error } = await supabaseAdmin
      .from('hw_providers')
      .select(PROVIDER_DETAIL_SELECT)
      .eq('id', providerId)
      .maybeSingle();
    if (error) throw httpError(`Failed to load provider: ${error.message}`, 500);
    const provider: any = providerRaw;
    if (!provider) throw httpError('HMO provider was not found.', 404);

    const [{ data: plans }, { data: facilities }, tenantCounts, bankOfferings, auditEvents] =
      await Promise.all([
        supabaseAdmin
          .from('hw_plans')
          .select('id, code, name, status, created_at, updated_at')
          .eq('provider_id', providerId)
          .order('name'),
        supabaseAdmin
          .from('hw_facilities')
          .select('id, name, state, lga, is_active, services, last_verified_at')
          .eq('provider_id', providerId)
          .order('name')
          .limit(100),
        collectProviderTenantCounts([{ id: providerId }]),
        this.listBankRelationships(providerId),
        this.listProviderAudit(providerId, { limit: 50, offset: 0 })
      ]);

    const { data: links } = await supabaseAdmin
      .from('hw_hmo_school_links')
      .select('id, tenant_id, institution_id, onboarding_status, tenant_type, updated_at')
      .eq('provider_id', providerId)
      .order('updated_at', { ascending: false })
      .limit(100);

    const { data: settings } = await supabaseAdmin
      .from('hw_tenant_settings')
      .select('tenant_id, assigned_provider_id, assignment_source, assigned_at')
      .eq('assigned_provider_id', providerId)
      .limit(100);

    return {
      provider: {
        ...provider,
        governance_status: governanceLabel(provider.integration_status),
        assignable: this.isAssignable(provider.integration_status),
        tenant_count: tenantCounts.get(providerId) || 0
      },
      plans: plans || [],
      facilities: facilities || [],
      schoolLinks: links || [],
      tenantAssignments: settings || [],
      bankRelationships: bankOfferings,
      audit: auditEvents,
      sections: {
        overview: true,
        organisation: true,
        contact: true,
        documents: Boolean(provider.licence_reference || provider.logo_url),
        plans: true,
        linkedInstitutions: true,
        bankRelationships: bankOfferings.supported,
        activity: true
      },
      dependencies: {
        rejectedStatusRequiresMigration:
          'Writing integration_status=rejected requires proposals/DO_NOT_APPLY_hw_provider_governance.sql',
        profileColumnsOptional:
          'description and contact_person_* columns are added by the same unapplied migration; older DBs ignore unknown fields on write failure fallback'
      }
    };
  }

  private static async listBankRelationships(providerId: string) {
    // hw_bank_hmo_offerings keys by agent_id + plan_version_id; provider is via the plan.
    const { data, error } = await supabaseAdmin
      .from('hw_bank_hmo_offerings')
      .select(
        'id, agent_id, plan_version_id, is_active, reason, created_at, updated_at, hw_plan_versions!inner(id, hw_plans!inner(id, provider_id))'
      )
      .eq('hw_plan_versions.hw_plans.provider_id', providerId)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) {
      if (relationMissing(error)) {
        return { supported: false, rows: [], note: 'hw_bank_hmo_offerings is not present in this environment.' };
      }
      return { supported: false, rows: [], note: error.message };
    }
    return {
      supported: true,
      rows: (data || []).map((row: any) => ({
        id: row.id,
        agent_id: row.agent_id,
        plan_version_id: row.plan_version_id,
        is_active: row.is_active,
        reason: row.reason,
        created_at: row.created_at,
        updated_at: row.updated_at
      })),
      note: null
    };
  }

  static async listProviderAudit(
    providerId: string,
    query: { limit?: number; offset?: number } = {}
  ) {
    if (!UUID_RE.test(String(providerId || ''))) throw httpError('providerId must be a UUID.');
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const { data, error, count } = await supabaseAdmin
      .from('hw_audit_events')
      .select(
        'id, action, actor_user_id, actor_role, changes, platform_reason, via_platform_access, occurred_at',
        { count: 'exact' }
      )
      .eq('resource_type', 'hw_providers')
      .eq('resource_id', providerId)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw httpError(`Failed to load provider audit history: ${error.message}`, 500);
    return {
      events: data || [],
      total: typeof count === 'number' ? count : (data || []).length,
      limit,
      offset
    };
  }

  static async registerProvider(ctx: HealthContext, body: any) {
    const displayName = requireText(body.displayName || body.display_name, 'Display name', 200);
    const legalName = trimOrNull(body.legalName || body.legal_name, 200) || displayName;
    let code = trimOrNull(body.code, 40);
    if (code) {
      code = code.toLowerCase();
      if (!CODE_RE.test(code)) {
        throw httpError('Provider code must be 2–40 chars of lowercase letters, digits, or underscore.');
      }
    } else {
      code = slugifyCode(displayName);
      if (!CODE_RE.test(code)) {
        code = `hmo_${Date.now().toString(36).slice(-8)}`;
      }
    }

    const licenceReference = trimOrNull(body.licenceReference || body.licence_reference || body.registrationNumber, 120);
    const regulatorType = trimOrNull(body.regulatorType || body.regulator_type, 40) || 'NHIA';
    if (!['NHIA', 'NAICOM', 'STATE_HMO', 'OTHER'].includes(regulatorType)) {
      throw httpError('regulatorType must be NHIA, NAICOM, STATE_HMO, or OTHER.');
    }

    await this.assertUniqueIdentity(code, licenceReference, null);

    let logoUrl = trimOrNull(body.logoUrl || body.logo_url, 2000);
    if (body.logoImage && typeof body.logoImage === 'string' && body.logoImage.startsWith('data:image')) {
      validateImageBase64(body.logoImage, { maxSizeBytes: 3 * 1024 * 1024 });
      logoUrl = await uploadBase64ToContabo(body.logoImage, 'hmo-provider-logos', `reg_${code}`);
    }

    const contactEmail = optionalEmail(body.contactEmail || body.contact_email || body.officialEmail, 'Official email');
    const contactPersonEmail = optionalEmail(
      body.contactPersonEmail || body.contact_person_email,
      'Contact person email'
    );

    // New registrations never auto-activate.
    const payload: Record<string, unknown> = {
      code,
      display_name: displayName,
      legal_name: legalName,
      licence_reference: licenceReference,
      regulator_type: regulatorType,
      licence_expiry: trimOrNull(body.licenceExpiry || body.licence_expiry, 32),
      integration_status: 'pending_verification',
      contact_email: contactEmail,
      contact_phone: trimOrNull(body.contactPhone || body.contact_phone || body.phone, 40),
      support_email: optionalEmail(body.supportEmail || body.support_email, 'Support email'),
      claims_email: optionalEmail(body.claimsEmail || body.claims_email, 'Claims email'),
      head_office_address: trimOrNull(
        body.headOfficeAddress || body.head_office_address || body.registeredAddress || body.address,
        500
      ),
      state: trimOrNull(body.state, 80),
      lga: trimOrNull(body.lga, 80),
      website_url: trimOrNull(body.websiteUrl || body.website_url || body.website, 300),
      logo_url: logoUrl,
      description: trimOrNull(body.description, 2000),
      contact_person_name: trimOrNull(body.contactPersonName || body.contact_person_name || body.contactPerson, 120),
      contact_person_email: contactPersonEmail,
      contact_person_phone: trimOrNull(body.contactPersonPhone || body.contact_person_phone, 40),
      status_reason: null,
      status_changed_at: new Date().toISOString(),
      status_changed_by: ctx.userId || null,
      capabilities: {
        ...(typeof body.capabilities === 'object' && body.capabilities ? body.capabilities : {}),
        registered_by_platform: true,
        registration_note: trimOrNull(body.registrationNote, 500)
      }
    };

    const insertResult: any = await supabaseAdmin
      .from('hw_providers')
      .insert(payload)
      .select(PROVIDER_DETAIL_SELECT)
      .maybeSingle();
    let data: any = insertResult.data;
    let error = insertResult.error;

    if (error) {
      // Older DBs without governance columns: retry without optional fields.
      if (/column|does not exist|rejected/i.test(error.message)) {
        const fallback = { ...payload };
        delete fallback.description;
        delete fallback.contact_person_name;
        delete fallback.contact_person_email;
        delete fallback.contact_person_phone;
        delete fallback.status_reason;
        delete fallback.status_changed_at;
        delete fallback.status_changed_by;
        const retry: any = await supabaseAdmin
          .from('hw_providers')
          .insert(fallback)
          .select('id, code, display_name, legal_name, licence_reference, integration_status, contact_email, contact_phone, website_url, logo_url, created_at')
          .maybeSingle();
        if (retry.error) throw httpError(`Failed to register provider: ${retry.error.message}`, 400);
        data = retry.data;
        error = null;
      } else if (/duplicate|unique/i.test(error.message)) {
        throw httpError('A provider with this code or licence reference already exists.', 409, 'PROVIDER_DUPLICATE');
      } else {
        throw httpError(`Failed to register provider: ${error.message}`, 400);
      }
    }

    await auditProvider(ctx, 'provider.registered', data.id, {
      code: data.code,
      displayName: data.display_name,
      status: data.integration_status,
      licenceReference: data.licence_reference
    });

    try {
      const { HealthNotificationService } = await import('./health-notification.service');
      await HealthNotificationService.notifyPlatformActor(
        ctx.userId,
        'provider.registered',
        'HMO provider registered',
        `${data.display_name} was registered and is pending approval.`,
        { providerId: data.id, code: data.code }
      );
    } catch {
      /* soft-fail */
    }

    return {
      ...data,
      governance_status: governanceLabel(data.integration_status),
      assignable: false
    };
  }

  static async updateProvider(ctx: HealthContext, providerId: string, body: any) {
    if (!UUID_RE.test(String(providerId || ''))) throw httpError('providerId must be a UUID.');
    const existing: any = await this.requireProvider(providerId);

    const licenceReference =
      body.licenceReference !== undefined || body.licence_reference !== undefined
        ? trimOrNull(body.licenceReference ?? body.licence_reference, 120)
        : existing.licence_reference;

    if (licenceReference && licenceReference !== existing.licence_reference) {
      await this.assertUniqueIdentity(null, licenceReference, providerId);
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const map: Array<[string, unknown]> = [
      ['display_name', body.displayName ?? body.display_name],
      ['legal_name', body.legalName ?? body.legal_name],
      ['licence_reference', body.licenceReference ?? body.licence_reference],
      ['regulator_type', body.regulatorType ?? body.regulator_type],
      ['licence_expiry', body.licenceExpiry ?? body.licence_expiry],
      ['contact_email', body.contactEmail ?? body.contact_email ?? body.officialEmail],
      ['contact_phone', body.contactPhone ?? body.contact_phone ?? body.phone],
      ['support_email', body.supportEmail ?? body.support_email],
      ['claims_email', body.claimsEmail ?? body.claims_email],
      ['head_office_address', body.headOfficeAddress ?? body.head_office_address ?? body.registeredAddress],
      ['state', body.state],
      ['lga', body.lga],
      ['website_url', body.websiteUrl ?? body.website_url ?? body.website],
      ['description', body.description],
      ['contact_person_name', body.contactPersonName ?? body.contact_person_name ?? body.contactPerson],
      ['contact_person_email', body.contactPersonEmail ?? body.contact_person_email],
      ['contact_person_phone', body.contactPersonPhone ?? body.contact_person_phone]
    ];

    for (const [column, raw] of map) {
      if (raw === undefined) continue;
      if (column.endsWith('_email')) {
        updates[column] = optionalEmail(raw, column);
      } else if (column === 'regulator_type' && raw !== null && raw !== '') {
        const reg = String(raw).trim();
        if (!['NHIA', 'NAICOM', 'STATE_HMO', 'OTHER'].includes(reg)) {
          throw httpError('regulatorType must be NHIA, NAICOM, STATE_HMO, or OTHER.');
        }
        updates[column] = reg;
      } else {
        updates[column] = trimOrNull(raw, column === 'description' || column === 'head_office_address' ? 2000 : 300);
      }
    }

    if (body.logoImage && typeof body.logoImage === 'string' && body.logoImage.startsWith('data:image')) {
      validateImageBase64(body.logoImage, { maxSizeBytes: 3 * 1024 * 1024 });
      updates.logo_url = await uploadBase64ToContabo(
        body.logoImage,
        'hmo-provider-logos',
        `upd_${existing.code}`
      );
    } else if (body.logoUrl !== undefined || body.logo_url !== undefined) {
      updates.logo_url = trimOrNull(body.logoUrl ?? body.logo_url, 2000);
    }

    // Status changes must use dedicated lifecycle endpoints.
    if (body.integration_status !== undefined || body.integrationStatus !== undefined || body.status !== undefined) {
      throw httpError('Use the approve, reject, suspend, or reactivate endpoints to change provider status.');
    }

    const updateResult: any = await supabaseAdmin
      .from('hw_providers')
      .update(updates)
      .eq('id', providerId)
      .select(PROVIDER_DETAIL_SELECT)
      .maybeSingle();
    let data: any = updateResult.data;
    let error = updateResult.error;

    if (error) {
      if (/column|does not exist/i.test(error.message)) {
        const slim = { ...updates };
        delete slim.description;
        delete slim.contact_person_name;
        delete slim.contact_person_email;
        delete slim.contact_person_phone;
        const retry: any = await supabaseAdmin
          .from('hw_providers')
          .update(slim)
          .eq('id', providerId)
          .select('id, code, display_name, legal_name, licence_reference, integration_status, contact_email, contact_phone, website_url, logo_url, updated_at')
          .maybeSingle();
        if (retry.error) throw httpError(`Failed to update provider: ${retry.error.message}`, 400);
        data = retry.data;
        error = null;
      } else {
        throw httpError(`Failed to update provider: ${error.message}`, 400);
      }
    }

    await auditProvider(ctx, 'provider.updated', providerId, {
      fields: Object.keys(updates).filter((k) => k !== 'updated_at')
    });

    return {
      ...data,
      governance_status: governanceLabel(data.integration_status),
      assignable: this.isAssignable(data.integration_status)
    };
  }

  static async approveProvider(ctx: HealthContext, providerId: string) {
    const existing: any = await this.requireProvider(providerId);
    if (existing.integration_status === 'verified') {
      return {
        ...existing,
        governance_status: 'ACTIVE',
        assignable: true,
        alreadyActive: true
      };
    }
    if (!['pending_verification', 'none', 'rejected'].includes(String(existing.integration_status))) {
      throw httpError(
        `Cannot approve a provider in status ${governanceLabel(existing.integration_status)}.`,
        409,
        'INVALID_TRANSITION'
      );
    }
    return this.transition(ctx, existing, 'verified', 'provider.approved', null, {
      last_verified_at: new Date().toISOString()
    });
  }

  static async rejectProvider(ctx: HealthContext, providerId: string, body: any) {
    const existing: any = await this.requireProvider(providerId);
    const reason = reasonRequired(body?.reason || body?.statusReason, 'Rejection');
    if (!['pending_verification', 'none'].includes(String(existing.integration_status))) {
      throw httpError(
        `Cannot reject a provider in status ${governanceLabel(existing.integration_status)}.`,
        409,
        'INVALID_TRANSITION'
      );
    }
    try {
      return await this.transition(ctx, existing, 'rejected', 'provider.rejected', reason);
    } catch (err: any) {
      if (/rejected|check|constraint/i.test(String(err?.message || ''))) {
        throw httpError(
          'Rejection requires the unapplied governance migration that adds integration_status=rejected. The provider was not changed.',
          503,
          'PROVIDER_REJECTED_STATUS_UNAVAILABLE'
        );
      }
      throw err;
    }
  }

  static async suspendProvider(ctx: HealthContext, providerId: string, body: any) {
    const existing: any = await this.requireProvider(providerId);
    const reason = reasonRequired(body?.reason || body?.statusReason, 'Suspension');
    if (!['verified', 'sandbox', 'pending_verification'].includes(String(existing.integration_status))) {
      throw httpError(
        `Cannot suspend a provider in status ${governanceLabel(existing.integration_status)}.`,
        409,
        'INVALID_TRANSITION'
      );
    }
    return this.transition(ctx, existing, 'suspended', 'provider.suspended', reason);
  }

  static async reactivateProvider(ctx: HealthContext, providerId: string, body: any = {}) {
    const existing: any = await this.requireProvider(providerId);
    if (existing.integration_status !== 'suspended') {
      throw httpError(
        `Only suspended providers can be reactivated (current: ${governanceLabel(existing.integration_status)}).`,
        409,
        'INVALID_TRANSITION'
      );
    }
    const note = trimOrNull(body?.reason || body?.statusReason, 1000);
    return this.transition(ctx, existing, 'verified', 'provider.reactivated', note, {
      last_verified_at: new Date().toISOString()
    });
  }

  private static async transition(
    ctx: HealthContext,
    existing: any,
    nextStatus: ProviderGovernanceStatus,
    action: string,
    statusReason: string | null,
    extra: Record<string, unknown> = {}
  ) {
    const updates: Record<string, unknown> = {
      integration_status: nextStatus,
      status_reason: statusReason,
      status_changed_at: new Date().toISOString(),
      status_changed_by: ctx.userId || null,
      updated_at: new Date().toISOString(),
      ...extra
    };

    let transitionResult: any = await supabaseAdmin
      .from('hw_providers')
      .update(updates)
      .eq('id', existing.id)
      .select(PROVIDER_DETAIL_SELECT)
      .maybeSingle();
    let data: any = transitionResult.data;
    let error = transitionResult.error;

    if (error && /column|does not exist/i.test(error.message)) {
      const slim = {
        integration_status: nextStatus,
        updated_at: updates.updated_at,
        ...extra
      };
      const retry: any = await supabaseAdmin
        .from('hw_providers')
        .update(slim)
        .eq('id', existing.id)
        .select('id, code, display_name, integration_status, licence_reference, last_verified_at, updated_at')
        .maybeSingle();
      error = retry.error;
      data = retry.data;
    }

    if (error) throw httpError(`Failed to change provider status: ${error.message}`, 400);

    await auditProvider(ctx, action, existing.id, {
      from: existing.integration_status,
      to: nextStatus,
      statusReason,
      code: existing.code,
      displayName: existing.display_name
    });

    try {
      const { HealthNotificationService } = await import('./health-notification.service');
      const kind =
        action === 'provider.approved'
          ? 'provider.approved'
          : action === 'provider.rejected'
            ? 'provider.rejected'
            : action === 'provider.suspended'
              ? 'provider.suspended'
              : action === 'provider.reactivated'
                ? 'provider.reactivated'
                : 'admin.action';
      await HealthNotificationService.notifyPlatformActor(
        ctx.userId,
        kind as any,
        `HMO provider ${governanceLabel(nextStatus)}`,
        `${existing.display_name} is now ${governanceLabel(nextStatus)}.`,
        { providerId: existing.id, code: existing.code, status: nextStatus }
      );
    } catch {
      /* soft-fail */
    }

    return {
      ...data,
      governance_status: governanceLabel(data.integration_status),
      assignable: this.isAssignable(data.integration_status)
    };
  }

  private static async requireProvider(providerId: string): Promise<any> {
    if (!UUID_RE.test(String(providerId || ''))) throw httpError('providerId must be a UUID.');
    const primary: any = await supabaseAdmin
      .from('hw_providers')
      .select(PROVIDER_DETAIL_SELECT)
      .eq('id', providerId)
      .maybeSingle();
    if (primary.error && /column|does not exist/i.test(primary.error.message)) {
      const fallback: any = await supabaseAdmin
        .from('hw_providers')
        .select(
          'id, code, display_name, legal_name, licence_reference, integration_status, contact_email, contact_phone, website_url, logo_url, institution_id, created_at, updated_at'
        )
        .eq('id', providerId)
        .maybeSingle();
      if (fallback.error) throw httpError(`Failed to load provider: ${fallback.error.message}`, 500);
      if (!fallback.data) throw httpError('HMO provider was not found.', 404);
      return fallback.data;
    }
    if (primary.error) throw httpError(`Failed to load provider: ${primary.error.message}`, 500);
    if (!primary.data) throw httpError('HMO provider was not found.', 404);
    return primary.data;
  }

  private static async assertUniqueIdentity(
    code: string | null,
    licenceReference: string | null,
    excludeId: string | null
  ) {
    if (code) {
      let q = supabaseAdmin.from('hw_providers').select('id, code').eq('code', code).limit(1);
      if (excludeId) q = q.neq('id', excludeId);
      const { data, error } = await q.maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw httpError(`Failed to check provider code: ${error.message}`, 500);
      }
      if (data) throw httpError('A provider with this code already exists.', 409, 'PROVIDER_DUPLICATE_CODE');
    }

    if (licenceReference) {
      const { data, error } = await supabaseAdmin
        .from('hw_providers')
        .select('id, licence_reference')
        .ilike('licence_reference', licenceReference)
        .limit(5);
      if (error) throw httpError(`Failed to check licence reference: ${error.message}`, 500);
      const clash = (data || []).find(
        (row) =>
          String(row.licence_reference || '').toLowerCase() === licenceReference.toLowerCase() &&
          row.id !== excludeId
      );
      if (clash) {
        throw httpError(
          'A provider with this registration or licence number already exists.',
          409,
          'PROVIDER_DUPLICATE_LICENCE'
        );
      }
    }
  }
}
