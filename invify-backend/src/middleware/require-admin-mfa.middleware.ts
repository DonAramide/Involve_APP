import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authenticator } from 'otplib';

/**
 * Requires a valid admin 2FA code for sensitive financial operations.
 * Expects `otp` in JSON body or multipart form field.
 */
export async function requireAdminMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const otp =
      (req.body?.otp as string | undefined) ||
      (req.body?.mfaCode as string | undefined) ||
      (req.query?.otp as string | undefined);

    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('mfa_enabled, mfa_secret, email')
      .eq('id', user.id)
      .single();

    if (error || !dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!dbUser.mfa_enabled || !dbUser.mfa_secret) {
      return res.status(403).json({
        error: 'MFA_NOT_ENABLED',
        message: 'Admin 2FA must be enabled before uploading settlement files.',
      });
    }

    if (!otp || String(otp).trim().length < 6) {
      return res.status(403).json({
        error: 'MFA_REQUIRED',
        message: '2FA code is required for settlement file upload.',
      });
    }

    const isValid = authenticator.verify({
      token: String(otp).trim(),
      secret: dbUser.mfa_secret,
    });

    if (!isValid) {
      return res.status(403).json({
        error: 'INVALID_MFA',
        message: 'Invalid 2FA code.',
      });
    }

    (req as any).mfaVerified = true;
    return next();
  } catch (err: any) {
    console.error('[requireAdminMfa] Error:', err.message);
    return res.status(500).json({ error: 'MFA verification failed' });
  }
}
