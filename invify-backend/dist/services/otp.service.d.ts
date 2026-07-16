export declare class OTPService {
    /**
     * Generates a 6-digit OTP and stores it in the database with an expiry.
     */
    static generateOTP(phone: string): Promise<string>;
    /**
     * Verifies the OTP provided by the user.
     */
    static verifyOTP(phone: string, code: string): Promise<boolean>;
    /**
     * Placeholder for sending WhatsApp message via a provider like Twilio or Termii.
     */
    private static sendWhatsAppOTP;
}
