/**
 * Verifies Supabase access tokens:
 *  - HS family → SUPABASE_JWT_SECRET (legacy JWT secret)
 *  - ES / RS / PS family → project JWKS (asymmetric signing keys)
 *
 * Does not log tokens or secrets.
 */
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, JWTPayload } from 'jose';

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let remoteJwksUrl: string | null = null;

export function supabaseProjectUrl(): string {
  const url =
    process.env.SUPABASE_URL ||
    process.env.STAGING_SUPABASE_URL ||
    process.env.PROD_SUPABASE_URL ||
    process.env.PRODUCTION_SUPABASE_URL ||
    '';
  return String(url).replace(/\/$/, '');
}

function getRemoteJwks() {
  const base = supabaseProjectUrl();
  if (!base) {
    const err: any = new Error('Authentication misconfigured: SUPABASE_URL required for asymmetric JWT');
    err.status = 503;
    err.code = 'JWT_JWKS_URL_MISSING';
    throw err;
  }
  const jwksUrl = `${base}/auth/v1/.well-known/jwks.json`;
  if (!remoteJwks || remoteJwksUrl !== jwksUrl) {
    remoteJwks = createRemoteJWKSet(new URL(jwksUrl));
    remoteJwksUrl = jwksUrl;
  }
  return remoteJwks;
}

export function peekAlg(token: string): string {
  try {
    const header = decodeProtectedHeader(token);
    return String(header.alg || '');
  } catch {
    return '';
  }
}

function verifyHs(token: string, secret: string): jwt.JwtPayload | string {
  return jwt.verify(token, secret);
}

/**
 * Cryptographically verify a Supabase (or compatible) bearer JWT.
 * Returns the decoded payload (claims).
 */
export async function verifySupabaseAccessToken(token: string): Promise<JWTPayload | jwt.JwtPayload> {
  const alg = peekAlg(token);
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  // Asymmetric (current Supabase signing keys): ES256 / RS256 / etc.
  if (alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS')) {
    try {
      const { payload } = await jwtVerify(token, getRemoteJwks());
      return payload;
    } catch {
      const err: any = new Error('Invalid or expired token');
      err.status = 401;
      throw err;
    }
  }

  // Symmetric / legacy HS256 (Legacy JWT Secret)
  if (!supabaseJwtSecret || supabaseJwtSecret.length < 16) {
    const err: any = new Error('Authentication misconfigured: SUPABASE_JWT_SECRET required');
    err.status = 503;
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }

  try {
    return verifyHs(token, supabaseJwtSecret) as jwt.JwtPayload;
  } catch {
    const err: any = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }
}

/** Sync HS-only verify for LOCAL fallback paths that also try JWT_SECRET. */
export function verifyWithSharedSecrets(token: string, secrets: string[]): jwt.JwtPayload {
  const alg = peekAlg(token);
  if (alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS')) {
    const err: any = new Error('Asymmetric JWT requires async JWKS verification');
    err.status = 401;
    err.code = 'JWT_ASYNC_REQUIRED';
    throw err;
  }
  let last: any;
  for (const secret of secrets) {
    try {
      return verifyHs(token, secret) as jwt.JwtPayload;
    } catch (e) {
      last = e;
    }
  }
  const err: any = new Error('Invalid or expired token');
  err.status = 401;
  err.cause = last;
  throw err;
}
