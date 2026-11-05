"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreasuryFeeService = exports.TreasuryQuoteError = void 0;
const FeeCalculator_1 = require("../modules/fee-orchestration/FeeCalculator");
const FeeOrchestrator_1 = require("../modules/fee-orchestration/FeeOrchestrator");
const FeeResolver_1 = require("../modules/fee-orchestration/FeeResolver");
const FeeSplitter_1 = require("../modules/fee-orchestration/FeeSplitter");
const MemoryFeeAssessmentStore_1 = require("../modules/fee-orchestration/stores/MemoryFeeAssessmentStore");
const SupabaseFeeProfileCatalog_1 = require("../modules/fee-orchestration/stores/SupabaseFeeProfileCatalog");
const SupabaseFeeAssessmentStore_1 = require("../modules/fee-orchestration/stores/SupabaseFeeAssessmentStore");
const fee_live_gate_1 = require("./fee-live-gate");
const wallet_service_1 = require("./wallet.service");
class TreasuryQuoteError extends Error {
    code;
    payload;
    constructor(message, code, payload = {}) {
        super(message);
        this.code = code;
        this.payload = payload;
        this.name = 'TreasuryQuoteError';
    }
}
exports.TreasuryQuoteError = TreasuryQuoteError;
function catalog() {
    return new SupabaseFeeProfileCatalog_1.SupabaseFeeProfileCatalog();
}
class TreasuryFeeService {
    static testCatalog = null;
    static testAssessmentStore = null;
    static async quote(tenantId, requestedAmount) {
        const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
        const requested = round2(Number(requestedAmount));
        if (!(requested > 0)) {
            throw new TreasuryQuoteError('Valid requested amount required', 'INVALID_AMOUNT');
        }
        const available = Number((await wallet_service_1.WalletService.getBalance(tenantId)).balance || 0);
        const resolved = await TreasuryFeeService.resolve(tenantId);
        let serviceFee = 0;
        let serviceFeeKobo = 0;
        let versionId = null;
        let profileId = null;
        if (resolved) {
            const calc = FeeCalculator_1.FeeCalculator.calculate({
                method: resolved.method,
                transactionAmountKobo: (0, fee_live_gate_1.walletAmountToKobo)(requested),
                percentageBps: resolved.percentage_bps,
                flatAmountKobo: resolved.flat_amount_kobo,
                minFeeKobo: resolved.min_fee_kobo,
                maxFeeKobo: resolved.max_fee_kobo,
                tenantId,
            });
            serviceFeeKobo = calc.final_fee_kobo;
            serviceFee = round2((0, fee_live_gate_1.koboToWalletAmount)(serviceFeeKobo));
            versionId = resolved.profile_version_id;
            profileId = resolved.profile_id;
        }
        const total = round2(requested + serviceFee);
        const shortfall = round2(Math.max(0, total - available));
        return {
            transaction_type: 'TREASURY_WITHDRAWAL',
            requested_amount: requested,
            service_fee: serviceFee,
            total_required: total,
            available_balance: available,
            remaining_balance: shortfall > 0 ? null : round2(available - total),
            shortfall,
            sufficient: shortfall === 0,
            fee_profile_version_id: versionId,
            fee_profile_id: profileId,
            service_fee_kobo: serviceFeeKobo,
            requested_amount_kobo: (0, fee_live_gate_1.walletAmountToKobo)(requested),
        };
    }
    static async resolve(tenantId) {
        const cat = this.testCatalog || catalog();
        const resolver = new FeeResolver_1.FeeResolver(cat);
        let agentId = null;
        try {
            agentId = (await (0, SupabaseFeeProfileCatalog_1.loadOwningAgentForTenant)(tenantId))?.agent_id || null;
        }
        catch {
            agentId = null;
        }
        const result = await resolver.resolve('TREASURY_WITHDRAWAL', tenantId, new Date(), agentId);
        if (result.status !== 'RESOLVED')
            return null;
        if (result.version.transaction_type !== 'TREASURY_WITHDRAWAL')
            return null;
        return result.version;
    }
    static feeCreditEntriesNaira(version, serviceFeeNaira) {
        if (serviceFeeNaira <= 0)
            return [];
        const split = FeeSplitter_1.FeeSplitter.split((0, fee_live_gate_1.walletAmountToKobo)(serviceFeeNaira), version);
        const entries = [
            { account: 'PLATFORM_FEE', type: 'CREDIT', amount: (0, fee_live_gate_1.koboToWalletAmount)(split.platform_amount_kobo) },
            { account: 'PROCESSOR_FEE', type: 'CREDIT', amount: (0, fee_live_gate_1.koboToWalletAmount)(split.processor_amount_kobo) },
            { account: 'SERVICE_FEE', type: 'CREDIT', amount: (0, fee_live_gate_1.koboToWalletAmount)(split.service_amount_kobo) },
            { account: 'AGENT_FEE', type: 'CREDIT', amount: (0, fee_live_gate_1.koboToWalletAmount)(split.agent_amount_kobo) },
        ].filter((e) => e.amount > 0);
        return entries;
    }
    static async persistAssessment(params) {
        if (!(0, fee_live_gate_1.isLiveFeePostingAllowed)())
            return;
        const orch = new FeeOrchestrator_1.FeeOrchestrator(this.testCatalog || catalog(), this.testAssessmentStore ||
            (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true'
                ? new MemoryFeeAssessmentStore_1.MemoryFeeAssessmentStore()
                : new SupabaseFeeAssessmentStore_1.SupabaseFeeAssessmentStore()));
        await orch.assess({
            transactionType: 'TREASURY_WITHDRAWAL',
            tenantId: params.tenantId,
            transactionAmountKobo: (0, fee_live_gate_1.walletAmountToKobo)(params.requestedAmount),
            eventTime: new Date(),
            sourceSystem: 'invify.treasury',
            sourceIdempotencyKey: `TREASURY_WITHDRAWAL:${params.tenantId}:${params.reference}`,
            transactionReference: params.reference,
            mode: (0, fee_live_gate_1.liveFeeAssessmentMode)(),
        });
    }
}
exports.TreasuryFeeService = TreasuryFeeService;
//# sourceMappingURL=treasury-fee.service.js.map