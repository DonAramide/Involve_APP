/**
 * Verifies Supabase access tokens:
 *  - HS family → SUPABASE_JWT_SECRET (legacy JWT secret)
 *  - ES / RS / PS family → project JWKS (asymmetric signing keys)
 *
 * Does not log tokens or secrets.
 */
import jwt from 'jsonwebtoken';
import { JWTPayload } from 'jose';
export declare function supabaseProjectUrl(): string;
export declare function peekAlg(token: string): string;
/**
 * Cryptographically verify a Supabase (or compatible) bearer JWT.
 * Returns the decoded payload (claims).
 */
export declare function verifySupabaseAccessToken(token: string): Promise<JWTPayload | jwt.JwtPayload>;
/** Sync HS-only verify for LOCAL fallback paths that also try JWT_SECRET. */
export declare function verifyWithSharedSecrets(token: string, secrets: string[]): jwt.JwtPayload;
