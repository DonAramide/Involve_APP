import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authenticator } from 'otplib';

function extractOtp(req: Request): string {
  const body = req.body || {};
  const header = req.headers['x-admin-otp'] || req.headers['x-mfa-code'];
  const raw =
    body.otp ||
    body.mfaCode ||
    body.mfaToken ||
    body.totpCode ||
    body.tokenCode ||
    (typeof header === 'string' ? header : '') ||
    (req.query?.otp as string | undefined) ||
    '';
  return String(raw).replace(/\D/g, '');
}

function verifyTotp(token: string, secret: string): boolean {
  const previous = authenticator.options.window;
  authenticator.options.window = 1;
  try {
    return authenticator.verify({ token, secret });
  } finally {
    authenticator.options.window = previous;
  }
}

async function loadMfaUser(user: { id?: string; email?: string }) {
  if (user?.id) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('mfa_enabled, mfa_secret, email')
      .eq('id', user.id)
      .maybeSingle();
    if (!error && data) return data;
  }
  const email = String(user?.email || '').trim();
  if (email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('mfa_enabled, mfa_secret, email')
      .ilike('email', email)
      .maybeSingle();
    if (!error && data) return data;
  }
  return null;
}

/**
 * Requires a valid authenticator 2FA code for the signed-in admin.
 * Used for settlement uploads and all maker-checker approvals.
 */
export async function requireAdminMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const otp = extractOtp(req);

    const dbUser = await loadMfaUser(user);

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!dbUser.mfa_enabled || !dbUser.mfa_secret) {
      return res.status(403).json({
        error: 'MFA_NOT_ENABLED',
        message: 'Enable 2FA on your admin account before this action.',
      });
    }

    if (!otp || otp.length < 6) {
      return res.status(403).json({
        error: 'MFA_REQUIRED',
        message: 'Enter your 2FA authenticator code to continue.',
      });
    }

    const isValid = verifyTotp(otp, dbUser.mfa_secret);

    if (!isValid) {
      return res.status(403).json({
        error: 'INVALID_MFA',
        message: 'Invalid 2FA code. Use the live 6-digit code from this checker account authenticator app.',
      });
    }

    (req as any).mfaVerified = true;
    return next();
  } catch (err: any) {
    console.error('[requireAdminMfa] Error:', err.message);
    return res.status(500).json({ error: 'MFA verification failed' });
  }
}

/** Checker approve/reject must present a valid 2FA code. */
export const requireCheckerMfa = requireAdminMfa;
