// invify-backend/src/modules/health-insurance/services/health-enrolment.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext, EnrolmentStatus } from '../types';
import { HealthAuditService } from './health-audit.service';
import { SandboxHealthProviderAdapter } from '../adapters/sandbox.adapter';

export class HealthEnrolmentService {
  /**
   * List enrolments for a tenant with pagination and filters.
   */
  static async listEnrolments(
    ctx: HealthContext,
    params: {
      status?: EnrolmentStatus;
      memberId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('hw_enrolments')
      .select(`
        id,
        status,
        status_reason,
        period_start,
        period_end,
        provider_sync_status,
        created_at,
        hw_members (
          id,
          member_category,
          students (first_name, last_name, admission_number, current_class),
          hw_staff_profiles (
            employment_category,
            department,
            tenant_staff (name, staff_id)
          )
        ),
        hw_plan_versions (
          id,
          version,
          premium_minor,
          currency,
          billing_frequency,
          hw_plans (name, code, hw_providers (display_name, code))
        ),
        hw_policies (
          id,
          policy_number,
          status,
          effective_date,
          expiry_date
        )
      `, { count: 'exact' })
      .eq('tenant_id', ctx.tenantId);

    if (params.status) query = query.eq('status', params.status);
    if (params.memberId) query = query.eq('member_id', params.memberId);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to list enrolments: ${error.message}`);

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  private static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  /**
   * Resolve an hw_members row for enrolment. Accepts:
   * - hw_members.id (UUID)
   * - students.id (UUID) via studentId / student_id
   * - students.admission_number via admissionNumber / admission_number
   * - legacy mobile clients that send admission_number in memberId
   * Creates the hw_members row when a tenant student is found but not yet a member.
   */
  static async resolveMemberForEnrolment(
    ctx: HealthContext,
    params: {
      memberId?: string;
      studentId?: string;
      admissionNumber?: string;
    },
  ): Promise<{ id: string; tenant_id: string; member_category: string }> {
    const memberId = String(params.memberId || '').trim();
    const studentId = String(params.studentId || '').trim();
    const admissionNumber = String(params.admissionNumber || '').trim();

    if (memberId && this.isUuid(memberId)) {
      const { data: byMemberId } = await supabaseAdmin
        .from('hw_members')
        .select('id, tenant_id, member_category')
        .eq('id', memberId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();
      if (byMemberId) return byMemberId;

      // Mobile/web may pass the students.id UUID in memberId.
      try {
        const { HealthMemberService } = await import('./health-member.service');
        const ensured = await HealthMemberService.enrolStudentMember(ctx, memberId);
        return {
          id: String(ensured.id),
          tenant_id: ctx.tenantId,
          member_category: 'student',
        };
      } catch {
        throw new Error('Member not found');
      }
    }

    const studentUuid = studentId && this.isUuid(studentId) ? studentId : '';
    if (studentUuid) {
      const { HealthMemberService } = await import('./health-member.service');
      const ensured = await HealthMemberService.enrolStudentMember(ctx, studentUuid);
      return {
        id: String(ensured.id),
        tenant_id: ctx.tenantId,
        member_category: 'student',
      };
    }

    const admission = admissionNumber || (!this.isUuid(memberId) ? memberId : '');
    if (!admission) {
      throw new Error('Member not found');
    }

    const { data: students, error: stuErr } = await supabaseAdmin
      .from('students')
      .select('id, tenant_id, school_id, admission_number')
      .eq('admission_number', admission)
      .limit(25);

    if (stuErr) throw new Error(`Member lookup failed: ${stuErr.message}`);

    const student = (students || []).find((row: any) => {
      const tenant = row.tenant_id || row.school_id;
      return String(tenant) === String(ctx.tenantId);
    });

    if (!student?.id) {
      throw new Error('Member not found');
    }

    const { HealthMemberService } = await import('./health-member.service');
    const ensured = await HealthMemberService.enrolStudentMember(ctx, String(student.id));
    return {
      id: String(ensured.id),
      tenant_id: ctx.tenantId,
      member_category: 'student',
    };
  }

  /**
   * Create an enrolment in draft/enrolment_pending status.
   */
  static async createEnrolment(
    ctx: HealthContext,
    params: {
      memberId: string;
      planVersionId: string;
      periodStart: string;
      periodEnd: string;
    }
  ) {
    const raw = params as any;
    const memberIdRaw = String(raw.memberId || raw.member_id || '');
    const studentIdRaw = String(raw.studentId || raw.student_id || '');
    const admissionNumberRaw = String(raw.admissionNumber || raw.admission_number || '');
    const planVersionId = String(raw.planVersionId || raw.plan_version_id || '');
    const periodStart = String(raw.periodStart || raw.period_start || raw.start_date || '');
    const periodEnd = String(raw.periodEnd || raw.period_end || raw.end_date || '');

    // 1. Resolve or create hw_members for this tenant (member UUID, student UUID, or admission number)
    const member = await this.resolveMemberForEnrolment(ctx, {
      memberId: memberIdRaw,
      studentId: studentIdRaw,
      admissionNumber: admissionNumberRaw,
    });

    // 2. Verify plan version is published and offered by tenant
    const { data: offer, error: offErr } = await supabaseAdmin
      .from('hw_tenant_plan_offers')
      .select('id, default_funding, hw_plan_versions(*)')
      .eq('tenant_id', ctx.tenantId)
      .eq('plan_version_id', planVersionId)
      .eq('is_active', true)
      .maybeSingle();

    if (offErr || !offer) {
      throw new Error('Plan version is not currently offered by this organisation');
    }

    await this.assertPlanVersionEnrolable(planVersionId, offer.hw_plan_versions);

    const { assertBankOfferingForNewEnrolment } = await import('./bank-hmo-distribution.service');
    await assertBankOfferingForNewEnrolment(ctx.tenantId, planVersionId);

    // 3. Create enrolment record (starts in enrolment_pending or draft)
    const { data: enrolment, error: enrErr } = await supabaseAdmin
      .from('hw_enrolments')
      .insert({
        tenant_id: ctx.tenantId,
        member_id: member.id,
        plan_version_id: planVersionId,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'enrolment_pending',
        submitted_by: ctx.userId,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (enrErr) throw new Error(`Failed to create enrolment: ${enrErr.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'enrolment.created',
      resourceType: 'hw_enrolments',
      resourceId: enrolment.id,
      changes: params
    });

    try {
      const { HealthNotificationService } = await import('./health-notification.service');
      await HealthNotificationService.notifyTenantAdmins(
        ctx.tenantId,
        'enrolment.created',
        'HMO enrolment created',
        `A new enrolment was created for plan version ${planVersionId}.`,
        { enrolmentId: enrolment.id, planVersionId }
      );
    } catch {
      /* soft-fail */
    }

    return enrolment;
  }

  /**
   * Blocks enrolment into draft/retired/expired plan versions and non-verified providers.
   */
  static async assertPlanVersionEnrolable(planVersionId: string, embeddedVersion?: any) {
    let version = embeddedVersion;
    if (Array.isArray(version)) version = version[0];
    if (!version || !version.id) {
      const { data, error } = await supabaseAdmin
        .from('hw_plan_versions')
        .select('id, status, effective_from, effective_to, plan_id, hw_plans(id, status, provider_id, hw_providers(id, integration_status))')
        .eq('id', planVersionId)
        .maybeSingle();
      if (error || !data) throw new Error('Plan version was not found');
      version = data;
    }

    if (String(version.status || '') !== 'published') {
      throw new Error(`Plan version is not published (status: ${version.status || 'unknown'}). Enrolment is blocked.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    if (version.effective_from && String(version.effective_from) > today) {
      throw new Error('Plan version is not yet effective.');
    }
    if (version.effective_to && String(version.effective_to) < today) {
      throw new Error('Plan version has expired and is not available for new enrolments.');
    }

    let plan = version.hw_plans;
    if (Array.isArray(plan)) plan = plan[0];
    if (!plan?.id && version.plan_id) {
      const { data: planRow } = await supabaseAdmin
        .from('hw_plans')
        .select('id, status, provider_id, hw_providers(id, integration_status)')
        .eq('id', version.plan_id)
        .maybeSingle();
      plan = planRow;
    }
    if (!plan) throw new Error('Parent plan for this version was not found.');
    if (String(plan.status || '') !== 'active') {
      throw new Error(`Plan is not active (status: ${plan.status || 'unknown'}). Enrolment is blocked.`);
    }

    let provider = plan.hw_providers;
    if (Array.isArray(provider)) provider = provider[0];
    if (!provider?.id && plan.provider_id) {
      const { data: providerRow } = await supabaseAdmin
        .from('hw_providers')
        .select('id, integration_status')
        .eq('id', plan.provider_id)
        .maybeSingle();
      provider = providerRow;
    }
    if (!provider || provider.integration_status !== 'verified') {
      throw new Error(
        `HMO provider is not active for new enrolments (status: ${provider?.integration_status || 'unknown'}).`
      );
    }
  }

  /**
   * Review and verify enrolment eligibility.
   * Transitions from awaiting_verification to awaiting_premium_payment or rejected.
   */
  static async verifyEnrolment(
    ctx: HealthContext,
    enrolmentId: string,
    params: {
      decision: 'approve' | 'reject';
      reason?: string;
    }
  ) {
    const { data: current, error: getErr } = await supabaseAdmin
      .from('hw_enrolments')
      .select('id, status, plan_version_id, hw_plan_versions(activation_requires_payment)')
      .eq('id', enrolmentId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (getErr || !current) throw new Error('Enrolment not found');

    if (params.decision === 'reject') {
      const { data, error } = await supabaseAdmin
        .from('hw_enrolments')
        .update({
          status: 'rejected',
          status_reason: params.reason || 'Verification rejected',
          verified_by: ctx.userId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', enrolmentId)
        .select()
        .single();

      if (error) throw new Error(`Failed to reject enrolment: ${error.message}`);
      return data;
    }

    // If plan waives upfront payment, can transition straight to awaiting_insurer_activation
    const requiresPayment = (current as any).hw_plan_versions?.activation_requires_payment !== false;
    const targetStatus: EnrolmentStatus = requiresPayment 
      ? 'awaiting_premium_payment' 
      : 'awaiting_insurer_activation';

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('hw_enrolments')
      .update({
        status: targetStatus,
        status_reason: params.reason || 'Verified by administrator',
        verified_by: ctx.userId,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', enrolmentId)
      .select()
      .single();

    if (updErr) throw new Error(`Failed to verify enrolment: ${updErr.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'enrolment.verified',
      resourceType: 'hw_enrolments',
      resourceId: enrolmentId,
      changes: { decision: params.decision, targetStatus }
    });

    return updated;
  }

  /**
   * Activate policy via verified insurer confirmation.
   * This is the ONLY legitimate path to setting coverage to 'active'.
   */
  static async activatePolicyWithProviderEvent(
    tenantId: string,
    enrolmentId: string,
    providerId: string,
    policyNumber: string,
    activationEventId: string,
    effectiveDate: string,
    expiryDate: string
  ) {
    // 1. Upsert hw_policies with active status and activation metadata
    const { data: policy, error: polErr } = await supabaseAdmin
      .from('hw_policies')
      .upsert(
        {
          tenant_id: tenantId,
          enrolment_id: enrolmentId,
          provider_id: providerId,
          policy_number: policyNumber,
          status: 'active',
          effective_date: effectiveDate,
          expiry_date: expiryDate,
          activation_event_id: activationEventId,
          activation_confirmed_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString()
        },
        { onConflict: 'enrolment_id' }
      )
      .select()
      .single();

    if (polErr) throw new Error(`Failed to record policy: ${polErr.message}`);

    // 2. Transition enrolment to 'active'
    const { data: enrolment, error: enrErr } = await supabaseAdmin
      .from('hw_enrolments')
      .update({
        status: 'active',
        status_reason: `Activated via insurer confirmation event ${activationEventId}`,
        last_provider_sync_at: new Date().toISOString(),
        provider_sync_status: 'synced',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrolmentId)
      .select()
      .single();

    if (enrErr) throw new Error(`Failed to activate enrolment: ${enrErr.message}`);

    await HealthAuditService.log({
      tenantId,
      action: 'policy.activated_by_insurer',
      resourceType: 'hw_policies',
      resourceId: policy.id,
      changes: { policyNumber, activationEventId, enrolmentId }
    });

    return { policy, enrolment };
  }

  /**
   * Permanently remove a rejected/cancelled enrolment from the school list.
   * Cleans confirmation-batch and draft billing/policy children first.
   */
  static async dismissRejectedEnrolment(ctx: HealthContext, enrolmentId: string) {
    const { data: current, error: getErr } = await supabaseAdmin
      .from('hw_enrolments')
      .select('id, status, tenant_id')
      .eq('id', enrolmentId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (getErr || !current) throw new Error('Enrolment not found');
    if (!['rejected', 'cancelled'].includes(String(current.status))) {
      throw new Error('Only rejected or cancelled enrolments can be deleted');
    }

    const { data: policy } = await supabaseAdmin
      .from('hw_policies')
      .select('id, status')
      .eq('enrolment_id', enrolmentId)
      .maybeSingle();

    if (policy && !['pending', 'cancelled', 'rejected_by_provider'].includes(String(policy.status))) {
      throw new Error('Cannot delete an enrolment that still has an active policy record');
    }

    const { data: invoices } = await supabaseAdmin
      .from('hw_premium_invoices')
      .select('id, status')
      .eq('enrolment_id', enrolmentId);

    const blockingInvoice = (invoices || []).find((inv: any) =>
      ['issued', 'partially_paid', 'paid'].includes(String(inv.status))
    );
    if (blockingInvoice) {
      throw new Error('Cannot delete an enrolment that has billed premiums');
    }

    // Confirmation-queue / batch rows block hard delete (ON DELETE RESTRICT).
    await supabaseAdmin.from('hw_enrolment_batch_items').delete().eq('enrolment_id', enrolmentId);

    if ((invoices || []).length > 0) {
      await supabaseAdmin
        .from('hw_premium_invoices')
        .delete()
        .eq('enrolment_id', enrolmentId)
        .in('status', ['draft', 'void']);
    }

    if (policy) {
      await supabaseAdmin.from('hw_policies').delete().eq('id', policy.id);
    }

    const { error: delErr } = await supabaseAdmin
      .from('hw_enrolments')
      .delete()
      .eq('id', enrolmentId)
      .eq('tenant_id', ctx.tenantId);

    if (delErr) throw new Error(`Failed to delete enrolment: ${delErr.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'enrolment.dismissed',
      resourceType: 'hw_enrolments',
      resourceId: enrolmentId,
      changes: { previousStatus: current.status },
    });

    return { id: enrolmentId, deleted: true };
  }

  /**
   * Re-submit a rejected/cancelled enrolment as a fresh enrolment_pending row
   * using the same member, plan version, and coverage period.
   */
  static async repushRejectedEnrolment(ctx: HealthContext, enrolmentId: string) {
    const { data: current, error: getErr } = await supabaseAdmin
      .from('hw_enrolments')
      .select('id, status, member_id, plan_version_id, period_start, period_end')
      .eq('id', enrolmentId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (getErr || !current) throw new Error('Enrolment not found');
    if (!['rejected', 'cancelled'].includes(String(current.status))) {
      throw new Error('Only rejected or cancelled enrolments can be re-pushed');
    }

    // Unique open-period index: if a live twin already exists, just clear the rejected row.
    const { data: existingOpen } = await supabaseAdmin
      .from('hw_enrolments')
      .select('id, status, member_id, plan_version_id, period_start, period_end, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('member_id', current.member_id)
      .eq('plan_version_id', current.plan_version_id)
      .eq('period_start', current.period_start)
      .not('status', 'in', '(cancelled,rejected,expired)')
      .neq('id', enrolmentId)
      .maybeSingle();

    const result =
      existingOpen ||
      (await this.createEnrolment(ctx, {
        memberId: String(current.member_id),
        planVersionId: String(current.plan_version_id),
        periodStart: String(current.period_start),
        periodEnd: String(current.period_end),
      }));

    if (!result?.id) {
      throw new Error('Failed to re-push enrolment');
    }

    try {
      await this.dismissRejectedEnrolment(ctx, enrolmentId);
    } catch {
      /* keep rejected row if FK cleanup fails; open/pending row still usable */
    }

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'enrolment.repushed',
      resourceType: 'hw_enrolments',
      resourceId: result.id,
      changes: {
        fromEnrolmentId: enrolmentId,
        reusedExisting: Boolean(existingOpen),
      },
    });

    return result;
  }

  /**
   * Staging / Sandbox simulation: Submit to sandbox adapter and activate.
   * Rejected in production.
   */
  static async simulateSandboxActivation(ctx: HealthContext, enrolmentId: string) {
    const sandbox = new SandboxHealthProviderAdapter(); // Will throw in production

    const { data: enr, error: enrErr } = await supabaseAdmin
      .from('hw_enrolments')
      .select(`
        id,
        tenant_id,
        period_start,
        period_end,
        status,
        hw_members(id, member_category, students(first_name, last_name)),
        hw_plan_versions(id, hw_plans(id, code, provider_id, hw_providers(id, code)))
      `)
      .eq('id', enrolmentId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (enrErr || !enr) throw new Error('Enrolment not found');

    const providerId = (enr as any).hw_plan_versions?.hw_plans?.provider_id;
    if (!providerId) throw new Error('Provider not configured for plan');

    // Submit to sandbox
    const submitRes = await sandbox.submitEnrolment({
      enrolmentId: enr.id,
      memberReference: (enr as any).hw_members?.id,
      planCode: (enr as any).hw_plan_versions?.hw_plans?.code,
      periodStart: enr.period_start,
      periodEnd: enr.period_end,
      applicant: {
        firstName: (enr as any).hw_members?.students?.first_name || 'Member',
        lastName: (enr as any).hw_members?.students?.last_name || 'Applicant',
        category: (enr as any).hw_members?.member_category
      }
    });

    const statusRes = await sandbox.getEnrolmentStatus(submitRes.providerTrackingId);
    const policyNumber = statusRes.policyNumber || `SBX-${Date.now()}`;
    const eventId = `EVT-SBX-${Date.now()}`;

    // Record provider event
    await supabaseAdmin
      .from('hw_provider_events')
      .insert({
        provider_id: providerId,
        event_id: eventId,
        event_type: 'policy.activated',
        occurred_at: new Date().toISOString(),
        signature_verified: true,
        processing_status: 'processed',
        raw_payload_redacted: { policyNumber, trackingId: submitRes.providerTrackingId }
      });

    // Execute authoritative activation
    return await this.activatePolicyWithProviderEvent(
      ctx.tenantId,
      enr.id,
      providerId,
      policyNumber,
      eventId,
      enr.period_start,
      enr.period_end
    );
  }
}
