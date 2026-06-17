import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { OnboardingController } from '../controllers/onboarding.controller';

const router = Router();

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 requests per IP per hour for OTP endpoints (to prevent basic spam)
  message: { error: 'Too many requests from this IP, please try again later.' }
});

router.post('/send-email-otp', otpRateLimiter, OnboardingController.sendEmailOtp);
router.post('/verify-email-otp', otpRateLimiter, OnboardingController.verifyEmailOtp);
router.post('/send-whatsapp-otp', otpRateLimiter, OnboardingController.sendWhatsappOtp);
router.post('/verify-whatsapp-otp', otpRateLimiter, OnboardingController.verifyWhatsappOtp);
router.post('/register', OnboardingController.register);

export const authRoutes = router;
