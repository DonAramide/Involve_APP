export type ChannelType = 'EMAIL' | 'WHATSAPP';
export type PurposeType = 'SIGNUP' | 'PASSWORD_RESET' | 'LOGIN' | 'PHONE_CHANGE' | 'EMAIL_CHANGE';
export declare class VerificationService {
    private readonly OTP_LENGTH;
    private readonly OTP_EXPIRY_MINUTES;
    private readonly MAX_RETRIES;
    private generateOTP;
    sendOTP(identifier: string, // Email or Phone
    channel: ChannelType, purpose: PurposeType, tenantId?: string): Promise<boolean>;
    verifyOTP(identifier: string, code: string, channel: ChannelType, purpose: PurposeType): Promise<boolean>;
}
export declare const verificationService: VerificationService;
