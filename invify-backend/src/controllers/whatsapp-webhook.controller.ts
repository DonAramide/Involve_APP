import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { WhatsAppConfig } from '../integrations/whatsapp/WhatsAppConfig';
import { WhatsAppMessageLogRepository } from '../repositories/whatsapp-message-log.repository';
import { GovAuditService } from '../services/gov-audit.service';
import { randomUUID } from 'crypto';

/**
 * Meta WhatsApp Cloud API webhooks.
 * GET  /webhooks/whatsapp — subscription verification
 * POST /webhooks/whatsapp — inbound messages + status callbacks
 */
export class WhatsAppWebhookController {
  /**
   * Meta webhook verification handshake.
   * Query: hub.mode, hub.verify_token, hub.challenge
   */
  static async verify(req: Request, res: Response) {
    const mode = String(req.query['hub.mode'] || '');
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');
    const expected = await WhatsAppConfig.getWebhookVerifyToken();

    if (mode === 'subscribe' && expected && token === expected) {
      console.log('[WhatsAppWebhook] Verification succeeded');
      return res.status(200).send(challenge);
    }

    console.warn('[WhatsAppWebhook] Verification failed');
    return res.status(403).send('Forbidden');
  }

  /**
   * Process inbound webhook events. Always ACK quickly with 200 for valid signed payloads.
   */
  static async handle(req: Request, res: Response) {
    try {
      const signatureValid = await WhatsAppWebhookController.verifySignature(req);
      if (!signatureValid) {
        console.warn('[WhatsAppWebhook] Invalid signature');
        return res.status(403).json({ error: 'Invalid signature' });
      }

      const body = req.body || {};
      if (body.object !== 'whatsapp_business_account') {
        // Acknowledge unknown objects without leaking details
        return res.status(200).json({ received: true });
      }

      // ACK immediately pattern: process synchronously but keep lightweight + idempotent
      await WhatsAppWebhookController.processPayload(body);

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[WhatsAppWebhook] Handler error:', err?.message || err);
      // Still 200 to avoid Meta retry storms for poison payloads we already logged
      return res.status(200).json({ received: true, warning: 'processed_with_errors' });
    }
  }

  static async verifySignature(req: Request): Promise<boolean> {
    const appSecret = await WhatsAppConfig.getAppSecret();
    // Allow unsigned in non-production when secret not configured (local/dev)
    if (!appSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[WhatsAppWebhook] WHATSAPP_APP_SECRET not configured');
        return false;
      }
      return true;
    }

    const header = String(req.headers['x-hub-signature-256'] || '');
    if (!header.startsWith('sha256=')) return false;

    const rawBody: Buffer | undefined = (req as any).rawBody;
    const payload = rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
    const provided = header.slice('sha256='.length);

    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(provided, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  static async processPayload(body: any): Promise<void> {
    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change?.field !== 'messages') continue;
        const value = change.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id || null;

        await this.processStatuses(value, phoneNumberId, entry?.id);
        await this.processIncomingMessages(value, phoneNumberId, entry?.id);
        await this.processErrors(value, phoneNumberId, entry?.id);
      }
    }
  }

  private static async processStatuses(value: any, phoneNumberId: string | null, entryId?: string) {
    const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
    for (const statusEvent of statuses) {
      const metaMessageId = statusEvent.id || statusEvent.message_id;
      const metaStatus = String(statusEvent.status || '').toLowerCase();
      const eventId =
        statusEvent.id && statusEvent.status && statusEvent.timestamp
          ? `status:${statusEvent.id}:${statusEvent.status}:${statusEvent.timestamp}`
          : `status:${entryId || 'e'}:${metaMessageId || 'm'}:${metaStatus}:${statusEvent.timestamp || Date.now()}`;

      const claim = await WhatsAppMessageLogRepository.claimWebhookEvent({
        eventId,
        eventType: 'status',
        metaMessageId,
        phoneNumberId,
        payload: statusEvent,
      });
      if (!claim.claimed) continue;

      if (!metaMessageId) continue;

      const mapped = WhatsAppMessageLogRepository.mapMetaStatus(metaStatus);
      const now = new Date().toISOString();
      const patch: any = {
        status: mapped,
        metaStatus,
      };

      if (mapped === 'sent') patch.sentAt = now;
      if (mapped === 'delivered') patch.deliveredAt = now;
      if (mapped === 'read') patch.readAt = now;
      if (mapped === 'failed') {
        patch.failedAt = now;
        const err = statusEvent.errors?.[0];
        patch.errorCode = err?.code != null ? String(err.code) : null;
        patch.errorMessage = err?.title || err?.message || null;
      }

      const updated = await WhatsAppMessageLogRepository.updateByMetaMessageId(metaMessageId, patch);
      if (!updated) {
        // Status for a message we didn't originate — still log a stub for audit trail
        await WhatsAppMessageLogRepository.create({
          messageType: 'GENERAL_NOTIFICATION',
          recipientPhone: statusEvent.recipient_id || 'unknown',
          phoneNumberId,
          metaMessageId,
          status: mapped,
          metaStatus,
          errorCode: patch.errorCode,
          errorMessage: patch.errorMessage,
          sentAt: mapped === 'sent' ? now : null,
          deliveredAt: mapped === 'delivered' ? now : null,
          readAt: mapped === 'read' ? now : null,
          failedAt: mapped === 'failed' ? now : null,
          payload: { source: 'webhook_status_orphan', statusEvent },
        });
      }

      console.log(
        `[WhatsAppWebhook] status metaMessageId=${metaMessageId} status=${mapped}${patch.errorCode ? ` errorCode=${patch.errorCode}` : ''}`
      );

      try {
        await GovAuditService.logAction({
          id: `wa-wh-${Date.now()}-${randomUUID().slice(0, 6)}`,
          timestamp: now,
          module: 'SYSTEM',
          action: `WHATSAPP_STATUS_${mapped.toUpperCase()}`,
          user_email: 'system@invify',
          user_name: 'WhatsAppWebhook',
          ip_address: '127.0.0.1',
          target: metaMessageId,
          status: mapped === 'failed' ? 'failed' : 'success',
          metadata: {
            meta_message_id: metaMessageId,
            status: mapped,
            error_code: patch.errorCode,
            phone_number_id: phoneNumberId,
          },
        });
      } catch {
        /* ignore */
      }
    }
  }

  private static async processIncomingMessages(value: any, phoneNumberId: string | null, entryId?: string) {
    const messages = Array.isArray(value?.messages) ? value.messages : [];
    for (const message of messages) {
      const metaMessageId = message.id;
      const eventId = metaMessageId
        ? `inbound:${metaMessageId}`
        : `inbound:${entryId || 'e'}:${message.timestamp || Date.now()}:${message.from || ''}`;

      const claim = await WhatsAppMessageLogRepository.claimWebhookEvent({
        eventId,
        eventType: 'inbound_message',
        metaMessageId,
        phoneNumberId,
        payload: {
          from: message.from,
          type: message.type,
          timestamp: message.timestamp,
          // Do not store full free-text body long-term beyond webhook_events; keep minimal
          textPreview: message.text?.body ? String(message.text.body).slice(0, 120) : undefined,
        },
      });
      if (!claim.claimed) continue;

      console.log(
        `[WhatsAppWebhook] inbound type=${message.type || 'unknown'} from=${WhatsAppConfig.maskPhone(message.from || '')} metaMessageId=${metaMessageId || '-'}`
      );

      try {
        await GovAuditService.logAction({
          id: `wa-in-${Date.now()}-${randomUUID().slice(0, 6)}`,
          timestamp: new Date().toISOString(),
          module: 'SYSTEM',
          action: 'WHATSAPP_INBOUND_MESSAGE',
          user_email: 'system@invify',
          user_name: 'WhatsAppWebhook',
          ip_address: '127.0.0.1',
          target: metaMessageId || eventId,
          status: 'success',
          metadata: {
            meta_message_id: metaMessageId,
            message_type: message.type,
            from_masked: WhatsAppConfig.maskPhone(message.from || ''),
            phone_number_id: phoneNumberId,
          },
        });
      } catch {
        /* ignore */
      }
    }
  }

  private static async processErrors(value: any, phoneNumberId: string | null, entryId?: string) {
    const errors = Array.isArray(value?.errors) ? value.errors : [];
    for (const err of errors) {
      const eventId = `error:${entryId || 'e'}:${err.code || 'x'}:${err.href || err.title || Date.now()}`;
      const claim = await WhatsAppMessageLogRepository.claimWebhookEvent({
        eventId,
        eventType: 'error',
        metaMessageId: null,
        phoneNumberId,
        payload: { code: err.code, title: err.title, message: err.message },
      });
      if (!claim.claimed) continue;

      console.error(
        `[WhatsAppWebhook] error code=${err.code || '-'} title=${err.title || err.message || 'unknown'}`
      );
    }
  }
}
