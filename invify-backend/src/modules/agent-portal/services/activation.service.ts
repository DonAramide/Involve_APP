import { supabaseAdmin } from '../../../db/supabase';
import { integrationEngine } from '../../../services/integration-engine.service';

export const STAGE_ORDER = [
  'REGISTRATION',
  'KYC_PENDING',
  'KYC_APPROVED',
  'TERMINAL_ASSIGNED',
  'TERMINAL_DEPLOYED',
  'TRAINING_COMPLETED',
  'FIRST_TRANSACTION',
  'FULLY_ACTIVATED',
] as const;

export type ActivationStage = (typeof STAGE_ORDER)[number];

function httpError(message: string, status: number) {
  const err: any = new Error(message);
  err.status = status;
  return err;
}

export class ActivationService {
  async resolveOwnedLink(rawId: string, agentId: string) {
    const id = String(rawId || '').trim();
    if (!id) throw httpError('Tenant id is required', 400);

    const byLink = await supabaseAdmin
      .from('agent_tenants')
      .select('id, agent_id, tenant_id, business_name, status, deleted_at')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (byLink.data) {
      if (String(byLink.data.agent_id) !== String(agentId)) {
        throw httpError('This tenant is not in your Institute portfolio', 403);
      }
      return byLink.data;
    }

    const byTenant = await supabaseAdmin
      .from('agent_tenants')
      .select('id, agent_id, tenant_id, business_name, status, deleted_at')
      .eq('tenant_id', id)
      .eq('agent_id', agentId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!byTenant.data) throw httpError('Tenant is not in this Institute portfolio', 404);
    return byTenant.data;
  }

  async ensureProgress(agentTenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('tenant_activation_progress')
      .select('*')
      .eq('agent_tenant_id', agentTenantId)
      .maybeSingle();
    if (error) throw httpError(error.message, 500);
    if (data) return data;

    const { data: created, error: insertErr } = await supabaseAdmin
      .from('tenant_activation_progress')
      .insert({
        agent_tenant_id: agentTenantId,
        current_stage: 'REGISTRATION',
        completion_percentage: (1 / STAGE_ORDER.length) * 100,
        is_registration_complete: true,
      })
      .select()
      .single();
    if (insertErr) throw httpError(insertErr.message, 500);
    return created;
  }

  async advanceToNext(agentTenantId: string) {
    const currentProgress = await this.ensureProgress(agentTenantId);
    const currentStage = String(currentProgress.current_stage || 'REGISTRATION') as ActivationStage;
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const fromIndex = currentIndex >= 0 ? currentIndex : 0;
    if (fromIndex >= STAGE_ORDER.length - 1) {
      throw httpError('Tenant is already fully activated', 400);
    }
    return this.advanceStage(agentTenantId, STAGE_ORDER[fromIndex + 1]);
  }

  async advanceStage(agentTenantId: string, newStage: string) {
    const currentProgress = await this.ensureProgress(agentTenantId);
    const currentIndex = STAGE_ORDER.indexOf(currentProgress.current_stage);
    const newIndex = STAGE_ORDER.indexOf(newStage as ActivationStage);

    if (newIndex === -1) {
      throw httpError(`Invalid stage: ${newStage}`, 400);
    }

    if (newIndex <= currentIndex) {
      throw httpError(
        `Cannot jump backwards or to same stage from ${currentProgress.current_stage} to ${newStage}`,
        400,
      );
    }

    if (newIndex > currentIndex + 1) {
      throw httpError(`Illegal stage jump from ${currentProgress.current_stage} to ${newStage}`, 400);
    }

    const updates: any = {
      current_stage: newStage,
      completion_percentage: ((newIndex + 1) / STAGE_ORDER.length) * 100,
    };

    if (newStage === 'KYC_PENDING') updates.is_kyc_pending = true;
    if (newStage === 'KYC_APPROVED') updates.is_kyc_approved = true;
    if (newStage === 'TERMINAL_ASSIGNED') updates.is_terminal_assigned = true;
    if (newStage === 'TERMINAL_DEPLOYED') updates.is_terminal_deployed = true;
    if (newStage === 'TRAINING_COMPLETED') updates.is_training_completed = true;
    if (newStage === 'FIRST_TRANSACTION') updates.is_first_transaction = true;
    if (newStage === 'FULLY_ACTIVATED') updates.is_fully_activated = true;

    const { data: updatedProgress, error: updateErr } = await supabaseAdmin
      .from('tenant_activation_progress')
      .update(updates)
      .eq('agent_tenant_id', agentTenantId)
      .select()
      .single();

    if (updateErr) throw httpError(updateErr.message, 500);

    const eventsToEmit = ['KYC_APPROVED', 'TERMINAL_ASSIGNED', 'TERMINAL_DEPLOYED', 'FIRST_TRANSACTION', 'FULLY_ACTIVATED'];
    if (eventsToEmit.includes(newStage)) {
      try {
        const { data: agentTenant } = await supabaseAdmin
          .from('agent_tenants')
          .select('agent_id, tenant_id')
          .eq('id', agentTenantId)
          .single();
        await integrationEngine.publish(newStage, 'ACTIVATION_MODULE', agentTenantId, {
          agentTenantId,
          agentId: agentTenant?.agent_id,
          tenantId: agentTenant?.tenant_id,
          stage: newStage,
        });
      } catch (err) {
        console.error(`[ActivationService] Failed to publish ${newStage}:`, err);
      }
    }

    return updatedProgress;
  }
}

export const activationService = new ActivationService();
