"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPController = void 0;
const otp_service_1 = require("../services/otp.service");
class OTPController {
    /**
     * POST /public/otp/send
     * Triggers an OTP send via WhatsApp.
     */
    static async sendOTP(req, res) {
        try {
            const { phone } = req.body;
            if (!phone) {
                return res.status(400).json({ error: 'Phone number is required' });
            }
            const code = await otp_service_1.OTPService.generateOTP(phone);
            const variantService = require('../config/build-variant').BuildVariantService.getInstance();
            return res.status(200).json({
                message: 'Verification code sent successfully via WhatsApp',
                // In dev mode, we might return the code for testing, 
                // but for production it should be hidden.
                devCode: variantService.isLocal() ? code : undefined
            });
        }
        catch (error) {
            console.error('[OTPController] Send Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /public/otp/verify
     * Validates the provided code.
     */
    static async verifyOTP(req, res) {
        try {
            const { phone, code } = req.body;
            if (!phone || !code) {
                return res.status(400).json({ error: 'Phone and code are required' });
            }
            const isValid = await otp_service_1.OTPService.verifyOTP(phone, code);
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid or expired verification code' });
            }
            return res.status(200).json({
                success: true,
                message: 'Phone number verified successfully'
            });
        }
        catch (error) {
            console.error('[OTPController] Verify Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.OTPController = OTPController;
//# sourceMappingURL=otp.controller.js.map