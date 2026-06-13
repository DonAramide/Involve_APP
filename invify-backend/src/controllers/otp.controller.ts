// src/controllers/otp.controller.ts
import { Request, Response } from 'express';
import { OTPService } from '../services/otp.service';

export class OTPController {
  /**
   * POST /public/otp/send
   * Triggers an OTP send via WhatsApp.
   */
  static async sendOTP(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const code = await OTPService.generateOTP(phone);
      
      const variantService = require('../config/build-variant').BuildVariantService.getInstance();
      
      return res.status(200).json({ 
        message: 'Verification code sent successfully via WhatsApp',
        // In dev mode, we might return the code for testing, 
        // but for production it should be hidden.
        devCode: variantService.isLocal() ? code : undefined
      });
    } catch (error: any) {
      console.error('[OTPController] Send Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /public/otp/verify
   * Validates the provided code.
   */
  static async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ error: 'Phone and code are required' });
      }

      const isValid = await OTPService.verifyOTP(phone, code);
      
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Phone number verified successfully' 
      });
    } catch (error: any) {
      console.error('[OTPController] Verify Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
