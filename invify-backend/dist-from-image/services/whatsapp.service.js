"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsAppService = void 0;
const whatsapp_1 = require("../integrations/whatsapp");
const whatsapp_notification_service_1 = require("./whatsapp-notification.service");
/**
 * Legacy WhatsAppService façade kept for VerificationService / OTP routes.
 * Delegates to MetaWhatsAppProvider + WhatsAppNotificationService.
 * Do not remove — preserves existing auth WhatsApp OTP behaviour.
 */
class WhatsAppService {
    provider = whatsapp_1.metaWhatsAppProvider;
    async sendOtpTemplate(to, otp, tenantId) {
        const result = await whatsapp_notification_service_1.WhatsAppNotificationService.sendOtp({
            recipientPhone: to,
            otp,
            tenantId,
        });
        if (!result.success && process.env.NODE_ENV === 'production') {
            throw new Error(result.errorMessage || 'Failed to send WhatsApp message');
        }
        if (!result.success) {
            console.warn(`[WhatsAppService] OTP send failed (non-prod soft-fail) phone=${whatsapp_1.WhatsAppConfig.maskPhone(to)} code=${result.errorCode || '-'}`);
            return process.env.NODE_ENV !== 'production';
        }
        return true;
    }
    async sendTextMessage(to, body, tenantId) {
        return this.provider.sendTextMessage({
            to,
            body,
            context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to },
        });
    }
    async sendTemplateMessage(to, templateName, components = [], tenantId) {
        return this.provider.sendTemplateMessage({
            to,
            templateName,
            components,
            context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to, templateName },
        });
    }
    async sendDocumentMessage(to, link, filename, caption, tenantId) {
        return this.provider.sendDocumentMessage({
            to,
            link,
            filename,
            caption,
            context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to },
        });
    }
    async sendImageMessage(to, link, caption, tenantId) {
        return this.provider.sendImageMessage({
            to,
            link,
            caption,
            context: { tenantId, messageType: 'GENERAL_NOTIFICATION', recipientPhone: to },
        });
    }
}
exports.WhatsAppService = WhatsAppService;
exports.whatsappService = new WhatsAppService();
//# sourceMappingURL=whatsapp.service.js.map