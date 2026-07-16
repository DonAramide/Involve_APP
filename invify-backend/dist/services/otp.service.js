"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
// src/services/otp.service.ts
const supabase_1 = require("../db/supabase");
class OTPService {
    /**
     * Generates a 6-digit OTP and stores it in the database with an expiry.
     */
    static async generateOTP(phone) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
        const { error } = await supabase_1.supabase
            .from('verification_codes')
            .upsert({
            phone,
            code,
            expires_at: expiresAt.toISOString(),
            used: false
        }, { onConflict: 'phone' });
        if (error)
            throw error;
        // Placeholder for WhatsApp API integration
        await this.sendWhatsAppOTP(phone, code);
        return code;
    }
    /**
     * Verifies the OTP provided by the user.
     */
    static async verifyOTP(phone, code) {
        const { data, error } = await supabase_1.supabase
            .from('verification_codes')
            .select('*')
            .eq('phone', phone)
            .eq('code', code)
            .eq('used', false)
            .single();
        if (error || !data)
            return false;
        const isExpired = new Date(data.expires_at) < new Date();
        if (isExpired)
            return false;
        // Mark as used
        await supabase_1.supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', data.id);
        return true;
    }
    /**
     * Placeholder for sending WhatsApp message via a provider like Twilio or Termii.
     */
    static async sendWhatsAppOTP(phone, code) {
        console.log('\n=============================================');
        console.log('         WhatsApp OTP Mock Provider          ');
        console.log('=============================================');
        console.log(` To: ${phone}`);
        console.log(` Code: ${code}`);
        console.log('=============================================\n');
        // Example: Integration with a provider (e.g. Termii for Nigeria)
        // To get a real API key, register at https://termii.com
        /*
        const response = await axios.post('https://api.ng.termii.com/api/sms/send', {
          to: phone,
          from: "Invify",
          sms: `Your Invify verification code is: ${code}. Valid for 10 mins.`,
          type: "whatsapp",
          channel: "whatsapp",
          api_key: process.env.TERMII_API_KEY
        });
        */
        // For now, we simulate success
        return true;
    }
}
exports.OTPService = OTPService;
//# sourceMappingURL=otp.service.js.map