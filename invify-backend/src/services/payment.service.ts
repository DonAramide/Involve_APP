import crypto from "crypto";
import { getQuasarService } from "../integrations/quasar/factory";
import { supabase } from "../db/supabase";
import { AuditService } from "./audit.service";


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
    metadata?: any
  }) {
    const { tenantId, walletId, amount, studentName, metadata = {} } = params;

    // 1. Generate unique payment reference
    const reference = `QNX-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    // 2. Fetch tenant & Call QuasarService (ApiKey lookup happens in factory)
    // 3. Call QuasarService.createPaymentIntent
    let intent;
    try {
      const quasar = await getQuasarService(tenantId);
      intent = await quasar.createPaymentIntent({
        amount,
        reference,
        description: `Fees Payment - Student: ${studentName}`,
        metadata: { ...metadata, reference, tenantId, studentName } 
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
        amount,
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
    await AuditService.log({
      eventType: 'payment.intent.created',
      reference,
      tenantId,
      payload: { amount, studentName, metadata, intent_reference: intent.reference }
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
  static async createPayout(tenantId: string, amount: number) {
    // 1. Fetch School Bank Details
    const { data: bankDetails, error: bankError } = await supabase
      .from('payout_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (bankError || !bankDetails) {
      throw new Error(`Payout failed: No bank details configured for tenant ${tenantId}`);
    }

    // 1.1 Balance Check (Mandatory)
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('tenant_id', tenantId)
      .single();

    if (walletError || !wallet) {
      throw new Error(`Payout failed: Could not verify wallet balance.`);
    }

    if (Number(wallet.balance) < amount) {
      throw new Error(`Insufficient funds. Available balance: ${wallet.balance}`);
    }

    // 2. Generate unique payout reference
    const reference = `POUT-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    // 3. Call Quasar SDK (via service)
    let transfer;
    try {
      const quasar = await getQuasarService(tenantId);
      transfer = await quasar.initiateTransfer({
        amount,
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
    } catch (error: any) {
      console.error('[PaymentService] Quasar Transfer Failure:', error.message);
      throw new Error(`Failed to initiate transfer with Quasar: ${error.message}`);
    }

    // 4. Store transaction record (PENDING)
    const { data: transaction, error: txError } = await supabase
      .from('transactions_log')
      .insert({
        reference,
        tenant_id: tenantId,
        amount,
        provider: "quasar",
        status: "PENDING",
        type: "payout",
        metadata: {
          bank_details: bankDetails.account_number,
          quasar_transfer_id: transfer.reference
        }
      })
      .select()
      .single();

    if (txError) {
      console.error('[PaymentService] Payout DB Write Failed:', txError.message);
    }

    // 5. AUDIT LOG
    await AuditService.log({
      eventType: 'payout.initiated' as any,
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

