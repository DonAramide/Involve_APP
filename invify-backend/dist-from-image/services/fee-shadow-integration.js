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
exports.FeeShadowIntegration = exports.FEE_SHADOW_SOURCE_VA = exports.FEE_SHADOW_SOURCE_POS = void 0;
exports.nairaToKobo = nairaToKobo;
exports.posShadowIdempotencyKey = posShadowIdempotencyKey;
exports.vaShadowIdempotencyKey = vaShadowIdempotencyKey;
exports.buildFeeShadowReport = buildFeeShadowReport;
exports.estimateLegacyVaInwardFeeKobo = estimateLegacyVaInwardFeeKobo;
exports.setFeeShadowTestOrchestrator = setFeeShadowTestOrchestrator;
const FeeOrchestrator_1 = require("../modules/fee-orchestration/FeeOrchestrator");
const FeeCalculator_1 = require("../modules/fee-orchestration/FeeCalculator");
const SupabaseFeeAssessmentStore_1 = require("../modules/fee-orchestration/stores/SupabaseFeeAssessmentStore");
const SupabaseFeeProfileCatalog_1 = require("../modules/fee-orchestration/stores/SupabaseFeeProfileCatalog");
const supabase_1 = require("../db/supabase");
const fee_live_gate_1 = require("./fee-live-gate");
const va_inward_charge_service_1 = require("./va-inward-charge.service");
exports.FEE_SHADOW_SOURCE_POS = 'invify.pos';
exports.FEE_SHADOW_SOURCE_VA = 'invify.va';
function nairaToKobo(amountNaira) {
    return Math.round(Number(amountNaira) * 100);
}
function usableReference(value) {
    const trimmed = String(value ?? '').trim();
    return trimmed && trimmed.toUpperCase() !== 'N/A' ? trimmed : '';
}
/**
 * Deterministic POS fee idempotency key derived only from transaction identity
 * that is identical across retries and delayed callbacks:
 *   1. terminal-scoped client reference (when the device supplies one)
 *   2. RRN + STAN
 * Returns null when neither exists. Server-generated ids (txId) are random per
 * call and must never be used here.
 */
function posShadowIdempotencyKey(params) {
    const tenantId = usableReference(params.tenantId);
    if (!tenantId)
        return null;
    const clientReference = usableReference(params.clientReference);
    const terminalId = usableReference(params.terminalId);
    if (clientReference && terminalId) {
        return `POS_WITHDRAWAL:${tenantId}:ref:${terminalId}:${clientReference}`;
    }
    const rrn = usableReference(params.rrn);
    const stan = usableReference(params.stan);
    if (rrn && stan) {
        return `POS_WITHDRAWAL:${tenantId}:${rrn}:${stan}`;
    }
    return null;
}
function vaShadowIdempotencyKey(reference) {
    return `VIRTUAL_ACCOUNT_INWARD_TRANSFER:${reference}`;
}
function buildFeeShadowReport(result, extras) {
    if (result.status === 'SHADOW_FAILED') {
        return {
            status: 'SHADOW_FAILED',
            transaction_type: '',
            source_system: '',
            source_idempotency_key: '',
            transaction_amount_kobo: null,
            profile_id: null,
            profile_version_id: null,
            override_version_id: null,
            calculated_fee_kobo: null,
            final_fee_kobo: null,
            platform_amount_kobo: null,
            processor_amount_kobo: null,
            service_amount_kobo: null,
            agent_amount_kobo: null,
            legacy_fee_independently_calculated: extras?.legacyFeeKobo != null,
            compared_existing_fee_kobo: extras?.legacyFeeKobo ?? null,
            compare_delta_kobo: null,
            error: result.error,
        };
    }
    if (result.status === 'SKIPPED' || result.status === 'NO_PROFILE') {
        return {
            status: result.status === 'SKIPPED' ? 'SKIPPED' : 'NO_PROFILE',
            transaction_type: '',
            source_system: '',
            source_idempotency_key: '',
            transaction_amount_kobo: null,
            profile_id: null,
            profile_version_id: null,
            override_version_id: null,
            calculated_fee_kobo: null,
            final_fee_kobo: null,
            platform_amount_kobo: null,
            processor_amount_kobo: null,
            service_amount_kobo: null,
            agent_amount_kobo: null,
            legacy_fee_independently_calculated: extras?.legacyFeeKobo != null,
            compared_existing_fee_kobo: extras?.legacyFeeKobo ?? null,
            compare_delta_kobo: extras?.legacyFeeKobo ?? null,
            ...(result.status === 'SKIPPED' && result.reason ? { skip_reason: result.reason } : {}),
        };
    }
    const snap = result.snapshot;
    const legacy = extras?.legacyFeeKobo ?? null;
    return {
        status: result.status,
        transaction_type: snap.transaction_type,
        source_system: snap.source_system,
        source_idempotency_key: snap.source_idempotency_key,
        transaction_amount_kobo: snap.transaction_amount_kobo,
        profile_id: snap.profile_id,
        profile_version_id: snap.profile_version_id,
        override_version_id: snap.override_version_id,
        calculated_fee_kobo: snap.calculated_fee_kobo,
        final_fee_kobo: snap.final_fee_kobo,
        platform_amount_kobo: snap.platform_amount_kobo,
        processor_amount_kobo: snap.processor_amount_kobo,
        service_amount_kobo: snap.service_amount_kobo,
        agent_amount_kobo: snap.agent_amount_kobo,
        legacy_fee_independently_calculated: legacy != null,
        compared_existing_fee_kobo: legacy,
        compare_delta_kobo: legacy != null ? snap.final_fee_kobo - legacy : null,
    };
}
/** Read-only estimate from tenant_fee_profiles VA inward columns. Never writes. */
function estimateLegacyVaInwardFeeKobo(transactionAmountKobo, profile) {
    if (!profile || profile.transfer_inward_fee_bps == null)
        return null;
    const bps = Number(profile.transfer_inward_fee_bps);
    if (!Number.isFinite(bps) || bps < 0)
        return null;
    try {
        const capNaira = profile.transfer_inward_fee_cap != null ? Number(profile.transfer_inward_fee_cap) : 0;
        const calc = FeeCalculator_1.FeeCalculator.calculate({
            method: 'PERCENTAGE',
            transactionAmountKobo,
            percentageBps: bps,
            flatAmountKobo: 0,
            minFeeKobo: 0,
            maxFeeKobo: capNaira > 0 ? Math.round(capNaira * 100) : 0,
        });
        return calc.final_fee_kobo;
    }
    catch {
        return null;
    }
}
let testOrchestrator = null;
let productionOrchestrator = null;
function setFeeShadowTestOrchestrator(orchestrator) {
    testOrchestrator = orchestrator;
}
function getOrchestrator() {
    if (testOrchestrator)
        return testOrchestrator;
    if (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true') {
        throw new Error('FEE_SHADOW_SKIP_NETWORK');
    }
    if (!productionOrchestrator) {
        productionOrchestrator = new FeeOrchestrator_1.FeeOrchestrator(new SupabaseFeeProfileCatalog_1.SupabaseFeeProfileCatalog(), new SupabaseFeeAssessmentStore_1.SupabaseFeeAssessmentStore());
    }
    return productionOrchestrator;
}
async function loadLegacyVaProfile(tenantId) {
    if (process.env.JEST_WORKER_ID && process.env.FEE_SHADOW_ALLOW_SUPABASE !== 'true') {
        return null;
    }
    try {
        const { data } = await supabase_1.supabaseAdmin
            .from('tenant_fee_profiles')
            .select('transfer_inward_fee_bps, transfer_inward_fee_cap')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        return data;
    }
    catch {
        return null;
    }
}
class FeeShadowIntegration {
    static async assessPosWithdrawalSafely(params) {
        try {
            const amountKobo = nairaToKobo(params.amountNaira);
            if (!params.tenantId || amountKobo <= 0) {
                return buildFeeShadowReport({ status: 'SKIPPED' });
            }
            const sourceIdempotencyKey = posShadowIdempotencyKey(params);
            if (!sourceIdempotencyKey) {
                console.warn(`[FeeShadow] POS assessment skipped: no stable reference (tenant=${params.tenantId} tx=${params.txId})`);
                return buildFeeShadowReport({ status: 'SKIPPED', reason: 'NO_STABLE_REFERENCE' });
            }
            let orchestrator;
            try {
                orchestrator = getOrchestrator();
            }
            catch (err) {
                if (String(err?.message) === 'FEE_SHADOW_SKIP_NETWORK') {
                    return buildFeeShadowReport({ status: 'SKIPPED' });
                }
                throw err;
            }
            let owner = null;
            try {
                owner = await (0, SupabaseFeeProfileCatalog_1.loadOwningAgentForTenant)(params.tenantId);
            }
            catch (ownErr) {
                console.warn('[FeeShadow] POS ownership:', ownErr?.message || ownErr);
            }
            const result = await orchestrator.assess({
                transactionType: 'POS_WITHDRAWAL',
                tenantId: params.tenantId,
                agentId: owner?.agent_id || null,
                transactionAmountKobo: amountKobo,
                eventTime: params.eventTime || new Date(),
                sourceSystem: exports.FEE_SHADOW_SOURCE_POS,
                sourceIdempotencyKey,
                transactionReference: params.txId,
                mode: 'SHADOW',
            });
            return buildFeeShadowReport(result);
        }
        catch (err) {
            console.warn('[FeeShadow] POS assessment isolated failure:', err?.message || err);
            return buildFeeShadowReport({ status: 'SHADOW_FAILED', error: String(err?.message || err) });
        }
    }
    static async assessVaInwardSafely(params) {
        try {
            const amountKobo = nairaToKobo(params.amountNaira);
            if (!params.tenantId || !params.reference || amountKobo <= 0) {
                return buildFeeShadowReport({ status: 'SKIPPED' });
            }
            let orchestrator;
            try {
                orchestrator = getOrchestrator();
            }
            catch (err) {
                if (String(err?.message) === 'FEE_SHADOW_SKIP_NETWORK') {
                    return buildFeeShadowReport({ status: 'SKIPPED' });
                }
                throw err;
            }
            let owner = null;
            try {
                owner = await (0, SupabaseFeeProfileCatalog_1.loadOwningAgentForTenant)(params.tenantId);
            }
            catch (ownErr) {
                console.warn('[FeeShadow] VA ownership:', ownErr?.message || ownErr);
            }
            const result = await orchestrator.assess({
                transactionType: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
                tenantId: params.tenantId,
                agentId: owner?.agent_id || null,
                transactionAmountKobo: amountKobo,
                eventTime: params.eventTime || new Date(),
                sourceSystem: exports.FEE_SHADOW_SOURCE_VA,
                sourceIdempotencyKey: vaShadowIdempotencyKey(params.reference),
                transactionReference: params.reference,
                mode: (0, fee_live_gate_1.liveFeeAssessmentMode)(),
            });
            const legacy = estimateLegacyVaInwardFeeKobo(amountKobo, await loadLegacyVaProfile(params.tenantId));
            const report = buildFeeShadowReport(result, { legacyFeeKobo: legacy });
            if ((0, fee_live_gate_1.isLiveFeePostingAllowed)() &&
                (result.status === 'ASSESSED' || result.status === 'IDEMPOTENT_REPLAY') &&
                result.snapshot.mode === 'LIVE') {
                try {
                    const { InboundFeeService } = await Promise.resolve().then(() => __importStar(require('./inbound-fee.service')));
                    const live = await InboundFeeService.enqueueLiveAssessment(result.snapshot);
                    return { ...report, ...live };
                }
                catch (postErr) {
                    console.error('[FeeShadow] VA live fee enqueue failed; gross credit kept:', postErr?.message || postErr);
                    return { ...report, live_enqueued: false, live_posted: false, error: String(postErr?.message || postErr) };
                }
            }
            return report;
        }
        catch (err) {
            console.warn('[FeeShadow] VA assessment isolated failure:', err?.message || err);
            return buildFeeShadowReport({ status: 'SHADOW_FAILED', error: String(err?.message || err) });
        }
    }
    static isPosApproved(response) {
        if (!response)
            return false;
        return response.paymentSuccess === true || String(response.statusCode || '') === '00';
    }
    static shouldAssessVaInward(input = {}) {
        const status = String(input.status || 'success').toLowerCase();
        if (['failed', 'failure', 'declined', 'error', 'pending', 'abandoned'].includes(status)) {
            return false;
        }
        if (String(input.type || '').toLowerCase() === 'payout')
            return false;
        return true;
    }
    static async afterPosResult(response, params) {
        if (this.isPosApproved(response)) {
            await this.assessPosWithdrawalSafely(params);
        }
        return response;
    }
    static async afterVaInwardResult(success, params) {
        if (!success || !this.shouldAssessVaInward({ status: success ? 'success' : 'failed' })) {
            return { status: 'SKIPPED' };
        }
        try {
            await (0, va_inward_charge_service_1.deductVaInwardCharge)(params);
        }
        catch (err) {
            console.warn('[VaInwardCharge] deduction skipped:', err?.message || err);
        }
        return this.assessVaInwardSafely(params);
    }
}
exports.FeeShadowIntegration = FeeShadowIntegration;
//# sourceMappingURL=fee-shadow-integration.js.map