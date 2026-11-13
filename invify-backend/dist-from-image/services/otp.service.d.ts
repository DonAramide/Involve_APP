export declare class OTPService {
    /**
     * Generates a 6-digit OTP, hashes it with bcrypt, and stores it in the database.
     */
    static generateOTP(phone: string): Promise<string>;
    /**
     * Verifies the OTP provided by the user with lockout after 5 failed attempts.
     */
    static verifyOTPDetailed(phone: string, code: string): Promise<{
        ok: boolean;
        locked?: boolean;
        error?: string;
    }>;
    /**
     * Verifies the OTP provided by the user.
     */
    static verifyOTP(phone: string, code: string): Promise<boolean>;
    /**
     * Placeholder for sending WhatsApp message via a provider like Twilio or Termii.
     */
    private static sendWhatsAppOTP;
}
export declare const otpService: typeof OTPService;
