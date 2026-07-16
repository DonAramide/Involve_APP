"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const factory_1 = require("../integrations/quasar/factory");
const supabase_1 = require("../db/supabase");
const audit_service_1 = require("./audit.service");
/**
 * PaymentService handles the initiation of external payments via Quasar.
 * Responsibilities:
 * - Reference generation
 * - Quasar SDK orchestration
 * - Transaction persistence (PENDING state)
 */
class PaymentService {
    /**
     * Creates a payment intent.
     * Path: POST /payments/create
     *
     * IMPORTANT:
     * - DO NOT update ledger here.
     * - DO NOT update wallet here.
     * - Ledger sync happens ONLY via Quasar Webhook (payment.success).
     */
    static async createIntent(params) {
        const { tenantId, walletId, amount, studentName, metadata = {} } = params;
        // 1. Generate unique payment reference
        const reference = `QNX-${Date.now()}-${crypto_1.default.randomUUID().split('-')[0].toUpperCase()}`;
        // 2. Fetch tenant & Call QuasarService (ApiKey lookup happens in factory)
        // 3. Call QuasarService.createPaymentIntent
        let intent;
        try {
            const quasar = await (0, factory_1.getQuasarService)(tenantId);
            intent = await quasar.createPaymentIntent({
                amount: Math.round(amount),
                reference,
                description: `Fees Payment - Student: ${studentName}`,
                metadata: { ...metadata, reference, tenantId, studentName }
            });
        }
        catch (error) {
            console.error('[PaymentService] Quasar SDK Failure:', error.message);
            throw new Error(`Failed to initialize payment with Quasar: ${error.message}`);
        }
        // 4. Store transaction record in database
        // Structure: { reference, tenantId, amount, provider: "quasar", status: "PENDING" }
        const { data: transaction, error } = await supabase_1.supabase
            .from('transactions_log') // Using 'transactions_log' for external audit trail
            .insert({
            reference,
            tenant_id: tenantId,
            wallet_id: walletId,
            amount: Math.round(amount),
            provider: "quasar",
            status: "PENDING",
            metadata: {
                ...metadata,
                quasar_intent_id: intent.reference,
                studentName
            }
        })
            .select()
            .single();
        if (error) {
            console.error('[PaymentService] DB Audit Write Failed:', error.message);
        }
        // 5. IMMUTABLE AUDIT LOG
        await audit_service_1.AuditService.log({
            eventType: 'payment.intent.created',
            reference,
            tenantId,
            payload: { amount: Math.round(amount), studentName, metadata, intent_reference: intent.reference }
        });
        // 6. Return intent to frontend
        return {
            reference,
            intent,
            transaction
        };
    }
    /**
     * Initiates a fund sweep (payout) to the school's bank account.
     * Path: POST /payments/payout
     */
    static async createPayout(tenantId, amount) {
        // 1. Fetch School Bank Details
        const { data: bankDetails, error: bankError } = await supabase_1.supabase
            .from('payout_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
        if (bankError || !bankDetails) {
            throw new Error(`Payout failed: No bank details configured for tenant ${tenantId}`);
        }
        // 2. Generate unique payout reference
        const reference = `POUT-${Date.now()}-${crypto_1.default.randomUUID().split('-')[0].toUpperCase()}`;
        const idempotencyKey = `payout:${reference}`;
        // 3. Database Pessimistic Locking & Double Entry
        // This atomic RPC checks balance and records the double entry
        const { data: ledgerRes, error: ledgerError } = await supabase_1.supabase.rpc('request_payout_with_lock', {
            p_tenant_id: tenantId,
            p_idempotency_key: idempotencyKey,
            p_reference: reference,
            p_amount: Math.round(amount), // Enforce Integer Kobo
            p_metadata: { type: 'payout_request' }
        });
        if (ledgerError) {
            throw new Error(`Payout rejected: ${ledgerError.message}`);
        }
        // 4. Call Quasar SDK (via service)
        let transfer;
        try {
            const quasar = await (0, factory_1.getQuasarService)(tenantId);
            transfer = await quasar.initiateTransfer({
                amount: Math.round(amount),
                reference,
                destination: {
                    account_number: bankDetails.account_number,
                    bank_code: bankDetails.bank_code,
                    account_name: bankDetails.account_name
                },
                metadata: {
                    tenantId,
                    schoolId: tenantId, // Mapping schoolId to tenantId for SDK requirements
                    type: 'fund_sweep'
                }
            });
        }
        catch (error) {
            console.error('[PaymentService] Quasar Transfer Failure:', error.message);
            // Initiate Reversal logic here if needed, but the webhook handles failed payouts
            throw new Error(`Failed to initiate transfer with Quasar: ${error.message}`);
        }
        // 5. Store transaction record (PENDING)
        const { data: transaction, error: txError } = await supabase_1.supabase
            .from('transactions_log')
            .insert({
            reference,
            tenant_id: tenantId,
            wallet_id: ledgerRes?.ledger_id || null, // Storing ledger_id as reference point
            amount: Math.round(amount),
            provider: "quasar",
            type: "payout",
            status: "PENDING",
            metadata: {
                quasar_transfer_id: transfer.reference,
                destination: bankDetails.account_number
            }
        })
            .select()
            .single();
        if (txError) {
            console.error('[PaymentService] DB Audit Write Failed:', txError.message);
        }
        // 5. AUDIT LOG
        await audit_service_1.AuditService.log({
            eventType: 'payout.initiated',
            reference,
            tenantId,
            payload: { amount, bankDetails: bankDetails.account_number }
        });
        return {
            reference,
            status: "PENDING",
            transfer
        };
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map