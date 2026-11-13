// invify-backend/src/modules/health-insurance/services/health-claim.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { SandboxHealthProviderAdapter } from '../adapters/sandbox.adapter';
import { HealthAuditService } from './health-audit.service';
import { HealthNotificationService } from './health-notification.service';

function httpError(message: string, status = 400, code?: string): Error {
  const err: any = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function newClaimReference(recordType: 'pre_authorisation' | 'claim'): string {
  const prefix = recordType === 'pre_authorisation' ? 'PA' : 'CL';
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export class HealthClaimService {
  /**
   * List claims/authorisations for a tenant.
   */
  static async listClaims(ctx: HealthContext, policyId?: string) {
    let query = supabaseAdmin
      .from('hw_claim_status_records')
      .select(`
        id,
        claim_reference,
        record_type,
        status,
        submitted_date,
        status_date,
        authorised_amount_minor,
        currency,
        rejection_reason,
        last_synced_at,
        hw_members (
          id,
          member_category,
          students (first_name, last_name, admission_number)
        ),
        hw_facilities (
          name,
          state,
          lga
        )
      `)
      .eq('tenant_id', ctx.tenantId)
      .order('status_date', { ascending: false });

    if (policyId) query = query.eq('policy_id', policyId);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list claims: ${error.message}`);
    return data || [];
  }

  /**
   * Look up claim status from provider.
   */
  static async lookupClaimStatus(ctx: HealthContext, claimReference: string) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.BUILD_VARIANT === 'prod';

    if (!isProd) {
      const sandbox = new SandboxHealthProviderAdapter();
      const statusRes = await sandbox.getClaimStatus(claimReference);
      return {
        connected: true,
        isSandbox: true,
        data: statusRes
      };
    }

    return {
      connected: false,
      isSandbox: false,
      message: 'Automated claim status lookup is not configured for this provider. Contact HMO directly.'
    };
  }

  /**
   * Tenant/institution submits a claim or pre-authorisation status record.
   * Clinical payloads are not stored — administrative metadata only.
   */
  static async submitClaim(
    ctx: HealthContext,
    body: {
      policyId: string;
      memberId: string;
      facilityId?: string;
      recordType?: 'pre_authorisation' | 'claim';
      claimReference?: string;
      authorisedAmountMinor?: number;
      currency?: string;
      notes?: string;
    }
  ) {
    const policyId = String(body.policyId || '');
    const memberId = String(body.memberId || '');
    const recordType = (body.recordType || 'claim') as 'pre_authorisation' | 'claim';
    if (!['pre_authorisation', 'claim'].includes(recordType)) {
      throw httpError('recordType must be pre_authorisation or claim.');
    }

    const { data: policy } = await supabaseAdmin
      .from('hw_policies')
      .select('id, tenant_id, member_id, status, provider_id')
      .eq('id', policyId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();
    if (!policy) throw httpError('Policy was not found for this institution.', 404);
    if (String(policy.status) !== 'active') {
      throw httpError(`Claims require an active policy (current: ${policy.status}).`, 409);
    }
    if (policy.member_id && policy.member_id !== memberId) {
      throw httpError('memberId does not match the policy member.', 400);
    }

    const { data: member } = await supabaseAdmin
      .from('hw_members')
      .select('id')
      .eq('id', memberId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();
    if (!member) throw httpError('Member was not found for this institution.', 404);

    if (body.facilityId) {
      const { data: facility } = await supabaseAdmin
        .from('hw_facilities')
        .select('id, provider_id, is_active')
        .eq('id', body.facilityId)
        .maybeSingle();
      if (!facility || !facility.is_active) throw httpError('Facility was not found or is inactive.', 404);
      if (policy.provider_id && facility.provider_id !== policy.provider_id) {
        throw httpError('Facility does not belong to the policy HMO provider.', 400);
      }
    }

    const claimReference = String(body.claimReference || newClaimReference(recordType)).trim().slice(0, 80);
    const now = new Date().toISOString();
    const insert = {
      tenant_id: ctx.tenantId,
      policy_id: policyId,
      member_id: memberId,
      facility_id: body.facilityId || null,
      claim_reference: claimReference,
      record_type: recordType,
      status: 'submitted',
      submitted_date: now.slice(0, 10),
      status_date: now,
      authorised_amount_minor:
        body.authorisedAmountMinor !== undefined ? Math.max(0, Number(body.authorisedAmountMinor) || 0) : null,
      currency: String(body.currency || 'NGN').slice(0, 3).toUpperCase(),
      rejection_reason: null,
      last_synced_at: now
    };

    const { data, error } = await supabaseAdmin
      .from('hw_claim_status_records')
      .insert(insert)
      .select('*')
      .maybeSingle();
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        throw httpError('A claim with this reference already exists for the tenant.', 409, 'CLAIM_DUPLICATE');
      }
      throw httpError(`Failed to submit claim: ${error.message}`, 400);
    }

    await this.appendStatusHistory(data!.id, null, 'submitted', ctx.userId, body.notes || null);
    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'claim.submitted',
      resourceType: 'hw_claim_status_records',
      resourceId: data!.id,
      changes: { claimReference, recordType, policyId, memberId }
    });
    await HealthNotificationService.notifyTenantAdmins(
      ctx.tenantId,
      'claim.submitted',
      'HMO claim submitted',
      `${recordType.replace('_', ' ')} ${claimReference} was submitted.`,
      { claimId: data!.id, claimReference }
    );

    return data;
  }

  static async approveClaim(ctx: HealthContext, claimId: string, body: { authorisedAmountMinor?: number; notes?: string } = {}) {
    return this.transitionClaim(ctx, claimId, 'approved', {
      authorisedAmountMinor: body.authorisedAmountMinor,
      notes: body.notes
    });
  }

  static async rejectClaim(ctx: HealthContext, claimId: string, body: { reason?: string; notes?: string }) {
    const reason = String(body?.reason || '').trim();
    if (reason.length < 5) throw httpError('Rejection requires a recorded reason (at least 5 characters).');
    return this.transitionClaim(ctx, claimId, 'rejected', { rejectionReason: reason, notes: body.notes });
  }

  /**
   * Settlement tracking only — does not disburse funds or post fees.
   */
  static async settleClaim(ctx: HealthContext, claimId: string, body: { notes?: string } = {}) {
    return this.transitionClaim(ctx, claimId, 'settled', { notes: body.notes });
  }

  static async listClaimHistory(ctx: HealthContext, claimId: string) {
    const claim = await this.requireTenantClaim(ctx, claimId);
    const { data, error } = await supabaseAdmin
      .from('hw_claim_status_events')
      .select('id, from_status, to_status, actor_user_id, notes, occurred_at')
      .eq('claim_id', claim.id)
      .order('occurred_at', { ascending: false });
    if (error) {
      if (/relation|does not exist/i.test(error.message)) {
        return {
          claimId: claim.id,
          events: [],
          note: 'Claim status history table is proposed in DO_NOT_APPLY_hw_claims_workflow.sql and is not applied yet.'
        };
      }
      throw httpError(`Failed to load claim history: ${error.message}`, 500);
    }
    return { claimId: claim.id, events: data || [], note: null };
  }

  private static async transitionClaim(
    ctx: HealthContext,
    claimId: string,
    nextStatus: 'approved' | 'rejected' | 'settled',
    opts: { authorisedAmountMinor?: number; rejectionReason?: string; notes?: string } = {}
  ) {
    const claim = await this.requireTenantClaim(ctx, claimId);
    const from = String(claim.status || '');
    const allowed: Record<string, string[]> = {
      approved: ['submitted', 'pending'],
      rejected: ['submitted', 'pending'],
      settled: ['approved']
    };
    if (!allowed[nextStatus].includes(from)) {
      throw httpError(
        `Cannot move claim from ${from} to ${nextStatus}. Approval and settlement are separate operations.`,
        409,
        'INVALID_CLAIM_TRANSITION'
      );
    }

    const updates: Record<string, any> = {
      status: nextStatus,
      status_date: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    };
    if (opts.authorisedAmountMinor !== undefined) {
      updates.authorised_amount_minor = Math.max(0, Number(opts.authorisedAmountMinor) || 0);
    }
    if (nextStatus === 'rejected') {
      updates.rejection_reason = opts.rejectionReason;
    }

    const { data, error } = await supabaseAdmin
      .from('hw_claim_status_records')
      .update(updates)
      .eq('id', claim.id)
      .eq('tenant_id', ctx.tenantId)
      .select('*')
      .maybeSingle();
    if (error) throw httpError(`Failed to update claim: ${error.message}`, 400);

    await this.appendStatusHistory(claim.id, from, nextStatus, ctx.userId, opts.notes || opts.rejectionReason || null);
    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: `claim.${nextStatus}`,
      resourceType: 'hw_claim_status_records',
      resourceId: claim.id,
      changes: { from, to: nextStatus, rejectionReason: opts.rejectionReason || null }
    });

    const notifyKind =
      nextStatus === 'approved' ? 'claim.approved' : nextStatus === 'rejected' ? 'claim.rejected' : 'claim.settled';
    await HealthNotificationService.notifyTenantAdmins(
      ctx.tenantId,
      notifyKind,
      `HMO claim ${nextStatus}`,
      `Claim ${claim.claim_reference} is now ${nextStatus}. Settlement does not disburse funds.`,
      { claimId: claim.id, claimReference: claim.claim_reference }
    );

    return data;
  }

  private static async requireTenantClaim(ctx: HealthContext, claimId: string) {
    const { data, error } = await supabaseAdmin
      .from('hw_claim_status_records')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();
    if (error) throw httpError(`Failed to load claim: ${error.message}`, 500);
    if (!data) throw httpError('Claim was not found for this institution.', 404);
    return data;
  }

  private static async appendStatusHistory(
    claimId: string,
    fromStatus: string | null,
    toStatus: string,
    actorUserId: string | undefined,
    notes: string | null
  ) {
    try {
      const { error } = await supabaseAdmin.from('hw_claim_status_events').insert({
        claim_id: claimId,
        from_status: fromStatus,
        to_status: toStatus,
        actor_user_id: actorUserId || null,
        notes: notes ? String(notes).slice(0, 1000) : null,
        occurred_at: new Date().toISOString()
      });
      if (error && !/relation|does not exist/i.test(error.message)) {
        console.warn('[HealthClaimService] status history insert failed:', error.message);
      }
    } catch (err: any) {
      console.warn('[HealthClaimService] status history unavailable:', err?.message || err);
    }
  }
}
