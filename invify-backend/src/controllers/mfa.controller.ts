import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class MfaController {
  
  static async generate(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.email) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate a new TOTP secret
      const secret = authenticator.generateSecret();
      
      // Generate OTP Auth URL
      const otpAuthUrl = authenticator.keyuri(user.email, 'Invify POS', secret);
      
      // Generate QR Code image data URL
      const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

      // Save secret to database, but keep mfa_enabled as false until verified
      const { error } = await supabaseAdmin.from('users').update({
        mfa_secret: secret,
      }).eq('id', user.id);

      if (error) {
        console.error('[MFA Generate] DB Error:', error);
        return res.status(500).json({ error: 'Failed to prepare MFA setup' });
      }

      return res.status(200).json({ secret, qrCodeUrl });
    } catch (error: any) {
      console.error('[MFA Generate] Error:', error.message);
      return res.status(500).json({ error: 'Failed to generate MFA' });
    }
  }

  static async enable(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { code } = req.body;

      if (!user || !user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const { data: dbUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('mfa_secret')
        .eq('id', user.id)
        .single();

      if (fetchError || !dbUser || !dbUser.mfa_secret) {
        return res.status(400).json({ error: 'MFA setup not initialized' });
      }

      // Verify token
      const isValid = authenticator.verify({ token: code, secret: dbUser.mfa_secret });

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid authentication code' });
      }

      // Save as enabled
      const { error: updateError } = await supabaseAdmin.from('users').update({
        mfa_enabled: true
      }).eq('id', user.id);

      if (updateError) {
        console.error('[MFA Enable] DB Error:', updateError);
        return res.status(500).json({ error: 'Failed to enable MFA' });
      }

      return res.status(200).json({ success: true, message: 'MFA enabled successfully' });
    } catch (error: any) {
      console.error('[MFA Enable] Error:', error.message);
      return res.status(500).json({ error: 'Failed to enable MFA' });
    }
  }
}
