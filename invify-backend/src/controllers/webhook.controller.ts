// src/controllers/webhook.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { LedgerService } from '../services/ledger.service';
import { NotificationService } from '../services/notification.service';
import { FinancialEventService } from '../services/event.service';
import { AuditService } from '../services/audit.service';
import { PaymentGatewayConvergenceService } from '../services/gateway.service';
import { QuasarWebhookService } from '../integrations/quasar/quasar-webhook.service';
import { QuasarIntegrationStore } from '../integrations/quasar/quasar-integration.store';
import { WhatsAppNotificationService } from '../services/whatsapp-notification.service';




/**
 * WebhookController is the CRITICAL entry point for financial state updates.
 * Rule: This is the ONLY place where student financial states (wallets/ledgers) are modified.
 */
export class WebhookController {
  
  static async handleQuasarWebhook(req: Request, res: Response) {
    const signature = req.headers['x-quasar-signature'] as string;
    const rawBuf = (req as any).rawBody;
    const rawBody =
      Buffer.isBuffer(rawBuf)
        ? rawBuf.toString('utf8')
        : typeof rawBuf === 'string'
          ? rawBuf
          : JSON.stringify(req.body);

    if (!signature || !rawBody) {
      return res.status(400).json({ error: 'Security headers or body missing' });
    }

    try {
      const event = req.body;
      const { reference, amount, status } = event?.data || {};

      // Card notification webhooks (Quasar → Invify) — ack even if HTTP timed out on switch path
      if (
        typeof event?.event === 'string' &&
        event.event.startsWith('card.transaction.')
      ) {
        return WebhookController._handleCardTransactionWebhook(req, res, event, signature, rawBody);
      }

      // 1. RESOLVE TRANSACTION & TENANT (Never trust tenantId from payload)
      if (!reference) {
        return res.status(400).json({ error: 'Missing reference in payload' });
      }

      let resolvedTenantId: string | null = null;
      let resolvedWalletId: string | null = null;
      let resolvedCustomerId: string | null = null;
      let resolvedStudentId: string | null = null;
      let resolvedAdmissionNumber: string | null = null;
      let transaction: any = null;

      // Try finding the pre-existing checkout transaction by reference in transactions_log
      const { data: foundTx } = await supabaseAdmin
        .from('transactions_log')
        .select('tenant_id, wallet_id, status, type, amount, metadata')
        .eq('reference', reference)
        .maybeSingle();

      if (foundTx) {
        transaction = foundTx;
        resolvedTenantId = transaction.tenant_id;
        resolvedWalletId = transaction.wallet_id;
        const meta = (transaction.metadata || {}) as Record<string, any>;
        resolvedCustomerId = meta.customerId || meta.customer_id || null;
        resolvedStudentId = meta.studentId || meta.student_id || null;
        resolvedAdmissionNumber = meta.admissionNumber || meta.admission_number || null;
      } else {
        // Unsolicited credit (direct virtual account transfer)
        const virtualAccountNumber = event.data?.accountNumber || event.data?.virtualAccountNumber || event.data?.metadata?.virtualAccountNumber;
        if (virtualAccountNumber) {
          // Resolve tenant-level virtual accounts first (provisioned via Quasar)
          const { data: tenantRec } = await supabaseAdmin
            .from('tenants')
            .select('id')
            .eq('virtual_account_number', virtualAccountNumber)
            .maybeSingle();

          if (tenantRec) {
            resolvedTenantId = tenantRec.id;
          } else {
            // Check customers (includes school students mirrored as customers)
            const { data: custRec } = await supabaseAdmin
              .from('customers')
              .select('id, tenant_id, name')
              .eq('virtual_account_number', virtualAccountNumber)
              .maybeSingle();

            if (custRec) {
              resolvedTenantId = custRec.tenant_id;
              resolvedCustomerId = custRec.id;
              if (typeof custRec.id === 'string' && custRec.id.startsWith('stu-')) {
                resolvedStudentId = custRec.id;
                resolvedAdmissionNumber = custRec.id.slice(4);
              }
            } else {
              // Check staff users with assigned virtual accounts
              const { data: staffUser } = await supabaseAdmin
                .from('users')
                .select('id, tenant_id')
                .eq('virtual_account_number', virtualAccountNumber)
                .maybeSingle();

              if (staffUser?.tenant_id) {
                resolvedTenantId = staffUser.tenant_id;
              } else {
                // Check cloud students table (school VA provision path)
                const { data: studentRec } = await supabaseAdmin
                  .from('students')
                  .select('id, school_id, tenant_id, admission_number, first_name, last_name')
                  .eq('virtual_account_number', virtualAccountNumber)
                  .maybeSingle();

                if (studentRec) {
                  resolvedTenantId = studentRec.tenant_id || studentRec.school_id;
                  resolvedStudentId = studentRec.id;
                  resolvedAdmissionNumber = studentRec.admission_number || null;
                  if (!resolvedCustomerId && typeof studentRec.id === 'string') {
                    resolvedCustomerId = studentRec.id;
                  }
                } else {
                  // Legacy student_virtual_accounts table
                  const { data: studentVa } = await supabaseAdmin
                    .from('student_virtual_accounts')
                    .select('student_id, school_id')
                    .eq('account_number', virtualAccountNumber)
                    .maybeSingle();

                  if (studentVa) {
                    resolvedTenantId = studentVa.school_id;
                    resolvedStudentId = studentVa.student_id;
                  }
                }
              }
            }
          }
        }
      }

      if (!resolvedTenantId) {
        // Sandbox credits: Quasar VA numbers are not always mirrored in Invify yet
        if (event?.data?.sandbox === true && typeof event?.data?.tenantId === 'string') {
          const quasarTenantId = event.data.tenantId as string;
          // Map Quasar tenant → Invify tenant via integration store
          try {
            const mapped = await QuasarIntegrationStore.getByQuasarTenantId(quasarTenantId);
            if (mapped?.invify_tenant_id) {
              resolvedTenantId = mapped.invify_tenant_id;
              console.warn(
                `[Webhook] Sandbox credit mapped Quasar tenant ${quasarTenantId} → Invify ${resolvedTenantId}`,
              );
            }
          } catch {
            /* continue fallback */
          }
          if (!resolvedTenantId) {
            const { data: byId } = await supabaseAdmin
              .from('tenants')
              .select('id')
              .eq('id', quasarTenantId)
              .maybeSingle();
            resolvedTenantId = byId?.id || null;
            if (resolvedTenantId) {
              console.warn(
                `[Webhook] Sandbox credit resolved tenant via payload tenantId=${resolvedTenantId} (VA may be Quasar-only)`,
              );
            } else {
              console.warn(
                `[Webhook] Sandbox payload tenantId=${quasarTenantId} is not an Invify tenant — cannot route socket notification`,
              );
            }
          }
        }
      }

      if (!resolvedTenantId) {
        console.warn(`[Webhook] No transaction reference found and virtual account owner could not be resolved for reference: ${reference}. Acknowledging silently.`);
        return res.status(200).json({ received: true, note: 'unknown_context' });
      }

      // Check amount mismatch for pre-existing checkout payments
      if (transaction) {
        const expectedAmount = Number(transaction.amount);
        if (Math.round(amount) !== expectedAmount) {
          console.error(`[Webhook] Amount mismatch for reference ${reference}. Expected: ${expectedAmount}, Received: ${Math.round(amount)}`);
          return res.status(400).json({ error: 'Payment amount mismatch. Flagged for reconciliation.' });
        }
      }

      // 2. LOAD SIGNING SECRETS (tenant → env → Integration Vault PRODUCTION/SANDBOX)
      const integration = await QuasarIntegrationStore.getByInvifyTenantId(resolvedTenantId);
      const candidateSecrets: string[] = [];
      const pushSecret = (value?: string | null) => {
        if (value && typeof value === 'string' && value.length >= 8 && !candidateSecrets.includes(value)) {
          candidateSecrets.push(value);
        }
      };

      if (integration) {
        try {
          pushSecret(QuasarIntegrationStore.decryptSigningSecret(integration));
        } catch {
          /* ignore decrypt failures */
        }
      }
      pushSecret(process.env.QUASAR_WEBHOOK_SIGNING_SECRET);
      pushSecret(process.env.QUASAR_SANDBOX_WEBHOOK_SECRET);

      try {
        const { IntegrationVaultService } = await import('../services/integration-vault.service');
        for (const envName of ['PRODUCTION', 'SANDBOX'] as const) {
          pushSecret(
            await IntegrationVaultService.getDecryptedCredential(
              'quasar',
              envName,
              undefined,
              'QUASAR_WEBHOOK_SIGNING_SECRET',
            ),
          );
        }
      } catch {
        /* vault optional */
      }

      if (candidateSecrets.length === 0) {
        pushSecret('whsec_mock_quasar_key');
      } else {
        console.log(`[Webhook] HMAC candidates loaded: ${candidateSecrets.length}`);
      }

      // Hydrate runtime env from first real vault/tenant secret so subsequent requests stay warm
      if (!process.env.QUASAR_WEBHOOK_SIGNING_SECRET && candidateSecrets[0] && candidateSecrets[0] !== 'whsec_mock_quasar_key') {
        process.env.QUASAR_WEBHOOK_SIGNING_SECRET = candidateSecrets[0];
      }

      // 3. VERIFY SIGNATURE (HMAC-SHA256, constant-time, timestamp replay protection)
      let isValid = false;
      for (const secret of candidateSecrets) {
        if (QuasarWebhookService.verifySignature(rawBody, signature, secret, event?.timestamp)) {
          isValid = true;
          break;
        }
      }
      // Sandbox / local clocks: retry without skew using the same secret pool
      if (!isValid && event?.data?.sandbox === true) {
        for (const secret of candidateSecrets) {
          if (QuasarWebhookService.verifySignature(rawBody, signature, secret, undefined)) {
            isValid = true;
            console.warn('[Webhook] Sandbox signature accepted with timestamp skew skipped.');
            break;
          }
        }
      }
      // Local/dev only: accept Quasar sandbox deliveries so VA credits can be verified end-to-end
      if (!isValid && event?.data?.sandbox === true && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[Webhook] Sandbox HMAC mismatch — accepting in development. Open Integration Vault → Quasar Payments and save the Outbound webhook signing secret.',
        );
        isValid = true;
      }
      if (!isValid) {
        console.error('[Security] Webhook HMAC signature mismatch');
        return res.status(401).json({ error: 'Auth failure' });
      }

      // 4. LOG WEBHOOK RECEIVE
      await AuditService.log({
        eventType: 'webhook.received',
        reference,
        tenantId: resolvedTenantId,
        payload: event
      });

      // 5. IDEMPOTENCY CHECK
      const idempotencyKey = `quasar:${reference}:credit`;
      if (await LedgerService.exists(idempotencyKey)) {
        console.log(`[Idempotency] Already processed ${reference}. Returning success.`);
        return res.status(200).json({ status: 'already_processed' });
      }

      // 6. PROCESS STATE UPDATES OR LOG DEPOSITS
      if (transaction) {
        if (status === 'success') {
          await WebhookController._handleSuccess(resolvedTenantId!, resolvedWalletId!, reference, amount, idempotencyKey, event, transaction.type);
        } else if (status === 'failed') {
          await WebhookController._handleFailure(resolvedTenantId!, resolvedWalletId!, reference, event, transaction.type);
        }
      } else {
        // Direct virtual account deposit
        if (
          status === 'success' ||
          event.event === 'transfer.success' ||
          event.event === 'virtual_account.credit' ||
          event.event === 'virtual_account.funded'
        ) {
          if (!resolvedWalletId) {
            const { data: wallet } = await supabaseAdmin
              .from('wallets')
              .select('id')
              .eq('tenant_id', resolvedTenantId)
              .maybeSingle();
            resolvedWalletId = wallet?.id;
          }

          const virtualAccountNumber = event.data?.accountNumber || event.data?.virtualAccountNumber || event.data?.metadata?.virtualAccountNumber;
          const senderName = event.data?.senderName || event.data?.metadata?.senderName || event.data?.accountName || 'Unknown Sender';
          const senderBank = event.data?.senderBank || event.data?.metadata?.senderBank || event.data?.bankName || 'Unknown Bank';
          const creditAmount = Number(amount);
          const isSandbox = event?.data?.sandbox === true;

          if (!Number.isFinite(creditAmount)) {
            console.error(`[Webhook] Invalid amount for ${reference}:`, amount);
            if (isSandbox) {
              return res.status(200).json({ received: true, note: 'sandbox_invalid_amount' });
            }
            return res.status(400).json({ error: 'Invalid amount' });
          }

          try {
            // Insert success deposit transaction in DB log
            const { error: insertErr } = await supabaseAdmin
              .from('transactions_log')
              .insert({
                reference,
                tenant_id: resolvedTenantId,
                wallet_id: resolvedWalletId,
                amount: Math.round(creditAmount),
                type: 'CREDIT',
                provider: 'quasar',
                status: 'SUCCESS',
                metadata: {
                  virtualAccountNumber,
                  accountNumber: virtualAccountNumber,
                  senderName,
                  senderBank,
                  sandbox: isSandbox,
                  quasarEvent: event.event,
                  ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
                  ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
                  ...(resolvedAdmissionNumber ? { admissionNumber: resolvedAdmissionNumber } : {}),
                }
              });
            if (insertErr) {
              throw new Error(insertErr.message || 'transactions_log insert failed');
            }

            if (resolvedWalletId) {
              // Double-entry bookkeeping: DR Clearing -> CR Merchant Wallet
              await LedgerService.createDoubleEntry({
                idempotencyKey,
                tenantId: resolvedTenantId,
                reference,
                entries: [
                  { account: "QUASAR_CLEARING", type: "DEBIT", amount: creditAmount },
                  { account: "USER_WALLET", type: "CREDIT", amount: creditAmount }
                ],
                actorId: 'SYSTEM_WEBHOOK',
                provider: 'quasar',
                metadata: { source: 'quasar_webhook', type: 'deposit', sandbox: isSandbox }
              });
            } else {
              console.warn(`[Webhook] No Invify wallet for tenant ${resolvedTenantId}; logged deposit without ledger for ${reference}`);
            }

            // Emit live updates over socket.io (tenant room + broadcast fallback for local/sandbox)
            try {
              const { io } = require('../app');
              if (io) {
                const payload = {
                  type: 'payment.success',
                  reference,
                  tenantId: resolvedTenantId,
                  walletId: resolvedWalletId,
                  amount: creditAmount,
                  customerId: resolvedCustomerId,
                  studentId: resolvedStudentId,
                  metadata: {
                    virtualAccountNumber,
                    accountNumber: virtualAccountNumber,
                    senderName,
                    studentName: senderName,
                    senderBank,
                    sandbox: isSandbox,
                    ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
                    ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
                    ...(resolvedAdmissionNumber ? { admissionNumber: resolvedAdmissionNumber } : {}),
                  }
                };
                io.to(`tenant:${resolvedTenantId}`).emit('payment.success', payload);
                // Never fan out payment alerts to room "all" — that notifies every online device.
                // Offline devices recover via /api/finance/missed-payments catch-up on reconnect.
                console.log(
                  `[Socket.io] Emitted payment.success to tenant:${resolvedTenantId} for ref ${reference}`,
                );
              } else {
                console.warn('[Socket.io] io instance unavailable — deposit notification not pushed');
              }
            } catch (e: any) {
              console.error('[Socket.io] Failed to emit deposit.success:', e.message);
            }

            // Push / in-app notification path used by checkout success flow
            try {
              await NotificationService.notifySchoolAdminOfPayment(
                resolvedTenantId,
                creditAmount,
                senderName,
              );
            } catch (e: any) {
              console.error('[NotificationService] Deposit notify failed:', e.message);
            }

            // WhatsApp receipt for depositor/customer (non-fatal)
            try {
              const depositMeta = event.data?.metadata || {};
              WhatsAppNotificationService.notifyReceipt({
                tenantId: resolvedTenantId,
                customerId: resolvedCustomerId || depositMeta.customerId || null,
                receiptId: reference,
                amount: creditAmount,
                currency: event.data?.currency || 'NGN',
                recipientPhone:
                  depositMeta.customerPhone ||
                  depositMeta.parentPhone ||
                  depositMeta.phone ||
                  null,
                customerName: senderName,
                reference,
              });
            } catch (e: any) {
              console.error('[WhatsAppNotification] Deposit receipt notify failed (non-fatal):', e?.message || e);
            }

            // Also emit via FinancialEventService so Supabase Realtime / watchGlobalEvents catches it and updates device dashboard / notifies
            try {
              await FinancialEventService.emit({
                type: 'payment.success',
                reference,
                tenantId: resolvedTenantId,
                walletId: resolvedWalletId || null,
                amount: creditAmount,
                metadata: {
                  virtualAccountNumber,
                  senderName,
                  studentName: senderName, // Map to studentName for mobile display compatibility
                  senderBank,
                  sandbox: isSandbox,
                  ...(resolvedCustomerId ? { customerId: resolvedCustomerId } : {}),
                  ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
                  ...(resolvedAdmissionNumber ? { admissionNumber: resolvedAdmissionNumber } : {}),
                },
                idempotencyKey: `event:deposit_success:${reference}`
              });
            } catch (e: any) {
              console.error('[EventService] Failed to emit deposit event:', e.message);
            }
          } catch (procErr: any) {
            if (isSandbox) {
              console.error(`[Webhook] Sandbox deposit processing failed for ${reference}:`, procErr.message);
              return res.status(200).json({
                received: true,
                note: 'sandbox_received_but_processing_failed',
                error: procErr.message,
              });
            }
            throw procErr;
          }
        }
      }

      return res.status(200).json({ received: true });

    } catch (error: any) {
      console.error('[Webhook Critical Error]', error.message);
      
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'quasar',
          endpoint: '/api/v1/webhooks/quasar',
          payload: req.body,
          error_message: error.message || String(error)
        });
        console.log(`[Webhook DLQ] Event stored in Dead Letter Queue for Quasar.`);
      } catch (dlqErr: any) {
        console.error('[DLQ Critical Failure] Could not store Quasar webhook in DLQ:', dlqErr.message);
      }

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

    try {
      const result = await PaymentGatewayConvergenceService.processSettlementWebhook("paystack", signature, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[Paystack Webhook Error]', error.message);
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'paystack',
          endpoint: '/api/v1/webhooks/paystack',
          payload: req.body,
          error_message: error.message || String(error)
        });
      } catch (dlqErr: any) {
        console.error('[DLQ Critical Failure]', dlqErr.message);
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
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

    try {
      const result = await PaymentGatewayConvergenceService.processSettlementWebhook("flutterwave", signature, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[Flutterwave Webhook Error]', error.message);
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'flutterwave',
          endpoint: '/api/v1/webhooks/flutterwave',
          payload: req.body,
          error_message: error.message || String(error)
        });
      } catch (dlqErr: any) {
        console.error('[DLQ Critical Failure]', dlqErr.message);
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
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

    try {
      const result = await PaymentGatewayConvergenceService.processSettlementWebhook("stripe", signature, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[Stripe Webhook Error]', error.message);
      try {
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'stripe',
          endpoint: '/api/v1/webhooks/stripe',
          payload: req.body,
          error_message: error.message || String(error)
        });
      } catch (dlqErr: any) {
        console.error('[DLQ Critical Failure]', dlqErr.message);
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
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
      entries: entries as any,
      actorId: 'SYSTEM_WEBHOOK',
      provider: 'quasar',
      metadata: { source: 'quasar_webhook', type }
    });

    // 2. Update Transaction Status → SUCCESS
    await supabaseAdmin
      .from('transactions_log')
      .update({ status: 'SUCCESS', processed_at: new Date().toISOString() })
      .eq('reference', reference);

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

      // Customer/parent WhatsApp receipt (non-fatal; does not affect ledger)
      try {
        const meta = event.data?.metadata || {};
        const recipientPhone =
          meta.customerPhone ||
          meta.parentPhone ||
          meta.phone ||
          meta.whatsapp ||
          null;
        WhatsAppNotificationService.notifyReceipt({
          tenantId,
          customerId: meta.customerId || null,
          invoiceId: meta.invoiceId || null,
          receiptId: reference,
          amount,
          currency: event.data?.currency || 'NGN',
          recipientPhone,
          customerName: meta.studentName || meta.customerName || studentName,
          reference,
        });
      } catch (e: any) {
        console.error('[WhatsAppNotification] Payment receipt notify failed (non-fatal):', e?.message || e);
      }
    }
    
    // 5. IMMUTABLE AUDIT LOG
    await AuditService.log({
      eventType: (type === 'payout' ? 'payout.success' : 'payment.success') as any,
      reference,
      tenantId,
      payload: { amount, type, event_data: event.data }
    });

    // 6. Emit via Socket.io to the tenant room!
    try {
      const { io } = require('../app');
      if (io) {
        io.to(`tenant:${tenantId}`).emit('payment.success', {
          type: type === 'payout' ? 'payout.success' : 'payment.success',
          reference,
          tenantId,
          walletId,
          amount,
          metadata: event.data?.metadata || {}
        });
        console.log(`[Socket.io] Emitted payment.success to room tenant:${tenantId} for ref ${reference}`);
      }
    } catch (e: any) {
      console.error('[Socket.io] Failed to emit payment.success via Socket.io:', e.message);
    }

    console.log(`[Event] Emit payment.success for ${reference}`);
  }

  /**
   * Updates transaction status to FAILED.
   */
  private static async _handleFailure(tenantId: string, walletId: string, reference: string, event: any, type: string = 'payment') {
    console.log(`[Webhook] Processing failure for ${type} ref: ${reference}`);
    
    await supabaseAdmin
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

  /**
   * Quasar card rail notifications — do not credit wallets.
   * Used so Invify still learns ISO/KIMONO/MPOS outcomes when the sync HTTP call timed out.
   * Updates the tenant POS attempt (idempotent by data.reference / RRN+STAN).
   */
  private static async _handleCardTransactionWebhook(
    req: Request,
    res: Response,
    event: any,
    signature: string,
    rawBody: string,
  ) {
    const reference = event?.data?.reference;
    const quasarTenantId =
      typeof event?.data?.tenantId === 'string' ? event.data.tenantId : null;

    if (!reference) {
      return res.status(400).json({ error: 'Missing reference in card payload' });
    }

    let resolvedTenantId: string | null = null;
    if (quasarTenantId) {
      try {
        const mapped = await QuasarIntegrationStore.getByQuasarTenantId(quasarTenantId);
        if (mapped?.invify_tenant_id) {
          resolvedTenantId = mapped.invify_tenant_id;
        }
      } catch {
        /* fall through */
      }
      if (!resolvedTenantId) {
        const { data: byId } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('id', quasarTenantId)
          .maybeSingle();
        resolvedTenantId = byId?.id || null;
      }
    }

    if (!resolvedTenantId) {
      console.warn(
        `[Webhook] card event ${event.event} ref=${reference} — tenant unresolved; acknowledging`,
      );
      return res.status(200).json({ received: true, note: 'card_unknown_tenant' });
    }

    const integration = await QuasarIntegrationStore.getByInvifyTenantId(resolvedTenantId);
    const candidateSecrets: string[] = [];
    const pushSecret = (value?: string | null) => {
      if (value && typeof value === 'string' && value.length >= 8 && !candidateSecrets.includes(value)) {
        candidateSecrets.push(value);
      }
    };
    if (integration) {
      try {
        pushSecret(QuasarIntegrationStore.decryptSigningSecret(integration));
      } catch {
        /* ignore */
      }
    }
    pushSecret(process.env.QUASAR_WEBHOOK_SIGNING_SECRET);
    pushSecret(process.env.QUASAR_SANDBOX_WEBHOOK_SECRET);

    let isValid = false;
    for (const secret of candidateSecrets) {
      if (QuasarWebhookService.verifySignature(rawBody, signature, secret, event?.timestamp)) {
        isValid = true;
        break;
      }
      if (QuasarWebhookService.verifySignature(rawBody, signature, secret, undefined)) {
        isValid = true;
        break;
      }
    }
    if (!isValid && process.env.NODE_ENV !== 'production') {
      console.warn('[Webhook] Card HMAC mismatch — accepting in development');
      isValid = true;
    }
    if (!isValid) {
      return res.status(401).json({ error: 'Auth failure' });
    }

    await AuditService.log({
      eventType: 'webhook.received',
      reference,
      tenantId: resolvedTenantId,
      payload: event,
    });

    let applyResult: {
      updated: boolean;
      duplicate: boolean;
      created: boolean;
      attemptId: string;
      status: string;
    } | null = null;

    try {
      const { PosService } = await import('../services/pos.service');
      applyResult = await PosService.applyCardWebhookUpdate({
        tenantId: resolvedTenantId,
        event: event.event,
        data: event.data || {},
      });
    } catch (e: any) {
      console.error(`[Webhook] Failed to apply card txn update for ${reference}:`, e.message);
      return res.status(500).json({ error: 'Failed to update card transaction', reference });
    }

    try {
      const { io } = require('../app');
      if (io) {
        io.to(`tenant:${resolvedTenantId}`).emit('card.transaction', {
          type: event.event,
          reference,
          tenantId: resolvedTenantId,
          approved: event.data?.approved === true,
          status: event.data?.status,
          outcome: event.data?.outcome,
          mode: event.data?.mode,
          amount: event.data?.amount,
          rrn: event.data?.rrn,
          stan: event.data?.stan,
          terminalId: event.data?.terminalId,
          attemptId: applyResult?.attemptId,
          localStatus: applyResult?.status,
          duplicate: applyResult?.duplicate === true,
        });
      }
    } catch (e: any) {
      console.error('[Socket.io] Failed to emit card.transaction:', e.message);
    }

    console.log(
      `[Webhook] Card ${event.event} ack tenant=${resolvedTenantId} ref=${reference} ` +
        `approved=${event.data?.approved} attempt=${applyResult?.attemptId} ` +
        `dup=${applyResult?.duplicate} created=${applyResult?.created} status=${applyResult?.status}`,
    );
    return res.status(200).json({
      received: true,
      event: event.event,
      reference,
      attemptId: applyResult?.attemptId,
      status: applyResult?.status,
      duplicate: applyResult?.duplicate === true,
      created: applyResult?.created === true,
      updated: applyResult?.updated === true,
    });
  }

}
