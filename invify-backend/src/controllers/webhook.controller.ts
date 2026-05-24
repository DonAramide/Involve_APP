// src/controllers/webhook.controller.ts
import { Request, Response } from 'express';
import { getQuasarService } from '../integrations/quasar/factory';
import { supabase } from '../db/supabase';
import { LedgerService } from '../services/ledger.service';
import { NotificationService } from '../services/notification.service';
import { FinancialEventService } from '../services/event.service';
import { AuditService } from '../services/audit.service';
import { PaymentGatewayConvergenceService } from '../services/gateway.service';




/**
 * WebhookController is the CRITICAL entry point for financial state updates.
 * Rule: This is the ONLY place where student financial states (wallets/ledgers) are modified.
 */
export class WebhookController {
  
  static async handleQuasarWebhook(req: Request, res: Response) {
    const signature = req.headers['x-quasar-signature'] as string;
    const tenantIdHeader = req.headers['x-tenant-id'] as string; // Used for factory lookup

    if (!signature || !tenantIdHeader) {
      return res.status(400).json({ error: 'Security headers missing' });
    }

    try {
      const quasar = await getQuasarService(tenantIdHeader);
      const rawBody = (req as any).rawBody?.toString();
      
      // 1. VERIFY SIGNATURE (Security Requirement)
      const isValid = await quasar.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('[Security] Webhook signature mismatch');
        return res.status(401).json({ error: 'Auth failure' });
      }

      // 2. PARSE & EXTRACT
      const event = req.body;
      const { reference, amount, status } = event.data || {};

      if (!reference) throw new Error('Missing reference in payload');

      // 0. LOG WEBHOOK RECEIVE
      await AuditService.log({
        eventType: 'webhook.received',
        reference,
        tenantId: tenantIdHeader,
        payload: event
      });


      // 3. RESOLVE TRANSACTION & TENANT (Do NOT trust payload for tenantId)
      const { data: transaction, error: txError } = await supabase
        .from('transactions_log')
        .select('tenant_id, wallet_id, status, type')
        .eq('reference', reference)
        .single();


      if (txError || !transaction) {
        console.error(`[Security] Attempted update for non-existent tx: ${reference}`);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const tenantId = transaction.tenant_id;

      // 4. IDEMPOTENCY CHECK
      const idempotencyKey = `quasar:${reference}:credit`;
      if (await LedgerService.exists(idempotencyKey)) {
        console.log(`[Idempotency] Already processed ${reference}. Returning success.`);
        return res.status(200).json({ status: 'already_processed' });
      }

      // 5. PROCESS STATE UPDATES
      if (status === 'success') {
        await WebhookController._handleSuccess(tenantId, transaction.wallet_id, reference, amount, idempotencyKey, event, transaction.type);
      } else if (status === 'failed') {
        await WebhookController._handleFailure(tenantId, transaction.wallet_id, reference, event, transaction.type);
      }


      return res.status(200).json({ received: true });

    } catch (error: any) {
      console.error('[Webhook Critical Error]', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /webhooks/paystack
   * Real Paystack webhook listener verifying HMAC SHA256 signatures.
   */
  static async handlePaystackWebhook(req: Request, res: Response) {
    const signature = req.headers['x-paystack-signature'] as string;
    const secret = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_key_quasar";
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);

    const isValid = PaymentGatewayConvergenceService.verifyWebhookHMAC(rawBody, signature, secret, "paystack");
    if (!isValid) {
      console.error('[Security] Paystack Webhook HMAC verification failed.');
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    const result = await PaymentGatewayConvergenceService.processSettlementWebhook("paystack", signature, req.body);
    return res.status(200).json(result);
  }

  /**
   * POST /webhooks/flutterwave
   * Real Flutterwave webhook listener.
   */
  static async handleFlutterwaveWebhook(req: Request, res: Response) {
    const signature = req.headers['verif-hash'] as string;
    const secret = process.env.FLW_SECRET_KEY || "flwseck_test_mock_key_quasar";

    const isValid = PaymentGatewayConvergenceService.verifyWebhookHMAC("", signature, secret, "flutterwave");
    if (!isValid) {
      console.error('[Security] Flutterwave Webhook signature mismatch.');
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    const result = await PaymentGatewayConvergenceService.processSettlementWebhook("flutterwave", signature, req.body);
    return res.status(200).json(result);
  }

  /**
   * POST /webhooks/stripe
   * Real Stripe webhook listener verifying Stripe-Signature HMAC SHA256 header.
   */
  static async handleStripeWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_secret_quasar";
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);

    const isValid = PaymentGatewayConvergenceService.verifyWebhookHMAC(rawBody, signature, secret, "stripe");
    if (!isValid) {
      console.error('[Security] Stripe Webhook HMAC verification failed.');
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    const result = await PaymentGatewayConvergenceService.processSettlementWebhook("stripe", signature, req.body);
    return res.status(200).json(result);
  }

  /**
   * Performs the double-entry write and updates transaction status.
   */
  private static async _handleSuccess(tenantId: string, walletId: string, reference: string, amount: number, idempotencyKey: string, event: any, type: string = 'payment') {
    console.log(`[Webhook] Processing success for ${type} ref: ${reference}`);

    // 1. Write double-entry ledger (Rules-compliant)
    const entries = type === 'payout' 
      ? [
          { account: "SCHOOL_WALLET", type: "DEBIT" as const, amount },
          { account: "EXTERNAL_BANK", type: "CREDIT" as const, amount }
        ]
      : [
          { account: "QUASAR_CLEARING", type: "DEBIT" as const, amount },
          { account: "USER_WALLET", type: "CREDIT" as const, amount }
        ];

    await LedgerService.createDoubleEntry({
      idempotencyKey,
      tenantId,
      reference,
      entries,
      metadata: { source: 'quasar_webhook', type }
    });

    // 2. Update Transaction Status → SUCCESS
    await supabase
      .from('transactions_log')
      .update({ status: 'SUCCESS', processed_at: new Date().toISOString() })
      .eq('reference', reference);

    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      const fs = require('fs');
      const path = require('path');
      const LOCAL_TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');
      if (fs.existsSync(LOCAL_TENANTS_DB_PATH)) {
        let tenants = JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8'));
        const idx = tenants.findIndex((t: any) => t.id === tenantId);
        if (idx !== -1) {
          tenants[idx].total_wallet_balance = (tenants[idx].total_wallet_balance || 0) + amount;
          tenants[idx].available_wallet_balance = (tenants[idx].available_wallet_balance || 0) + amount;
          tenants[idx].wallet_balance = (tenants[idx].wallet_balance || 0) + amount;
          fs.writeFileSync(LOCAL_TENANTS_DB_PATH, JSON.stringify(tenants, null, 2));
        }
      }
    }

    // 3. Emit Financial Event for Realtime UI update
    await FinancialEventService.emit({
      type: type === 'payout' ? 'payout.success' : 'payment.success',
      reference,
      tenantId,
      walletId,
      amount,
      metadata: event.data?.metadata || {},
      idempotencyKey: `event:${type === 'payout' ? 'payout' : 'payment'}_success:${reference}`
    });

    // 4. Emit Push Notification to School Admin
    if (type === 'payout') {
      await NotificationService.notifySchoolAdminOfPayoutSuccess(tenantId, amount);
    } else {
      const studentName = event.data?.metadata?.studentName || 'Student';
      await NotificationService.notifySchoolAdminOfPayment(tenantId, amount, studentName);
    }
    
    // 5. IMMUTABLE AUDIT LOG
    await AuditService.log({
      eventType: (type === 'payout' ? 'payout.success' : 'payment.success') as any,
      reference,
      tenantId,
      payload: { amount, type, event_data: event.data }
    });

    console.log(`[Event] Emit payment.success for ${reference}`);
  }

  /**
   * Updates transaction status to FAILED.
   */
  private static async _handleFailure(tenantId: string, walletId: string, reference: string, event: any, type: string = 'payment') {
    console.log(`[Webhook] Processing failure for ${type} ref: ${reference}`);
    
    await supabase
      .from('transactions_log')
      .update({ status: 'FAILED', processed_at: new Date().toISOString() })
      .eq('reference', reference);

    // Emit Financial Event
    await FinancialEventService.emit({
      type: type === 'payout' ? 'payout.failed' : 'payment.failed',
      reference,
      tenantId,
      walletId,
      amount: event.data?.amount || 0,
      idempotencyKey: `event:${type === 'payout' ? 'payout' : 'payment'}_failed:${reference}`
    });

    if (type === 'payout') {
      await NotificationService.notifySchoolAdminOfPayoutFailure(tenantId, event.data?.amount || 0);
    }

    // IMMUTABLE AUDIT LOG
    await AuditService.log({
      eventType: (type === 'payout' ? 'payout.failed' : 'payment.failed') as any,
      reference,
      tenantId,
      payload: { ...event, type }
    });

    console.log(`[Event] Emit payment.failed for ${reference}`);
  }


}
