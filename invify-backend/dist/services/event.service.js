"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialEventService = void 0;
// src/services/event.service.ts
const supabase_1 = require("../db/supabase");
/**
 * FinancialEventService manages the emission of business events
 * that drive UI reactivity and audit trails.
 */
class FinancialEventService {
    /**
     * Emits a financial event.
     * This inserts into a Postgres table enabled for Realtime.
     */
    static async emit(params) {
        try {
            const { data, error } = await supabase_1.supabase
                .from('financial_events')
                .insert({
                type: params.type,
                reference: params.reference,
                tenant_id: params.tenantId,
                wallet_id: params.walletId,
                amount: params.amount,
                idempotency_key: params.idempotencyKey,
                metadata: params.metadata || {}
            })
                .select()
                .single();
            if (error) {
                if (error.code === '23505') {
                    console.log(`[EventService] Duplicate event ignored: ${params.idempotencyKey}`);
                    return;
                }
                console.error('[EventService] Failed to emit event:', error.message);
                return;
            }
            console.log(`[EventService] Emitted ${params.type} for ${params.reference}`);
            return data;
        }
        catch (error) {
            console.error('[EventService] Error:', error);
        }
    }
    /**
     * Specifically handles a wallet update event emission.
     */
    static async emitWalletUpdate(tenantId, walletId, reference, amount) {
        return this.emit({
            type: 'wallet_updated', // Mapping to wallet.updated
            reference,
            tenantId,
            walletId,
            amount,
            idempotencyKey: `event:wallet_updated:${reference}`
        });
    }
}
exports.FinancialEventService = FinancialEventService;
//# sourceMappingURL=event.service.js.map