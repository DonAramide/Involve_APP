export declare class WhatsAppService {
    private readonly baseUrl;
    private readonly phoneNumberId;
    private readonly accessToken;
    private httpClient;
    sendOtpTemplate(to: string, otp: string): Promise<boolean>;
}
export declare const whatsappService: WhatsAppService;
