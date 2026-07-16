"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsAppService = void 0;
const http_client_1 = require("../utils/http-client");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class WhatsAppService {
    baseUrl = 'https://graph.facebook.com/v19.0';
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    accessToken = process.env.META_ACCESS_TOKEN;
    httpClient = new http_client_1.EnterpriseHttpClient({
        providerName: 'WhatsApp',
        timeout: parseInt(process.env.WHATSAPP_TIMEOUT_MS || '5000', 10),
        maxRetries: 3
    });
    async sendOtpTemplate(to, otp) {
        if (!this.phoneNumberId || !this.accessToken) {
            console.warn('[WhatsAppService] Missing META_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
            // For local development, pretend it sent
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[WhatsAppService] (Dev) OTP ${otp} would be sent to ${to}`);
                return true;
            }
            throw new Error('WhatsApp configuration missing');
        }
        try {
            // Normalize phone number: remove any '+' and leading zeros if needed
            const normalizedPhone = to.replace(/\+/g, '');
            const payload = {
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'template',
                template: {
                    name: 'invify_auth_otp', // Assuming a registered template name
                    language: {
                        code: 'en'
                    },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: otp }
                            ]
                        },
                        {
                            type: 'button',
                            sub_type: 'url',
                            index: '0',
                            parameters: [
                                { type: 'text', text: otp }
                            ]
                        }
                    ]
                }
            };
            const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
            await this.httpClient.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`[WhatsAppService] Successfully sent OTP template to ${to}`);
            return true;
        }
        catch (error) {
            console.error(`[WhatsAppService] Failed to send OTP to ${to}:`, error.response?.data || error.message);
            throw new Error('Failed to send WhatsApp message');
        }
    }
}
exports.WhatsAppService = WhatsAppService;
exports.whatsappService = new WhatsAppService();
//# sourceMappingURL=whatsapp.service.js.map