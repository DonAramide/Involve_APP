import { Request, Response } from 'express';
import { verificationService } from '../services/verification.service';

export class OnboardingController {
  
  public static async sendEmailOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, purpose = 'SIGNUP' } = req.body;
      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Valid email is required.' });
        return;
      }

      await verificationService.sendOTP(email, 'EMAIL', purpose);
      res.status(200).json({ success: true, message: 'Verification code sent' });
    } catch (error: any) {
      console.error('[OnboardingController] sendEmailOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  public static async verifyEmailOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, purpose = 'SIGNUP' } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: 'Email and code are required.' });
        return;
      }

      const isValid = await verificationService.verifyOTP(email, code, 'EMAIL', purpose);
      if (isValid) {
        res.status(200).json({ success: true, message: 'Email verified successfully.' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
      }
    } catch (error: any) {
      console.error('[OnboardingController] verifyEmailOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  public static async sendWhatsappOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, purpose = 'SIGNUP' } = req.body;
      if (!phone || typeof phone !== 'string') {
        res.status(400).json({ error: 'Valid phone number is required.' });
        return;
      }

      await verificationService.sendOTP(phone, 'WHATSAPP', purpose);
      res.status(200).json({ success: true, message: 'Verification code sent' });
    } catch (error: any) {
      console.error('[OnboardingController] sendWhatsappOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  public static async verifyWhatsappOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, code, purpose = 'SIGNUP' } = req.body;
      if (!phone || !code) {
        res.status(400).json({ error: 'Phone and code are required.' });
        return;
      }

      const isValid = await verificationService.verifyOTP(phone, code, 'WHATSAPP', purpose);
      if (isValid) {
        res.status(200).json({ success: true, message: 'WhatsApp number verified successfully.' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
      }
    } catch (error: any) {
      console.error('[OnboardingController] verifyWhatsappOtp error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, phone, password, emailVerified, phoneVerified } = req.body;

      if (!email || !password) {
         res.status(400).json({ success: false, error: 'Missing required fields' });
         return;
      }

      const emailVerificationRequired = process.env.AUTH_EMAIL_VERIFICATION_REQUIRED !== 'false';
      const whatsappVerificationRequired = process.env.AUTH_WHATSAPP_VERIFICATION_REQUIRED === 'true';

      if (emailVerificationRequired && !emailVerified) {
        res.status(400).json({ success: false, error: 'Email verification is required to complete registration.' });
        return;
      }

      if (whatsappVerificationRequired && !phoneVerified) {
        res.status(400).json({ success: false, error: 'WhatsApp verification is required to complete registration.' });
        return;
      }

      // Here you would typically insert the user into your database or call Supabase auth.admin.createUser
      // Mocking successful registration for now
      console.log(`[OnboardingController] Registering user ${firstName} ${lastName} (${email})`);

      // Mock DB Creation ...
      
      // Send Welcome Email
      const { emailService } = require('../services/email.service');
      await emailService.sendWelcomeEmail(email);

      res.status(201).json({ success: true, message: 'Account created successfully.' });
    } catch (error: any) {
      console.error('[OnboardingController] register error:', error.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
