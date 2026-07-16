"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
// invify-backend/src/services/wallet.service.ts
const supabase_1 = require("../db/supabase");
class WalletService {
    /**
     * Strictly derived balance from ledger_entries.
     * Formula: SUM(amount WHERE entry_type='CREDIT') - SUM(amount WHERE entry_type='DEBIT')
     * Column name is 'entry_type' (not 'type') as per DB schema.
     */
    static async getBalance(tenantId) {
        // The actual DB column is 'entry_type' (not 'type')
        // Columns: id, tenant_id, amount, entry_type, status, reference, idempotency_key, metadata, created_at, ledger_id
        const { data, error } = await supabase_1.supabase
            .from('ledger_entries')
            .select('amount, entry_type')
            .eq('tenant_id', tenantId);
        if (error) {
            console.error('[WalletService] Balance calc failed:', error.message);
            // Return zero balance gracefully instead of throwing — prevents 500 on tenant details
            return { tenantId, balance: 0, currency: 'NGN', timestamp: new Date().toISOString() };
        }
        // Mathematical Derivation of Wallet Projection
        const balance = (data || []).reduce((current, entry) => {
            const amt = Number(entry.amount);
            if (entry.entry_type === 'CREDIT')
                return current + amt;
            if (entry.entry_type === 'DEBIT')
                return current - amt;
            return current;
        }, 0);
        return {
            tenantId,
            balance,
            currency: 'NGN',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Full transaction history for a tenant.
     */
    static async getTransactions(tenantId, params = {}) {
        let query = supabase_1.supabase
            .from('ledger_entries')
            .select('*')
            .eq('tenant_id', tenantId);
        if (params.account) {
            query = query.eq('account', params.account);
        }
        if (params.startDate) {
            query = query.gte('created_at', params.startDate);
        }
        if (params.endDate) {
            query = query.lte('created_at', params.endDate);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=wallet.service.js.map