import { supabase } from '../../../db/supabase';
import { isAgentPayoutExecutionEnabled, loadAgentFeeReadModel, loadAttributedTenantIds } from '../../agent-portal/services/agent-fee-read-model';

export class WalletService {
  async getWalletKPIs(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id, agent_code').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');

    const { data: wallet, error } = await supabase.from('agent_wallets').select('*').eq('agent_id', agent.id).single();
    const w = wallet || { available_balance: 0, pending_earnings: 0, total_earnings: 0, total_withdrawn: 0, pending_withdrawals: 0 };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const { data: recentEvents } = await supabase
      .from('commission_events')
      .select('amount, created_at')
      .eq('agent_id', agent.id)
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: true });
      
    let thisMonth = 0;
    
    // Aggregate timeseries (last 7 days logic)
    const timeseriesMap = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      timeseriesMap.set(d.toISOString().split('T')[0], 0);
    }

    recentEvents?.forEach(ev => {
      thisMonth += Number(ev.amount);
      const day = ev.created_at.split('T')[0];
      if (timeseriesMap.has(day)) {
        timeseriesMap.set(day, timeseriesMap.get(day) + Number(ev.amount));
      }
    });

    const timeseriesCategories = Array.from(timeseriesMap.keys());
    const timeseriesData = Array.from(timeseriesMap.values());

    const attributed = await loadAttributedTenantIds(agent.id, String(agent.agent_code || ''));
    const feeOrchestration = await loadAgentFeeReadModel(String(agent.agent_code || ''), attributed.tenantIds, agent.id);

    return {
      availableBalance: w.available_balance,
      pendingEarnings: w.pending_earnings,
      totalEarnings: w.total_earnings,
      totalWithdrawn: w.total_withdrawn,
      pendingWithdrawals: w.pending_withdrawals,
      thisMonthEarnings: thisMonth,
      payout_execution_enabled: isAgentPayoutExecutionEnabled(),
      feeOrchestration,
      timeseries: {
        categories: timeseriesCategories,
        data: timeseriesData
      }
    };
  }

  async getLedger(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data } = await supabase.from('wallet_ledger').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
    return data || [];
  }

  async getCommissions(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data } = await supabase.from('commission_events').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
    
    // Server-side aggregation for Donut Chart
    const categories: any = { MERCHANT_ONBOARDING: 0, MERCHANT_ACTIVATION: 0, BONUS: 0 };
    data?.forEach((c: any) => {
      if (categories[c.event_type] !== undefined) categories[c.event_type] += Number(c.amount);
      else categories.BONUS += Number(c.amount);
    });

    return {
      list: data || [],
      aggregated: categories
    };
  }

  async requestWithdrawal(authUserId: string, payload: any) {
    const { data: agent } = await supabase.from('agents').select('id, agent_code, status').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    if (agent.status && agent.status !== 'ACTIVE') {
      const err: any = new Error('Agent is not ACTIVE');
      err.code = 'AGENT_NOT_ACTIVE';
      throw err;
    }

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err: any = new Error('Withdrawal amount must be greater than 0');
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    const attributed = await loadAttributedTenantIds(agent.id, String(agent.agent_code || ''));
    const fee = await loadAgentFeeReadModel(String(agent.agent_code || ''), attributed.tenantIds, agent.id) as any;
    const availableKobo = Number(fee?.available_kobo || 0);
    const amountKobo = Math.round(amount > 100000 ? amount : amount * 100);
    // payload.amount historically used naira in the wallet UI; treat values >= 100000 as already kobo
    const requestKobo = Number.isInteger(payload.amount_kobo) ? Number(payload.amount_kobo) : amountKobo;

    if (requestKobo > availableKobo) {
      const err: any = new Error('INSUFFICIENT_AVAILABLE: shadow/assessed commission is not withdrawable.');
      err.code = 'INSUFFICIENT_AVAILABLE';
      throw err;
    }

    if (!isAgentPayoutExecutionEnabled()) {
      const err: any = new Error('PAYOUT_DISABLED: real-money payouts are not enabled for this environment.');
      err.code = 'PAYOUT_DISABLED';
      throw err;
    }

    throw Object.assign(new Error('PAYOUT_DISABLED: settlement completion is blocked.'), { code: 'PAYOUT_DISABLED' });
  }

  async getWithdrawals(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data } = await supabase.from('agent_withdrawal_requests').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
    return data || [];
  }

  async addBankAccount(authUserId: string, payload: any) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');

    const { data, error } = await supabase.from('agent_profiles').update({
      bank_name: payload.bank_name,
      account_number: payload.account_number,
      account_name: payload.account_name
    }).eq('agent_id', agent.id).select().single();

    if (error) throw new Error('Failed to link bank account');
    return data;
  }

  async getBankAccounts(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data } = await supabase.from('agent_profiles').select('bank_name, account_number, account_name').eq('agent_id', agent.id).single();
    return data ? [data] : [];
  }
}

export const walletService = new WalletService();
