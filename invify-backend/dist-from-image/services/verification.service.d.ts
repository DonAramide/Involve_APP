export type ChannelType = 'EMAIL' | 'WHATSAPP';
export type PurposeType = 'SIGNUP' | 'PASSWORD_RESET' | 'LOGIN' | 'PHONE_CHANGE' | 'EMAIL_CHANGE';
export declare class VerificationService {
    private readonly OTP_LENGTH;
    private readonly OTP_EXPIRY_MINUTES;
    private readonly MAX_RETRIES;
    private generateOTP;
    static normalizePurpose(purpose?: string): PurposeType;
    sendOTP(identifier: string, // Email or Phone
    channel: ChannelType, purpose: PurposeType | string, tenantId?: string, options?: {
        reuseIfPending?: boolean;
    }): Promise<boolean>;
    verifyOTP(identifier: string, code: string, channel: ChannelType, purpose: PurposeType | string): Promise<boolean>;
    verifyOTPDetailed(identifier: string, code: string, channel: ChannelType, purpose: PurposeType | string): Promise<{
        ok: boolean;
        error?: string;
    }>;
    private findRecentVerified;
    /**
     * True if this email just completed PASSWORD_RESET OTP verification
     * (within expiry window). Used so UI can verify first, then set password.
     */
    hasFreshPasswordResetVerification(email: string): Promise<boolean>;
}
export declare const verificationService: VerificationService;
