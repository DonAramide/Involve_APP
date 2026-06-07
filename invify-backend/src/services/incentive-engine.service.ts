import { supabaseAdmin } from '../db/supabase';

export class IncentiveEngineService {
  /**
   * Evaluates various targets (performance, terminal, campaigns) for an agent
   * when an activation or transaction event occurs.
   */
  static async evaluateTargets(agentId: string, eventType: string, payload: any): Promise<void> {
    try {
      console.log(`[IncentiveEngine] Evaluating targets for agent ${agentId} due to ${eventType}`);

      // 1. Update agent_commission_progress
      // E.g. incrementing terminals deployed or tenants onboarded
      if (eventType === 'FULLY_ACTIVATED') {
        const { error: progressError } = await supabaseAdmin.rpc('increment_agent_progress', {
          p_agent_id: agentId,
          p_metric: 'tenants_onboarded_count',
          p_amount: 1
        });
        // Fallback if RPC doesn't exist: manually fetch and update
        if (progressError) {
          const { data: progress } = await supabaseAdmin
            .from('agent_commission_progress')
            .select('*')
            .eq('agent_id', agentId)
            .limit(1)
            .single();

          if (progress) {
            await supabaseAdmin
              .from('agent_commission_progress')
              .update({ tenants_onboarded_count: (progress.tenants_onboarded_count || 0) + 1 })
              .eq('id', progress.id);
          }
        }
      }

      // 2. Evaluate performance_target_rules
      const { data: perfRules } = await supabaseAdmin.from('performance_target_rules').select('*');
      if (perfRules && perfRules.length > 0) {
        // mock hit
        const hitRule = perfRules[0];
        await this.grantReward(agentId, hitRule.bonus_amount, 'CASH_BONUS', 'PERFORMANCE_TARGET');
      }

      // 3. Evaluate terminal_target_rules
      if (eventType === 'FIRST_TRANSACTION') {
        const { data: termRules } = await supabaseAdmin.from('terminal_target_rules').select('*');
        if (termRules && termRules.length > 0) {
          const tRule = termRules[0];
          await this.grantReward(agentId, tRule.reward_value, tRule.reward_type, 'TERMINAL_TARGET');
        }
      }

      // 4. Evaluate commission_campaigns
      const { data: campaigns } = await supabaseAdmin.from('commission_campaigns').select('*');
      if (campaigns && campaigns.length > 0) {
        const camp = campaigns[0];
        await this.grantReward(agentId, camp.reward_value, camp.reward_type, 'CAMPAIGN_BONUS', camp.id);
      }

    } catch (err) {
      console.error(`[IncentiveEngine] Error evaluating targets:`, err);
    }
  }

  private static async grantReward(agentId: string, amount: number, rewardType: string, source: string, campaignId?: string) {
    // Populate approval_queue
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('approval_queue')
      .insert({
        agent_id: agentId,
        source_type: source,
        amount: amount,
        status: 'PENDING'
      })
      .select()
      .single();

    if (approvalError) throw approvalError;

    // Create agent_bonus_rewards
    await supabaseAdmin
      .from('agent_bonus_rewards')
      .insert({
        agent_id: agentId,
        reward_type: rewardType,
        reward_source: source,
        reward_amount: amount,
        approval_state: 'PENDING',
        campaign_id: campaignId || null,
        approval_queue_id: approval.id
      });
      
    console.log(`[IncentiveEngine] Granted ${amount} (${rewardType}) to agent ${agentId} from ${source}`);
  }
}
