import { supabase } from '../../../db/supabase';
import { integrationEngine } from '../../../services/integration-engine.service';

const STAGE_ORDER = [
  'REGISTRATION',
  'KYC_PENDING',
  'KYC_APPROVED',
  'TERMINAL_ASSIGNED',
  'TERMINAL_DEPLOYED',
  'TRAINING_COMPLETED',
  'FIRST_TRANSACTION',
  'FULLY_ACTIVATED'
];

export class ActivationService {
  async advanceStage(agentTenantId: string, newStage: string) {
    // 1. Get current stage
    const { data: currentProgress, error: fetchErr } = await supabase
      .from('tenant_activation_progress')
      .select('*')
      .eq('agent_tenant_id', agentTenantId)
      .single();

    if (fetchErr || !currentProgress) {
      throw new Error('Activation progress record not found');
    }

    const currentIndex = STAGE_ORDER.indexOf(currentProgress.current_stage);
    const newIndex = STAGE_ORDER.indexOf(newStage);

    if (newIndex === -1) {
      throw new Error(`Invalid stage: ${newStage}`);
    }

    if (newIndex <= currentIndex) {
      throw new Error(`Cannot jump backwards or to same stage from ${currentProgress.current_stage} to ${newStage}`);
    }

    if (newIndex > currentIndex + 1) {
      throw new Error(`Illegal stage jump from ${currentProgress.current_stage} to ${newStage}`);
    }

    // Advance to newStage
    const updates: any = {
      current_stage: newStage,
    };
    
    // update completion percentage
    updates.completion_percentage = ((newIndex + 1) / STAGE_ORDER.length) * 100;
    
    if (newStage === 'KYC_PENDING') updates.is_kyc_pending = true;
    if (newStage === 'KYC_APPROVED') updates.is_kyc_approved = true;
    if (newStage === 'TERMINAL_ASSIGNED') updates.is_terminal_assigned = true;
    if (newStage === 'TERMINAL_DEPLOYED') updates.is_terminal_deployed = true;
    if (newStage === 'TRAINING_COMPLETED') updates.is_training_completed = true;
    if (newStage === 'FIRST_TRANSACTION') updates.is_first_transaction = true;
    if (newStage === 'FULLY_ACTIVATED') updates.is_fully_activated = true;

    const { data: updatedProgress, error: updateErr } = await supabase
      .from('tenant_activation_progress')
      .update(updates)
      .eq('agent_tenant_id', agentTenantId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const eventsToEmit = ['KYC_APPROVED', 'TERMINAL_ASSIGNED', 'TERMINAL_DEPLOYED', 'FIRST_TRANSACTION', 'FULLY_ACTIVATED'];
    if (eventsToEmit.includes(newStage)) {
      try {
        const { data: agentTenant } = await supabase.from('agent_tenants').select('agent_id, tenant_id').eq('id', agentTenantId).single();
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
