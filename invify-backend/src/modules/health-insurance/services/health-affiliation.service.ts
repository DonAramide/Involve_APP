/**
 * Institution/tenant affiliation with centrally governed HMO providers.
 * Institutions request links; they never create global hw_providers rows.
 */
import { supabaseAdmin } from '../../../db/supabase';
import { HealthAuditService } from './health-audit.service';
import { HealthContext } from '../types';
import { HealthNotificationService } from './health-notification.service';
import { HealthProviderGovernanceService } from './health-provider-governance.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(message: string, status = 400, code?: string): Error {
  const err: any = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

export class HealthAffiliationService {
  /** Verified providers available for affiliation / offer selection. */
  static async listEligibleProviders() {
    return HealthProviderGovernanceService.listProviders({ status: 'verified', limit: 100, offset: 0 });
  }

  static async listAffiliations(ctx: HealthContext) {
    const { data, error } = await supabaseAdmin
      .from('hw_hmo_school_links')
      .select(
        'id, provider_id, tenant_id, institution_id, onboarding_status, tenant_type, contact_person, contact_email, notes, rejection_reason, created_at, updated_at, hw_providers(id, code, display_name, integration_status)'
      )
      .eq('tenant_id', ctx.tenantId)
      .order('updated_at', { ascending: false });
    if (error) throw httpError(`Failed to list affiliations: ${error.message}`, 500);
    return data || [];
  }

  static async requestAffiliation(
    ctx: HealthContext,
    body: {
      providerId: string;
      contactPerson?: string;
      contactEmail?: string;
      contactPhone?: string;
      notes?: string;
    }
  ) {
    const providerId = String(body.providerId || '');
    if (!UUID_RE.test(providerId)) throw httpError('providerId must be a UUID.');

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('hw_providers')
      .select('id, code, display_name, integration_status')
      .eq('id', providerId)
      .maybeSingle();
    if (providerError) throw httpError(`Failed to read provider: ${providerError.message}`, 500);
    if (!provider) throw httpError('HMO provider was not found.', 404);
    if (provider.integration_status !== 'verified') {
      throw httpError('Only approved (verified) HMO providers can be selected for affiliation.', 409, 'PROVIDER_NOT_ASSIGNABLE');
    }

    const { data: existing } = await supabaseAdmin
      .from('hw_hmo_school_links')
      .select('id, onboarding_status')
      .eq('tenant_id', ctx.tenantId)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (existing && ['active', 'pending_approval'].includes(String(existing.onboarding_status))) {
      throw httpError(`An affiliation already exists with status ${existing.onboarding_status}.`, 409, 'AFFILIATION_EXISTS');
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, type, institution_id')
      .eq('id', ctx.tenantId)
      .maybeSingle();

    const tenantType = String(tenant?.type || 'school').toLowerCase();
    const linkType = tenantType === 'retail' ? 'employer' : tenantType === 'services' ? 'organization' : 'school';
    const now = new Date().toISOString();

    const payload = {
      provider_id: providerId,
      tenant_id: ctx.tenantId,
      institution_id: tenant?.institution_id || null,
      tenant_type: linkType,
      onboarding_status: 'pending_approval',
      contact_person: body.contactPerson ? String(body.contactPerson).trim().slice(0, 120) : null,
      contact_email: body.contactEmail ? String(body.contactEmail).trim().slice(0, 254) : null,
      contact_phone: body.contactPhone ? String(body.contactPhone).trim().slice(0, 40) : null,
      notes: body.notes ? String(body.notes).trim().slice(0, 1000) : null,
      rejection_reason: null,
      updated_at: now
    };

    const { data, error } = existing
      ? await supabaseAdmin.from('hw_hmo_school_links').update(payload).eq('id', existing.id).select('*').maybeSingle()
      : await supabaseAdmin.from('hw_hmo_school_links').insert(payload).select('*').maybeSingle();

    if (error) throw httpError(`Failed to request affiliation: ${error.message}`, 400);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'affiliation.requested',
      resourceType: 'hw_hmo_school_links',
      resourceId: data!.id,
      changes: { providerId, providerCode: provider.code, status: 'pending_approval' }
    });

    await HealthNotificationService.notifyTenantAdmins(
      ctx.tenantId,
      'affiliation.requested',
      'HMO affiliation requested',
      `Affiliation with ${provider.display_name} was submitted for approval.`,
      { providerId, linkId: data!.id }
    );
    await HealthNotificationService.notifyPlatformActor(
      ctx.userId,
      'affiliation.requested',
      'HMO affiliation requested',
      `Your request to affiliate with ${provider.display_name} was recorded.`,
      { providerId, linkId: data!.id }
    );

    return data;
  }
}
