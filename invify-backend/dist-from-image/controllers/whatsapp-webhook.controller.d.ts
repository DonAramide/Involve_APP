import { Request, Response } from 'express';
/**
 * Meta WhatsApp Cloud API webhooks.
 * GET  /webhooks/whatsapp — subscription verification
 * POST /webhooks/whatsapp — inbound messages + status callbacks
 */
export declare class WhatsAppWebhookController {
    /**
     * Meta webhook verification handshake.
     * Query: hub.mode, hub.verify_token, hub.challenge
     */
    static verify(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Process inbound webhook events. Always ACK quickly with 200 for valid signed payloads.
     */
    static handle(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifySignature(req: Request): Promise<boolean>;
    static processPayload(body: any): Promise<void>;
    private static processStatuses;
    private static processIncomingMessages;
    private static processErrors;
}
