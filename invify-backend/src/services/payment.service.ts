import crypto from "crypto";
import { getQuasarService } from "../integrations/quasar/factory";
import { QuasarProvisioningService } from "../integrations/quasar/quasar-provisioning.service";
import { supabase, supabaseAdmin } from "../db/supabase";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";
import { WalletService } from "./wallet.service";
import { isDefinitiveTransferRejection, PayoutReversalService } from "./payout-reversal.service";
import { isSandboxPayoutAllowed } from "./fee-live-gate";
import { TreasuryFeeService } from "./treasury-fee.service";
import * as fs from 'fs';
import * as path from 'path';


/**
 * PaymentService handles the initiation of external payments via Quasar.
 * Responsibilities: 
 * - Reference generation
 * - Quasar SDK orchestration
 * - Transaction persistence (PENDING state)
 */
export class PaymentService {
  /**
   * Creates a payment intent.
   * Path: POST /payments/create
   * 
   * IMPORTANT:
   * - DO NOT update ledger here.
   * - DO NOT update wallet here.
   * - Ledger sync happens ONLY via Quasar Webhook (payment.success).
   */
  static async createIntent(params: {
    tenantId: string,
    walletId: string,
    amount: number,
    studentName: string,
    metadata?: any,
    idempotencyKey?: string,
  }) {
    const { tenantId, walletId, amount, studentName, metadata = {}, idempotencyKey } = params;

    if (!amount || Number(amount) <= 0) {
      throw new Error('Invalid payment amount');
    }

    // Idempotency: return existing intent when client key already used for this tenant
    if (idempotencyKey) {
      const { data: existingRows } = await supabase
        .from('transactions_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .contains('metadata', { idempotency_key: idempotencyKey })
        .order('created_at', { ascending: false })
        .limit(1);
      const existing = existingRows?.[0];
      if (existing) {
        return {
          reference: existing.reference,
          intent: { reference: existing.metadata?.quasar_intent_id || existing.reference },
          transaction: existing,
          idempotentReplay: true,
        };
      }
    }

    // 1. Generate unique payment reference (UUID primary; timestamp only as prefix)
    const reference = `QNX-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    // 2. Fetch tenant & Call QuasarService (ApiKey lookup happens in factory)
    // 3. Call QuasarService.createPaymentIntent
    let intent;
    try {
      const quasar = await getQuasarService(tenantId);
      intent = await quasar.createPaymentIntent({
        amount: Math.round(amount),
        reference,
        description: `Fees Payment - Student: ${studentName}`,
        metadata: { ...metadata, reference, tenantId, studentName, idempotency_key: idempotencyKey }
      });
    } catch (error: any) {
      console.error('[PaymentService] Quasar SDK Failure:', error.message);
      throw new Error(`Failed to initialize payment with Quasar: ${error.message}`);
    }

    // 4. Store transaction record in database
    // Structure: { reference, tenantId, amount, provider: "quasar", status: "PENDING" }
    const { data: transaction, error } = await supabase
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
          studentName,
          ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        }
      })
      .select()
      .single();

    if (error) {
      console.error('[PaymentService] DB Audit Write Failed:', error.message);
      // Unique violation on concurrent duplicate idempotency → re-fetch
      if (idempotencyKey && (error as any).code === '23505') {
        const { data: raced } = await supabase
          .from('transactions_log')
          .select('*')
          .eq('tenant_id', tenantId)
          .contains('metadata', { idempotency_key: idempotencyKey })
          .limit(1)
          .maybeSingle();
        if (raced) {
          return {
            reference: raced.reference,
            intent: { reference: raced.metadata?.quasar_intent_id || raced.reference },
            transaction: raced,
            idempotentReplay: true,
          };
        }
      }
    }

    // 5. IMMUTABLE AUDIT LOG
    await AuditService.log({
      eventType: 'payment.intent.created',
      reference,
      tenantId,
      payload: { amount: Math.round(amount), studentName, metadata, intent_reference: intent.reference, idempotencyKey }
    });

    // 6. Return intent to frontend
    return {
      reference,
      intent,
      transaction
    };
  }

  /**
   * Initiates a fund sweep (payout) to the school's bank account,
   * or to an explicit destination (e.g. staff salary).
   * Path: POST /payments/payout
   */
  static async createPayout(
    tenantId: string,
    amount: number,
    options?: {
      destination?: {
        account_number: string;
        bank_code: string;
        account_name: string;
        bank_name?: string;
      };
      metadata?: Record<string, any>;
      idempotencyKey?: string;
    },
  ) {
    const { FeatureGateService, BuildVariantService } = await import('../config/build-variant');
    const wallet = await WalletService.ensureWallet(tenantId);
    if (!wallet) {
      throw new Error(`Could not create wallet for tenant ${tenantId}`);
    }
    const variant = BuildVariantService.getInstance();
    if (variant.isProd()) {
      if (!FeatureGateService.isFeatureEnabled('real_money_payouts')) {
        const err: any = new Error(
          'Real-money payouts are disabled for this environment. Set FEATURE_REAL_MONEY_PAYOUTS=true only when intentionally enabling live exits.',
        );
        err.status = 403;
        throw err;
      }
    } else if (!isSandboxPayoutAllowed()) {
      const err: any = new Error('Payouts are not enabled in this environment.');
      err.status = 403;
      throw err;
    }

    if (!amount || Number(amount) <= 0) {
      throw new Error('Valid payout amount required');
    }

    const payoutType = options?.metadata?.type || 'fund_sweep';
    let bankDetails: any = options?.destination || null;

    // 1. Fetch tenant bank details when no explicit destination
    if (!bankDetails) {
      try {
        const { data, error } = await supabaseAdmin
          .from('payout_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        if (!error && data) {
          bankDetails = data;
        }
      } catch (err) {}

      if (!bankDetails) {
        try {
          const filePath = path.join(process.cwd(), 'tenant_payout_settings.json');
          if (fs.existsSync(filePath)) {
            const allSettings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            bankDetails = allSettings[tenantId] || null;
          }
        } catch (err) {
          console.error('[PaymentService] Failed to read local tenant payout settings fallback:', err);
        }
      }
    }

    if (!bankDetails?.account_number || !bankDetails?.bank_code || !bankDetails?.account_name) {
      throw new Error(
        payoutType === 'staff_salary'
          ? 'Payout failed: Staff bank details incomplete'
          : `Payout failed: No bank details configured for tenant ${tenantId}`,
      );
    }

    // 2. Generate unique payout reference + client/server idempotency key
    const prefix = payoutType === 'staff_salary' ? 'SAL' : 'POUT';
    const reference = `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const idempotencyKey = options?.idempotencyKey
      ? `payout:${tenantId}:${options.idempotencyKey}`
      : `payout:${reference}`;

    const requestedAmount = Math.round(amount);
    const quote = await TreasuryFeeService.quote(tenantId, requestedAmount);
    const version = quote.fee_profile_version_id ? await TreasuryFeeService.resolve(tenantId) : null;
    const feeEntries = version ? TreasuryFeeService.feeCreditEntriesNaira(version, quote.service_fee) : [];

    // 3. Atomic lock: balance >= requested + treasury fee. External amount stays requested.
    const { data: ledgerRes, error: ledgerError } = await supabaseAdmin.rpc('request_treasury_withdrawal_with_fee', {
      p_tenant_id: tenantId,
      p_idempotency_key: idempotencyKey,
      p_reference: reference,
      p_requested_amount: requestedAmount,
      p_fee_entries: feeEntries,
      p_metadata: {
        type: payoutType === 'staff_salary' ? 'staff_salary' : 'payout_request',
        transaction_type: 'TREASURY_WITHDRAWAL',
        requested_amount: requestedAmount,
        service_fee: quote.service_fee,
        total_required: quote.total_required,
        fee_profile_version_id: quote.fee_profile_version_id,
        ...(options?.metadata || {}),
      },
    });

    if (ledgerError) {
      const message = String(ledgerError.message || '');
      if (message.includes('INSUFFICIENT_BALANCE')) {
        const err: any = new Error(
          `Insufficient balance for requested amount plus service fee. Available ₦${quote.available_balance}, this withdrawal needs ₦${quote.total_required} (₦${requestedAmount} plus ₦${quote.service_fee} fee).`,
        );
        err.status = 402;
        err.code = 'INSUFFICIENT_BALANCE';
        err.quote = { ...quote, sufficient: false };
        throw err;
      }
      throw new Error(`Payout rejected: ${ledgerError.message}`);
    }

    // Client retry with the same idempotency key: the wallet was debited once
    // under the original reference — never initiate a second transfer.
    if ((ledgerRes as any)?.status === 'DE-DUPLICATED') {
      const { data: original } = await supabaseAdmin
        .from('ledgers')
        .select('reference')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      const originalReference = original?.reference || null;
      let originalStatus = 'PENDING';
      if (originalReference) {
        const { data: originalTx } = await supabaseAdmin
          .from('transactions_log')
          .select('status')
          .eq('reference', originalReference)
          .maybeSingle();
        originalStatus = originalTx?.status || originalStatus;
      }
      return {
        reference: originalReference,
        status: originalStatus,
        transfer: null,
        idempotentReplay: true,
        quote,
      };
    }

    if (version) {
      try {
        await TreasuryFeeService.persistAssessment({
          tenantId,
          reference,
          requestedAmount,
          version,
        });
      } catch (assessErr: any) {
        console.error('[PaymentService] treasury fee assessment persist failed:', assessErr?.message || assessErr);
      }
    }

    // 4. Call Quasar SDK (via service)
    let transfer;
    try {
      const quasar = await getQuasarService(tenantId);
      transfer = await quasar.initiateTransfer({
        amount: requestedAmount,
        reference,
        destination: {
          account_number: bankDetails.account_number,
          bank_code: bankDetails.bank_code,
          account_name: bankDetails.account_name,
        },
        metadata: {
          tenantId,
          schoolId: tenantId,
          type: payoutType,
          ...(options?.metadata || {}),
        },
      });
    } catch (error: any) {
      console.error('[PaymentService] Quasar Transfer Failure:', error.message);
      await PaymentService.handleTransferInitiationFailure({
        tenantId,
        reference,
        amount: requestedAmount,
        payoutType,
        bankDetails,
        metadata: {
          ...(options?.metadata || {}),
          requested_amount: requestedAmount,
          service_fee: quote.service_fee,
          total_required: quote.total_required,
        },
        ledgerId: (ledgerRes as any)?.ledger_id || null,
        error,
      });
      throw new Error(`Failed to initiate transfer with Quasar: ${error.message}`);
    }

    // 5. Store transaction record (PENDING)
    const { error: txError } = await supabaseAdmin
      .from('transactions_log')
      .insert({
        reference,
        tenant_id: tenantId,
        wallet_id: (ledgerRes as any)?.ledger_id || null,
        amount: requestedAmount,
        provider: 'quasar',
        type: 'payout',
        status: 'PENDING',
        metadata: {
          quasar_transfer_id: transfer.reference,
          destination: bankDetails.account_number,
          bank_name: bankDetails.bank_name || null,
          payout_type: payoutType,
          requested_amount: requestedAmount,
          service_fee: quote.service_fee,
          total_required: quote.total_required,
          fee_profile_version_id: quote.fee_profile_version_id,
          ...(options?.metadata || {}),
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('[PaymentService] DB Audit Write Failed:', txError.message);
    }

    await AuditService.log({
      eventType: 'payout.initiated' as any,
      reference,
      tenantId,
      payload: {
        amount,
        bankDetails: bankDetails.account_number,
        payoutType,
        ...(options?.metadata || {}),
      },
    });

    try {
      const { TenantAlertService } = require('./tenant-alert.service');
      TenantAlertService.notifyWithdrawal(tenantId, { amount, reference });
    } catch (alertErr: any) {
      console.warn('[PaymentService] Tenant withdrawal alert skipped:', alertErr?.message || alertErr);
    }

    return {
      reference,
      status: 'PENDING',
      transfer,
      quote,
    };
  }

  /**
   * Definitive provider rejection → restore the reserved wallet debit (idempotent).
   * Ambiguous outcome (timeout / network / 5xx) → keep the reservation, record a
   * PENDING row flagged for reconciliation, and let the webhook settle it.
   */
  private static async handleTransferInitiationFailure(params: {
    tenantId: string;
    reference: string;
    amount: number;
    payoutType: string;
    bankDetails: any;
    metadata: Record<string, any>;
    ledgerId: string | null;
    error: any;
  }): Promise<void> {
    const { tenantId, reference, amount, payoutType, bankDetails, metadata, ledgerId, error } = params;
    const definitive = isDefinitiveTransferRejection(error);
    const errorMessage = String(error?.message || error);

    let reversalStatus: string | null = null;
    let reversalError: string | null = null;
    if (definitive) {
      try {
        const reversal = await PayoutReversalService.reverseFailedPayout({
          tenantId,
          reference,
          reason: `transfer_rejected: ${errorMessage}`,
          source: 'SYNC_TRANSFER_REJECTED',
        });
        reversalStatus = reversal.status;
      } catch (revErr: any) {
        reversalError = String(revErr?.message || revErr);
        console.error(`[PaymentService] CRITICAL payout reversal failed for ${reference}:`, reversalError);
      }
    }

    const { error: txError } = await supabaseAdmin.from('transactions_log').insert({
      reference,
      tenant_id: tenantId,
      wallet_id: ledgerId,
      amount,
      provider: 'quasar',
      type: 'payout',
      status: definitive ? 'FAILED' : 'PENDING',
      metadata: {
        destination: bankDetails?.account_number,
        bank_name: bankDetails?.bank_name || null,
        payout_type: payoutType,
        ...metadata,
        transfer_error: errorMessage,
        reconciliation_required: !definitive || reversalError !== null,
        reversal_status: reversalStatus,
        ...(reversalError ? { reversal_error: reversalError } : {}),
      },
    });
    if (txError) {
      console.error('[PaymentService] DB Audit Write Failed (payout failure):', txError.message);
    }

    try {
      await AuditService.log({
        eventType: (definitive && !reversalError ? 'payout.failed' : 'payout.reconciliation_required') as any,
        reference,
        tenantId,
        payload: {
          amount,
          payoutType,
          definitive_rejection: definitive,
          reversal_status: reversalStatus,
          reversal_error: reversalError,
          transfer_error: errorMessage,
        },
      });
    } catch (auditErr: any) {
      console.error('[PaymentService] payout failure audit failed:', auditErr?.message || auditErr);
    }
  }

  /** Prefer reference match; only query id when value looks like a UUID (PostgREST OR with non-UUID id breaks). */
  private static async findTransactionByRefOrId(referenceOrId: string) {
    const byRef = await supabaseAdmin
      .from('transactions_log')
      .select('*')
      .eq('reference', referenceOrId)
      .maybeSingle();
    if (byRef.data) return byRef.data;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        referenceOrId,
      );
    if (!isUuid) return null;

    const byId = await supabaseAdmin
      .from('transactions_log')
      .select('*')
      .eq('id', referenceOrId)
      .maybeSingle();
    return byId.data || null;
  }

  static async getIntent(reference: string) {
    const transaction = await PaymentService.findTransactionByRefOrId(reference);

    if (!transaction) {
      throw new Error(`Transaction not found: ${reference}`);
    }

    try {
      const paymentsClient = await QuasarProvisioningService.getPaymentsClient(transaction.tenant_id);
      const liveIntent = await paymentsClient.getPaymentIntent(transaction.reference);
      return {
        ...transaction,
        status: liveIntent.status || transaction.status,
        liveIntent
      };
    } catch (err: any) {
      console.warn(`[PaymentService] Failed to fetch live intent from Quasar:`, err.message);
      return transaction;
    }
  }

  static async cancelIntent(reference: string) {
    const { data: transaction, error } = await supabase
      .from('transactions_log')
      .select('*')
      .or(`reference.eq.${reference},id.eq.${reference}`)
      .single();

    if (error || !transaction) {
      throw new Error(`Transaction not found: ${reference}`);
    }

    // Try to cancel on Quasar
    try {
      const paymentsClient = await QuasarProvisioningService.getPaymentsClient(transaction.tenant_id);
      await (paymentsClient as any).client.post(`/payments/intents/${transaction.reference}/cancel`, {});
    } catch (err: any) {
      console.warn(`[PaymentService] Quasar cancellation endpoint failed; marking local intent FAILED without provider confirm:`, err.message);
    }

    // Update locally
    const { data: updatedTx, error: updateError } = await supabase
      .from('transactions_log')
      .update({ status: 'FAILED', processed_at: new Date().toISOString() })
      .eq('id', transaction.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update transaction locally: ${updateError.message}`);
    }

    // Audit log
    await AuditService.log({
      eventType: 'payment.intent.cancelled' as any,
      reference: transaction.reference,
      tenantId: transaction.tenant_id,
      payload: { reason: 'User request' }
    });

    return updatedTx;
  }

  static async getHistory(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('transactions_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch history: ${error.message}`);
    }

    return data || [];
  }

  static async refundIntent(reference: string, amount: number, reason?: string, clientIdempotencyKey?: string) {
    const transaction = await PaymentService.findTransactionByRefOrId(reference);

    if (!transaction) {
      throw new Error(`Transaction not found: ${reference}`);
    }

    if (amount <= 0 || amount > transaction.amount) {
      const amountErr: any = new Error(
        `Invalid refund amount: ${amount}. Must be greater than 0 and less than or equal to original amount ${transaction.amount}.`,
      );
      amountErr.status = 400;
      throw amountErr;
    }

    if (clientIdempotencyKey) {
      const { data: existingRefunds } = await supabaseAdmin
        .from('transactions_log')
        .select('*')
        .eq('tenant_id', transaction.tenant_id)
        .eq('type', 'refund')
        .contains('metadata', { idempotency_key: clientIdempotencyKey })
        .limit(1);
      if (existingRefunds?.[0]) {
        return { ...existingRefunds[0], idempotentReplay: true };
      }
    }

    // Provider refund MUST succeed before any SUCCESS ledger/financial outcome (fail-closed)
    let providerRefund: any;
    try {
      const paymentsClient = await QuasarProvisioningService.getPaymentsClient(transaction.tenant_id);
      providerRefund = await paymentsClient.createIntentRefund(transaction.reference, {
        amount: Math.round(amount),
        reason,
      });
    } catch (err: any) {
      console.error(`[PaymentService] Quasar refund failed — failing closed (no local SUCCESS):`, err.message);
      await AuditService.log({
        eventType: 'payment.refund.failed' as any,
        reference: transaction.reference,
        tenantId: transaction.tenant_id,
        payload: { amount, reason, error: err.message },
      });
      const failErr: any = new Error(`Refund provider failure: ${err.message}`);
      failErr.status = 502;
      throw failErr;
    }

    // Record the refund in transactions_log only after provider confirmation
    const refundRef = `REF-${transaction.reference}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const { data: refundTx, error: refundTxErr } = await supabaseAdmin
      .from('transactions_log')
      .insert({
        reference: refundRef,
        tenant_id: transaction.tenant_id,
        wallet_id: transaction.wallet_id,
        amount: Math.round(amount),
        provider: "quasar",
        type: "refund",
        status: "SUCCESS",
        metadata: {
          original_reference: transaction.reference,
          reason,
          provider_refund: providerRefund?.data || providerRefund || null,
          ...(clientIdempotencyKey ? { idempotency_key: clientIdempotencyKey } : {}),
        }
      })
      .select()
      .single();

    if (refundTxErr) {
      throw new Error(`Failed to create refund transaction record: ${refundTxErr.message}`);
    }

    // Execute double-entry bookkeeping: Debit merchant wallet, Credit refunds
    const idempotencyKey = `ledger:refund:${clientIdempotencyKey || refundRef}`;
    await LedgerService.createDoubleEntry({
      idempotencyKey,
      tenantId: transaction.tenant_id,
      reference: refundRef,
      entries: [
        { account: 'USER_WALLET', type: 'DEBIT', amount: Math.round(amount) },
        { account: 'REFUNDS', type: 'CREDIT', amount: Math.round(amount) }
      ],
      metadata: { originalReference: transaction.reference, reason }
    });

    // Audit log
    await AuditService.log({
      eventType: 'payment.refund.created' as any,
      reference: refundRef,
      tenantId: transaction.tenant_id,
      payload: { amount, original_reference: transaction.reference, reason }
    });

    return refundTx;
  }
}

