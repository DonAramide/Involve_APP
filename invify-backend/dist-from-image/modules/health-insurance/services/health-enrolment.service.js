"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthEnrolmentService = void 0;
// invify-backend/src/modules/health-insurance/services/health-enrolment.service.ts
const supabase_1 = require("../../../db/supabase");
const health_audit_service_1 = require("./health-audit.service");
const sandbox_adapter_1 = require("../adapters/sandbox.adapter");
class HealthEnrolmentService {
    /**
     * List enrolments for a tenant with pagination and filters.
     */
    static async listEnrolments(ctx, params) {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 20));
        const offset = (page - 1) * limit;
        let query = supabase_1.supabaseAdmin
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
        if (params.status)
            query = query.eq('status', params.status);
        if (params.memberId)
            query = query.eq('member_id', params.memberId);
        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        const { data, count, error } = await query;
        if (error)
            throw new Error(`Failed to list enrolments: ${error.message}`);
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
    /**
     * Create an enrolment in draft/enrolment_pending status.
     */
    static async createEnrolment(ctx, params) {
        const raw = params;
        const memberId = String(raw.memberId || raw.member_id || '');
        const planVersionId = String(raw.planVersionId || raw.plan_version_id || '');
        const periodStart = String(raw.periodStart || raw.period_start || raw.start_date || '');
        const periodEnd = String(raw.periodEnd || raw.period_end || raw.end_date || '');
        // 1. Verify member exists in this tenant
        const { data: member, error: memErr } = await supabase_1.supabaseAdmin
            .from('hw_members')
            .select('id, tenant_id, member_category')
            .eq('id', memberId)
            .eq('tenant_id', ctx.tenantId)
            .maybeSingle();
        if (memErr || !member)
            throw new Error('Member not found');
        // 2. Verify plan version is published and offered by tenant
        const { data: offer, error: offErr } = await supabase_1.supabaseAdmin
            .from('hw_tenant_plan_offers')
            .select('id, default_funding, hw_plan_versions(*)')
            .eq('tenant_id', ctx.tenantId)
            .eq('plan_version_id', planVersionId)
            .eq('is_active', true)
            .maybeSingle();
        if (offErr || !offer) {
            throw new Error('Plan version is not currently offered by this organisation');
        }
        const { assertBankOfferingForNewEnrolment } = await Promise.resolve().then(() => __importStar(require('./bank-hmo-distribution.service')));
        await assertBankOfferingForNewEnrolment(ctx.tenantId, planVersionId);
        // 3. Create enrolment record (starts in enrolment_pending or draft)
        const { data: enrolment, error: enrErr } = await supabase_1.supabaseAdmin
            .from('hw_enrolments')
            .insert({
            tenant_id: ctx.tenantId,
            member_id: memberId,
            plan_version_id: planVersionId,
            period_start: periodStart,
            period_end: periodEnd,
            status: 'enrolment_pending',
            submitted_by: ctx.userId,
            submitted_at: new Date().toISOString()
        })
            .select()
            .single();
        if (enrErr)
            throw new Error(`Failed to create enrolment: ${enrErr.message}`);
        await health_audit_service_1.HealthAuditService.log({
            tenantId: ctx.tenantId,
            actorUserId: ctx.userId,
            action: 'enrolment.created',
            resourceType: 'hw_enrolments',
            resourceId: enrolment.id,
            changes: params
        });
        return enrolment;
    }
    /**
     * Review and verify enrolment eligibility.
     * Transitions from awaiting_verification to awaiting_premium_payment or rejected.
     */
    static async verifyEnrolment(ctx, enrolmentId, params) {
        const { data: current, error: getErr } = await supabase_1.supabaseAdmin
            .from('hw_enrolments')
            .select('id, status, plan_version_id, hw_plan_versions(activation_requires_payment)')
            .eq('id', enrolmentId)
            .eq('tenant_id', ctx.tenantId)
            .maybeSingle();
        if (getErr || !current)
            throw new Error('Enrolment not found');
        if (params.decision === 'reject') {
            const { data, error } = await supabase_1.supabaseAdmin
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
            if (error)
                throw new Error(`Failed to reject enrolment: ${error.message}`);
            return data;
        }
        // If plan waives upfront payment, can transition straight to awaiting_insurer_activation
        const requiresPayment = current.hw_plan_versions?.activation_requires_payment !== false;
        const targetStatus = requiresPayment
            ? 'awaiting_premium_payment'
            : 'awaiting_insurer_activation';
        const { data: updated, error: updErr } = await supabase_1.supabaseAdmin
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
        if (updErr)
            throw new Error(`Failed to verify enrolment: ${updErr.message}`);
        await health_audit_service_1.HealthAuditService.log({
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
    static async activatePolicyWithProviderEvent(tenantId, enrolmentId, providerId, policyNumber, activationEventId, effectiveDate, expiryDate) {
        // 1. Upsert hw_policies with active status and activation metadata
        const { data: policy, error: polErr } = await supabase_1.supabaseAdmin
            .from('hw_policies')
            .upsert({
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
        }, { onConflict: 'enrolment_id' })
            .select()
            .single();
        if (polErr)
            throw new Error(`Failed to record policy: ${polErr.message}`);
        // 2. Transition enrolment to 'active'
        const { data: enrolment, error: enrErr } = await supabase_1.supabaseAdmin
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
        if (enrErr)
            throw new Error(`Failed to activate enrolment: ${enrErr.message}`);
        await health_audit_service_1.HealthAuditService.log({
            tenantId,
            action: 'policy.activated_by_insurer',
            resourceType: 'hw_policies',
            resourceId: policy.id,
            changes: { policyNumber, activationEventId, enrolmentId }
        });
        return { policy, enrolment };
    }
    /**
     * Staging / Sandbox simulation: Submit to sandbox adapter and activate.
     * Rejected in production.
     */
    static async simulateSandboxActivation(ctx, enrolmentId) {
        const sandbox = new sandbox_adapter_1.SandboxHealthProviderAdapter(); // Will throw in production
        const { data: enr, error: enrErr } = await supabase_1.supabaseAdmin
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
        if (enrErr || !enr)
            throw new Error('Enrolment not found');
        const providerId = enr.hw_plan_versions?.hw_plans?.provider_id;
        if (!providerId)
            throw new Error('Provider not configured for plan');
        // Submit to sandbox
        const submitRes = await sandbox.submitEnrolment({
            enrolmentId: enr.id,
            memberReference: enr.hw_members?.id,
            planCode: enr.hw_plan_versions?.hw_plans?.code,
            periodStart: enr.period_start,
            periodEnd: enr.period_end,
            applicant: {
                firstName: enr.hw_members?.students?.first_name || 'Member',
                lastName: enr.hw_members?.students?.last_name || 'Applicant',
                category: enr.hw_members?.member_category
            }
        });
        const statusRes = await sandbox.getEnrolmentStatus(submitRes.providerTrackingId);
        const policyNumber = statusRes.policyNumber || `SBX-${Date.now()}`;
        const eventId = `EVT-SBX-${Date.now()}`;
        // Record provider event
        await supabase_1.supabaseAdmin
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
        return await this.activatePolicyWithProviderEvent(ctx.tenantId, enr.id, providerId, policyNumber, eventId, enr.period_start, enr.period_end);
    }
}
exports.HealthEnrolmentService = HealthEnrolmentService;
//# sourceMappingURL=health-enrolment.service.js.map