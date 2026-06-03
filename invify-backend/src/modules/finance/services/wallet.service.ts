import { supabase } from '../../../db/supabase';

export class WalletService {
  async getWalletKPIs(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');

    const { data: wallet, error } = await supabase.from('agent_wallets').select('*').eq('agent_id', agent.id).single();
    
    // Default wallet if not found yet
    const w = wallet || { available_balance: 0, pending_earnings: 0, total_earnings: 0, total_withdrawn: 0 };

    // Calculate this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const { data: recentEvents } = await supabase
      .from('commission_events')
      .select('amount')
      .eq('agent_id', agent.id)
      .gte('created_at', startOfMonth.toISOString());
      
    const thisMonth = recentEvents?.reduce((sum, curr) => sum + Number(curr.amount), 0) || 0;

    return {
      availableBalance: w.available_balance,
      pendingEarnings: w.pending_earnings,
      totalEarnings: w.total_earnings,
      totalWithdrawn: w.total_withdrawn,
      thisMonthEarnings: thisMonth
    };
  }

  async getLedger(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data, error } = await supabase.from('wallet_ledger').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
    return data || [];
  }

  async getCommissions(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data, error } = await supabase.from('commission_events').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
    return data || [];
  }

  async requestWithdrawal(authUserId: string, payload: any) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');

    const amount = Number(payload.amount);
    if (amount <= 0) throw new Error('Withdrawal amount must be greater than 0');

    // Check available balance
    const { data: wallet } = await supabase.from('agent_wallets').select('*').eq('agent_id', agent.id).single();
    if (!wallet || Number(wallet.available_balance) < amount) {
      throw new Error('Insufficient available balance');
    }

    // Deduct from available balance (using basic update - in prod use RPC/transaction)
    await supabase.from('agent_wallets').update({
      available_balance: Number(wallet.available_balance) - amount
    }).eq('agent_id', agent.id);

    // Create Request
    const { data, error } = await supabase.from('withdrawal_requests').insert({
      agent_id: agent.id,
      amount,
      bank_name: payload.bank_name,
      account_number: payload.account_number,
      account_name: payload.account_name,
      remarks: payload.remarks,
      status: 'PENDING_REVIEW'
    }).select().single();

    if (error) throw new Error('Failed to create withdrawal request');
    return data;
  }

  async getWithdrawals(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data, error } = await supabase.from('withdrawal_requests').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
    return data || [];
  }

  async addBankAccount(authUserId: string, payload: any) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');

    const { data, error } = await supabase.from('agent_bank_accounts').insert({
      agent_id: agent.id,
      bank_name: payload.bank_name,
      account_number: payload.account_number,
      account_name: payload.account_name,
      is_primary: true
    }).select().single();

    if (error) throw new Error('Failed to link bank account');
    return data;
  }

  async getBankAccounts(authUserId: string) {
    const { data: agent } = await supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
    if (!agent) throw new Error('Agent not found');
    const { data, error } = await supabase.from('agent_bank_accounts').select('*').eq('agent_id', agent.id);
    return data || [];
  }
}

export const walletService = new WalletService();
