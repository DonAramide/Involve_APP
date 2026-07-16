"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const supabase_1 = require("../../../db/supabase");
class WalletService {
    async getWalletKPIs(authUserId) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data: wallet, error } = await supabase_1.supabase.from('agent_wallets').select('*').eq('agent_id', agent.id).single();
        const w = wallet || { available_balance: 0, pending_earnings: 0, total_earnings: 0, total_withdrawn: 0, pending_withdrawals: 0 };
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { data: recentEvents } = await supabase_1.supabase
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
        return {
            availableBalance: w.available_balance,
            pendingEarnings: w.pending_earnings,
            totalEarnings: w.total_earnings,
            totalWithdrawn: w.total_withdrawn,
            pendingWithdrawals: w.pending_withdrawals,
            thisMonthEarnings: thisMonth,
            timeseries: {
                categories: timeseriesCategories,
                data: timeseriesData
            }
        };
    }
    async getLedger(authUserId) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data } = await supabase_1.supabase.from('wallet_ledger').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
        return data || [];
    }
    async getCommissions(authUserId) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data } = await supabase_1.supabase.from('commission_events').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
        // Server-side aggregation for Donut Chart
        const categories = { MERCHANT_ONBOARDING: 0, MERCHANT_ACTIVATION: 0, BONUS: 0 };
        data?.forEach((c) => {
            if (categories[c.event_type] !== undefined)
                categories[c.event_type] += Number(c.amount);
            else
                categories.BONUS += Number(c.amount);
        });
        return {
            list: data || [],
            aggregated: categories
        };
    }
    async requestWithdrawal(authUserId, payload) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const amount = Number(payload.amount);
        if (amount <= 0)
            throw new Error('Withdrawal amount must be greater than 0');
        // Verify available_balance
        const { data: wallet } = await supabase_1.supabase.from('agent_wallets').select('available_balance, pending_balance').eq('agent_id', agent.id).single();
        if (!wallet || wallet.available_balance < amount) {
            throw new Error('Insufficient available balance');
        }
        // Deduct amount from available_balance and add to pending_balance
        const newAvailable = wallet.available_balance - amount;
        const newPending = (wallet.pending_balance || 0) + amount;
        await supabase_1.supabase.from('agent_wallets').update({
            available_balance: newAvailable,
            pending_balance: newPending
        }).eq('agent_id', agent.id);
        // Insert DEBIT_WITHDRAWAL into wallet_ledger
        await supabase_1.supabase.from('wallet_ledger').insert({
            agent_id: agent.id,
            amount: amount,
            transaction_type: 'DEBIT_WITHDRAWAL',
            description: payload.remarks || 'Withdrawal request',
            balance_after: newAvailable
        });
        // Insert into agent_withdrawal_requests
        const { data, error } = await supabase_1.supabase.from('agent_withdrawal_requests').insert({
            agent_id: agent.id,
            amount: amount,
            bank_name: payload.bank_name,
            account_number: payload.account_number,
            account_name: payload.account_name,
            status: 'PENDING'
        }).select().single();
        if (error) {
            throw new Error(error.message || 'Failed to process withdrawal');
        }
        return data;
    }
    async getWithdrawals(authUserId) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data } = await supabase_1.supabase.from('agent_withdrawal_requests').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false });
        return data || [];
    }
    async addBankAccount(authUserId, payload) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data, error } = await supabase_1.supabase.from('agent_profiles').update({
            bank_name: payload.bank_name,
            account_number: payload.account_number,
            account_name: payload.account_name
        }).eq('agent_id', agent.id).select().single();
        if (error)
            throw new Error('Failed to link bank account');
        return data;
    }
    async getBankAccounts(authUserId) {
        const { data: agent } = await supabase_1.supabase.from('agents').select('id').eq('auth_user_id', authUserId).single();
        if (!agent)
            throw new Error('Agent not found');
        const { data } = await supabase_1.supabase.from('agent_profiles').select('bank_name, account_number, account_name').eq('agent_id', agent.id).single();
        return data ? [data] : [];
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
//# sourceMappingURL=wallet.service.js.map