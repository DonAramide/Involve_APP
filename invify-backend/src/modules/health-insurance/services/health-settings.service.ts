// invify-backend/src/modules/health-insurance/services/health-settings.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { HealthAuditService } from './health-audit.service';
import { relationMissing } from './health-institution-context';

const PROVIDER_SELECT =
  'id, code, display_name, legal_name, licence_reference, integration_status, contact_email, contact_phone, support_email, website_url, head_office_address, institution_id';

function mapAssignedProvider(row: any) {
  if (!row?.id) return null;
  return {
    id: row.id,
    code: row.code || null,
    name: row.display_name || row.legal_name || 'HMO Partner',
    display_name: row.display_name || null,
    integrationStatus: row.integration_status || 'none',
    integration_status: row.integration_status || 'none',
    licenceReference: row.licence_reference || null,
    licence_reference: row.licence_reference || null,
    websiteUrl: row.website_url || null,
    website_url: row.website_url || null,
    supportEmail: row.support_email || row.contact_email || null,
    support_email: row.support_email || row.contact_email || null,
    supportPhone: row.contact_phone || null,
    support_phone: row.contact_phone || null,
    headOfficeAddress: row.head_office_address || null,
    head_office_address: row.head_office_address || null
  };
}

function buildViewerContext(ctx: HealthContext) {
  const perms = new Set((ctx.permissions || []).map(String));
  const canManageSettings =
    ctx.isPlatformOperator ||
    perms.has('health.settings.manage');

  let role = 'parent_guardian';
  if (ctx.isGuardian) {
    role = 'parent_guardian';
  } else if (canManageSettings || perms.has('health.plans.manage') || perms.has('health.reports.read')) {
    role = 'school_admin';
  } else if (perms.has('health.staff.access') || perms.has('health.hr_admin')) {
    role = 'staff';
  } else if (perms.has('health.students.access')) {
    role = 'student';
  }

  const permittedRoles = ctx.isGuardian
    ? ['parent_guardian']
    : canManageSettings
      ? ['school_admin', 'staff', 'parent_guardian', 'student']
      : [role];

  return {
    tenantId: ctx.tenantId,
    role,
    permittedRoles,
    canManageSettings
  };
}

async function loadProviderById(providerId: string) {
  const { data, error } = await supabaseAdmin
    .from('hw_providers')
    .select(PROVIDER_SELECT)
    .eq('id', providerId)
    .maybeSingle();
  if (error && !relationMissing(error)) {
    throw new Error(`Failed to load assigned HMO: ${error.message}`);
  }
  return error ? null : data;
}

async function resolveAssignedProvider(tenantId: string, settings: any) {
  const assignedId = settings?.assigned_provider_id || null;
  if (assignedId) {
    const provider = await loadProviderById(assignedId);
    if (provider) {
      return {
        provider,
        assignmentMode: settings?.assignment_mode || 'SELECTABLE',
        assignmentSource: settings?.assignment_source || 'ADMIN_ASSIGNED',
        assignedInstitutionId: settings?.assigned_institution_id || null
      };
    }
  }

  // Fallback: active school link (admin Registry "linked tenants")
  const { data: link, error: linkError } = await supabaseAdmin
    .from('hw_hmo_school_links')
    .select(`provider_id, institution_id, onboarding_status, hw_providers ( ${PROVIDER_SELECT} )`)
    .eq('tenant_id', tenantId)
    .eq('onboarding_status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkError && !relationMissing(linkError)) {
    throw new Error(`Failed to resolve HMO school link: ${linkError.message}`);
  }

  if (link) {
    const nested = Array.isArray(link.hw_providers) ? link.hw_providers[0] : link.hw_providers;
    const provider = nested || (link.provider_id ? await loadProviderById(link.provider_id) : null);
    if (provider) {
      const existingSource = String(settings?.assignment_source || 'UNASSIGNED');
      return {
        provider,
        assignmentMode: settings?.assignment_mode && settings.assignment_mode !== 'SELECTABLE'
          ? settings.assignment_mode
          : 'LOCKED',
        assignmentSource: existingSource !== 'UNASSIGNED' ? existingSource : 'CODE_INHERITED',
        assignedInstitutionId: settings?.assigned_institution_id || link.institution_id || null
      };
    }
  }

  // Fallback: HEALTH_INSURANCE institution relationship → hw_providers.institution_id
  const { data: rel, error: relError } = await supabaseAdmin
    .from('tenant_institution_relationships')
    .select('institution_id, status, tenant_override_policy')
    .eq('tenant_id', tenantId)
    .eq('service_type', 'HEALTH_INSURANCE')
    .in('status', ['ACTIVE', 'active'])
    .limit(1)
    .maybeSingle();

  if (relError && !relationMissing(relError)) {
    throw new Error(`Failed to resolve institution relationship: ${relError.message}`);
  }

  if (rel?.institution_id) {
    const { data: byInst, error: byInstError } = await supabaseAdmin
      .from('hw_providers')
      .select(PROVIDER_SELECT)
      .eq('institution_id', rel.institution_id)
      .limit(1)
      .maybeSingle();
    if (byInstError && !relationMissing(byInstError)) {
      throw new Error(`Failed to resolve HMO by institution: ${byInstError.message}`);
    }
    if (byInst) {
      const locked = String(rel.tenant_override_policy || '').toUpperCase() === 'LOCKED';
      return {
        provider: byInst,
        assignmentMode: locked ? 'LOCKED' : (settings?.assignment_mode || 'SELECTABLE'),
        assignmentSource: settings?.assignment_source || 'CODE_INHERITED',
        assignedInstitutionId: settings?.assigned_institution_id || rel.institution_id
      };
    }
  }

  return {
    provider: null,
    assignmentMode: settings?.assignment_mode || 'SELECTABLE',
    assignmentSource: settings?.assignment_source || 'UNASSIGNED',
    assignedInstitutionId: settings?.assigned_institution_id || null
  };
}

async function loadOnboardingInstitution(institutionId: string | null) {
  if (!institutionId) return null;
  const { data, error } = await supabaseAdmin
    .from('institutions')
    .select('id, code, name, institution_type')
    .eq('id', institutionId)
    .maybeSingle();
  if (error && !relationMissing(error)) {
    throw new Error(`Failed to load institution: ${error.message}`);
  }
  if (!data) return null;
  return {
    institutionId: data.id,
    institutionCode: data.code || null,
    institutionName: data.name || null,
    institutionType: data.institution_type || 'HMO'
  };
}

export class HealthSettingsService {
  /**
   * Get settings for a tenant. If none exist, returns default unconfigured state.
   * Includes assigned HMO profile for mobile Health & Wellness.
   */
  static async getSettings(ctx: HealthContext) {
    const { data, error } = await supabaseAdmin
      .from('hw_tenant_settings')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (error && !relationMissing(error)) {
      throw new Error(`Failed to retrieve health settings: ${error.message}`);
    }

    const settings = error ? null : data;
    const resolved = await resolveAssignedProvider(ctx.tenantId, settings);
    const assignedProvider = mapAssignedProvider(resolved.provider);
    const assignmentMode = resolved.assignmentMode || 'SELECTABLE';
    const assignmentSource = resolved.assignmentSource || 'UNASSIGNED';
    const canChangeProvider = assignmentMode !== 'LOCKED' && !ctx.isGuardian;
    const onboardingInstitution = await loadOnboardingInstitution(resolved.assignedInstitutionId);
    const viewerContext = buildViewerContext(ctx);

    if (!settings) {
      return {
        tenantId: ctx.tenantId,
        enabled: false,
        schoolEnabled: false,
        retailEnabled: false,
        servicesEnabled: false,
        retentionMonths: 84,
        isConfigured: false,
        assignmentMode,
        assignmentSource,
        canChangeProvider,
        assignedProvider,
        onboardingInstitution,
        viewerContext
      };
    }

    return {
      tenantId: settings.tenant_id,
      enabled: settings.enabled,
      schoolEnabled: settings.school_enabled,
      retailEnabled: settings.retail_enabled,
      servicesEnabled: settings.services_enabled,
      retentionMonths: settings.retention_months,
      enabledAt: settings.enabled_at,
      isConfigured: true,
      assignmentMode,
      assignmentSource,
      canChangeProvider,
      assignedProviderId: settings.assigned_provider_id || assignedProvider?.id || null,
      assignedProvider,
      onboardingInstitution,
      viewerContext
    };
  }

  /**
   * Configure health settings for a tenant.
   */
  static async updateSettings(
    ctx: HealthContext,
    updates: {
      enabled?: boolean;
      schoolEnabled?: boolean;
      retailEnabled?: boolean;
      servicesEnabled?: boolean;
      retentionMonths?: number;
    }
  ) {
    const payload: any = {
      tenant_id: ctx.tenantId,
      updated_at: new Date().toISOString()
    };

    if (typeof updates.enabled === 'boolean') {
      payload.enabled = updates.enabled;
      if (updates.enabled) {
        payload.enabled_by = ctx.userId;
        payload.enabled_at = new Date().toISOString();
      }
    }
    if (typeof updates.schoolEnabled === 'boolean') payload.school_enabled = updates.schoolEnabled;
    if (typeof updates.retailEnabled === 'boolean') payload.retail_enabled = updates.retailEnabled;
    if (typeof updates.servicesEnabled === 'boolean') payload.services_enabled = updates.servicesEnabled;
    if (typeof updates.retentionMonths === 'number') payload.retention_months = updates.retentionMonths;

    const { data, error } = await supabaseAdmin
      .from('hw_tenant_settings')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save health settings: ${error.message}`);
    }

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'settings.updated',
      resourceType: 'hw_tenant_settings',
      resourceId: ctx.tenantId,
      changes: updates,
      viaPlatformAccess: ctx.isPlatformOperator,
      platformReason: ctx.platformReason
    });

    return data;
  }
}
