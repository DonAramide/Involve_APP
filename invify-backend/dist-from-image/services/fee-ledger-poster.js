"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeLedgerPoster = exports.PERMANENT_FEE_POSTING_CODES = exports.FeeLedgerPostingError = void 0;
exports.feeAssessIdempotencyKey = feeAssessIdempotencyKey;
exports.feeReverseIdempotencyKey = feeReverseIdempotencyKey;
exports.assertLedgerBundleBalanced = assertLedgerBundleBalanced;
exports.buildFeeAssessmentBundle = buildFeeAssessmentBundle;
exports.reverseFeeComponents = reverseFeeComponents;
exports.buildFeeReversalBundle = buildFeeReversalBundle;
exports.mapGuardedRpcError = mapGuardedRpcError;
exports.setFeeLedgerRpcForTests = setFeeLedgerRpcForTests;
const FeeSplitter_1 = require("../modules/fee-orchestration/FeeSplitter");
const types_1 = require("../modules/fee-orchestration/types");
const ledger_service_1 = require("./ledger.service");
class FeeLedgerPostingError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'FeeLedgerPostingError';
    }
}
exports.FeeLedgerPostingError = FeeLedgerPostingError;
function feeAssessIdempotencyKey(assessmentId) {
    return `ledger:fee:assess:${assessmentId}`;
}
function feeReverseIdempotencyKey(reversalId) {
    return `ledger:fee:reverse:${reversalId}`;
}
function positiveEntries(entries) {
    return entries.filter((e) => e.amount > 0);
}
/** Compare money in kobo so ₦1.02 and a float sum of its parts still balance. */
function moneyKobo(amount) {
    return Math.round(Number(amount) * 100);
}
function assertLedgerBundleBalanced(entries) {
    const debit = entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + moneyKobo(e.amount), 0);
    const credit = entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + moneyKobo(e.amount), 0);
    if (debit !== credit) {
        throw new FeeLedgerPostingError(`unbalanced fee ledger bundle: debit ${debit} credit ${credit}`, 'UNBALANCED');
    }
}
/**
 * Live bundle (not executed in shadow):
 * DEBIT USER_WALLET final_fee
 * CREDIT PLATFORM_FEE / PROCESSOR_FEE / SERVICE_FEE / AGENT_FEE
 * PROCESSOR_FEE is a payable, not platform revenue.
 */
function buildFeeAssessmentBundle(amounts) {
    const finalKobo = moneyKobo(amounts.platform_amount_kobo +
        amounts.processor_amount_kobo +
        amounts.service_amount_kobo +
        amounts.agent_amount_kobo);
    if (!Number.isFinite(finalKobo) || finalKobo < 0) {
        throw new FeeLedgerPostingError('final fee must be a non-negative amount', 'INVALID_AMOUNT');
    }
    if (finalKobo === 0) {
        return [];
    }
    const finalFee = finalKobo / 100;
    const entries = positiveEntries([
        { account: 'USER_WALLET', type: 'DEBIT', amount: finalFee },
        { account: 'PLATFORM_FEE', type: 'CREDIT', amount: amounts.platform_amount_kobo },
        { account: 'PROCESSOR_FEE', type: 'CREDIT', amount: amounts.processor_amount_kobo },
        { account: 'SERVICE_FEE', type: 'CREDIT', amount: amounts.service_amount_kobo },
        { account: 'AGENT_FEE', type: 'CREDIT', amount: amounts.agent_amount_kobo },
    ]);
    assertLedgerBundleBalanced(entries);
    return entries;
}
/**
 * Proportional component reversal: refund_fee = trunc(original_final * refunded_txn / original_txn),
 * then largest-remainder across original component weights so shares keep proportion.
 */
function reverseFeeComponents(params) {
    const originalFinal = params.original.platform_amount_kobo +
        params.original.processor_amount_kobo +
        params.original.service_amount_kobo +
        params.original.agent_amount_kobo;
    if (!Number.isInteger(params.originalTransactionAmountKobo) ||
        params.originalTransactionAmountKobo <= 0) {
        throw new types_1.FeeOrchestrationError('original transaction amount must be a positive integer', 'INVALID_AMOUNT');
    }
    if (!Number.isInteger(params.refundedTransactionAmountKobo) ||
        params.refundedTransactionAmountKobo < 0 ||
        params.refundedTransactionAmountKobo > params.originalTransactionAmountKobo) {
        throw new types_1.FeeOrchestrationError('refunded amount must be between 0 and original transaction amount', 'INVALID_AMOUNT');
    }
    const targetFee = Number((BigInt(originalFinal) * BigInt(params.refundedTransactionAmountKobo)) /
        BigInt(params.originalTransactionAmountKobo));
    const allocated = FeeSplitter_1.FeeSplitter.allocateByWeights(targetFee, [
        params.original.platform_amount_kobo,
        params.original.processor_amount_kobo,
        params.original.service_amount_kobo,
        params.original.agent_amount_kobo,
    ]);
    return {
        platform_amount_kobo: allocated[0],
        processor_amount_kobo: allocated[1],
        service_amount_kobo: allocated[2],
        agent_amount_kobo: allocated[3],
    };
}
/**
 * Opposite of the live assessment bundle: CREDIT USER_WALLET, DEBIT each fee account.
 */
function buildFeeReversalBundle(amounts) {
    const finalKobo = moneyKobo(amounts.platform_amount_kobo +
        amounts.processor_amount_kobo +
        amounts.service_amount_kobo +
        amounts.agent_amount_kobo);
    if (finalKobo === 0) {
        return [];
    }
    const finalFee = finalKobo / 100;
    const entries = positiveEntries([
        { account: 'USER_WALLET', type: 'CREDIT', amount: finalFee },
        { account: 'PLATFORM_FEE', type: 'DEBIT', amount: amounts.platform_amount_kobo },
        { account: 'PROCESSOR_FEE', type: 'DEBIT', amount: amounts.processor_amount_kobo },
        { account: 'SERVICE_FEE', type: 'DEBIT', amount: amounts.service_amount_kobo },
        { account: 'AGENT_FEE', type: 'DEBIT', amount: amounts.agent_amount_kobo },
    ]);
    assertLedgerBundleBalanced(entries);
    return entries;
}
function assertLivePostingAllowed(mode) {
    if (mode !== 'LIVE') {
        throw new FeeLedgerPostingError('Shadow mode cannot invoke the fee ledger poster', 'SHADOW_FORBIDDEN');
    }
    if (process.env.FEE_ORCHESTRATION_LIVE !== 'true') {
        throw new FeeLedgerPostingError('Fee ledger posting is not enabled', 'LIVE_FLAG_OFF');
    }
}
/** Deterministic rejections raised by the guarded fee RPCs. Never retried by the outbox. */
exports.PERMANENT_FEE_POSTING_CODES = [
    'INSUFFICIENT_BALANCE',
    'FEE_DEBIT_INVALID_KEY',
    'FEE_DEBIT_INVALID_BUNDLE',
    'FEE_DEBIT_WALLET_NOT_FOUND',
    'FEE_REVERSAL_INVALID_KEY',
    'FEE_REVERSAL_INVALID_BUNDLE',
    'FEE_REVERSAL_WALLET_NOT_FOUND',
    'FEE_REVERSAL_ORIGINAL_NOT_POSTED',
    'FEE_REVERSAL_EXCEEDS_ORIGINAL',
];
function mapGuardedRpcError(error) {
    const message = String(error?.message || error || 'unknown fee ledger error');
    const code = exports.PERMANENT_FEE_POSTING_CODES.find((c) => message.includes(c));
    return new FeeLedgerPostingError(message, code || 'LEDGER_WRITE_FAILED');
}
let rpcOverride = null;
/** Test seam: route guarded RPCs to a local database harness. */
function setFeeLedgerRpcForTests(rpc) {
    rpcOverride = rpc;
}
async function callGuardedRpc(fn, args) {
    if (rpcOverride)
        return rpcOverride(fn, args);
    const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require('../db/supabase')));
    const res = await supabaseAdmin.rpc(fn, args);
    return { data: res.data, error: res.error };
}
function toPostingResult(data, idempotencyKey) {
    const status = data?.status === 'DE-DUPLICATED' ? 'DE-DUPLICATED' : 'CREATED';
    return { status, ledgerId: data?.ledger_id ?? null, idempotencyKey };
}
/**
 * Capability-only poster. Not wired into FeeOrchestrator or any money path.
 * Runs only if mode=LIVE and FEE_ORCHESTRATION_LIVE=true, and only through the
 * guarded RPCs (post_fee_debit_guarded / post_fee_reversal_guarded).
 */
class FeeLedgerPoster {
    static accountNature = ledger_service_1.FEE_LEDGER_ACCOUNT_NATURE;
    static feeAccounts = ledger_service_1.FEE_LEDGER_ACCOUNTS;
    static async postAssessment(params) {
        assertLivePostingAllowed(params.mode);
        const entries = buildFeeAssessmentBundle(params.amounts);
        if (entries.length === 0) {
            return { status: 'SKIPPED_ZERO' };
        }
        const idempotencyKey = feeAssessIdempotencyKey(params.assessmentId);
        const { data, error } = await callGuardedRpc('post_fee_debit_guarded', {
            p_tenant_id: params.tenantId,
            p_idempotency_key: idempotencyKey,
            p_reference: params.reference,
            p_entries: entries,
            p_metadata: {
                kind: 'FEE_ASSESSMENT',
                assessmentId: params.assessmentId,
                accountNature: ledger_service_1.FEE_LEDGER_ACCOUNT_NATURE,
            },
        });
        if (error)
            throw mapGuardedRpcError(error);
        return toPostingResult(data, idempotencyKey);
    }
    static async postReversal(params) {
        assertLivePostingAllowed(params.mode);
        const entries = buildFeeReversalBundle(params.amounts);
        if (entries.length === 0) {
            return { status: 'SKIPPED_ZERO' };
        }
        const idempotencyKey = feeReverseIdempotencyKey(params.reversalId);
        const { data, error } = await callGuardedRpc('post_fee_reversal_guarded', {
            p_tenant_id: params.tenantId,
            p_idempotency_key: idempotencyKey,
            p_reference: params.reference,
            p_assessment_id: params.assessmentId,
            p_entries: entries,
            p_metadata: {
                kind: 'FEE_REVERSAL',
                reversalId: params.reversalId,
                accountNature: ledger_service_1.FEE_LEDGER_ACCOUNT_NATURE,
            },
        });
        if (error)
            throw mapGuardedRpcError(error);
        return toPostingResult(data, idempotencyKey);
    }
}
exports.FeeLedgerPoster = FeeLedgerPoster;
//# sourceMappingURL=fee-ledger-poster.js.map