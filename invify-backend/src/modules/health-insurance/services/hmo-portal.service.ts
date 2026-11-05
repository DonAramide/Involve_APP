// invify-backend/src/modules/health-insurance/services/hmo-portal.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import {
  ResolvedInstitutionContext,
  HMO_ROLE_PERMISSIONS,
  HmoRole,
} from './institution-classification.service';
import {
  hmoExcelExchangeService,
  ALLOWED_BATCH_TRANSITIONS,
  BatchStatus,
} from './hmo-excel-exchange.service';
import { validateImageBase64 } from '../../../utils/image-validator';
import { uploadBase64ToContabo } from '../../agent-portal/utils/kyc-storage';
import {
  ensureTenantOffersFromAssignedHmo,
  offerPublishedVersionToLinkedSchools
} from './tenant-plan-offer-sync';

export class HmoPortalService {
  /**
   * Resolves whether authUserId exists in public.users(id).
   * Institute Portal logins live in auth.users + public.agents and may not have a row in public.users,
   * so nullable FK columns referencing public.users(id) (created_by, uploaded_by, approved_by, etc.)
   * must receive null when no public.users row exists.
   */
  private async resolvePublicUserIdOrNull(authUserId?: string | null): Promise<string | null> {
    if (!authUserId) return null;
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle();
      return data?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Resolves all tenant_ids linked to this HMO via:
   * 1. hw_hmo_school_links (provider_id)
   * 2. tenant_institution_relationships (institution_id + service_type = 'HEALTH_INSURANCE')
   * 3. hw_tenant_plan_offers joined to hw_plan_versions -> hw_plans (provider_id)
   */
  async getParticipatingTenantIds(ctx: ResolvedInstitutionContext): Promise<string[]> {
    const providerId = ctx.hmoProviderId;
    if (!providerId) return [];

    const tenantSet = new Set<string>();

    try {
      const { data: links } = await supabaseAdmin
        .from('hw_hmo_school_links')
        .select('tenant_id')
        .eq('provider_id', providerId);
      for (const row of links || []) {
        if (row.tenant_id) tenantSet.add(row.tenant_id);
      }
    } catch {}

    if (ctx.institutionId) {
      try {
        const { data: rels } = await supabaseAdmin
          .from('tenant_institution_relationships')
          .select('tenant_id')
          .eq('institution_id', ctx.institutionId)
          .eq('service_type', 'HEALTH_INSURANCE');
        for (const row of rels || []) {
          if (row.tenant_id) tenantSet.add(row.tenant_id);
        }
      } catch {}
    }

    try {
      const { data: plans } = await supabaseAdmin
        .from('hw_plans')
        .select('id')
        .eq('provider_id', providerId);
      const planIds = (plans || []).map((p: any) => p.id);
      if (planIds.length > 0) {
        const { data: versions } = await supabaseAdmin
          .from('hw_plan_versions')
          .select('id')
          .in('plan_id', planIds);
        const versionIds = (versions || []).map((v: any) => v.id);
        if (versionIds.length > 0) {
          const { data: offers } = await supabaseAdmin
            .from('hw_tenant_plan_offers')
            .select('tenant_id')
            .in('plan_version_id', versionIds);
          for (const row of offers || []) {
            if (row.tenant_id) tenantSet.add(row.tenant_id);
          }
        }
      }
    } catch {}

    return Array.from(tenantSet);
  }

  /**
   * Resolves all plan_ids and plan_version_ids belonging to this HMO provider.
   */
  async getProviderPlanScope(providerId: string): Promise<{
    plans: any[];
    planIds: string[];
    versions: any[];
    versionIds: string[];
  }> {
    let plans: any[] = [];
    let versions: any[] = [];
    try {
      const { data: pData } = await supabaseAdmin
        .from('hw_plans')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      plans = pData || [];
      const planIds = plans.map((p: any) => p.id);
      if (planIds.length > 0) {
        const { data: vData } = await supabaseAdmin
          .from('hw_plan_versions')
          .select('*')
          .in('plan_id', planIds)
          .order('version', { ascending: false });
        versions = vData || [];
      }
      return {
        plans,
        planIds,
        versions,
        versionIds: versions.map((v: any) => v.id),
      };
    } catch {
      return { plans: [], planIds: [], versions: [], versionIds: [] };
    }
  }

  /**
   * 1. HMO Executive Dashboard Overview (12 KPIs, Charts, Tasks, Alerts, Quick Actions)
   */
  async getDashboardOverview(ctx: ResolvedInstitutionContext) {
    const providerId = ctx.hmoProviderId!;
    const [tenantIds, planScope] = await Promise.all([
      this.getParticipatingTenantIds(ctx),
      this.getProviderPlanScope(providerId),
    ]);

    let enrolments: any[] = [];
    if (planScope.versionIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('hw_enrolments')
        .select('*')
        .in('plan_version_id', planScope.versionIds)
        .order('created_at', { ascending: false });
      enrolments = data || [];
    }

    let policies: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_policies')
        .select('*')
        .eq('provider_id', providerId);
      policies = data || [];
    } catch {}

    let facilities: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_facilities')
        .select('*')
        .eq('provider_id', providerId);
      facilities = data || [];
    } catch {}

    let batches: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_enrolment_batches')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      batches = data || [];
    } catch {}

    let claimsAndAuths: any[] = [];
    try {
      const policyIds = policies.map((p: any) => p.id);
      if (policyIds.length > 0) {
        const { data } = await supabaseAdmin
          .from('hw_claim_status_records')
          .select('*')
          .in('policy_id', policyIds)
          .order('status_date', { ascending: false });
        claimsAndAuths = data || [];
      }
    } catch {}

    let tasks: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_hmo_tasks')
        .select('*')
        .eq('provider_id', providerId)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });
      tasks = data || [];
    } catch {}

    // Compute the 12 mandatory HMO KPIs
    const uniqueMemberIds = new Set(enrolments.map((e: any) => e.member_id));
    const activeCoveredCount = enrolments.filter((e: any) => e.status === 'active').length;
    const pendingConfirmationsCount = enrolments.filter((e: any) =>
      ['enrolment_pending', 'awaiting_verification', 'awaiting_insurer_activation'].includes(e.status)
    ).length;
    const suspendedOrExpiredCount = enrolments.filter((e: any) =>
      ['suspended', 'expired', 'cancelled', 'rejected'].includes(e.status)
    ).length;
    const participatingSchoolsCount = tenantIds.length;
    const registeredFacilitiesCount = facilities.filter((f: any) => f.is_active !== false).length;
    const pendingBatchesCount = batches.filter((b: any) =>
      ['draft', 'validating', 'ready_for_export', 'exported', 'submitted_to_hmo', 'awaiting_hmo_response', 'partially_processed'].includes(b.status)
    ).length;
    const failedRejectedRowsCount =
      batches.reduce((sum: number, b: any) => sum + Number(b.rejected_rows || 0) + Number(b.invalid_rows || 0), 0) +
      enrolments.filter((e: any) => e.status === 'rejected').length;

    const preAuths = claimsAndAuths.filter((c: any) => c.record_type === 'pre_authorisation');
    const claims = claimsAndAuths.filter((c: any) => c.record_type === 'claim');
    const pendingPreAuthsCount = preAuths.filter((c: any) => ['submitted', 'pending'].includes(c.status)).length;
    const pendingClaimsCount = claims.filter((c: any) => ['submitted', 'pending'].includes(c.status)).length;
    const approvedClaimsAwaitingSettlementCount = claims.filter((c: any) => c.status === 'approved').length;
    const nowMs = Date.now();
    const overdueTasksCount = tasks.filter((t: any) => t.due_at && new Date(t.due_at).getTime() < nowMs).length;

    const hmoKpis = {
      totalRegisteredMembers: { value: uniqueMemberIds.size || enrolments.length, label: 'Total Registered Members', icon: 'groups', color: 'cyan-4' },
      activeCoveredMembers: { value: activeCoveredCount, label: 'Active Covered Members', icon: 'verified_user', color: 'green-4' },
      pendingEnrollmentConfirmations: { value: pendingConfirmationsCount, label: 'Pending Enrollment Confirmations', icon: 'pending_actions', color: 'amber-4' },
      suspendedOrExpiredMemberships: { value: suspendedOrExpiredCount, label: 'Suspended / Expired Memberships', icon: 'person_off', color: 'orange-4' },
      participatingSchools: { value: participatingSchoolsCount, label: 'Participating Schools & Employers', icon: 'school', color: 'purple-4' },
      registeredHospitals: { value: registeredFacilitiesCount, label: 'Registered Hospitals & Providers', icon: 'local_hospital', color: 'teal-4' },
      pendingEnrollmentBatches: { value: pendingBatchesCount, label: 'Pending Enrollment Batches', icon: 'inventory_2', color: 'blue-4' },
      failedOrRejectedRows: { value: failedRejectedRowsCount, label: 'Failed / Rejected Enrollment Rows', icon: 'error_outline', color: 'red-4' },
      pendingPreAuthorizations: { value: pendingPreAuthsCount, label: 'Pending Pre-Authorizations', icon: 'fact_check', color: 'indigo-4' },
      pendingClaims: { value: pendingClaimsCount, label: 'Pending Claims', icon: 'receipt_long', color: 'amber-3' },
      approvedClaimsAwaitingSettlement: { value: approvedClaimsAwaitingSettlementCount, label: 'Approved Claims Awaiting Settlement', icon: 'account_balance', color: 'light-green-4' },
      overdueOperationalTasks: { value: overdueTasksCount, label: 'Overdue Operational Tasks', icon: 'alarm', color: 'deep-orange-4' },
    };

    // Build chart breakdown datasets
    const planVersionMap = new Map<string, string>();
    const planNameMap = new Map<string, string>();
    for (const p of planScope.plans) planNameMap.set(p.id, p.name);
    for (const v of planScope.versions) {
      planVersionMap.set(v.id, planNameMap.get(v.plan_id) || `Plan v${v.version}`);
    }

    const byPlanCounts: Record<string, number> = {};
    for (const e of enrolments) {
      const pName = planVersionMap.get(e.plan_version_id) || 'Standard Health Plan';
      byPlanCounts[pName] = (byPlanCounts[pName] || 0) + 1;
    }

    const batchStatusBreakdown = {
      draft: batches.filter((b: any) => b.status === 'draft').length,
      readyForExport: batches.filter((b: any) => b.status === 'ready_for_export').length,
      awaitingResponse: batches.filter((b: any) => ['exported', 'submitted_to_hmo', 'awaiting_hmo_response'].includes(b.status)).length,
      partiallyProcessed: batches.filter((b: any) => b.status === 'partially_processed').length,
      reconciled: batches.filter((b: any) => ['reconciled', 'completed'].includes(b.status)).length,
    };

    const quickActions = [
      { key: 'export_batch', label: 'Export Enrollment Batch', tab: 'excel_centre', icon: 'download', permission: 'hmo.batches.export' },
      { key: 'upload_response', label: 'Upload Processed HMO Sheet', tab: 'excel_centre', icon: 'upload_file', permission: 'hmo.batches.reconcile' },
      { key: 'create_plan', label: 'Create Health Plan', tab: 'plans', icon: 'health_and_safety', permission: 'hmo.plans.manage' },
      { key: 'add_provider', label: 'Add Hospital / Clinic', tab: 'providers', icon: 'local_hospital', permission: 'hmo.providers.manage' },
      { key: 'review_enrollments', label: 'Review Pending Enrollments', tab: 'enrollments', icon: 'how_to_reg', permission: 'hmo.members.manage' },
      { key: 'review_claims', label: 'Review Pre-Auth & Claims', tab: 'claims', icon: 'assignment_turned_in', permission: 'hmo.claims.view' },
    ].filter((a) => ctx.hmoPermissions.includes(a.permission as any));

    return {
      institution: {
        id: ctx.institutionId,
        code: ctx.institutionCode,
        name: ctx.institutionName,
        institutionType: ctx.institutionType,
        portalMode: ctx.portalMode,
        approvalStatus: ctx.approvalStatus,
        kycStatus: ctx.kycStatus,
        hmoProviderId: ctx.hmoProviderId,
        hmoProviderCode: ctx.hmoProviderCode,
        hmoRole: ctx.hmoRole,
        permissions: ctx.hmoPermissions,
      },
      hmoKpis,
      charts: {
        enrollmentByPlan: Object.entries(byPlanCounts).map(([plan, count]) => ({ plan, count })),
        batchStatusBreakdown,
        claimsByStatus: {
          submitted: claims.filter((c: any) => c.status === 'submitted').length,
          pending: claims.filter((c: any) => c.status === 'pending').length,
          approved: claims.filter((c: any) => c.status === 'approved').length,
          rejected: claims.filter((c: any) => c.status === 'rejected').length,
          settled: claims.filter((c: any) => c.status === 'settled').length,
        },
      },
      quickActions,
      recentBatches: batches.slice(0, 5),
      tasks,
    };
  }

  /**
   * 2. HMO Organization Profile & Verification
   */
  async getOrganizationProfile(ctx: ResolvedInstitutionContext) {
    const providerId = ctx.hmoProviderId!;
    const [{ data: provider }, { data: institution }] = await Promise.all([
      supabaseAdmin.from('hw_providers').select('*').eq('id', providerId).maybeSingle(),
      ctx.institutionId
        ? supabaseAdmin.from('institutions').select('*').eq('id', ctx.institutionId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      providerId,
      institutionId: ctx.institutionId,
      institutionCode: ctx.institutionCode,
      institutionType: 'HMO',
      legalName: provider?.legal_name || institution?.legal_name || ctx.institutionName,
      tradingName: provider?.display_name || institution?.trading_name || ctx.institutionName,
      licenceReference: provider?.licence_reference || institution?.metadata?.licenceNumber || 'NHIA/HMO/060',
      regulatorType: provider?.regulator_type || institution?.metadata?.regulator || 'NHIA',
      licenceExpiry: provider?.licence_expiry || null,
      integrationStatus: provider?.integration_status || 'verified',
      approvalStatus: ctx.approvalStatus,
      kycStatus: ctx.kycStatus,
      contactEmail: provider?.contact_email || institution?.contact_email || ctx.email,
      contactPhone: provider?.contact_phone || institution?.contact_phone || '',
      supportEmail: provider?.support_email || '',
      claimsEmail: provider?.claims_email || '',
      headOfficeAddress: provider?.head_office_address || '',
      state: provider?.state || 'Lagos',
      lga: provider?.lga || '',
      websiteUrl: provider?.website_url || '',
      logoUrl: provider?.logo_url || institution?.logo_url || '',
      capabilities: provider?.capabilities || {},
    };
  }

  async updateOrganizationProfile(ctx: ResolvedInstitutionContext, body: any) {
    const providerId = ctx.hmoProviderId!;
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (body.tradingName || body.display_name) updates.display_name = String(body.tradingName || body.display_name).trim();
    if (body.legalName || body.legal_name) updates.legal_name = String(body.legalName || body.legal_name).trim();
    if (body.licenceReference !== undefined) updates.licence_reference = String(body.licenceReference).trim();
    if (body.regulatorType !== undefined) updates.regulator_type = body.regulatorType;
    if (body.contactEmail !== undefined) updates.contact_email = String(body.contactEmail).trim();
    if (body.contactPhone !== undefined) updates.contact_phone = String(body.contactPhone).trim();
    if (body.supportEmail !== undefined) updates.support_email = String(body.supportEmail).trim();
    if (body.claimsEmail !== undefined) updates.claims_email = String(body.claimsEmail).trim();
    if (body.headOfficeAddress !== undefined) updates.head_office_address = String(body.headOfficeAddress).trim();
    if (body.state !== undefined) updates.state = String(body.state).trim();
    if (body.lga !== undefined) updates.lga = String(body.lga).trim();
    if (body.websiteUrl !== undefined) updates.website_url = String(body.websiteUrl).trim();

    await supabaseAdmin.from('hw_providers').update(updates).eq('id', providerId);

    if (ctx.institutionId) {
      const instUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.legal_name) instUpdates.legal_name = updates.legal_name;
      if (updates.display_name) instUpdates.trading_name = updates.display_name;
      if (updates.contact_email) instUpdates.contact_email = updates.contact_email;
      if (updates.contact_phone) instUpdates.contact_phone = updates.contact_phone;
      await supabaseAdmin.from('institutions').update(instUpdates).eq('id', ctx.institutionId);
    }

    return this.getOrganizationProfile(ctx);
  }

  /**
   * 3. School & Employer Network Management
   */
  async listSchoolNetwork(ctx: ResolvedInstitutionContext) {
    const providerId = ctx.hmoProviderId!;
    const [tenantIds, planScope] = await Promise.all([
      this.getParticipatingTenantIds(ctx),
      this.getProviderPlanScope(providerId),
    ]);

    let schoolLinks: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_hmo_school_links')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      schoolLinks = data || [];
    } catch {}

    const allTenantIds = Array.from(new Set([...tenantIds, ...schoolLinks.map((l: any) => l.tenant_id)]));
    const tenantsMap = await this.fetchTenantsByIds(allTenantIds);

    let enrolmentsByTenant: Record<string, { total: number; active: number; pending: number; rejected: number }> = {};
    if (planScope.versionIds.length > 0 && allTenantIds.length > 0) {
      const { data: enrols } = await supabaseAdmin
        .from('hw_enrolments')
        .select('tenant_id, status')
        .in('plan_version_id', planScope.versionIds)
        .in('tenant_id', allTenantIds);
      for (const e of enrols || []) {
        if (!enrolmentsByTenant[e.tenant_id]) {
          enrolmentsByTenant[e.tenant_id] = { total: 0, active: 0, pending: 0, rejected: 0 };
        }
        enrolmentsByTenant[e.tenant_id].total++;
        if (e.status === 'active') enrolmentsByTenant[e.tenant_id].active++;
        if (['enrolment_pending', 'awaiting_verification', 'awaiting_insurer_activation'].includes(e.status)) {
          enrolmentsByTenant[e.tenant_id].pending++;
        }
        if (e.status === 'rejected' || e.status === 'cancelled') {
          enrolmentsByTenant[e.tenant_id].rejected =
            (enrolmentsByTenant[e.tenant_id].rejected || 0) + 1;
        }
      }
    }

    const linkByTenant = new Map<string, any>();
    for (const l of schoolLinks) linkByTenant.set(l.tenant_id, l);

    return allTenantIds.map((tid) => {
      const t = tenantsMap.get(tid) || {};
      const link = linkByTenant.get(tid) || {};
      const counts = enrolmentsByTenant[tid] || { total: 0, active: 0, pending: 0, rejected: 0 };
      const location = this.formatTenantLocation(t);
      return {
        id: link.id || tid,
        tenantId: tid,
        schoolName:
          t.business_name ||
          t.name ||
          t.owner_name ||
          link.contact_person ||
          `Organization ${tid.slice(0, 8)}`,
        tenantType:
          link.tenant_type ||
          (String(t.business_type || t.type || '').toLowerCase() === 'school' ? 'school' : 'organization'),
        onboardingStatus: link.onboarding_status || 'active',
        contactPerson: link.contact_person || t.owner_name || t.name || 'Administrator',
        contactEmail: link.contact_email || t.owner_email || t.email || '',
        contactPhone: link.contact_phone || t.phone || '',
        state: t.state || t.city || null,
        city: t.city || null,
        location,
        streetAddress: t.street_address || t.address || null,
        allowedPlanIds: link.allowed_plan_ids || planScope.planIds,
        enrolledMembers: counts.total,
        activeMembers: counts.active,
        pendingMembers: counts.pending,
        rejectedMembers: counts.rejected || 0,
        createdAt: link.created_at || t.created_at,
      };
    });
  }

  /**
   * Institute-facing tenant metrics for a participating school (HMO-safe subset of admin detail).
   */
  async getSchoolTenantMetrics(ctx: ResolvedInstitutionContext, tenantId: string) {
    const providerId = ctx.hmoProviderId!;
    const tid = String(tenantId || '').trim();
    if (!tid) throw new Error('Tenant id is required.');

    const network = await this.listSchoolNetwork(ctx);
    const school = network.find((row: any) => String(row.tenantId) === tid);
    if (!school) {
      throw new Error('School/tenant is not linked to your HMO institution.');
    }

    const tenantsMap = await this.fetchTenantsByIds([tid]);
    const t = tenantsMap.get(tid) || {};
    const planScope = await this.getProviderPlanScope(providerId);

    let devices: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('devices')
        .select('id, device_id, device_number, status, last_seen, created_at, agent_code')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .limit(20);
      devices = data || [];
    } catch {
      try {
        const { data } = await supabaseAdmin
          .from('devices')
          .select('id, device_id, status, created_at')
          .eq('tenant_id', tid)
          .limit(20);
        devices = data || [];
      } catch {
        devices = [];
      }
    }

    let walletBalance = 0;
    let walletCurrency = 'NGN';
    try {
      const { data: wallets } = await supabaseAdmin
        .from('wallets')
        .select('id, balance, currency, wallet_type, status')
        .eq('tenant_id', tid)
        .limit(10);
      for (const w of wallets || []) {
        walletBalance += Number(w.balance || 0);
        if (w.currency) walletCurrency = String(w.currency);
      }
    } catch {
      /* wallets schema varies */
    }

    let claims = { total: 0, pending: 0, approved: 0, rejected: 0 };
    try {
      if (planScope.versionIds.length) {
        const { data: enrols } = await supabaseAdmin
          .from('hw_enrolments')
          .select('id')
          .eq('tenant_id', tid)
          .in('plan_version_id', planScope.versionIds);
        const enrolmentIds = (enrols || []).map((e: any) => e.id);
        if (enrolmentIds.length) {
          const { data: policies } = await supabaseAdmin
            .from('hw_policies')
            .select('id')
            .in('enrolment_id', enrolmentIds);
          const policyIds = (policies || []).map((p: any) => p.id);
          if (policyIds.length) {
            const { data: claimRows } = await supabaseAdmin
              .from('hw_claim_status_records')
              .select('id, status')
              .in('policy_id', policyIds);
            for (const c of claimRows || []) {
              claims.total++;
              const st = String(c.status || '').toLowerCase();
              if (st === 'approved' || st === 'settled') claims.approved++;
              else if (st === 'rejected') claims.rejected++;
              else claims.pending++;
            }
          }
        }
      }
    } catch {
      /* claims optional */
    }

    return {
      tenantId: tid,
      name: school.schoolName,
      status: t.status || school.onboardingStatus || 'active',
      type: school.tenantType || t.type || 'school',
      plan: t.plan || null,
      planExpiresAt: t.plan_expires_at || null,
      agentCode: t.agent_code || null,
      ownerName: t.owner_name || school.contactPerson || null,
      ownerEmail: school.contactEmail || t.owner_email || null,
      phone: school.contactPhone || t.phone || null,
      location: school.location || this.formatTenantLocation(t),
      streetAddress: school.streetAddress || t.street_address || null,
      state: school.state || t.state || null,
      city: school.city || t.city || t.lga || null,
      country: t.country || null,
      createdAt: school.createdAt || t.created_at || null,
      onboardingStatus: school.onboardingStatus,
      allowedPlanIds: school.allowedPlanIds || [],
      metrics: {
        enrolledMembers: school.enrolledMembers || 0,
        activeMembers: school.activeMembers || 0,
        pendingMembers: school.pendingMembers || 0,
        rejectedMembers: school.rejectedMembers || 0,
        deviceCount: devices.length,
        walletBalance,
        walletCurrency,
        claimsTotal: claims.total,
        claimsPending: claims.pending,
        claimsApproved: claims.approved,
        claimsRejected: claims.rejected,
      },
      devices: devices.map((d: any) => ({
        id: d.id,
        deviceId: d.device_id || d.id,
        deviceNumber: d.device_number || null,
        status: d.status || null,
        lastSeen: d.last_seen || null,
        agentCode: d.agent_code || null,
        createdAt: d.created_at || null,
      })),
    };
  }

  /**
   * Progressive tenant select — staging tenants schema does not always have
   * business_name / email / city. Prefer the proven admin column set, then fall back.
   */
  private async fetchTenantsByIds(tenantIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!tenantIds.length) return map;
    const attempts = [
      'id, name, phone, country, state, lga, street_address, owner_email, owner_name, settings, kyc_data, type, status, created_at',
      'id, name, phone, country, state, lga, street_address, owner_email, owner_name, settings, type, status',
      'id, name, phone, state, lga, street_address, owner_email, owner_name, settings',
      'id, name, phone, state, street_address, owner_email, owner_name',
      'id, name, phone, owner_email, owner_name, state',
      'id, name, phone, owner_email',
      'id, name, phone',
      'id, name',
    ];
    for (const cols of attempts) {
      const { data, error } = await supabaseAdmin.from('tenants').select(cols).in('id', tenantIds);
      if (error || !Array.isArray(data)) continue;
      for (const raw of data as any[]) {
        if (!raw?.id) continue;
        map.set(String(raw.id), this.normalizeTenantRow(raw));
      }
      return map;
    }
    return map;
  }

  private normalizeTenantRow(t: any): any {
    const settings = t?.settings && typeof t.settings === 'object' ? t.settings : {};
    const owner =
      (settings.owner_profile && typeof settings.owner_profile === 'object' && settings.owner_profile) ||
      (settings.ownerProfile && typeof settings.ownerProfile === 'object' && settings.ownerProfile) ||
      {};
    const kyc = t?.kyc_data && typeof t.kyc_data === 'object' ? t.kyc_data : {};
    const street =
      t.street_address ||
      t.address ||
      owner.streetAddress ||
      owner.address ||
      kyc.street_address ||
      kyc.address ||
      null;
    const city = t.city || owner.city || t.lga || kyc.city || null;
    const state = t.state || owner.state || kyc.state || null;
    const country = t.country || owner.country || kyc.country || null;
    const phone = t.phone || owner.phone || settings.phone || kyc.phone || null;
    const email = t.owner_email || t.email || owner.email || settings.email || kyc.email || null;
    const displayName =
      t.business_name ||
      t.name ||
      owner.businessName ||
      kyc.business_name ||
      t.owner_name ||
      null;
    return {
      ...t,
      business_name: displayName,
      name: t.name || displayName,
      owner_name:
        t.owner_name ||
        [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim() ||
        null,
      owner_email: email,
      email,
      phone,
      street_address: street,
      address: street,
      city,
      state,
      country,
      lga: t.lga || owner.city || null,
    };
  }

  private formatTenantLocation(t: any): string | null {
    if (!t || typeof t !== 'object') return null;
    const line = [t.street_address || t.address, t.city || t.lga, t.state, t.country]
      .map((p) => (p == null ? '' : String(p).trim()))
      .filter(Boolean)
      .join(', ');
    return line || (t.state ? String(t.state) : null) || (t.city || t.lga ? String(t.city || t.lga) : null);
  }

  async updateSchoolOnboarding(
    ctx: ResolvedInstitutionContext,
    tenantId: string,
    payload: { onboardingStatus: string; allowedPlanIds?: string[]; notes?: string; rejectionReason?: string }
  ) {
    const providerId = ctx.hmoProviderId!;
    const status = payload.onboardingStatus;
    if (!['pending_approval', 'active', 'suspended', 'rejected', 'terminated'].includes(status)) {
      throw new Error(`Invalid school onboarding status: ${status}`);
    }

    const actorUserId = await this.resolvePublicUserIdOrNull(ctx.authUserId);
    const record: Record<string, any> = {
      provider_id: providerId,
      institution_id: ctx.institutionId,
      tenant_id: tenantId,
      onboarding_status: status,
      notes: payload.notes || null,
      rejection_reason: status === 'rejected' ? (payload.rejectionReason || 'Rejected by HMO') : null,
      approved_by: status === 'active' ? actorUserId : null,
      approved_at: status === 'active' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(payload.allowedPlanIds)) {
      record.allowed_plan_ids = payload.allowedPlanIds;
    }

    const { data, error } = await supabaseAdmin
      .from('hw_hmo_school_links')
      .upsert(record, { onConflict: 'provider_id,tenant_id' })
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);

    // If approved active and institution_id exists, also ensure tenant_institution_relationships has HEALTH_INSURANCE
    if (status === 'active' && ctx.institutionId) {
      try {
        await supabaseAdmin.from('tenant_institution_relationships').upsert(
          {
            tenant_id: tenantId,
            institution_id: ctx.institutionId,
            service_type: 'HEALTH_INSURANCE',
            status: 'ACTIVE',
            onboarding_source: 'ADMIN_ASSIGNED',
          },
          { onConflict: 'tenant_id,service_type' }
        );
      } catch {}
    }

    if (status === 'active') {
      try {
        await ensureTenantOffersFromAssignedHmo(tenantId, actorUserId);
      } catch (err: any) {
        console.warn('[HmoPortalService.updateSchoolOnboarding] plan offer sync:', err?.message || err);
      }
    }

    return data || record;
  }

  /**
   * 4. Insurance Plans & Benefits Management
   */
  async listPlansAndVersions(ctx: ResolvedInstitutionContext) {
    const scope = await this.getProviderPlanScope(ctx.hmoProviderId!);
    const versionsByPlan = new Map<string, any[]>();
    for (const v of scope.versions) {
      const list = versionsByPlan.get(v.plan_id) || [];
      list.push(v);
      versionsByPlan.set(v.plan_id, list);
    }

    return scope.plans.map((plan: any) => {
      const pVersions = versionsByPlan.get(plan.id) || [];
      const latest = pVersions[0] || null;
      return {
        ...plan,
        latestVersion: latest,
        versions: pVersions,
      };
    });
  }

  async createOrVersionPlan(ctx: ResolvedInstitutionContext, body: any) {
    const providerId = ctx.hmoProviderId!;
    const actorUserId = await this.resolvePublicUserIdOrNull(ctx.authUserId);
    const code = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\-]/g, '_');
    const name = String(body.name || '').trim();
    if (!code || code.length < 2 || !name) {
      throw new Error('Plan code (min 2 chars) and plan name are required.');
    }

    // 1. Upsert hw_plans scoped to providerId
    const { data: planRow, error: planErr } = await supabaseAdmin
      .from('hw_plans')
      .upsert(
        {
          provider_id: providerId,
          code,
          name,
          status: body.publishImmediately ? 'active' : 'draft',
          created_by: actorUserId,
        },
        { onConflict: 'provider_id,code' }
      )
      .select('*')
      .single();

    if (planErr || !planRow) {
      throw new Error(planErr?.message || 'Failed to save HMO plan.');
    }

    // 2. Determine next version number
    const { data: existingVersions } = await supabaseAdmin
      .from('hw_plan_versions')
      .select('version')
      .eq('plan_id', planRow.id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingVersions && existingVersions.length > 0 ? Number(existingVersions[0].version) + 1 : 1;
    const premiumMinor = Number(
      body.premium_minor !== undefined
        ? body.premium_minor
        : Math.round(Number(body.premiumNaira || body.premium || 15000) * 100)
    );
    const billingFrequency = ['monthly', 'quarterly', 'termly', 'annual', 'one_off'].includes(body.billing_frequency || body.billingFrequency)
      ? (body.billing_frequency || body.billingFrequency)
      : 'termly';
    const memberCategories =
      Array.isArray(body.member_categories || body.memberCategories) &&
      (body.member_categories || body.memberCategories).length > 0
        ? (body.member_categories || body.memberCategories)
        : ['student', 'teaching_staff', 'non_teaching_staff', 'dependant'];

    const isPublished = Boolean(body.publishImmediately);
    const versionPayload = {
      plan_id: planRow.id,
      version: nextVersion,
      status: isPublished ? 'published' : 'draft',
      premium_minor: Math.max(0, premiumMinor),
      currency: 'NGN',
      billing_frequency: billingFrequency,
      member_categories: memberCategories,
      eligibility_rules: body.eligibility_rules || body.eligibilityRules || {
        minAge: 0,
        maxAge: 65,
        waitingPeriodDays: Number(body.waitingPeriodDays || 14),
        maxDependants: Number(body.maxDependants || 4),
      },
      benefits: Array.isArray(body.benefits)
        ? body.benefits
        : [
            { category: 'Outpatient Care', limitMinor: Number(body.outpatientLimitMinor || 25000000), copayBps: Number(body.copayBps || 0) },
            { category: 'Inpatient / Admission', limitMinor: Number(body.inpatientLimitMinor || 100000000), copayBps: 0 },
            { category: 'Emergency & Ambulance', limitMinor: 50000000, copayBps: 0 },
          ],
      exclusions: Array.isArray(body.exclusions) ? body.exclusions : ['Cosmetic procedures', 'Unapproved overseas treatment'],
      requires_verification: body.requires_verification !== false,
      activation_requires_payment: body.activation_requires_payment !== false,
      effective_from: body.effective_from || body.effectiveFrom || new Date().toISOString().slice(0, 10),
      effective_to: body.effective_to || body.effectiveTo || null,
      published_at: isPublished ? new Date().toISOString() : null,
      published_by: isPublished ? actorUserId : null,
    };

    const { data: versionRow, error: verErr } = await supabaseAdmin
      .from('hw_plan_versions')
      .insert(versionPayload)
      .select('*')
      .single();

    if (verErr) throw new Error(verErr.message);

    if (isPublished && versionRow?.id) {
      try {
        await offerPublishedVersionToLinkedSchools(
          providerId,
          versionRow.id,
          planRow.id,
          actorUserId
        );
      } catch (err: any) {
        console.warn('[HmoPortalService.createOrVersionPlan] linked-school offer sync:', err?.message || err);
      }
    }

    return {
      plan: planRow,
      version: versionRow,
    };
  }

  async updatePlanStatus(ctx: ResolvedInstitutionContext, planId: string, status: 'draft' | 'active' | 'retired') {
    const providerId = ctx.hmoProviderId!;
    const { data: plan } = await supabaseAdmin
      .from('hw_plans')
      .select('*')
      .eq('id', planId)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (!plan) {
      throw new Error('Plan not found or does not belong to your HMO institution.');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('hw_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('provider_id', providerId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    if (status === 'active') {
      try {
        // Activate often happens without the "publish version" checkbox; promote latest draft.
        const { data: versions } = await supabaseAdmin
          .from('hw_plan_versions')
          .select('id, status, version')
          .eq('plan_id', planId)
          .order('version', { ascending: false });
        let publishedIds = (versions || [])
          .filter((v: any) => String(v.status) === 'published')
          .map((v: any) => String(v.id));
        if (publishedIds.length === 0) {
          const draft = (versions || []).find((v: any) => String(v.status) === 'draft');
          if (draft) {
            const { data: promoted } = await supabaseAdmin
              .from('hw_plan_versions')
              .update({
                status: 'published',
                published_at: new Date().toISOString()
              })
              .eq('id', draft.id)
              .eq('status', 'draft')
              .select('id')
              .maybeSingle();
            if (promoted?.id) publishedIds = [String(promoted.id)];
          }
        }
        for (const versionId of publishedIds) {
          await offerPublishedVersionToLinkedSchools(providerId, versionId, planId, null);
        }
      } catch (err: any) {
        console.warn('[HmoPortalService.updatePlanStatus] linked-school offer sync:', err?.message || err);
      }
    }

    return updated;
  }

  /**
   * 5. Member & Enrollment Management (Scoped strictly to HMO's plans)
   */
  async listEnrollments(
    ctx: ResolvedInstitutionContext,
    filters?: { status?: string; tenantId?: string; planId?: string; search?: string }
  ) {
    const providerId = ctx.hmoProviderId!;
    const scope = await this.getProviderPlanScope(providerId);
    if (scope.versionIds.length === 0) return [];

    let targetVersionIds = scope.versionIds;
    if (filters?.planId) {
      targetVersionIds = scope.versions
        .filter((v: any) => v.plan_id === filters.planId)
        .map((v: any) => v.id);
      if (targetVersionIds.length === 0) return [];
    }

    let query = supabaseAdmin
      .from('hw_enrolments')
      .select('*')
      .in('plan_version_id', targetVersionIds)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    const { data: enrolments, error } = await query;
    if (error || !enrolments || enrolments.length === 0) return [];

    const memberIds = Array.from(new Set(enrolments.map((e: any) => e.member_id)));
    const tenantIds = Array.from(new Set(enrolments.map((e: any) => e.tenant_id)));
    const enrolmentIds = enrolments.map((e: any) => e.id);

    const membersRes = await supabaseAdmin.from('hw_members').select('*').in('id', memberIds);
    const policiesRes = await supabaseAdmin.from('hw_policies').select('*').in('enrolment_id', enrolmentIds);
    const tenantMap = await this.fetchTenantsByIds(tenantIds);
    const schoolLinkByTenant = new Map<string, any>();
    try {
      const { data: links } = await supabaseAdmin
        .from('hw_hmo_school_links')
        .select('tenant_id, contact_person, contact_email, contact_phone, tenant_type, onboarding_status')
        .eq('provider_id', providerId)
        .in('tenant_id', tenantIds);
      for (const link of links || []) {
        if (link?.tenant_id) schoolLinkByTenant.set(String(link.tenant_id), link);
      }
    } catch {
      /* school links optional */
    }
    const members = membersRes.data;
    const policies = policiesRes.data;

    const memberMap = new Map<string, any>((members || []).map((m: any) => [m.id, m]));
    const policyMap = new Map<string, any>((policies || []).map((p: any) => [p.enrolment_id, p]));
    const planById = new Map<string, any>(scope.plans.map((p: any) => [p.id, p]));
    const versionById = new Map<string, any>(scope.versions.map((v: any) => [v.id, v]));

    const studentIds = Array.from(
      new Set(
        (members || [])
          .map((m: any) => m.student_id)
          .filter((id: unknown) => typeof id === 'string' && id.length > 0),
      ),
    ) as string[];

    const studentMap = new Map<string, any>();
    const entityPayloadByStudentId = new Map<string, any>();
    const guardiansByStudentId = new Map<string, any[]>();
    const parentsByKey = new Map<string, any>();
    const parentCustomerById = new Map<string, any>();

    const normalizePhone = (value: unknown): string =>
      String(value || '').replace(/\D/g, '').replace(/^0+/, '');
    const parentIdentityKey = (name: unknown, phone: unknown): string =>
      `${String(name || '').trim().toLowerCase()}|${normalizePhone(phone)}`;
    const rememberParent = (raw: any, syncId?: string | null) => {
      if (!raw || typeof raw !== 'object') return;
      const email =
        String(raw.email || raw.parentEmail || raw.parent_email || raw.guardianEmail || '').trim() ||
        null;
      const phone = raw.phone || raw.parentPhone || raw.parent_phone || null;
      const name = raw.fullName || raw.name || raw.parentName || raw.parent_name || null;
      const relationship =
        raw.relationship ||
        raw.parentRelationship ||
        raw.parent_relationship ||
        raw.guardianRelationship ||
        raw.guardian_relationship ||
        null;
      const record = {
        ...raw,
        email,
        phone,
        name,
        relationship: relationship ? String(relationship) : null,
        syncId: syncId || raw.syncId || raw.sync_id || raw.id || null,
      };
      const keys = [
        syncId,
        raw.syncId,
        raw.sync_id,
        raw.id,
        raw.localKey,
        raw.localId,
        raw.parentKey,
      ]
        .map((k) => (k == null ? '' : String(k).trim()))
        .filter(Boolean);
      for (const key of keys) parentsByKey.set(key, record);
      const phoneKey = normalizePhone(phone);
      if (phoneKey) parentsByKey.set(`phone:${phoneKey}`, record);
      const identity = parentIdentityKey(name, phone);
      if (identity !== '|') parentsByKey.set(`id:${identity}`, record);
    };

    if (studentIds.length > 0) {
      const studentsRes = await supabaseAdmin.from('students').select('*').in('id', studentIds);
      for (const s of studentsRes.data || []) studentMap.set(s.id, s);

      try {
        const entitiesRes = await supabaseAdmin
          .from('school_entities')
          .select('sync_id, payload')
          .eq('entity_type', 'student')
          .in('sync_id', studentIds);
        for (const ent of entitiesRes.data || []) {
          if (ent?.sync_id) entityPayloadByStudentId.set(String(ent.sync_id), ent.payload || {});
        }
      } catch {
        // school_entities may be absent on some environments
      }

      // School parent directory (email lives here, not on students.parent_*)
      try {
        const parentEntitiesRes = await supabaseAdmin
          .from('school_entities')
          .select('sync_id, payload, tenant_id')
          .eq('entity_type', 'parent')
          .in('tenant_id', tenantIds);
        for (const ent of parentEntitiesRes.data || []) {
          rememberParent(ent.payload || {}, ent.sync_id);
        }
      } catch {
        // optional
      }

      try {
        const guardianJoined = await supabaseAdmin
          .from('hw_guardian_links')
          .select('student_id, relationship, is_primary, status, guardian_user_id, users:guardian_user_id(id, name, email, phone)')
          .in('student_id', studentIds);

        let guardianLinks: any[] | null = guardianJoined.data as any[] | null;
        if (guardianJoined.error || !guardianLinks) {
          const guardianPlain = await supabaseAdmin
            .from('hw_guardian_links')
            .select('student_id, relationship, is_primary, status, guardian_user_id')
            .in('student_id', studentIds);
          guardianLinks = guardianPlain.data as any[] | null;
        }

        const guardianUserIds = Array.from(
          new Set(
            (guardianLinks || [])
              .map((l: any) => l.guardian_user_id)
              .filter((id: unknown) => typeof id === 'string' && id.length > 0),
          ),
        ) as string[];
        const usersById = new Map<string, any>();
        if (guardianUserIds.length > 0) {
          const usersRes = await supabaseAdmin
            .from('users')
            .select('id, name, email, phone')
            .in('id', guardianUserIds);
          for (const u of usersRes.data || []) usersById.set(u.id, u);
        }

        for (const link of guardianLinks || []) {
          const sid = String(link.student_id || '');
          if (!sid) continue;
          const status = String(link.status || '').toLowerCase();
          if (['rejected', 'revoked', 'expired'].includes(status)) continue;
          const joined = Array.isArray((link as any).users) ? (link as any).users[0] : (link as any).users;
          const user = joined || usersById.get(String(link.guardian_user_id || '')) || null;
          const list = guardiansByStudentId.get(sid) || [];
          list.push({
            relationship: link.relationship || null,
            isPrimary: !!link.is_primary,
            status: link.status || null,
            name: user?.name || null,
            email: user?.email || null,
            phone: user?.phone || null,
          });
          guardiansByStudentId.set(sid, list);
        }
      } catch {
        // guardian enrichment is optional for the queue
      }

      // customers: student mirror + parent (par-*) contacts
      const parentCustomerIds = Array.from(
        new Set(
          Array.from(entityPayloadByStudentId.values())
            .flatMap((payload: any) => [
              payload?.parentSyncId,
              payload?.parent_sync_id,
              payload?.parentId,
              payload?.parent_id,
            ])
            .map((v) => (v == null ? '' : String(v).trim()))
            .filter(Boolean),
        ),
      );
      try {
        const customerIds = Array.from(new Set([...studentIds, ...parentCustomerIds]));
        if (customerIds.length > 0) {
          const customersRes = await supabaseAdmin
            .from('customers')
            .select('id, name, email, phone, address')
            .in('id', customerIds);
          for (const c of customersRes.data || []) {
            parentCustomerById.set(String(c.id), c);
            if (studentIds.includes(c.id)) {
              const existing = entityPayloadByStudentId.get(String(c.id)) || {};
              entityPayloadByStudentId.set(String(c.id), {
                ...existing,
                customerName: c.name,
                customerEmail: c.email,
                customerPhone: c.phone,
                customerAddress: c.address,
              });
            } else {
              rememberParent(
                {
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  address: c.address,
                },
                c.id,
              );
            }
          }
        }
      } catch {
        // optional
      }
    }

    let rows = enrolments.map((e: any) => {
      const m = memberMap.get(e.member_id) || {};
      const t = tenantMap.get(e.tenant_id) || {};
      const pol = policyMap.get(e.id) || null;
      const ver = versionById.get(e.plan_version_id) || {};
      const plan = planById.get(ver.plan_id) || {};
      const enrolmentRef = `ENR-${String(e.id).slice(0, 8).toUpperCase()}`;
      const student = m.student_id ? studentMap.get(m.student_id) || {} : {};
      const entity = m.student_id ? entityPayloadByStudentId.get(String(m.student_id)) || {} : {};
      const guardians = m.student_id ? guardiansByStudentId.get(String(m.student_id)) || [] : [];
      const primaryGuardian =
        guardians.find((g) => g.isPrimary) || guardians[0] || null;

      const firstName = student.first_name || entity.firstName || entity.first_name || null;
      const middleName = student.middle_name || entity.middleName || entity.middle_name || null;
      const lastName = student.last_name || entity.lastName || entity.last_name || null;
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || null;
      const dateOfBirth =
        student.date_of_birth || entity.dateOfBirth || entity.date_of_birth || null;
      const gender = student.gender || entity.gender || null;
      const currentClass =
        student.current_class || entity.className || entity.current_class || m.cohort_label || null;
      const admissionNumber =
        student.admission_number || entity.admissionNumber || entity.admission_number || null;
      const linkedParentKeys = [
        entity.parentSyncId,
        entity.parent_sync_id,
        entity.parentId,
        entity.parent_id,
        entity.parentKey,
        entity.parent_key,
      ]
        .map((k) => (k == null ? '' : String(k).trim()))
        .filter(Boolean);
      let linkedParent: any = null;
      for (const key of linkedParentKeys) {
        linkedParent = parentsByKey.get(key) || parentCustomerById.get(key) || null;
        if (linkedParent) break;
      }
      const provisionalParentName =
        student.parent_name ||
        entity.parentName ||
        entity.parent_name ||
        primaryGuardian?.name ||
        entity.customerName ||
        null;
      const provisionalParentPhone =
        student.parent_phone ||
        entity.parentPhone ||
        entity.parent_phone ||
        primaryGuardian?.phone ||
        entity.customerPhone ||
        student.phone ||
        null;
      if (!linkedParent) {
        linkedParent =
          parentsByKey.get(`phone:${normalizePhone(provisionalParentPhone)}`) ||
          parentsByKey.get(`id:${parentIdentityKey(provisionalParentName, provisionalParentPhone)}`) ||
          null;
      }

      const parentName = provisionalParentName || linkedParent?.name || null;
      const parentPhone = provisionalParentPhone || linkedParent?.phone || null;
      const parentEmail =
        student.parent_email ||
        entity.parentEmail ||
        entity.parent_email ||
        entity.guardianEmail ||
        entity.guardian_email ||
        linkedParent?.email ||
        primaryGuardian?.email ||
        entity.customerEmail ||
        null;
      const parentRelationship =
        primaryGuardian?.relationship ||
        entity.parentRelationship ||
        entity.parent_relationship ||
        entity.relationship ||
        entity.guardianRelationship ||
        entity.guardian_relationship ||
        linkedParent?.relationship ||
        (parentName || parentPhone || parentEmail ? 'parent_guardian' : null);
      const parentLocation =
        entity.parentAddress ||
        entity.parent_address ||
        linkedParent?.address ||
        entity.address ||
        entity.homeAddress ||
        entity.home_address ||
        entity.customerAddress ||
        null;
      const memberAddress = parentLocation || this.formatTenantLocation(t);

      const link = schoolLinkByTenant.get(String(e.tenant_id)) || {};
      const schoolName =
        t.business_name ||
        t.name ||
        t.owner_name ||
        link.contact_person ||
        `School ${String(e.tenant_id).slice(0, 6)}`;
      const schoolPhone = t.phone || link.contact_phone || null;
      const schoolEmail = t.owner_email || t.email || link.contact_email || null;
      const schoolAddress = this.formatTenantLocation(t);

      return {
        id: e.id,
        enrolmentReference: enrolmentRef,
        tenantId: e.tenant_id,
        schoolName,
        schoolPhone,
        schoolEmail,
        schoolAddress,
        schoolState: t.state || null,
        schoolCity: t.city || t.lga || null,
        memberId: e.member_id,
        memberCategory: m.member_category || 'student',
        member: {
          id: e.member_id,
          studentId: m.student_id || null,
          fullName,
          firstName,
          middleName,
          lastName,
          admissionNumber,
          dateOfBirth,
          gender,
          currentClass,
          address: memberAddress,
          parentName,
          parentPhone,
          parentEmail,
          parentLocation,
          parentRelationship,
          guardians,
        },
        statusReason: e.status_reason || null,
        insurerMemberRef: m.insurer_member_ref || pol?.policy_number || null,
        cohortLabel: m.cohort_label || null,
        planId: plan.id || null,
        planCode: plan.code || 'STD',
        planName: plan.name || 'Health Plan',
        planVersion: ver.version || 1,
        premiumMinor: ver.premium_minor || 0,
        periodStart: e.period_start,
        periodEnd: e.period_end,
        status: e.status,
        providerSyncStatus: e.provider_sync_status,
        policyNumber: pol?.policy_number || null,
        policyStatus: pol?.status || null,
        createdAt: e.created_at,
      };
    });

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.enrolmentReference.toLowerCase().includes(q) ||
          String(r.insurerMemberRef || '').toLowerCase().includes(q) ||
          String(r.schoolName || '').toLowerCase().includes(q) ||
          String(r.planName || '').toLowerCase().includes(q) ||
          String(r.member?.fullName || '').toLowerCase().includes(q) ||
          String(r.member?.admissionNumber || '').toLowerCase().includes(q) ||
          String(r.member?.parentName || '').toLowerCase().includes(q) ||
          String(r.member?.parentEmail || '').toLowerCase().includes(q),
      );
    }

    return rows;
  }

  /**
   * Confirms or rejects an individual enrollment by the HMO, recording the external HMO Member ID & Policy.
   */
  async adjudicateEnrollment(
    ctx: ResolvedInstitutionContext,
    enrolmentId: string,
    payload: {
      decision: 'confirm' | 'reject' | 'suspend';
      hmoMemberId?: string;
      policyNumber?: string;
      effectiveDate?: string;
      expiryDate?: string;
      reason?: string;
    }
  ) {
    const providerId = ctx.hmoProviderId!;
    const scope = await this.getProviderPlanScope(providerId);

    const { data: enrolment } = await supabaseAdmin
      .from('hw_enrolments')
      .select('*')
      .eq('id', enrolmentId)
      .maybeSingle();

    if (!enrolment || !scope.versionIds.includes(enrolment.plan_version_id)) {
      throw new Error('Enrollment not found or does not belong to your HMO institution.');
    }

    if (payload.decision === 'confirm') {
      const hmoMemberId = String(payload.hmoMemberId || payload.policyNumber || '').trim();
      if (!hmoMemberId) {
        throw new Error('HMO Member ID / Policy Number is required to confirm coverage.');
      }
      const policyNumber = String(payload.policyNumber || hmoMemberId).trim();
      const effectiveDate = payload.effectiveDate || enrolment.period_start;
      const expiryDate = payload.expiryDate || enrolment.period_end;

      // 1. Update hw_members.insurer_member_ref
      const { error: memberErr } = await supabaseAdmin
        .from('hw_members')
        .update({ insurer_member_ref: hmoMemberId, updated_at: new Date().toISOString() })
        .eq('id', enrolment.member_id);
      if (memberErr) {
        throw new Error(`Failed to save HMO Member ID: ${memberErr.message}`);
      }

      // 2. Upsert active hw_policies record first (required by trg_hw_enrolment_active_policy_check)
      const eventId = `hmo-portal-confirm-${enrolmentId}-${Date.now()}`;
      const { error: policyErr } = await supabaseAdmin.from('hw_policies').upsert(
        {
          tenant_id: enrolment.tenant_id,
          enrolment_id: enrolment.id,
          provider_id: providerId,
          policy_number: policyNumber,
          status: 'active',
          effective_date: effectiveDate,
          expiry_date: expiryDate,
          activation_event_id: eventId,
          activation_confirmed_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        },
        { onConflict: 'enrolment_id' }
      );
      if (policyErr) {
        throw new Error(`Failed to create active policy: ${policyErr.message}`);
      }

      // 3. Advance through legal trigger edges only (never assume an update succeeded)
      const fromStatus = String(enrolment.status || '');
      const hops: string[] =
        fromStatus === 'active'
          ? []
          : fromStatus === 'draft'
            ? ['enrolment_pending', 'awaiting_verification', 'awaiting_insurer_activation', 'active']
            : fromStatus === 'enrolment_pending'
              ? ['awaiting_verification', 'awaiting_insurer_activation', 'active']
              : fromStatus === 'awaiting_verification' || fromStatus === 'awaiting_premium_payment'
                ? ['awaiting_insurer_activation', 'active']
                : fromStatus === 'awaiting_insurer_activation'
                  ? ['active']
                  : fromStatus === 'rejected' || fromStatus === 'cancelled'
                    ? []
                    : ['active'];

      if (fromStatus === 'rejected' || fromStatus === 'cancelled') {
        throw new Error(`Cannot confirm a ${fromStatus} enrollment. Create a new enrollment instead.`);
      }

      const actorUserId = await this.resolvePublicUserIdOrNull(ctx.authUserId);
      let currentStatus = fromStatus;
      for (const next of hops) {
        const updates: Record<string, any> = {
          status: next,
          updated_at: new Date().toISOString(),
        };
        if (next === 'active') {
          updates.provider_sync_status = 'synced';
          updates.last_provider_sync_at = new Date().toISOString();
          updates.verified_at = new Date().toISOString();
          if (actorUserId) updates.verified_by = actorUserId;
          updates.status_reason = `Confirmed by HMO with member ID ${hmoMemberId}`;
        }
        const { data: updated, error } = await supabaseAdmin
          .from('hw_enrolments')
          .update(updates)
          .eq('id', enrolment.id)
          .select('id, status')
          .single();
        if (error) {
          throw new Error(
            `Failed to confirm enrollment (${currentStatus} → ${next}): ${error.message}`
          );
        }
        currentStatus = updated?.status || next;
      }

      return { enrolmentId, status: currentStatus || 'active', hmoMemberId, policyNumber };
    }

    if (payload.decision === 'reject') {
      const reason = String(
        payload.reason || (payload as any).rejectionReason || (payload as any).rejection_reason || ''
      ).trim();
      if (reason.length < 5) {
        throw new Error('A rejection reason is required (minimum 5 characters).');
      }

      // Staging DB trigger only allows specific edges. enrolment_pending cannot
      // jump straight to rejected — hop through awaiting_verification first.
      // Some states only allow cancelled; treat that as a closed rejection.
      const from = String(enrolment.status || '');
      const hops: string[] =
        from === 'enrolment_pending'
          ? ['awaiting_verification', 'rejected']
          : from === 'awaiting_verification' || from === 'awaiting_insurer_activation'
            ? ['rejected']
            : from === 'awaiting_premium_payment' || from === 'draft'
              ? ['cancelled']
              : from === 'rejected' || from === 'cancelled'
                ? []
                : ['rejected'];

      if (from === 'rejected' || from === 'cancelled') {
        return { enrolmentId, status: from, reason };
      }

      let currentStatus = from;
      for (const next of hops) {
        const updates: Record<string, any> = {
          status: next,
          status_reason: reason,
          updated_at: new Date().toISOString(),
        };
        if (next === 'rejected' || next === 'cancelled') {
          updates.provider_sync_status = 'failed';
          updates.provider_error = reason;
        }
        const { data: updated, error } = await supabaseAdmin
          .from('hw_enrolments')
          .update(updates)
          .eq('id', enrolment.id)
          .select('id, status')
          .single();
        if (error) {
          throw new Error(
            `Failed to reject enrollment (${currentStatus} → ${next}): ${error.message}`
          );
        }
        currentStatus = updated?.status || next;
      }

      return { enrolmentId, status: currentStatus, reason };
    }

    if (payload.decision === 'suspend') {
      await supabaseAdmin
        .from('hw_enrolments')
        .update({
          status: 'suspended',
          status_reason: payload.reason || 'Suspended by HMO',
        })
        .eq('id', enrolment.id);
      await supabaseAdmin
        .from('hw_policies')
        .update({ status: 'suspended' })
        .eq('enrolment_id', enrolment.id);
      return { enrolmentId, status: 'suspended' };
    }

    throw new Error(`Unsupported enrollment decision: ${payload.decision}`);
  }

  /**
   * 6. Excel/CSV Integration Centre: Batch Creation, Export, and Response Reconciliation
   */
  async listBatches(ctx: ResolvedInstitutionContext) {
    const providerId = ctx.hmoProviderId!;
    const { data, error } = await supabaseAdmin
      .from('hw_enrolment_batches')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async createEnrollmentBatch(
    ctx: ResolvedInstitutionContext,
    payload: {
      tenantId?: string;
      planId?: string;
      academicSession?: string;
      coverageStart?: string;
      coverageEnd?: string;
      notes?: string;
    }
  ) {
    const providerId = ctx.hmoProviderId!;
    const enrollments = await this.listEnrollments(ctx, {
      tenantId: payload.tenantId,
      planId: payload.planId,
    });

    const candidateRows = enrollments.filter((e: any) =>
      ['enrolment_pending', 'awaiting_verification', 'awaiting_premium_payment', 'awaiting_insurer_activation', 'draft'].includes(
        e.status
      )
    );

    const batchReference = `BATCH-${ctx.institutionCode || 'HMO'}-${Date.now().toString().slice(-6)}`;
    let validCount = 0;
    let invalidCount = 0;

    const batchItemsPayload = candidateRows.map((row: any, idx: number) => {
      const member = row.member || {};
      const itemCandidate = {
        enrolment_reference: row.enrolmentReference,
        member_full_name: member.fullName || `Member ${row.enrolmentReference}`,
        member_category: row.memberCategory || 'student',
        date_of_birth: member.dateOfBirth || null,
        sex: member.gender || null,
        plan_code: row.planCode || 'STD',
        period_start: row.periodStart,
        period_end: row.periodEnd,
      };
      const check = hmoExcelExchangeService.validateBatchItem(itemCandidate);
      if (check.valid) validCount++;
      else invalidCount++;

      return {
        provider_id: providerId,
        tenant_id: row.tenantId,
        enrolment_id: row.id,
        member_id: row.memberId,
        enrolment_reference: row.enrolmentReference,
        row_number: idx + 1,
        member_full_name: itemCandidate.member_full_name,
        member_category: itemCandidate.member_category,
        date_of_birth: itemCandidate.date_of_birth,
        sex: itemCandidate.sex,
        plan_code: itemCandidate.plan_code,
        plan_name: row.planName,
        school_name: row.schoolName,
        validation_status: check.valid ? 'valid' : 'invalid',
        validation_errors: check.errors,
        reconciliation_status: 'pending',
      };
    });

    const initialStatus: BatchStatus =
      invalidCount > 0 ? 'validation_failed' : 'ready_for_export';

    const actorUserId = await this.resolvePublicUserIdOrNull(ctx.authUserId);
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('hw_enrolment_batches')
      .insert({
        batch_reference: batchReference,
        provider_id: providerId,
        tenant_id: payload.tenantId || null,
        plan_id: payload.planId || null,
        academic_session: payload.academicSession || '2026/2027',
        coverage_start: payload.coverageStart || new Date().toISOString().slice(0, 10),
        coverage_end:
          payload.coverageEnd ||
          new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        status: initialStatus,
        total_rows: batchItemsPayload.length,
        valid_rows: validCount,
        invalid_rows: invalidCount,
        pending_rows: batchItemsPayload.length,
        notes: payload.notes || null,
        created_by: actorUserId,
      })
      .select('*')
      .single();

    if (batchErr || !batch) {
      throw new Error(batchErr?.message || 'Failed to create enrollment batch.');
    }

    if (batchItemsPayload.length > 0) {
      const itemsWithBatchId = batchItemsPayload.map((it) => ({
        ...it,
        batch_id: batch.id,
      }));
      await supabaseAdmin.from('hw_enrolment_batch_items').insert(itemsWithBatchId);
    }

    return batch;
  }

  async exportBatchToCsv(ctx: ResolvedInstitutionContext, batchId: string) {
    const providerId = ctx.hmoProviderId!;
    const actorUserId = await this.resolvePublicUserIdOrNull(ctx.authUserId);
    const { data: batch } = await supabaseAdmin
      .from('hw_enrolment_batches')
      .select('*')
      .eq('id', batchId)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (!batch) {
      throw new Error('Enrollment batch not found or does not belong to your HMO institution.');
    }

    const { data: items } = await supabaseAdmin
      .from('hw_enrolment_batch_items')
      .select('*')
      .eq('batch_id', batchId)
      .eq('provider_id', providerId)
      .order('row_number', { ascending: true });

    const mappings = await hmoExcelExchangeService.listMappings(providerId);
    const activeMapping = mappings[0];

    const exported = hmoExcelExchangeService.generateBatchCsv({
      batchReference: batch.batch_reference,
      items: items || [],
      columnMappings: activeMapping?.column_mappings,
      dateFormat: activeMapping?.date_format || 'YYYY-MM-DD',
      delimiter: activeMapping?.delimiter || ',',
    });

    // Advance batch status to 'exported' if currently ready_for_export / draft / exported
    const nextExportCount = Number(batch.export_count || 0) + 1;
    await supabaseAdmin
      .from('hw_enrolment_batches')
      .update({
        status: batch.status === 'ready_for_export' || batch.status === 'draft' ? 'exported' : batch.status,
        export_count: nextExportCount,
        last_exported_at: new Date().toISOString(),
        last_exported_by: actorUserId,
      })
      .eq('id', batchId);

    return {
      batchId: batch.id,
      batchReference: batch.batch_reference,
      filename: exported.filename,
      rowCount: exported.rowCount,
      csv: exported.csv,
    };
  }

  async reconcileResponseSheet(
    ctx: ResolvedInstitutionContext,
    payload: {
      batchId?: string;
      fileName: string;
      csvContent: string;
      commit?: boolean;
      idempotencyKey?: string;
    }
  ) {
    const providerId = ctx.hmoProviderId!;
    const actorUserId = await this.resolvePublicUserIdOrNull(ctx.authUserId);
    const parsed = hmoExcelExchangeService.parseResponseCsvToRows(payload.csvContent || '');
    const idempotencyKey =
      payload.idempotencyKey || `${providerId}:${payload.batchId || 'all'}:${parsed.checksumSha256}`;

    // Fetch existing batch items for this HMO provider (or specific batchId)
    let itemsQuery = supabaseAdmin
      .from('hw_enrolment_batch_items')
      .select('*')
      .eq('provider_id', providerId);

    if (payload.batchId) {
      itemsQuery = itemsQuery.eq('batch_id', payload.batchId);
    }

    const { data: batchItems } = await itemsQuery;
    const reconciliation = hmoExcelExchangeService.reconcileRowsInMemory({
      providerId,
      parsedRows: parsed.rows,
      existingBatchItems: (batchItems || []) as any[],
    });

    if (!payload.commit) {
      return {
        mode: 'PREVIEW',
        fileName: payload.fileName,
        checksumSha256: parsed.checksumSha256,
        summary: reconciliation.summary,
        results: reconciliation.results,
      };
    }

    // Check if an identical committed job already exists for idempotency
    const { data: existingJob } = await supabaseAdmin
      .from('hw_import_jobs')
      .select('*')
      .eq('provider_id', providerId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingJob && ['completed', 'partially_completed'].includes(existingJob.status)) {
      return {
        mode: 'IDEMPOTENT_REPLAY',
        job: existingJob,
        fileName: payload.fileName,
        checksumSha256: parsed.checksumSha256,
        summary: existingJob.summary_payload || reconciliation.summary,
        results: reconciliation.results,
      };
    }

    const jobReference = `IMP-${ctx.institutionCode || 'HMO'}-${Date.now().toString().slice(-6)}`;
    const { data: jobRow } = await supabaseAdmin
      .from('hw_import_jobs')
      .upsert(
        {
          job_reference: jobReference,
          provider_id: providerId,
          batch_id: payload.batchId || null,
          import_type: 'ENROLMENT_RESPONSE',
          file_name: payload.fileName || 'response.csv',
          file_checksum_sha256: parsed.checksumSha256,
          file_size_bytes: Buffer.byteLength(payload.csvContent || '', 'utf8'),
          idempotency_key: idempotencyKey,
          status:
            reconciliation.summary.invalidRows > 0 || reconciliation.summary.unmatchedRows > 0
              ? 'partially_completed'
              : 'completed',
          total_rows: reconciliation.summary.totalRows,
          matched_rows: reconciliation.summary.matchedRows,
          confirmed_rows: reconciliation.summary.confirmedRows,
          rejected_rows: reconciliation.summary.rejectedRows,
          unmatched_rows: reconciliation.summary.unmatchedRows,
          duplicate_rows: reconciliation.summary.duplicateRows,
          invalid_rows: reconciliation.summary.invalidRows,
          summary_payload: reconciliation.summary,
          uploaded_by: actorUserId,
          committed_at: new Date().toISOString(),
        },
        { onConflict: 'provider_id,idempotency_key' }
      )
      .select('*')
      .maybeSingle();

    // Apply confirmed and rejected updates
    for (const rowResult of reconciliation.results) {
      if (rowResult.outcome === 'matched_confirmed' && rowResult.enrolmentId && rowResult.batchItemId) {
        await supabaseAdmin
          .from('hw_enrolment_batch_items')
          .update({
            reconciliation_status: 'confirmed',
            hmo_member_id: rowResult.hmoMemberId,
            hmo_policy_number: rowResult.hmoPolicyNumber,
            confirmed_effective_date: rowResult.confirmedEffectiveDate,
            confirmed_expiry_date: rowResult.confirmedExpiryDate,
            assigned_facility_ref: rowResult.assignedFacilityRef,
            reconciled_at: new Date().toISOString(),
            reconciled_by_job_id: jobRow?.id || null,
          })
          .eq('id', rowResult.batchItemId);

        try {
          await this.adjudicateEnrollment(ctx, rowResult.enrolmentId, {
            decision: 'confirm',
            hmoMemberId: rowResult.hmoMemberId || undefined,
            policyNumber: rowResult.hmoPolicyNumber || undefined,
            effectiveDate: rowResult.confirmedEffectiveDate || undefined,
            expiryDate: rowResult.confirmedExpiryDate || undefined,
          });
        } catch {}
      } else if (rowResult.outcome === 'matched_rejected' && rowResult.enrolmentId && rowResult.batchItemId) {
        await supabaseAdmin
          .from('hw_enrolment_batch_items')
          .update({
            reconciliation_status: 'rejected',
            rejection_code: rowResult.rejectionCode,
            rejection_reason: rowResult.rejectionReason,
            reconciled_at: new Date().toISOString(),
            reconciled_by_job_id: jobRow?.id || null,
          })
          .eq('id', rowResult.batchItemId);

        try {
          await this.adjudicateEnrollment(ctx, rowResult.enrolmentId, {
            decision: 'reject',
            reason: rowResult.rejectionReason || undefined,
          });
        } catch {}
      }

      if (jobRow?.id) {
        await supabaseAdmin.from('hw_import_row_results').insert({
          import_job_id: jobRow.id,
          provider_id: providerId,
          batch_item_id: rowResult.batchItemId,
          enrolment_id: rowResult.enrolmentId,
          row_number: rowResult.rowNumber,
          enrolment_reference: rowResult.enrolmentReference,
          outcome: rowResult.outcome,
          hmo_member_id: rowResult.hmoMemberId,
          hmo_policy_number: rowResult.hmoPolicyNumber,
          confirmed_effective_date: rowResult.confirmedEffectiveDate,
          confirmed_expiry_date: rowResult.confirmedExpiryDate,
          assigned_facility_ref: rowResult.assignedFacilityRef,
          rejection_code: rowResult.rejectionCode,
          rejection_reason: rowResult.rejectionReason,
          error_details: rowResult.errorDetails,
          raw_row_sanitized: rowResult.rawSanitized,
        });
      }
    }

    if (payload.batchId) {
      await supabaseAdmin
        .from('hw_enrolment_batches')
        .update({
          status: reconciliation.summary.nextBatchStatus,
          confirmed_rows: reconciliation.summary.confirmedRows,
          rejected_rows: reconciliation.summary.rejectedRows,
          reconciled_at: new Date().toISOString(),
        })
        .eq('id', payload.batchId)
        .eq('provider_id', providerId);
    }

    return {
      mode: 'COMMITTED',
      job: jobRow,
      fileName: payload.fileName,
      checksumSha256: parsed.checksumSha256,
      summary: reconciliation.summary,
      results: reconciliation.results,
    };
  }

  /**
   * 7. Provider Network (Hospitals, Clinics, Pharmacies, Labs)
   */
  async listFacilities(ctx: ResolvedInstitutionContext, filters?: { state?: string; search?: string }) {
    const providerId = ctx.hmoProviderId!;
    let query = supabaseAdmin
      .from('hw_facilities')
      .select('*')
      .eq('provider_id', providerId)
      .order('name', { ascending: true });

    if (filters?.state) {
      query = query.ilike('state', filters.state);
    }

    const { data, error } = await query;
    if (error) return [];
    let list = (data || []).map((f: any) => {
      let logo_url = f.logo_url || '';
      let latitude = f.latitude != null ? f.latitude : null;
      let longitude = f.longitude != null ? f.longitude : null;
      let restrictionsNote = f.restrictions || '';

      if (f.restrictions && typeof f.restrictions === 'string' && f.restrictions.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(f.restrictions);
          logo_url = logo_url || parsed.logo_url || '';
          if (latitude == null && parsed.latitude != null) latitude = parsed.latitude;
          if (longitude == null && parsed.longitude != null) longitude = parsed.longitude;
          restrictionsNote = parsed.note || '';
        } catch {
          // fallback to raw string
        }
      }

      return {
        ...f,
        logo_url,
        latitude,
        longitude,
        restrictions: restrictionsNote,
      };
    });

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (f: any) =>
          String(f.name || '').toLowerCase().includes(q) ||
          String(f.external_ref || '').toLowerCase().includes(q) ||
          String(f.state || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  async saveFacility(ctx: ResolvedInstitutionContext, body: any) {
    const providerId = ctx.hmoProviderId!;
    const externalRef = String(body.external_ref || body.externalRef || `FAC-${Date.now().toString().slice(-6)}`)
      .trim()
      .toUpperCase();
    const name = String(body.name || '').trim();
    if (!name) throw new Error('Facility name is required.');

    // Process facility logo if provided
    let logoUrl = String(body.logo_url || body.logoUrl || '').trim();
    if (body.logoImage && typeof body.logoImage === 'string' && body.logoImage.startsWith('data:image')) {
      try {
        validateImageBase64(body.logoImage, { maxSizeBytes: 3 * 1024 * 1024 });
        logoUrl = await uploadBase64ToContabo(
          body.logoImage,
          'facility-logos',
          `${providerId.slice(0, 8)}_${externalRef.replace(/[^A-Z0-9]/gi, '_')}`
        );
      } catch (err: any) {
        console.warn(`[HmoPortalService] Facility logo upload failed: ${err.message}`);
        // If upload fails, preserve existing logo or throw if validation failed
        if (err.name === 'ImageValidationError') throw err;
      }
    }

    // Process GPS coordinates
    const latNum = body.latitude !== undefined && body.latitude !== '' && body.latitude !== null ? Number(body.latitude) : null;
    const lngNum = body.longitude !== undefined && body.longitude !== '' && body.longitude !== null ? Number(body.longitude) : null;

    // Services parsing
    let parsedServices: string[] = [];
    if (Array.isArray(body.services)) {
      parsedServices = body.services.map((s: any) => String(s).trim()).filter(Boolean);
    } else if (typeof body.services === 'string') {
      parsedServices = body.services.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (parsedServices.length === 0) {
      parsedServices = ['Outpatient', 'Inpatient', 'Pharmacy', 'Emergency'];
    }

    // Resilient metadata storage inside restrictions column (avoids schema break on staging)
    const restrictionsPayload = JSON.stringify({
      note: typeof body.restrictions === 'string' && !body.restrictions.startsWith('{') ? body.restrictions : '',
      logo_url: logoUrl,
      latitude: !isNaN(latNum as number) ? latNum : null,
      longitude: !isNaN(lngNum as number) ? lngNum : null,
    });

    const record = {
      provider_id: providerId,
      external_ref: externalRef,
      name,
      state: body.state || 'Lagos',
      lga: body.lga || '',
      address: body.address || '',
      phone: body.phone || '',
      services: parsedServices,
      restrictions: restrictionsPayload,
      source: 'manual_verified',
      last_verified_at: new Date().toISOString(),
      is_active: body.is_active !== false,
    };

    const { data, error } = await supabaseAdmin
      .from('hw_facilities')
      .upsert(record, { onConflict: 'provider_id,external_ref' })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return {
      ...data,
      logo_url: logoUrl,
      latitude: !isNaN(latNum as number) ? latNum : null,
      longitude: !isNaN(lngNum as number) ? lngNum : null,
    };
  }

  /**
   * 8. Pre-Authorization & Claims Management
   */
  async listClaimsAndPreAuths(
    ctx: ResolvedInstitutionContext,
    filters?: { recordType?: 'pre_authorisation' | 'claim'; status?: string }
  ) {
    const providerId = ctx.hmoProviderId!;
    const { data: policies } = await supabaseAdmin
      .from('hw_policies')
      .select('id, policy_number, tenant_id, enrolment_id')
      .eq('provider_id', providerId);

    const policyIds = (policies || []).map((p: any) => p.id);
    if (policyIds.length === 0) return [];

    let query = supabaseAdmin
      .from('hw_claim_status_records')
      .select('*')
      .in('policy_id', policyIds)
      .order('status_date', { ascending: false });

    if (filters?.recordType) {
      query = query.eq('record_type', filters.recordType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) return [];
    const policyMap = new Map<string, any>((policies || []).map((p: any) => [p.id, p]));
    return (data || []).map((r: any) => ({
      ...r,
      policyNumber: policyMap.get(r.policy_id)?.policy_number || null,
    }));
  }

  async adjudicateClaimOrPreAuth(
    ctx: ResolvedInstitutionContext,
    recordId: string,
    payload: {
      status: 'approved' | 'rejected' | 'settled';
      authorisedAmountMinor?: number;
      rejectionReason?: string;
      notes?: string;
    }
  ) {
    const providerId = ctx.hmoProviderId!;
    const { data: rec } = await supabaseAdmin
      .from('hw_claim_status_records')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (!rec) throw new Error('Claim or Pre-Authorization record not found.');

    // Verify policy belongs to this HMO provider
    const { data: policy } = await supabaseAdmin
      .from('hw_policies')
      .select('id, provider_id, tenant_id')
      .eq('id', rec.policy_id)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (!policy) {
      throw new Error('Access denied: Claim/Pre-Authorization belongs to another HMO.');
    }

    const from = String(rec.status || '');
    const next = payload.status;
    const allowed: Record<string, string[]> = {
      approved: ['submitted', 'pending'],
      rejected: ['submitted', 'pending'],
      settled: ['approved'],
    };
    if (!allowed[next]?.includes(from)) {
      throw new Error(
        `Cannot move claim from ${from} to ${next}. Approval and settlement are separate; settlement does not disburse funds.`
      );
    }
    if (next === 'rejected') {
      const reason = String(payload.rejectionReason || '').trim();
      if (reason.length < 5) throw new Error('Rejection requires a recorded reason (at least 5 characters).');
    }

    const updates: Record<string, any> = {
      status: next,
      status_date: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };
    if (payload.authorisedAmountMinor !== undefined) {
      updates.authorised_amount_minor = Math.max(0, Number(payload.authorisedAmountMinor));
    }
    if (next === 'rejected') {
      updates.rejection_reason = String(payload.rejectionReason).trim();
    }

    const { data: updated, error } = await supabaseAdmin
      .from('hw_claim_status_records')
      .update(updates)
      .eq('id', recordId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    try {
      await supabaseAdmin.from('hw_claim_status_events').insert({
        claim_id: recordId,
        from_status: from,
        to_status: next,
        actor_user_id: ctx.authUserId || null,
        notes: payload.notes || payload.rejectionReason || null,
        occurred_at: new Date().toISOString(),
      });
    } catch {
      /* history table may be unapplied */
    }

    const { HealthAuditService } = await import('./health-audit.service');
    await HealthAuditService.log({
      tenantId: policy.tenant_id,
      actorUserId: ctx.authUserId || undefined,
      action: `claim.${next}`,
      resourceType: 'hw_claim_status_records',
      resourceId: recordId,
      changes: { from, to: next, rejectionReason: updates.rejection_reason || null },
    });

    const { HealthNotificationService } = await import('./health-notification.service');
    await HealthNotificationService.notifyTenantAdmins(
      policy.tenant_id,
      next === 'approved' ? 'claim.approved' : next === 'rejected' ? 'claim.rejected' : 'claim.settled',
      `HMO claim ${next}`,
      `Claim ${rec.claim_reference} is now ${next}. Settlement tracking is not a payout.`,
      { claimId: recordId, claimReference: rec.claim_reference }
    );

    return updated;
  }

  /**
   * 9. Billing & Premium Reconciliation + Profit-Sharing Statements Summary
   */
  async getBillingSummary(ctx: ResolvedInstitutionContext) {
    const providerId = ctx.hmoProviderId!;
    const scope = await this.getProviderPlanScope(providerId);

    let invoices: any[] = [];
    if (scope.versionIds.length > 0) {
      const { data: enrols } = await supabaseAdmin
        .from('hw_enrolments')
        .select('id')
        .in('plan_version_id', scope.versionIds);
      const enrolIds = (enrols || []).map((e: any) => e.id);
      if (enrolIds.length > 0) {
        const { data: invData } = await supabaseAdmin
          .from('hw_premium_invoices')
          .select('*')
          .in('enrolment_id', enrolIds)
          .order('created_at', { ascending: false });
        invoices = invData || [];
      }
    }

    let statements: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_profit_sharing_statements')
        .select('*')
        .eq('provider_id', providerId)
        .order('period_start', { ascending: false });
      statements = data || [];
    } catch {}

    const totalInvoicedMinor = invoices.reduce((sum, i) => sum + Number(i.amount_due_minor || 0), 0);
    const totalPaidMinor = invoices.reduce((sum, i) => sum + Number(i.amount_paid_minor || 0), 0);
    const outstandingMinor = Math.max(0, totalInvoicedMinor - totalPaidMinor);

    return {
      summary: {
        totalInvoices: invoices.length,
        totalInvoicedMinor,
        totalPaidMinor,
        outstandingMinor,
        paidInvoicesCount: invoices.filter((i) => i.status === 'paid').length,
        pendingInvoicesCount: invoices.filter((i) => ['issued', 'partially_paid'].includes(i.status)).length,
      },
      invoices: invoices.slice(0, 50),
      statements,
    };
  }

  /**
   * 10. HMO Users & Role Management + Searchable Audit Logs
   */
  async listUsersAndAudit(ctx: ResolvedInstitutionContext) {
    const providerId = ctx.hmoProviderId!;
    let users: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_hmo_user_memberships')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });
      users = data || [];
    } catch {}

    let importJobs: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('hw_import_jobs')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(25);
      importJobs = data || [];
    } catch {}

    return {
      currentRole: ctx.hmoRole,
      availableRoles: Object.keys(HMO_ROLE_PERMISSIONS) as HmoRole[],
      rolePermissionsMatrix: HMO_ROLE_PERMISSIONS,
      users,
      recentImportAudit: importJobs,
    };
  }
}

export const hmoPortalService = new HmoPortalService();
