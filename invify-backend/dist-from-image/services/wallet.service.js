"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
// invify-backend/src/services/wallet.service.ts
const supabase_1 = require("../db/supabase");
function entryKind(entry) {
    const raw = String(entry.entry_type || entry.type || '').toUpperCase();
    if (['CREDIT', 'VIRTUAL_ACCOUNT_CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'CARD_PAYMENT'].includes(raw)) {
        return 'CREDIT';
    }
    if (['DEBIT', 'WITHDRAWAL', 'SWEEP'].includes(raw)) {
        return 'DEBIT';
    }
    return null;
}
function walletRows(rows) {
    const hasUserWallet = rows.some((row) => String(row.account || '') === 'USER_WALLET');
    if (!hasUserWallet)
        return rows;
    // Double-entry writes QUASAR_CLEARING DR + USER_WALLET CR. Only the wallet side is spendable.
    return rows.filter((row) => String(row.account || '') === 'USER_WALLET');
}
class WalletService {
    /**
     * Spendable tenant balance from ledger_entries (USER_WALLET only).
     * CREDIT − DEBIT. Accepts both `type` and `entry_type` column names.
     */
    static async getBalance(tenantId) {
        const primary = await supabase_1.supabaseAdmin
            .from('ledger_entries')
            .select('amount, type, account')
            .eq('tenant_id', tenantId);
        let data = primary.data;
        let error = primary.error;
        if (error && String(error.message || '').toLowerCase().includes('account')) {
            const fallback = await supabase_1.supabaseAdmin
                .from('ledger_entries')
                .select('amount, type')
                .eq('tenant_id', tenantId);
            data = fallback.data;
            error = fallback.error;
        }
        if (error) {
            console.error('[WalletService] Balance calc failed:', error.message);
            return { tenantId, balance: 0, currency: 'NGN', timestamp: new Date().toISOString() };
        }
        const balance = walletRows(data || []).reduce((current, entry) => {
            const amt = Number(entry.amount);
            if (!Number.isFinite(amt))
                return current;
            const kind = entryKind(entry);
            if (kind === 'CREDIT')
                return current + amt;
            if (kind === 'DEBIT')
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
    static async getTransactions(tenantId, params = {}) {
        let query = supabase_1.supabaseAdmin
            .from('ledger_entries')
            .select('*')
            .eq('tenant_id', tenantId);
        // Wallet history is USER_WALLET. Callers can still ask for another account.
        const account = params.account || 'USER_WALLET';
        if (account && account !== 'ALL') {
            query = query.eq('account', account);
        }
        if (params.startDate) {
            query = query.gte('created_at', params.startDate);
        }
        if (params.endDate) {
            query = query.lte('created_at', params.endDate);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            // Older rows may not have `account`. Retry unfiltered and project in memory.
            if (String(error.message || '').toLowerCase().includes('account')) {
                const fallback = await supabase_1.supabaseAdmin
                    .from('ledger_entries')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false });
                if (fallback.error)
                    throw fallback.error;
                return this.withLedgerContext(walletRows(fallback.data || []));
            }
            throw error;
        }
        return this.withLedgerContext(data || []);
    }
    static async withLedgerContext(rows) {
        const ids = [...new Set(rows.map((r) => r.ledger_id).filter(Boolean))];
        if (!ids.length)
            return rows;
        const { data: ledgers } = await supabase_1.supabaseAdmin
            .from('ledgers')
            .select('id, reference, metadata, idempotency_key')
            .in('id', ids);
        const byId = new Map((ledgers || []).map((l) => [l.id, l]));
        return rows.map((row) => {
            const ledger = byId.get(row.ledger_id);
            return {
                ...row,
                reference: ledger?.reference || row.reference,
                metadata: { ...(ledger?.metadata || {}), ...(row.metadata || {}) },
                idempotency_key: ledger?.idempotency_key || row.idempotency_key,
            };
        });
    }
    /**
     * Creates the tenant wallet row if payout/ledger RPCs would otherwise fail.
     */
    static async ensureWallet(tenantId, currency = 'NGN') {
        if (!tenantId)
            return null;
        const existing = await supabase_1.supabaseAdmin
            .from('wallets')
            .select('id, tenant_id, balance, currency')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();
        if (existing.data)
            return existing.data;
        const full = await supabase_1.supabaseAdmin
            .from('wallets')
            .insert({ tenant_id: tenantId, balance: 0, currency })
            .select('id, tenant_id, balance, currency')
            .maybeSingle();
        if (!full.error && full.data)
            return full.data;
        const slim = await supabase_1.supabaseAdmin
            .from('wallets')
            .insert({ tenant_id: tenantId, balance: 0 })
            .select('id, tenant_id, balance')
            .maybeSingle();
        if (slim.error) {
            const raced = await supabase_1.supabaseAdmin
                .from('wallets')
                .select('id, tenant_id, balance')
                .eq('tenant_id', tenantId)
                .limit(1)
                .maybeSingle();
            if (raced.data)
                return raced.data;
            console.warn('[WalletService] ensureWallet failed:', slim.error.message || full.error?.message);
            return null;
        }
        return slim.data;
    }
    /**
     * Surface gross / fee / net so inbound is never shown as a single netted amount.
     */
    static presentWalletHistory(rows) {
        const wallet = walletRows(rows || []);
        const byRef = new Map();
        const transactions = wallet.map((row) => {
            const amount = Number(row.amount) || 0;
            const kind = entryKind(row);
            const meta = row.metadata || {};
            const reference = String(row.reference || meta.reference || row.ledger_id || '');
            let presentationKind = 'OTHER';
            if (kind === 'CREDIT')
                presentationKind = 'INBOUND_CREDIT';
            else if (kind === 'DEBIT' && (String(row.account) === 'USER_WALLET' || !row.account)) {
                presentationKind = String(meta.kind || '').includes('FEE') || String(meta.guard || '').includes('fee')
                    ? 'FEE_DEBIT'
                    : 'PAYOUT_PRINCIPAL';
                if (String(row.idempotency_key || meta.idempotency_key || '').includes('ledger:fee:'))
                    presentationKind = 'FEE_DEBIT';
            }
            const bucket = byRef.get(reference) || { gross: 0, fee: 0 };
            if (presentationKind === 'INBOUND_CREDIT')
                bucket.gross += amount;
            if (presentationKind === 'FEE_DEBIT')
                bucket.fee += amount;
            byRef.set(reference, bucket);
            return {
                ...row,
                presentation_kind: presentationKind,
                signed_amount: WalletService.toSignedAmount(row),
            };
        });
        const inbound = [...byRef.entries()]
            .filter(([, v]) => v.gross > 0)
            .map(([reference, v]) => ({
            reference,
            gross_amount: v.gross,
            fee_amount: v.fee,
            net_wallet_impact: v.gross - v.fee,
        }));
        return { transactions, inbound, outbound: [] };
    }
    static toSignedAmount(entry) {
        const amt = Math.abs(Number(entry.amount) || 0);
        return entryKind(entry) === 'DEBIT' ? -amt : amt;
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=wallet.service.js.map