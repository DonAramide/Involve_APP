import { WhatsAppProvider } from './WhatsAppProvider';
import { SendDocumentParams, SendImageParams, SendTemplateParams, SendTextParams, WhatsAppAccountConfig, WhatsAppSendResult } from './types';
/**
 * Meta WhatsApp Cloud API provider (Graph API).
 * Does not replace NotificationService (FCM) or EmailService.
 */
export declare class MetaWhatsAppProvider implements WhatsAppProvider {
    private readonly configOverride?;
    private httpClient;
    constructor(configOverride?: WhatsAppAccountConfig | undefined);
    private getConfig;
    private baseUrl;
    private postMessage;
    sendTextMessage(params: SendTextParams): Promise<WhatsAppSendResult>;
    sendTemplateMessage(params: SendTemplateParams): Promise<WhatsAppSendResult>;
    sendDocumentMessage(params: SendDocumentParams): Promise<WhatsAppSendResult>;
    sendImageMessage(params: SendImageParams): Promise<WhatsAppSendResult>;
}
export declare const metaWhatsAppProvider: MetaWhatsAppProvider;
