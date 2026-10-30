/**
 * Legacy WhatsAppService façade kept for VerificationService / OTP routes.
 * Delegates to MetaWhatsAppProvider + WhatsAppNotificationService.
 * Do not remove — preserves existing auth WhatsApp OTP behaviour.
 */
export declare class WhatsAppService {
    private provider;
    sendOtpTemplate(to: string, otp: string, tenantId?: string): Promise<boolean>;
    sendTextMessage(to: string, body: string, tenantId?: string): Promise<import("../integrations/whatsapp").WhatsAppSendResult>;
    sendTemplateMessage(to: string, templateName: string, components?: any[], tenantId?: string): Promise<import("../integrations/whatsapp").WhatsAppSendResult>;
    sendDocumentMessage(to: string, link: string, filename?: string, caption?: string, tenantId?: string): Promise<import("../integrations/whatsapp").WhatsAppSendResult>;
    sendImageMessage(to: string, link: string, caption?: string, tenantId?: string): Promise<import("../integrations/whatsapp").WhatsAppSendResult>;
}
export declare const whatsappService: WhatsAppService;
