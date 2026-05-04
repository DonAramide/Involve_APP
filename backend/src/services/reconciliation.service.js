// backend/src/services/reconciliation.service.js
const QuaserService = require('./quaser.service');
const LedgerService = require('./ledger.service');
const { supabase } = require('../config/supabase');

class ReconciliationService {
    /**
     * Tiered Reconciliation Orchestrator
     * @param {string} tenant_id 
     * @param {string} tier - 'recent' | 'daily' | 'legacy'
     */
    static async reconcile(tenant_id, tier = 'recent') {
        const windowSize = this.#getWindowSize(tier);
        console.log(`[Recon] Starting ${tier} sweep for ${tenant_id} (Window: ${windowSize}h)`);

        try {
            const quaserId = await QuaserService.getQuaserId(tenant_id);
            // In a real Quaser API, we'd pass a time window/limit. 
            // Here we fetch a limit corresponding to the tier.
            const limit = tier === 'recent' ? 20 : tier === 'daily' ? 100 : 500;
            const quaserData = await QuaserService.getTransactions(quaserId, limit);
            const quaserTransactions = quaserData.transactions || [];

            for (const qTx of quaserTransactions) {
                // Filter by time window if possible
                const txDate = new Date(qTx.created_at);
                const now = new Date();
                const diffHours = (now - txDate) / (1000 * 60 * 60);
                
                if (tier === 'recent' && diffHours > 1) continue;
                if (tier === 'daily' && diffHours > 24) continue;

                await this.#processEntry(tenant_id, qTx);
            }
        } catch (err) {
            console.error(`[Recon] Tiered sweep failed (${tier}):`, err.message);
        }
    }

    static #getWindowSize(tier) {
        if (tier === 'recent') return 1;
        if (tier === 'daily') return 24;
        return 720; // 30 days
    }

    static async #processEntry(tenant_id, qTx) {
        const reference = qTx.reference;
        const provider = 'quaser';
        const qStatus = this.#mapStatus(qTx.status);

        // Idempotent repair attempt
        // Note: LedgerService.upsertLedgerEntry already handles:
        // 1. SELECT FOR UPDATE locking
        // 2. Monotonic status check
        // 3. Provider Mismatch block
        const result = await LedgerService.upsertLedgerEntry({
            tenant_id,
            reference,
            provider,
            type: qTx.type === 'inbound' ? 'credit' : 'debit',
            amount: qTx.amount,
            status: qStatus,
            source: 'quaser',
            metadata: { reconciliation_tier_repair: true }
        });

        if (!result.success && result.error.includes('Provider mismatch')) {
            console.error(`[Recon] Hard Block: Provider mismatch for ${reference}. Manual review required.`);
        }
    }

    static #mapStatus(qStatus) {
        if (qStatus === 'success' || qStatus === 'completed') return 'succeeded';
        if (qStatus === 'failed' || qStatus === 'cancelled') return 'failed';
        if (qStatus === 'processing') return 'processing';
        return 'pending';
    }
}

module.exports = ReconciliationService;
