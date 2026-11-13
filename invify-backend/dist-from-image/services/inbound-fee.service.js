"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundFeeService = void 0;
const fee_shadow_integration_1 = require("./fee-shadow-integration");
const fee_live_gate_1 = require("./fee-live-gate");
const fee_posting_outbox_1 = require("./fee-posting-outbox");
const fee_posting_outbox_stores_1 = require("./fee-posting-outbox.stores");
const fee_ledger_poster_1 = require("./fee-ledger-poster");
const wallet_service_1 = require("./wallet.service");
/** Exact kobo to naira with two decimal places. 102 kobo is ₦1.02, not ₦1. */
function koboToNaira(kobo) {
    if (!Number.isInteger(kobo) || kobo < 0)
        return 0;
    return Number((kobo / 100).toFixed(2));
}
/**
 * The fee engine splits integer kobo. The wallet stores naira, so each
 * component is converted at two decimal places and the debit stays the exact fee.
 */
function walletPostingAmounts(snapshot) {
    const platform = koboToNaira(snapshot.platform_amount_kobo);
    const processor = koboToNaira(snapshot.processor_amount_kobo);
    const service = koboToNaira(snapshot.service_amount_kobo);
    const agent = koboToNaira(snapshot.agent_amount_kobo);
    const final = koboToNaira(snapshot.final_fee_kobo);
    return {
        platform_amount_kobo: platform,
        processor_amount_kobo: processor,
        service_amount_kobo: service,
        agent_amount_kobo: agent,
        final_fee_kobo: final,
    };
}
/**
 * Posts the inbound VA fee as a separate USER_WALLET debit after gross credit.
 * Failures are parked on the outbox (NEEDS_ATTENTION); the gross credit is kept.
 */
class InboundFeeService {
    static testOutboxStore = null;
    static memoryStore = null;
    static store() {
        if (this.testOutboxStore)
            return this.testOutboxStore;
        if (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true') {
            if (!this.memoryStore)
                this.memoryStore = new fee_posting_outbox_stores_1.MemoryFeePostingOutboxStore();
            return this.memoryStore;
        }
        return new fee_posting_outbox_stores_1.SupabaseFeePostingOutboxStore();
    }
    static async enqueueLiveAssessment(snapshot) {
        if (!(0, fee_live_gate_1.isLiveFeePostingAllowed)() || snapshot.mode !== 'LIVE' || snapshot.transaction_type !== 'VIRTUAL_ACCOUNT_INWARD_TRANSFER') {
            return { live_enqueued: false, live_posted: false, needs_attention: false };
        }
        if (snapshot.kind !== 'ASSESSMENT' || snapshot.final_fee_kobo <= 0) {
            return { live_enqueued: false, live_posted: false, needs_attention: false };
        }
        const posted = walletPostingAmounts(snapshot);
        if (posted.final_fee_kobo <= 0) {
            return { live_enqueued: false, live_posted: false, needs_attention: false };
        }
        await wallet_service_1.WalletService.ensureWallet(snapshot.tenant_id);
        const store = this.store();
        const outbox = new fee_posting_outbox_1.FeePostingOutbox(store);
        await outbox.enqueueAssessment({
            ...snapshot,
            ...posted,
        });
        const run = await new fee_posting_outbox_1.FeePostingWorker(store, fee_ledger_poster_1.FeeLedgerPoster).runOnce(8);
        const needs = run.status === 'PROCESSED' && run.needsAttention > 0;
        if (needs) {
            console.error(`[InboundFee] ${snapshot.transaction_reference} fee posting NEEDS_ATTENTION; gross credit kept`);
        }
        return {
            live_enqueued: true,
            live_posted: run.status === 'PROCESSED' && run.done > 0,
            needs_attention: needs,
        };
    }
    static attachLiveFields(report, extra) {
        return { ...report, ...extra };
    }
    static fromAssess(result, extra) {
        return { ...(0, fee_shadow_integration_1.buildFeeShadowReport)(result), ...extra };
    }
}
exports.InboundFeeService = InboundFeeService;
//# sourceMappingURL=inbound-fee.service.js.map