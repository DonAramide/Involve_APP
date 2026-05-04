// backend/src/services/ledger.service.js
const { supabase } = require('../config/supabase');
const { EventBusService } = require('./event_bus.service');

class LedgerService {
    /**
     * Enhanced Lock-Safe Upsert
     * Invokes PostgreSQL RPC with 5s Lock Timeout
     */
    static async upsertLedgerEntry({
        tenant_id,
        reference,
        provider,
        type, 
        amount,
        status, 
        source, 
        entry_group_id = null,
        metadata = {}
    }) {
        const idempotency_key = `${provider}:${reference}:${type}`;

        try {
            // CALL DATABASE RPC (Atomic, Monotonic, and Lock-Hardened)
            const { data, error } = await supabase.rpc('safe_upsert_ledger_entry', {
                p_tenant_id: tenant_id,
                p_reference: reference,
                p_provider: provider,
                p_type: type,
                p_amount: amount,
                p_status: status,
                p_source: source,
                p_idempotency_key: idempotency_key,
                p_metadata: metadata,
                p_entry_group_id: entry_group_id
            });

            if (error) {
                // Determine if it's a retryable LOCK_TIMEOUT or a terminal error
                if (error.message.includes('LOCK_TIMEOUT')) {
                    console.warn(`[Ledger] Lock contention for ${reference} (Retryable). Error: ${error.message}`);
                    throw new Error(`RETRYABLE: ${error.message}`);
                }
                
                if (error.message.includes('PROVIDER_MISMATCH')) {
                    console.error(`[Ledger] Terminal Error: ${error.message}`);
                    return { success: false, error: error.message };
                }

                throw error;
            }

            // Success Handling
            const result = data;
            if (result.success && status === 'succeeded' && result.status !== 'succeeded') {
                await EventBusService.emit('ledger.entry.succeeded', {
                    tenant_id,
                    reference,
                    amount,
                    idempotency_key
                });
            }

            return result;
        } catch (err) {
            console.error('[Ledger] RPC Execution Failed:', err.message);
            // Re-throw so worker handles retry logic
            throw err;
        }
    }

    /**
     * Wallet Balance Aggregation (Definitive Source of Truth)
     */
    static async getWalletBalance(tenant_id) {
        const { data, error } = await supabase
            .from('ledger_entries')
            .select('amount, type')
            .eq('tenant_id', tenant_id)
            .eq('status', 'succeeded');

        if (error) throw error;

        return data.reduce((acc, entry) => {
            return entry.type === 'credit' ? acc + parseFloat(entry.amount) : acc - parseFloat(entry.amount);
        }, 0);
    }
}

module.exports = LedgerService;
