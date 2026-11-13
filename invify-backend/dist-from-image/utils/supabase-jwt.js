"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseProjectUrl = supabaseProjectUrl;
exports.peekAlg = peekAlg;
exports.verifySupabaseAccessToken = verifySupabaseAccessToken;
exports.verifyWithSharedSecrets = verifyWithSharedSecrets;
/**
 * Verifies Supabase access tokens:
 *  - HS family → SUPABASE_JWT_SECRET (legacy JWT secret)
 *  - ES / RS / PS family → project JWKS (asymmetric signing keys)
 *
 * Does not log tokens or secrets.
 */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jose_1 = require("jose");
let remoteJwks = null;
let remoteJwksUrl = null;
function supabaseProjectUrl() {
    const url = process.env.SUPABASE_URL ||
        process.env.STAGING_SUPABASE_URL ||
        process.env.PROD_SUPABASE_URL ||
        process.env.PRODUCTION_SUPABASE_URL ||
        '';
    return String(url).replace(/\/$/, '');
}
function getRemoteJwks() {
    const base = supabaseProjectUrl();
    if (!base) {
        const err = new Error('Authentication misconfigured: SUPABASE_URL required for asymmetric JWT');
        err.status = 503;
        err.code = 'JWT_JWKS_URL_MISSING';
        throw err;
    }
    const jwksUrl = `${base}/auth/v1/.well-known/jwks.json`;
    if (!remoteJwks || remoteJwksUrl !== jwksUrl) {
        remoteJwks = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl));
        remoteJwksUrl = jwksUrl;
    }
    return remoteJwks;
}
function peekAlg(token) {
    try {
        const header = (0, jose_1.decodeProtectedHeader)(token);
        return String(header.alg || '');
    }
    catch {
        return '';
    }
}
/**
 * Tablet device tokens (HS256 with a `deviceId` claim) must never expire.
 * Older ones were issued with a 30-day `exp`, so expiry is ignored for them;
 * the signature is still verified.
 */
function verifyHs(token, secret) {
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (e) {
        if (e?.name !== 'TokenExpiredError')
            throw e;
        const payload = jsonwebtoken_1.default.verify(token, secret, { ignoreExpiration: true });
        if (payload && typeof payload === 'object' && payload.deviceId) {
            return payload;
        }
        throw e;
    }
}
/**
 * Cryptographically verify a Supabase (or compatible) bearer JWT.
 * Returns the decoded payload (claims).
 */
async function verifySupabaseAccessToken(token) {
    const alg = peekAlg(token);
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    // Asymmetric (current Supabase signing keys): ES256 / RS256 / etc.
    if (alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS')) {
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, getRemoteJwks());
            return payload;
        }
        catch {
            const err = new Error('Invalid or expired token');
            err.status = 401;
            throw err;
        }
    }
    // Symmetric / legacy HS256 (Legacy JWT Secret)
    if (!supabaseJwtSecret || supabaseJwtSecret.length < 16) {
        const err = new Error('Authentication misconfigured: SUPABASE_JWT_SECRET required');
        err.status = 503;
        err.code = 'JWT_SECRET_MISSING';
        throw err;
    }
    try {
        return verifyHs(token, supabaseJwtSecret);
    }
    catch {
        const err = new Error('Invalid or expired token');
        err.status = 401;
        throw err;
    }
}
/** Sync HS-only verify for LOCAL fallback paths that also try JWT_SECRET. */
function verifyWithSharedSecrets(token, secrets) {
    const alg = peekAlg(token);
    if (alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS')) {
        const err = new Error('Asymmetric JWT requires async JWKS verification');
        err.status = 401;
        err.code = 'JWT_ASYNC_REQUIRED';
        throw err;
    }
    let last;
    for (const secret of secrets) {
        try {
            return verifyHs(token, secret);
        }
        catch (e) {
            last = e;
        }
    }
    const err = new Error('Invalid or expired token');
    err.status = 401;
    err.cause = last;
    throw err;
}
//# sourceMappingURL=supabase-jwt.js.map