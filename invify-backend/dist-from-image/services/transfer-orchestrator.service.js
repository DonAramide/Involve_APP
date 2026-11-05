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
exports.TransferOrchestrator = void 0;
const supabase_1 = require("../db/supabase");
const routing_engine_service_1 = require("./routing-engine.service");
const banking_gateway_service_1 = require("./banking-gateway.service");
const quasar_event_gateway_service_1 = require("./quasar-event-gateway.service");
const crypto = __importStar(require("crypto"));
const FinancialVerificationEngine_1 = require("./financial-verification/FinancialVerificationEngine");
const VerificationContext_1 = require("./financial-verification/shared/VerificationContext");
class TransferOrchestrator {
    static locks = new Map();
    static verificationEngine = new FinancialVerificationEngine_1.FinancialVerificationEngine();
    /**
     * Acquire a simulated distributed execution lock with a heartbeat renewal
     */
    static async acquireExecutionLock(lockKey) {
        const now = Date.now();
        const existing = this.locks.get(lockKey);
        if (existing && existing.expiresAt > now) {
            return false; // Lock is already held
        }
        // Set lock with 120s TTL
        const expiresAt = now + 120 * 1000;
        // Heartbeat renewal timer every 30 seconds
        const timer = setInterval(() => {
            const lock = this.locks.get(lockKey);
            if (lock) {
                lock.expiresAt = Date.now() + 120 * 1000;
            }
        }, 30 * 1000);
        this.locks.set(lockKey, { expiresAt, timer });
        return true;
    }
    static releaseExecutionLock(lockKey) {
        const existing = this.locks.get(lockKey);
        if (existing) {
            clearInterval(existing.timer);
            this.locks.delete(lockKey);
        }
    }
    static async initiateTransfer(params) {
        const lockKey = `lock:transfer:${params.tenantId}:${params.beneficiaryAccountNumber}`;
        // 1. Acquire Lock
        const acquired = await this.acquireExecutionLock(lockKey);
        if (!acquired) {
            throw new Error('Lock acquisition failed. A transaction for this account is already in progress.');
        }
        try {
            const excludeList = [];
            // 2. Select initial optimal provider
            let provider = await routing_engine_service_1.RoutingEngineService.selectOptimalProvider({
                requiredCapability: 'supports_nip_transfer',
                amount: params.amount,
                excludeProviders: excludeList
            });
            // 3. Register baseline financial event
            const eventId = crypto.randomUUID();
            const reference = `REF_TX_${Date.now()}`;
            await supabase_1.supabaseAdmin.from('financial_events').insert({
                id: eventId,
                event_type: 'PAYOUT_WITHDRAWAL',
                state: 'INITIALIZED',
                reference,
                tenant_id: params.tenantId,
                created_by: params.userId
            });
            // 4. Create base transfer log
            const { data: log, error: logErr } = await supabase_1.supabaseAdmin
                .from('bank_transfer_logs')
                .insert({
                tenant_id: params.tenantId,
                financial_event_id: eventId,
                beneficiary_id: params.beneficiaryId,
                provider: provider,
                amount: params.amount,
                fee_amount: params.fee,
                net_amount: params.amount - params.fee,
                status: 'PENDING'
            })
                .select()
                .single();
            if (logErr || !log) {
                throw new Error(`Failed to create transfer logs: ${logErr?.message}`);
            }
            // ==========================================
            // INVIFY INDEPENDENT FINANCIAL VERIFICATION
            // ==========================================
            const { data: initialReq } = await supabase_1.supabaseAdmin
                .from('quasar_verification_requests')
                .select('*')
                .eq('financial_event_id', eventId)
                .maybeSingle();
            const verificationContext = new VerificationContext_1.VerificationContext({
                tenantId: params.tenantId,
                amount: params.amount,
                currency: 'NGN',
                financialEventId: eventId,
                beneficiaryAccountNumber: params.beneficiaryAccountNumber,
                beneficiaryBankCode: params.beneficiaryBankCode,
                provider: provider,
                metadata: {
                    nonce: initialReq?.nonce,
                    signature: initialReq?.signed_token,
                    test_force_liquidity_fail: initialReq?.signed_token === 'force_liquidity_fail'
                }
            });
            const { verdict } = await this.verificationEngine.execute(verificationContext, 'Banking', 'WITHDRAWAL');
            if (!verdict.passed || verdict.decision !== 'ALLOW') {
                throw new Error(`Invify Verification Rejected: ${verdict.errors.join(', ')}`);
            }
            // ==========================================
            // QUASAR FINANCIAL AUTHORITY AUTHORIZATION CHECK
            // ==========================================
            const { data: request } = await supabase_1.supabaseAdmin
                .from('quasar_verification_requests')
                .select('id')
                .eq('financial_event_id', eventId)
                .maybeSingle();
            if (!request) {
                throw new Error('Quasar Verification Request not found for this transaction.');
            }
            const { data: result, error: resErr } = await supabase_1.supabaseAdmin
                .from('quasar_verification_results')
                .select('*')
                .eq('verification_request_id', request.id)
                .eq('result_status', 'VERIFIED')
                .eq('decision_type', 'APPROVED')
                .is('consumed_at', null)
                .maybeSingle();
            if (resErr || !result) {
                throw new Error('Quasar Authorization has not been approved or is already consumed.');
            }
            // Consume authorization token atomically to prevent double spend/replay
            const { data: consumedResult, error: consumeErr } = await supabase_1.supabaseAdmin
                .from('quasar_verification_results')
                .update({
                consumed_at: new Date().toISOString(),
                execution_reference: eventId
            })
                .eq('id', result.id)
                .is('consumed_at', null)
                .select();
            if (consumeErr || !consumedResult || consumedResult.length === 0) {
                throw new Error('Quasar Authorization token has already been consumed.');
            }
            let currentProvider = provider;
            let attemptNumber = 1;
            let executionStatus = 'PENDING';
            let lastProviderReference = '';
            // 5. Transfer execution attempt loop (with failover engine logic)
            while (attemptNumber <= 3) {
                const attemptRef = `ref_att_${currentProvider}_${Date.now()}`;
                // Log attempt registry entry
                await supabase_1.supabaseAdmin.from('bank_transfer_attempts').insert({
                    transfer_log_id: log.id,
                    attempt_number: attemptNumber,
                    provider: currentProvider,
                    provider_reference: attemptRef,
                    status: 'ATTEMPT_PENDING'
                });
                try {
                    const adapter = banking_gateway_service_1.BankingGatewayService.getAdapter(currentProvider);
                    const response = await adapter.executeTransfer({
                        transferLogId: log.id,
                        amount: params.amount,
                        fee: params.fee,
                        beneficiaryBankCode: params.beneficiaryBankCode,
                        beneficiaryAccountNumber: params.beneficiaryAccountNumber,
                        financialEventId: eventId
                    });
                    // Evaluate result
                    if (response.status === 'SUCCESS') {
                        await supabase_1.supabaseAdmin.from('bank_transfer_attempts')
                            .update({ status: 'ATTEMPT_SUCCESS' })
                            .eq('transfer_log_id', log.id)
                            .eq('attempt_number', attemptNumber);
                        await supabase_1.supabaseAdmin.from('bank_transfer_logs')
                            .update({ status: 'SUCCESS' })
                            .eq('id', log.id);
                        lastProviderReference = response.providerReference;
                        executionStatus = 'SUCCESS';
                        break;
                    }
                    else {
                        throw new Error(`Provider execution returned status: ${response.status}`);
                    }
                }
                catch (err) {
                    // Record failed attempt
                    await supabase_1.supabaseAdmin.from('bank_transfer_attempts')
                        .update({ status: 'ATTEMPT_FAILED', error_message: err.message })
                        .eq('transfer_log_id', log.id)
                        .eq('attempt_number', attemptNumber);
                    // Add to exclusions to prevent loop trap
                    excludeList.push(currentProvider);
                    // Trip health evaluations
                    await supabase_1.supabaseAdmin.rpc('evaluate_provider_health', {
                        p_provider: currentProvider,
                        p_has_failed: true,
                        p_latency_ms: 10000
                    });
                    // Trigger Failover logic to select next provider
                    attemptNumber++;
                    if (attemptNumber <= 3) {
                        try {
                            currentProvider = await routing_engine_service_1.RoutingEngineService.selectOptimalProvider({
                                requiredCapability: 'supports_nip_transfer',
                                amount: params.amount,
                                excludeProviders: excludeList
                            });
                            // Switch provider on transfer log
                            await supabase_1.supabaseAdmin.from('bank_transfer_logs')
                                .update({ provider: currentProvider })
                                .eq('id', log.id);
                        }
                        catch (failoverErr) {
                            break;
                        }
                    }
                }
            }
            // Publish status and trigger journal entries in Quasar Event Gateway
            if (executionStatus === 'SUCCESS') {
                await quasar_event_gateway_service_1.QuasarEventGatewayService.publishOutboundExecution({
                    transferLogId: log.id,
                    financialEventId: eventId,
                    tenantId: params.tenantId,
                    amount: params.amount,
                    fee: params.fee,
                    reference,
                    status: 'SUCCESS',
                    provider: currentProvider,
                    providerReference: lastProviderReference
                });
            }
            else {
                await supabase_1.supabaseAdmin.from('bank_transfer_logs')
                    .update({ status: 'FAILED' })
                    .eq('id', log.id);
                executionStatus = 'FAILED';
                await quasar_event_gateway_service_1.QuasarEventGatewayService.publishOutboundExecution({
                    transferLogId: log.id,
                    financialEventId: eventId,
                    tenantId: params.tenantId,
                    amount: params.amount,
                    fee: params.fee,
                    reference,
                    status: 'FAILED',
                    provider: currentProvider,
                    providerReference: `REF_ERR_${log.id}`
                });
            }
            return {
                transferLogId: log.id,
                status: executionStatus,
                provider: currentProvider
            };
        }
        finally {
            this.releaseExecutionLock(lockKey);
        }
    }
}
exports.TransferOrchestrator = TransferOrchestrator;
//# sourceMappingURL=transfer-orchestrator.service.js.map