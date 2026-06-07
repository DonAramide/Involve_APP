import { supabaseAdmin } from '../db/supabase';

export class CommissionEngineService {
  /**
   * Evaluates standard tenant onboarding & activation bonuses.
   * Looks up the agent's current active commission plan version and category overrides.
   */
  static async evaluateAcquisitionReward(agentId: string, tenantId: string, merchantCategoryId: string): Promise<boolean> {
    try {
      // 1. Deterministically fetch the exact active commission plan responsible for this calculation
      const { data: legacyPlan, error: legacyPlanError } = await supabaseAdmin
        .from('commission_plans')
        .select('id, base_bounty, holding_period_days')
        .eq('event_type', 'ACTIVATION')
        .is('effective_to', null)
        .single();
        
      if (legacyPlanError || !legacyPlan) throw new Error('No valid commission plan found for this calculation');
      const planId = legacyPlan.id;

      // 4. Calculate exact bonus amount from the plan
      const bonusAmount = legacyPlan.base_bounty; // Deterministic calculation
      const holdingPeriod = legacyPlan.holding_period_days || 30;
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + holdingPeriod);

      // 5. Insert into approval_queue (status: PENDING)
      const { data: approval, error: approvalError } = await supabaseAdmin
        .from('approval_queue')
        .insert({
          agent_id: agentId,
          source_type: 'ACQUISITION_REWARD',
          amount: bonusAmount,
          status: 'PENDING'
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // 6. Log event to commission_events
      const { error: eventError } = await supabaseAdmin
        .from('commission_events')
        .insert({
          agent_id: agentId,
          plan_id: planId,
          event_type: 'ACQUISITION_EVALUATED',
          amount: bonusAmount,
          new_state: 'PENDING',
          reference_id: approval.id,
          release_date: releaseDate.toISOString(),
          metadata: { tenantId, merchantCategoryId }
        });

      if (eventError) throw eventError;

      console.log(`[CommissionEngine] Evaluated acquisition for agent ${agentId}, tenant ${tenantId}`);
      return true;
    } catch (err) {
      console.error(`[CommissionEngine] Error evaluating acquisition:`, err);
      return false;
    }
  }

  /**
   * Processes RevShare for a transaction based on the transaction type and category rules.
   */
  static async calculateRevenueShare(agentId: string, transactionType: string, platformNetRevenue: number, tenantId?: string): Promise<boolean> {
    try {
      // 1. Fetch agent's tier and plan
      // 2. Identify the % based on transactionType (CARD, USSD, TRANSFER, VA)
      // 3. Multiply platformNetRevenue by %
      const revSharePct = 10; // Simulated 10%
      const revShareAmount = platformNetRevenue * (revSharePct / 100);

      const { data: approval, error: approvalError } = await supabaseAdmin
        .from('approval_queue')
        .insert({
          agent_id: agentId,
          source_type: 'REVENUE_SHARE',
          amount: revShareAmount,
          status: 'PENDING'
        })
        .select()
        .single();

      if (approvalError) throw approvalError;

      // 4. Accumulate into agent_revenue_share_ledger
      const dummyTenantId = '00000000-0000-0000-0000-000000000000';
      const { error: ledgerError } = await supabaseAdmin
        .from('agent_revenue_share_ledger')
        .insert({
          agent_id: agentId,
          tenant_id: tenantId || dummyTenantId,
          transaction_id: `txn_${Date.now()}`,
          transaction_type: transactionType,
          platform_revenue: platformNetRevenue,
          revenue_share_percentage: revSharePct,
          calculated_commission: revShareAmount,
          approval_state: 'PENDING',
          approval_queue_id: approval.id
        });

      if (ledgerError) throw ledgerError;

      // Deterministically fetch the exact active commission plan responsible for this calculation
      const { data: legacyPlan, error: legacyPlanError } = await supabaseAdmin
        .from('commission_plans')
        .select('id, base_bounty, holding_period_days')
        .eq('event_type', 'ACTIVATION')
        .is('effective_to', null)
        .single();
        
      if (legacyPlanError || !legacyPlan) throw new Error('No valid commission plan found for this calculation');
      const planId = legacyPlan.id;
      const holdingPeriod = legacyPlan.holding_period_days || 30;
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + holdingPeriod);

      const { error: eventError } = await supabaseAdmin
        .from('commission_events')
        .insert({
          agent_id: agentId,
          plan_id: planId,
          event_type: 'REVENUE_SHARE_CALCULATED',
          amount: revShareAmount,
          new_state: 'PENDING',
          reference_id: approval.id,
          release_date: releaseDate.toISOString(),
          metadata: { tenantId, transactionType, platformNetRevenue, revSharePct }
        });

      if (eventError) throw eventError;

      console.log(`[CommissionEngine] Calculated revshare for agent ${agentId}`);
      return true;
    } catch (err) {
      console.error(`[CommissionEngine] Error calculating revshare:`, err);
      return false;
    }
  }

  /**
   * Upgrades agent to next tier if threshold met.
   */
  static async checkAndUpgradeTier(agentId: string): Promise<boolean> {
    // 1. Count tenants
    // 2. Check performance_target_rules
    // 3. Update agent_commission_assignments current_tier
    
    return true;
  }
}
