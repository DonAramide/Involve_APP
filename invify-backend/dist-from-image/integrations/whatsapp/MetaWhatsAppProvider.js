"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaWhatsAppProvider = exports.MetaWhatsAppProvider = void 0;
const http_client_1 = require("../../utils/http-client");
const WhatsAppConfig_1 = require("./WhatsAppConfig");
/**
 * Meta WhatsApp Cloud API provider (Graph API).
 * Does not replace NotificationService (FCM) or EmailService.
 */
class MetaWhatsAppProvider {
    configOverride;
    httpClient = new http_client_1.EnterpriseHttpClient({
        providerName: 'MetaWhatsApp',
        timeout: parseInt(process.env.WHATSAPP_TIMEOUT_MS || '10000', 10),
        maxRetries: 2,
    });
    constructor(configOverride) {
        this.configOverride = configOverride;
    }
    async getConfig(tenantId) {
        if (this.configOverride)
            return this.configOverride;
        return WhatsAppConfig_1.WhatsAppConfig.resolve(tenantId);
    }
    baseUrl(version) {
        const v = version.startsWith('v') ? version : `v${version}`;
        return `https://graph.facebook.com/${v}`;
    }
    async postMessage(cfg, phoneNumberId, payload) {
        if (!cfg.accessToken || !phoneNumberId) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[MetaWhatsAppProvider] Missing credentials — mocking send to ${WhatsAppConfig_1.WhatsAppConfig.maskPhone(String(payload.to || ''))}`);
                return {
                    success: true,
                    metaMessageId: `mock_wamid_${Date.now()}`,
                    phoneNumberId,
                    mocked: true,
                };
            }
            return {
                success: false,
                phoneNumberId,
                errorCode: 'CONFIG_MISSING',
                errorMessage: 'WhatsApp configuration missing',
            };
        }
        try {
            const url = `${this.baseUrl(cfg.graphApiVersion)}/${phoneNumberId}/messages`;
            const response = await this.httpClient.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${cfg.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const metaMessageId = response.data?.messages?.[0]?.id ||
                response.data?.messages?.[0]?.message_id ||
                undefined;
            return {
                success: true,
                metaMessageId,
                phoneNumberId,
            };
        }
        catch (error) {
            const errData = error?.response?.data?.error;
            const errorCode = String(errData?.code || error?.response?.status || 'SEND_FAILED');
            const errorMessage = String(errData?.message || error?.message || 'Failed to send WhatsApp message');
            console.error(`[MetaWhatsAppProvider] Send failed phone=${WhatsAppConfig_1.WhatsAppConfig.maskPhone(String(payload.to || ''))} code=${errorCode}`);
            return {
                success: false,
                phoneNumberId,
                errorCode,
                errorMessage,
            };
        }
    }
    async sendTextMessage(params) {
        const cfg = await this.getConfig(params.context?.tenantId);
        const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
        const to = WhatsAppConfig_1.WhatsAppConfig.normalizePhone(params.to);
        return this.postMessage(cfg, phoneNumberId, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body: params.body },
        });
    }
    async sendTemplateMessage(params) {
        const cfg = await this.getConfig(params.context?.tenantId);
        const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
        const to = WhatsAppConfig_1.WhatsAppConfig.normalizePhone(params.to);
        return this.postMessage(cfg, phoneNumberId, {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: params.templateName,
                language: { code: params.languageCode || 'en' },
                components: params.components || [],
            },
        });
    }
    async sendDocumentMessage(params) {
        const cfg = await this.getConfig(params.context?.tenantId);
        const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
        const to = WhatsAppConfig_1.WhatsAppConfig.normalizePhone(params.to);
        return this.postMessage(cfg, phoneNumberId, {
            messaging_product: 'whatsapp',
            to,
            type: 'document',
            document: {
                link: params.link,
                filename: params.filename,
                caption: params.caption,
            },
        });
    }
    async sendImageMessage(params) {
        const cfg = await this.getConfig(params.context?.tenantId);
        const phoneNumberId = params.context?.whatsappPhoneNumberId || cfg.phoneNumberId;
        const to = WhatsAppConfig_1.WhatsAppConfig.normalizePhone(params.to);
        return this.postMessage(cfg, phoneNumberId, {
            messaging_product: 'whatsapp',
            to,
            type: 'image',
            image: {
                link: params.link,
                caption: params.caption,
            },
        });
    }
}
exports.MetaWhatsAppProvider = MetaWhatsAppProvider;
exports.metaWhatsAppProvider = new MetaWhatsAppProvider();
//# sourceMappingURL=MetaWhatsAppProvider.js.map