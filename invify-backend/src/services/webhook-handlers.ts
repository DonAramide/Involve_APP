import { supabaseAdmin } from '../db/supabase';
import { QuasarEventGatewayService } from './quasar-event-gateway.service';
import * as crypto from 'crypto';
import { FinancialVerificationEngine } from './financial-verification/FinancialVerificationEngine';
import { VerificationContext } from './financial-verification/shared/VerificationContext';

export class IncomingWebhookHandlers {
  private static verificationEngine = new FinancialVerificationEngine();

  static async handleWebhook(params: {
    provider: 'PROVIDUS' | 'WEMA' | 'PAYSTACK' | 'FLUTTERWAVE';
    payload: any;
    signature: string;
  }): Promise<{ status: string }> {
    const payloadStr = JSON.stringify(params.payload);
    const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

    // 1. Replay Attack protection: check if hash already exists in incoming_webhook_logs
    const { data: existing } = await supabaseAdmin
      .from('incoming_webhook_logs')
      .select('id')
      .eq('payload_hash', payloadHash)
      .eq('status', 'VERIFIED')
      .limit(1)
      .maybeSingle();

    if (existing) {
      throw new Error(`Duplicate webhook payload detected (Replay Attack blocked)`);
    }

    // 2. Signature Validation
    const isValidSignature = params.signature === `${params.provider.toLowerCase()}_signature_token`;
    if (!isValidSignature) {
      throw new Error('Invalid webhook signature');
    }

    const providerEventId = params.payload.reference || params.payload.providerReference || crypto.randomUUID();

    // 3. Log to incoming_webhook_logs
    const { data: log, error: logErr } = await supabaseAdmin.from('incoming_webhook_logs').insert({
      provider: params.provider,
      event_type: params.payload.event || 'charge.success',
      payload: params.payload,
      signature_header: params.signature,
      status: 'VERIFIED',
      provider_event_id: providerEventId,
      payload_hash: payloadHash
    }).select().single();

    if (logErr) {
      throw new Error(`Failed to log webhook: ${logErr.message}`);
    }

    try {
      const { tenantId, amount, reference, providerReference, accountNumber } = params.payload;

      const verificationContext = new VerificationContext({
        tenantId,
        amount,
        currency: 'NGN',
        provider: params.provider,
        providerReference,
        metadata: {
          rawPayload: params.payload,
          signature: params.signature
        }
      });

      const { verdict } = await IncomingWebhookHandlers.verificationEngine.execute(
        verificationContext,
        'Banking',
        'INBOUND'
      );

      if (!verdict.passed || verdict.decision !== 'ALLOW') {
        throw new Error(`Invify Webhook Verification Rejected: ${verdict.errors.join(', ')}`);
      }

      await QuasarEventGatewayService.publishInboundCredit({
        tenantId,
        amount,
        reference,
        provider: params.provider,
        providerReference,
        accountNumber,
        rawPayload: params.payload
      });

      // Update log to record processing completion
      await supabaseAdmin.from('incoming_webhook_logs').update({
        processed_at: new Date().toISOString()
      }).eq('id', log.id);

      return { status: 'SUCCESS' };
    } catch (err: any) {
      await supabaseAdmin.from('incoming_webhook_logs').update({
        status: 'FAILED',
        verification_result: err.message
      }).eq('id', log.id);
      throw err;
    }
  }
}
