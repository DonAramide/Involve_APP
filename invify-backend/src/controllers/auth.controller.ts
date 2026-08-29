// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';
import { UserDeviceService } from '../services/user-device.service';
import { SYSTEM_TENANT_UUID } from '../config/constants';
import { GovAuditService } from '../services/gov-audit.service';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import {
  consumeMfaChallenge,
  issueMfaChallenge,
  MfaChallengeError,
  validateMfaChallenge,
} from '../services/mfa-challenge.service';
import {
  AuthSessionError,
  exchangeRefreshToken,
  peekTokenSubject,
  revokeProviderSession,
} from '../services/auth-session.service';

/** Love School (device / JWT from live tablet sessions). */
const LOVE_SCHOOL_TENANT_ID = '0e9ccdf3-f96b-4914-8aed-76165655ad01';
const LOVE_SCHOOL_OWNER_ID = 'eb9f0b3c-c874-4d96-b624-5d4d63a60e4e';

function isAuthConnectivityFailure(err: any): boolean {
  const msg = String(err?.message || err || '');
  const causeMsg = String(err?.cause?.message || err?.cause || '');
  const code = err?.code || err?.cause?.code;
  return (
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    /fetch failed/i.test(msg) ||
    /ConnectTimeoutError/i.test(msg) ||
    /Connect Timeout/i.test(msg) ||
    /timeout/i.test(msg) ||
    /fetch failed/i.test(causeMsg) ||
    /Connect Timeout/i.test(causeMsg) ||
    /network/i.test(msg)
  );
}

function offlineAuthAllowed(variantService: { isLocal(): boolean; isStaging(): boolean; isProd(): boolean }): boolean {
  // LOCAL only — never staging or production, even on connectivity failure
  if (variantService.isProd() || variantService.isStaging()) return false;
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.BUILD_PROFILE === 'production'
  ) {
    return false;
  }
  return process.env.OFFLINE_LOCAL_AUTH === 'true' && variantService.isLocal();
}

const PLATFORM_STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'STAFF',
  'ADMIN_FINANCE',
  'ADMIN_TREASURY',
  'ADMIN_RISK',
  'ADMIN_OPS',
  'ADMIN_EXECUTIVE',
  'ADMIN_DEPLOY',
]);

function normalizeLoginPortal(raw: unknown, isolationTier?: unknown): 'admin' | 'tenant' | null {
  const portal = String(raw || '').trim().toLowerCase();
  if (portal === 'admin' || portal === 'ops' || portal === 'staff') return 'admin';
  if (portal === 'tenant' || portal === 'owner') return 'tenant';

  const tier = String(isolationTier || '').trim().toLowerCase();
  if (tier === 'staff' || tier === 'sso') return 'admin';
  if (tier === 'admin' || tier === 'pro') return 'tenant';
  return null;
}

function isPlatformStaffRole(roleRaw: unknown): boolean {
  const roles = String(roleRaw || '')
    .split(',')
    .map((r) => r.trim().toUpperCase().replace(/-/g, '_'))
    .filter(Boolean);
  return roles.some((r) => PLATFORM_STAFF_ROLES.has(r));
}

/** Reject cross-portal login (tenant creds on /admin/login and vice versa). */
function assertPortalRoleAllowed(
  portal: 'admin' | 'tenant' | null,
  role: unknown,
): { ok: true } | { ok: false; status: number; body: Record<string, string> } {
  if (!portal) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'PORTAL_REQUIRED',
        message: 'Login portal is required. Use /admin/login or /tenant/login.',
        code: 'PORTAL_REQUIRED',
      },
    };
  }

  const isStaff = isPlatformStaffRole(role);
  if (portal === 'admin' && !isStaff) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'WRONG_LOGIN_PORTAL',
        message:
          'This account belongs to a tenant workspace. Sign in at /tenant/login.',
        code: 'WRONG_LOGIN_PORTAL',
      },
    };
  }
  if (portal === 'tenant' && isStaff) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'WRONG_LOGIN_PORTAL',
        message:
          'This account belongs to platform Admin / Ops. Sign in at /admin/login.',
        code: 'WRONG_LOGIN_PORTAL',
      },
    };
  }
  return { ok: true };
}

function resolveOfflineIdentity(emailRaw: string): {
  role: string;
  tenantId: string;
  userId: string;
} {
  // LOCAL-only helper. Never elevates to SUPER_ADMIN based on email substring heuristics.
  const email = (emailRaw || '').trim().toLowerCase();
  if (email === 'olive@invify.com') {
    return {
      role: 'TENANT_OPERATOR',
      tenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382',
      userId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382',
    };
  }
  if (
    email === 'info.iips.ng@gmail.com' ||
    (email.includes('love') && email.includes('school'))
  ) {
    return {
      role: 'owner',
      tenantId: LOVE_SCHOOL_TENANT_ID,
      userId: LOVE_SCHOOL_OWNER_ID,
    };
  }
  // Default least-privilege local sandbox identity (not super_admin)
  return {
    role: 'TENANT_OPERATOR',
    tenantId: 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382',
    userId: '88a18bc0-d128-4e1b-b413-58019ab268f7',
  };
}

function buildOfflineToken(email: string, identity: { role: string; tenantId: string; userId: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is required to issue local offline tokens');
  }
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: identity.userId,
      sub: identity.userId,
      email,
      role: identity.role,
      tenantId: identity.tenantId,
    },
    secret,
    { expiresIn: '7d', algorithm: 'HS256' },
  );
}

async function validateDeviceOrBlock(userId: string, email: string, req: Request): Promise<{ allowed: boolean; errorResponse?: any }> {
  try {
    let enforce = false;
    try {
      const { data, error } = await supabase.from('system_configurations').select('config_value').eq('config_key', 'enforce_device_control').single();
      if (!error && data) {
         enforce = data.config_value === true || data.config_value === 'true';
      }
    } catch(dbErr) {
      enforce = false;
    }
    if (!enforce) return { allowed: true };

    const deviceId = req.body.deviceId;
    if (!deviceId) {
      return { 
        allowed: false, 
        errorResponse: { 
          error: 'DEVICE_APPROVAL_REQUIRED', 
          message: 'Secure device identity footprint is missing. Device control is strictly enforced.' 
        } 
      };
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const verification = await UserDeviceService.verifyDevice(
      userId,
      deviceId,
      email,
      { ipAddress: String(ipAddress), userAgent }
    );

    if (!verification.isApproved) {
      return {
        allowed: false,
        errorResponse: {
          error: 'DEVICE_APPROVAL_REQUIRED',
          deviceId,
          status: verification.record.status,
          message: `This device footprint (${deviceId}) status is ${verification.record.status} and requires manual Invify operations team approval.`
        }
      };
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: true };
  }
}

function dispatchLoginSecurityAlert(req: Request, user: { name?: string; email: string; role?: string }) {
  try {
    const { emailService } = require('../services/email.service');
    const forwarded = req.headers['x-forwarded-for'];
    let ip = '';
    if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      ip = forwarded[0].trim();
    } else {
      ip = (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || req.ip || '127.0.0.1';
    }

    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }

    const deviceId = req.body?.deviceId || req.headers['x-device-id'] || 'Web Browser (Default Device)';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    const city = (req.headers['cf-ipcity'] || req.headers['x-client-city']) as string;
    const country = (req.headers['cf-ipcountry'] || req.headers['x-client-country'] || req.headers['x-country-name'] || req.headers['x-country-code']) as string;

    let location = '';
    if (city && country) {
      location = `${city}, ${country}`;
    } else if (country) {
      location = country;
    } else if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      location = 'Local Network / Development Environment';
    } else {
      location = 'Detected via IP Address';
    }

    const portal = req.body?.portal === 'admin' || (user.role && user.role.startsWith('admin_')) || user.role === 'super_admin' || user.role === 'internal_staff'
      ? 'Invify Super Admin Portal'
      : 'Invify Business & Tenant Portal';

    emailService.sendLoginAlertEmail(user.email, {
      name: user.name || user.email.split('@')[0],
      ipAddress: ip,
      deviceId: String(deviceId),
      userAgent: String(userAgent),
      location,
      loginTime: new Date().toUTCString(),
      portal
    }).then(() => {
      console.log(`[AuthController] Sent login security alert to: ${user.email}`);
    }).catch((err: any) => {
      console.warn('[AuthController] Failed to send login security alert:', err.message);
    });
  } catch (err: any) {
    console.warn('[AuthController] Failed to trigger login alert email:', err.message);
  }
}

const MFA_CHALLENGE_COOKIE = 'invify_mfa_challenge';

function readMfaChallengeToken(req: Request): string {
  const bodyToken = req.body?.challengeToken || req.body?.setupToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) return bodyToken.trim();

  const cookieHeader = req.headers.cookie || '';
  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0) continue;
    const name = entry.slice(0, separator).trim();
    if (name === MFA_CHALLENGE_COOKIE) {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    }
  }
  return '';
}

function setMfaChallengeCookie(res: Response, token: string): void {
  const variant = require('../config/build-variant').BuildVariantService.getInstance();
  const protectedEnvironment =
    process.env.NODE_ENV === 'staging' ||
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'staging' ||
    process.env.APP_ENV === 'production' ||
    variant.isStaging() ||
    variant.isProd();
  res.cookie(MFA_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: protectedEnvironment,
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000,
    path: '/api/auth/mfa',
  });
}

function clearMfaChallengeCookie(res: Response): void {
  res.clearCookie(MFA_CHALLENGE_COOKIE, { path: '/api/auth/mfa' });
}

function mfaErrorResponse(res: Response, error: unknown): Response {
  if (error instanceof MfaChallengeError) {
    return res.status(error.status).json({ error: error.code, message: error.message });
  }
  console.error('[MFA] Error:', error instanceof Error ? error.message : error);
  return res.status(500).json({ error: 'MFA_OPERATION_FAILED', message: 'MFA operation failed' });
}

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates user against Supabase Auth and checks password reset requirements.
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password, portal, isolationTier } = req.body;
      const loginPortal = normalizeLoginPortal(portal, isolationTier);

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (!loginPortal) {
        return res.status(400).json({
          error: 'PORTAL_REQUIRED',
          message: 'Login portal is required. Use /admin/login or /tenant/login.',
          code: 'PORTAL_REQUIRED',
        });
      }

      // 0. Check Maintenance Mode Global Lockout
      let is_maintenance_locked = false;
      let maintenance_message = 'System is currently under maintenance. Please try again later.';
      
      try {
         const { data, error } = await supabase.from('system_configurations').select('config_key, config_value').in('config_key', ['is_maintenance_locked', 'maintenance_message']);
         if (!error && data && data.length > 0) {
            for (const row of data) {
               if (row.config_key === 'is_maintenance_locked') is_maintenance_locked = row.config_value === true || row.config_value === 'true';
               if (row.config_key === 'maintenance_message') maintenance_message = row.config_value;
            }
         }
      } catch(dbErr) {
         is_maintenance_locked = false;
      }

      if (is_maintenance_locked) {
        const emailLower = (email || '').toLowerCase();
        const isSuperAdmin = emailLower === 'sysadmin@iips.app' || emailLower === 'superadmin@iips.app' || emailLower.includes('admin') || emailLower.includes('iips');
        
        if (!isSuperAdmin) {
          return res.status(403).json({
            error: 'MAINTENANCE_LOCK',
            message: maintenance_message
          });
        }
      }
      const variantService = require('../config/build-variant').BuildVariantService.getInstance();

      // Offline Developer Bypass (local + staging when flag set)
      if (process.env.OFFLINE_LOCAL_AUTH === 'true' && offlineAuthAllowed(variantService)) {
        if (password === 'wrongpassword' || email.includes('notauser')) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`[AuthController] OFFLINE_LOCAL_AUTH is true. Bypassing Supabase for: ${email}`);
        const identity = resolveOfflineIdentity(email);
        const portalGate = assertPortalRoleAllowed(loginPortal, identity.role);
        if (!portalGate.ok) {
          return res.status(portalGate.status).json(portalGate.body);
        }
        const mockToken = buildOfflineToken(email, identity);
        
        const check = await validateDeviceOrBlock(identity.userId, email, req);
        if (!check.allowed) {
          return res.status(403).json(check.errorResponse);
        }

        return res.status(200).json({
          token: mockToken,
          refreshToken: 'mock_refresh_token',
          user: { id: identity.userId, email: email, role: identity.role, tenantId: identity.tenantId }
        });
      }

      // 1. Authenticate with Supabase Auth
      let authData: any = null;
      let authError: any = null;
      try {
        const result = await supabase.auth.signInWithPassword({
          email,
          password
        });
        authData = result.data;
        authError = result.error;
      } catch (networkErr: any) {
        authError = networkErr;
      }

      if (authError || !authData?.user || !authData?.session) {
        // Supabase unreachable — do not pretend this is a bad password.
        if (isAuthConnectivityFailure(authError)) {
          console.error(
            `[AuthController] Supabase Auth unreachable: ${authError?.message || authError}` +
              (authError?.cause ? ` cause=${authError.cause?.message || authError.cause}` : ''),
          );

          if (offlineAuthAllowed(variantService)) {
            console.warn(
              `[AuthController] Issuing offline login token for ${email} (Supabase connect timeout)`,
            );
            const identity = resolveOfflineIdentity(email);
            const portalGate = assertPortalRoleAllowed(loginPortal, identity.role);
            if (!portalGate.ok) {
              return res.status(portalGate.status).json(portalGate.body);
            }
            const mockToken = buildOfflineToken(email, identity);
            const check = await validateDeviceOrBlock(identity.userId, email, req);
            if (!check.allowed) {
              return res.status(403).json(check.errorResponse);
            }
            return res.status(200).json({
              token: mockToken,
              refreshToken: 'mock_refresh_token',
              user: {
                id: identity.userId,
                email,
                role: identity.role,
                tenantId: identity.tenantId,
              },
              offlineAuth: true,
              warning: 'Logged in offline — Supabase Auth is unreachable from this machine',
            });
          }

          return res.status(503).json({
            error: 'AUTH_SERVICE_UNAVAILABLE',
            message:
              'Cannot reach Supabase Auth (connect timeout). Check network/VPN/firewall to *.supabase.co:443. Offline auth is LOCAL-only (OFFLINE_LOCAL_AUTH=true + BUILD_VARIANT=LOCAL).',
            retryable: true,
          });
        }

        // Dynamic Developer Bypass for local environment sandbox presets (LOCAL only; no email→super_admin)
        const devAccounts = ['olive@invify.com'];
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (devAccounts.includes(normalizedEmail) && variantService.isLocal() && process.env.OFFLINE_LOCAL_AUTH === 'true') {
          console.log(`[AuthController] Dev sandbox credentials bypass activated for: ${normalizedEmail}`);
          const identity = resolveOfflineIdentity(normalizedEmail);
          const portalGate = assertPortalRoleAllowed(loginPortal, identity.role);
          if (!portalGate.ok) {
            return res.status(portalGate.status).json(portalGate.body);
          }
          const mockToken = buildOfflineToken(email, identity);
          
          const check = await validateDeviceOrBlock(identity.userId, email, req);
          if (!check.allowed) {
            return res.status(403).json(check.errorResponse);
          }

          return res.status(200).json({
            token: mockToken,
            refreshToken: 'mock_refresh_token',
            user: {
              id: identity.userId,
              email: email,
              role: identity.role,
              tenantId: identity.tenantId,
            }
          });
        }

        // Log failed login attempt
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        try {
          await GovAuditService.logAction({
            id: `auth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            module: 'AUTH',
            action: 'FAILED_LOGIN',
            user_email: email,
            user_name: 'Unknown',
            ip_address: String(ip),
            location: 'System',
            target: 'Authentication',
            status: 'failed',
            metadata: { reason: authError?.message || 'Invalid credentials' }
          });
        } catch (e) {
          console.error('Failed to log audit event', e);
        }

        return res.status(401).json({ error: authError?.message || 'Invalid credentials' });
      }

      // 2. Fetch public profile to check role and password reset status (using unpolluted supabaseAdmin to bypass RLS recursion)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('[AuthController] Profile Fetch Error:', profileError);
        return res.status(403).json({ error: 'User profile not found' });
      }

      // Roles come solely from persisted users.role — no email-based elevation

      const portalGate = assertPortalRoleAllowed(loginPortal, profile.role);
      if (!portalGate.ok) {
        // Valid password but wrong portal — do not issue a session
        try {
          await supabase.auth.signOut();
        } catch (_) {
          /* ignore */
        }
        return res.status(portalGate.status).json(portalGate.body);
      }

      // Check tenant plan restriction for Web Dashboard access
      if (profile.tenant_id && profile.tenant_id !== SYSTEM_TENANT_UUID) {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('plan')
          .eq('id', profile.tenant_id)
          .single();

        if (tenant) {
          const plan = (tenant.plan || '').toLowerCase();
          if (['basic', 'free', 'trial'].includes(plan)) {
            return res.status(403).json({
              error: 'UPGRADE_REQUIRED',
              message: 'You have to be a Pro user to login. Please upgrade to Pro user on your device to grant access to login.'
            });
          }
        }
      }

      // 3. Check password reset requirement flag
      if (profile.require_password_reset) {
        return res.status(200).json({
          requiresPasswordReset: true,
          userId: profile.id,
          email: profile.email,
          role: profile.role || 'tenant_admin'
        });
      }

      // 4. Return complete JWT Session (if MFA not required)
      const check = await validateDeviceOrBlock(profile.id, profile.email, req);
      if (!check.allowed) {
        return res.status(403).json(check.errorResponse);
      }

      const isPlatformRole = [
        'super_admin',
        'admin_finance',
        'admin_treasury',
        'admin_risk',
        'admin_ops',
        'admin_executive',
        'admin_deploy',
        'internal_staff'
      ].includes(profile.role);

      if (isPlatformRole) {
        const pendingSession = {
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
        };

        // Enforce setup if not enabled
        if (!profile.mfa_enabled) {
          let setupToken: string;
          try {
            setupToken = issueMfaChallenge(profile.id, 'setup', pendingSession).token;
          } catch (error) {
            return mfaErrorResponse(res, error);
          }
          setMfaChallengeCookie(res, setupToken);
          return res.status(200).json({
            requiresMfaSetup: true,
            setupToken,
            challengeToken: setupToken,
            userId: profile.id,
            role: profile.role
          });
        } else {
          // Enforce 2FA challenge if enabled
          let challengeToken: string;
          try {
            challengeToken = issueMfaChallenge(profile.id, 'verify', pendingSession).token;
          } catch (error) {
            return mfaErrorResponse(res, error);
          }
          setMfaChallengeCookie(res, challengeToken);
          return res.status(200).json({
            requires2FA: true,
            challengeToken,
            userId: profile.id,
            role: profile.role,
            message: 'MFA challenge required'
          });
        }
      }

      dispatchLoginSecurityAlert(req, {
        name: profile.name,
        email: profile.email,
        role: profile.role
      });

      return res.status(200).json({
        token: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.role || 'tenant_admin',
          tenantId: profile.tenant_id
        }
      });

    } catch (error: any) {
      console.error('[AuthController] Login Error:', error.message);
      
      const variantService = require('../config/build-variant').BuildVariantService.getInstance();
      if (isAuthConnectivityFailure(error) && offlineAuthAllowed(variantService)) {
        console.log('[AuthController] Network/Supabase connectivity timeout detected. Activating offline auth fallback...');
        const email = req.body.email;
        const identity = resolveOfflineIdentity(email);
        const portalGate = assertPortalRoleAllowed(
          normalizeLoginPortal(req.body.portal, req.body.isolationTier),
          identity.role,
        );
        if (!portalGate.ok) {
          return res.status(portalGate.status).json(portalGate.body);
        }
        const mockToken = buildOfflineToken(email, identity);
        
        const check = await validateDeviceOrBlock(identity.userId, email, req);
        if (!check.allowed) {
          return res.status(403).json(check.errorResponse);
        }

        dispatchLoginSecurityAlert(req, {
          email: email,
          role: identity.role
        });

        return res.status(200).json({
          token: mockToken,
          refreshToken: 'mock_refresh_token',
          user: {
            id: identity.userId,
            email: email,
            role: identity.role,
            tenantId: identity.tenantId,
          },
          offlineAuth: true,
          warning: 'Logged in offline — Supabase Auth is unreachable from this machine',
        });
      }

      if (isAuthConnectivityFailure(error)) {
        return res.status(503).json({
          error: 'AUTH_SERVICE_UNAVAILABLE',
          message:
            'Cannot reach Supabase Auth (connect timeout). Check network/VPN/firewall to *.supabase.co:443.',
          retryable: true,
        });
      }
      
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/auth/reset-password
   *
   * Supported payloads:
   * 1) { userId, newPassword } — authenticated / forced first-login reset
   * 2) { email, code|otp, newPassword } — OTP password recovery (PASSWORD_RESET)
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const {
        userId,
        email,
        newPassword,
        code,
        otp,
      } = req.body || {};

      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      let targetUserId: string | null = userId || null;

      // OTP recovery path: verify email OTP then resolve user by email
      if (!targetUserId && email) {
        const otpCode = String(code || otp || '').trim();
        const normalizedEmail = String(email).trim().toLowerCase();
        const { verificationService } = require('../services/verification.service');

        // Wizard already verified OTP → trust fresh VERIFIED row (do not re-require PENDING)
        const alreadyVerified =
          await verificationService.hasFreshPasswordResetVerification(normalizedEmail);

        if (!alreadyVerified) {
          if (!otpCode) {
            return res.status(400).json({
              error: 'Verify your recovery email OTP before setting a new password.',
            });
          }
          const result = await verificationService.verifyOTPDetailed(
            normalizedEmail,
            otpCode,
            'EMAIL',
            'PASSWORD_RESET',
          );
          if (!result.ok) {
            return res.status(400).json({
              error: result.error || 'Invalid or expired verification code.',
            });
          }
        }

        // Resolve auth user id by email
        const { data: profile, error: profileLookupError } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (profileLookupError) {
          console.warn('[AuthController] users lookup:', profileLookupError.message);
        }

        if (profile?.id) {
          targetUserId = profile.id;
        } else {
          // Fallback: list auth users (small tenants / local)
          try {
            const { data: listed, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });
            if (!listErr && listed?.users?.length) {
              const match = listed.users.find(
                (u: any) => String(u.email || '').toLowerCase() === normalizedEmail,
              );
              if (match?.id) targetUserId = match.id;
            }
          } catch (e: any) {
            console.warn('[AuthController] auth.admin.listUsers failed:', e?.message || e);
          }
        }

        if (!targetUserId) {
          return res.status(404).json({
            error: 'No account found for that email. Check the address and try again.',
          });
        }
      }

      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing userId or email for password reset.' });
      }

      // 1. Update password in Supabase Auth (service_role required for admin API)
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (authError) {
        const authMsg = String(authError.message || '').toLowerCase();
        const authCode = String((authError as any).code || '').toLowerCase();
        // Only treat real same-password rejections (not generic "User not allowed")
        if (
          authCode === 'same_password' ||
          authMsg.includes('same password') ||
          authMsg.includes('different from the old') ||
          authMsg.includes('should be different') ||
          authMsg.includes('password should be different')
        ) {
          return res.status(400).json({
            error:
              'New password cannot be the same as your previous password. Please choose a different passphrase.',
            code: 'SAME_AS_PREVIOUS_PASSWORD',
          });
        }

        console.error(
          `[AuthController] updateUserById failed for ${targetUserId}:`,
          authError.message,
          (authError as any).code || '',
        );

        return res.status(400).json({ error: authError.message });
      }

      // 2. Clear require_password_reset flag in public users table
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .update({ require_password_reset: false })
        .eq('id', targetUserId);

      if (profileError) {
        console.warn('[AuthController] require_password_reset clear failed:', profileError.message);
      }

      return res.status(200).json({
        message: 'Password reset completed successfully. You can now log in.',
      });
    } catch (error: any) {
      console.error('[AuthController] ResetPassword Error:', error.message);
      return res.status(500).json({ error: 'Password reset failed' });
    }
  }

  public static async sendWhatsappOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== 'string') {
        res.status(400).json({ error: 'Valid phone number is required.' });
        return;
      }

      const { otpService } = require('../services/otp.service');
      await otpService.generateOTP(phone);
      res.status(200).json({ message: 'OTP sent successfully via WhatsApp.' });
    } catch (error: any) {
      console.error('[AuthController] sendWhatsappOtp error:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  public static async verifyWhatsappOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        res.status(400).json({ error: 'Phone and OTP are required.' });
        return;
      }

      const { otpService } = require('../services/otp.service');
      const isValid = await otpService.verifyOTP(phone, otp);
      if (isValid) {
        try {
          const { dbQuery } = require('../db/pg');
          // Check if tenants table exists
          const tableCheck = await dbQuery(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'tenants'
            );`
          );

          if (tableCheck.rows[0]?.exists) {
            // Update phone_verified = true
            const safePhone = phone.replace(/\+/g, '');
            const reversed = safePhone.split('').reverse().join('');
            const expectedTenantId = `tenant-` + reversed;

            await dbQuery(
              `UPDATE tenants SET phone_verified = true WHERE id = $1 OR phone = $2`,
              [expectedTenantId, phone]
            );
          }
          
          res.status(200).json({ 
            message: 'OTP verified successfully.',
            data: { phone_verified: true }
          });
        } catch (dbErr) {
          console.error('Failed to update tenant status after OTP verification', dbErr);
          res.status(200).json({ 
            message: 'OTP verified successfully (Tenant sync failed).',
            data: { phone_verified: true }
          });
        }
      } else {
        res.status(400).json({ error: 'Invalid or expired OTP.' });
      }
    } catch (error: any) {
      console.error('[AuthController] verifyWhatsappOtp error:', error.message);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/auth/mfa/setup
   * Generates TOTP secret and QR code URL for setup.
   */
  static async mfaSetup(req: Request, res: Response) {
    try {
      const requestedUserId =
        typeof req.body?.userId === 'string' && req.body.userId.trim()
          ? req.body.userId.trim()
          : undefined;
      const setupChallenge = validateMfaChallenge(
        readMfaChallengeToken(req),
        'setup',
        requestedUserId,
      );

      // Claim before any database mutation. Concurrent/replayed setup requests fail closed.
      const pendingSession = consumeMfaChallenge(setupChallenge);
      const userId = setupChallenge.userId;

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Always rotate an incomplete enrollment secret; never disclose a stored secret.
      const secret = authenticator.generateSecret();
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ mfa_secret: secret, mfa_enabled: false })
        .eq('id', userId);
      if (updateErr) {
        console.error('[MfaSetup] Failed to store MFA secret:', updateErr.message);
        return res.status(500).json({ error: 'Failed to prepare MFA setup' });
      }

      const otpAuthUrl = authenticator.keyuri(profile.email, 'Invify Admin', secret);
      const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
      const verificationChallenge = issueMfaChallenge(userId, 'verify', pendingSession);
      setMfaChallengeCookie(res, verificationChallenge.token);

      // Raw secret is returned only in this password-authenticated, single-user enrollment flow.
      return res.status(200).json({
        secret,
        qrCodeUrl,
        challengeToken: verificationChallenge.token,
      });
    } catch (error) {
      return mfaErrorResponse(res, error);
    }
  }

  /**
   * POST /api/auth/mfa/verify
   * Verifies OTP code and activates MFA if setup. Returns the cached session.
   */
  static async mfaVerify(req: Request, res: Response) {
    try {
      const requestedUserId =
        typeof req.body?.userId === 'string' && req.body.userId.trim()
          ? req.body.userId.trim()
          : undefined;
      const tokenCode = req.body?.tokenCode || req.body?.code;
      if (!tokenCode) {
        return res.status(400).json({ error: 'MFA code is required' });
      }
      const verificationChallenge = validateMfaChallenge(
        readMfaChallengeToken(req),
        'verify',
        requestedUserId,
      );
      const userId = verificationChallenge.userId;

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      const secret = profile.mfa_secret;
      if (!secret) {
        return res.status(400).json({ error: 'MFA not initialized' });
      }

      const cleanToken = String(tokenCode).trim();
      if (!authenticator.verify({ token: cleanToken, secret })) {
        return res.status(400).json({ message: 'Invalid or expired 2FA code' });
      }

      if (!profile.mfa_enabled) {
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({ mfa_enabled: true })
          .eq('id', userId);
        if (updateErr) {
          console.error('[MfaVerify] Failed to update mfa_enabled:', updateErr.message);
          return res.status(500).json({ error: 'Failed to enable MFA' });
        }
      }

      // Consuming after successful TOTP verification enforces one-time session release.
      const session = consumeMfaChallenge(verificationChallenge);
      clearMfaChallengeCookie(res);

      dispatchLoginSecurityAlert(req, {
        name: profile.name,
        email: profile.email,
        role: profile.role
      });

      return res.status(200).json({
        token: session.token,
        refreshToken: session.refreshToken,
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.role || 'tenant_admin',
          tenantId: profile.tenant_id
        }
      });
    } catch (error) {
      return mfaErrorResponse(res, error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Thin facade over Supabase Auth refresh-token rotation. Does not mint custom JWTs.
   */
  static async refresh(req: Request, res: Response) {
    try {
      const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
      const currentAccess = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
      const boundUserId = peekTokenSubject(currentAccess);
      const session = await exchangeRefreshToken(req.body?.refreshToken, boundUserId);
      return res.status(200).json({
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
      });
    } catch (error) {
      if (error instanceof AuthSessionError) {
        return res.status(error.status).json({ error: error.code, message: error.message });
      }
      return res.status(401).json({
        error: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token is invalid or expired',
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Best-effort Supabase session revocation, then always succeeds so the client can clear storage.
   */
  static async logout(req: Request, res: Response) {
    clearMfaChallengeCookie(res);
    const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    try {
      await revokeProviderSession({
        refreshToken: req.body?.refreshToken,
        accessToken,
      });
    } catch {
      // Local logout remains authoritative even if the provider is unreachable.
    }
    return res.status(200).json({ ok: true });
  }
}
