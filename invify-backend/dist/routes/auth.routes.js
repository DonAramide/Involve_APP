"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const onboarding_controller_1 = require("../controllers/onboarding.controller");
const router = (0, express_1.Router)();
const otpRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 requests per IP per hour for OTP endpoints (to prevent basic spam)
    message: { error: 'Too many requests from this IP, please try again later.' }
});
router.post('/send-email-otp', otpRateLimiter, onboarding_controller_1.OnboardingController.sendEmailOtp);
router.post('/verify-email-otp', otpRateLimiter, onboarding_controller_1.OnboardingController.verifyEmailOtp);
router.post('/send-whatsapp-otp', otpRateLimiter, onboarding_controller_1.OnboardingController.sendWhatsappOtp);
router.post('/verify-whatsapp-otp', otpRateLimiter, onboarding_controller_1.OnboardingController.verifyWhatsappOtp);
router.post('/register', onboarding_controller_1.OnboardingController.register);
// Device linking via QR code
router.post('/generate-link-qr', onboarding_controller_1.OnboardingController.generateDeviceLinkQr);
router.post('/link-device', onboarding_controller_1.OnboardingController.linkDevice);
exports.authRoutes = router;
//# sourceMappingURL=auth.routes.js.map