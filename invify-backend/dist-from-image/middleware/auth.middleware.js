"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const supabase_1 = require("../db/supabase");
const constants_1 = require("../config/constants");
const build_variant_1 = require("../config/build-variant");
const supabase_jwt_1 = require("../utils/supabase-jwt");
/**
 * Middleware: Supabase JWT Verification
 *
 * Security model (Phase 2 / Phase 4):
 *  - Staging/Production: JWT MUST be cryptographically verified (HS via SUPABASE_JWT_SECRET,
 *    ES/RS via project JWKS). Missing secret → 503 fail-closed for HS path; missing URL → 503 for JWKS.
 *  - LOCAL/test only: mock bypasses gated by isMockTokenAllowed / isMockAuthAllowed.
 *  - Never auto-elevate to super_admin.
 *  - Never trust email hardcodes for role elevation.
 */
const PROFILE_TTL_MS = Number(process.env.AUTH_PROFILE_CACHE_TTL_MS || 5 * 60 * 1000);
const DB_TIMEOUT_MS = Number(process.env.AUTH_DB_TIMEOUT_MS || 8000);
const profileCacheById = new Map();
const profileCacheByEmail = new Map();
function cacheProfile(profile) {
    if (!profile?.id)
        return;
    const entry = { profile, expiresAt: Date.now() + PROFILE_TTL_MS };
    profileCacheById.set(String(profile.id), entry);
    if (profile.email) {
        profileCacheByEmail.set(String(profile.email).trim().toLowerCase(), entry);
    }
}
function getCachedProfile(userId, email) {
    const now = Date.now();
    if (userId) {
        const hit = profileCacheById.get(String(userId));
        if (hit && hit.expiresAt > now)
            return hit.profile;
    }
    if (email) {
        const hit = profileCacheByEmail.get(String(email).trim().toLowerCase());
        if (hit && hit.expiresAt > now)
            return hit.profile;
    }
    return null;
}
async function withTimeout(promise, ms, label) {
    let timer;
    try {
        return await Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
function isTimeoutError(err) {
    const msg = String(err?.message || err || '');
    return (msg.includes('timeout') ||
        msg.includes('fetch failed') ||
        msg.includes('Connection') ||
        msg.includes('network') ||
        err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err?.status === 408 ||
        err?.status === 504);
}
function deviceOwnerFromJwt(jwtPayload, userId, userEmail) {
    let decodedTenantId = jwtPayload?.tenantId ||
        jwtPayload?.tenant_id ||
        jwtPayload?.app_metadata?.tenantId ||
        jwtPayload?.user_metadata?.tenantId ||
        null;
    if (decodedTenantId === 'undefined' || decodedTenantId === 'null')
        decodedTenantId = null;
    const claimRole = String(jwtPayload?.role || 'owner').toLowerCase();
    if (!decodedTenantId || !['owner', 'tenant_admin', 'staff'].includes(claimRole)) {
        return null;
    }
    return {
        id: userId,
        email: userEmail,
        role: claimRole,
        tenantId: String(decodedTenantId),
    };
}
async function loadAgentForJwt(userId, userEmail) {
    try {
        const byAuth = await withTimeout(supabase_1.supabaseAdmin
            .from('agents')
            .select('id, email, auth_user_id, status')
            .eq('auth_user_id', userId)
            .is('deleted_at', null)
            .maybeSingle(), DB_TIMEOUT_MS, 'agents.byAuth');
        if (byAuth.data)
            return byAuth.data;
        if (userEmail) {
            const byEmail = await withTimeout(supabase_1.supabaseAdmin
                .from('agents')
                .select('id, email, auth_user_id, status')
                .ilike('email', userEmail.trim())
                .is('deleted_at', null)
                .maybeSingle(), DB_TIMEOUT_MS, 'agents.byEmail');
            if (byEmail.data)
                return byEmail.data;
        }
    }
    catch (err) {
        if (!isTimeoutError(err)) {
            console.warn('[AuthMiddleware] Agent profile lookup failed:', err?.message || err);
        }
    }
    return null;
}
function requiresVerifiedJwt() {
    if (process.env.NODE_ENV === 'production' ||
        process.env.APP_ENV === 'production' ||
        process.env.BUILD_PROFILE === 'production') {
        return true;
    }
    const variant = build_variant_1.BuildVariantService.getInstance();
    return variant.isStaging() || variant.isProd();
}
/** Least-privilege claims from JWT — never super_admin from absence of data. */
function claimsFromJwt(jwtPayload, userId, userEmail) {
    let role = jwtPayload.role === 'authenticated' || !jwtPayload.role
        ? jwtPayload.app_metadata?.role ||
            jwtPayload.user_metadata?.role ||
            'owner'
        : jwtPayload.role;
    // Strip accidental privilege escalation from unverified claim shapes
    if (String(role).toLowerCase() === 'super_admin' && !jwtPayload.app_metadata?.role && !jwtPayload.user_metadata?.role) {
        // Only trust super_admin if explicitly set in app/user metadata from a verified token;
        // still prefer DB profile. For claim fallback use least privilege.
        role = 'owner';
    }
    let tenantId = jwtPayload.tenantId ||
        jwtPayload.tenant_id ||
        jwtPayload.app_metadata?.tenantId ||
        jwtPayload.app_metadata?.tenant_id ||
        jwtPayload.user_metadata?.tenantId ||
        jwtPayload.user_metadata?.tenant_id ||
        null;
    if (tenantId === 'undefined' || tenantId === 'null')
        tenantId = null;
    return {
        id: userId,
        email: userEmail,
        role: String(role || 'owner').toLowerCase() === 'super_admin' ? 'owner' : String(role || 'owner'),
        tenant_id: tenantId,
        is_active: true,
        name: jwtPayload.user_metadata?.full_name || 'User',
    };
}
async function verifyBearerToken(token) {
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const localJwtSecret = process.env.JWT_SECRET;
    if (requiresVerifiedJwt()) {
        // Staging/prod: asymmetric (ES256) via JWKS, or HS256 via legacy JWT secret.
        const alg = (0, supabase_jwt_1.peekAlg)(token);
        const isAsymmetric = alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS');
        if (isAsymmetric) {
            const base = (0, supabase_jwt_1.supabaseProjectUrl)();
            if (!base) {
                const err = new Error('Authentication misconfigured: SUPABASE_URL required for asymmetric JWT');
                err.status = 503;
                err.code = 'JWT_JWKS_URL_MISSING';
                throw err;
            }
            return (0, supabase_jwt_1.verifySupabaseAccessToken)(token);
        }
        else {
            if ((!supabaseJwtSecret || supabaseJwtSecret.length < 16) &&
                (!localJwtSecret || localJwtSecret.length < 16)) {
                const err = new Error('Authentication misconfigured: JWT verification secret not configured');
                err.status = 503;
                err.code = 'JWT_SECRET_MISSING';
                throw err;
            }
            try {
                return await (0, supabase_jwt_1.verifySupabaseAccessToken)(token);
            }
            catch (primary) {
                if (primary?.code === 'JWT_SECRET_MISSING' || primary?.code === 'JWT_JWKS_URL_MISSING') {
                    if (!localJwtSecret || localJwtSecret.length < 16)
                        throw primary;
                }
                const secrets = [localJwtSecret, supabaseJwtSecret].filter((s) => typeof s === 'string' && s.length >= 16);
                if (secrets.length === 0)
                    throw primary;
                try {
                    return (0, supabase_jwt_1.verifyWithSharedSecrets)(token, secrets);
                }
                catch {
                    throw primary;
                }
            }
        }
    }
    // LOCAL / test: try Supabase verifier first (HS + JWKS), then JWT_SECRET for offline tokens
    try {
        return await (0, supabase_jwt_1.verifySupabaseAccessToken)(token);
    }
    catch (primary) {
        if (primary?.code === 'JWT_SECRET_MISSING' || primary?.code === 'JWT_JWKS_URL_MISSING') {
            // fall through to local secret
        }
        else if (!localJwtSecret) {
            throw primary;
        }
    }
    if (localJwtSecret && localJwtSecret.length >= 16) {
        try {
            return (0, supabase_jwt_1.verifyWithSharedSecrets)(token, [localJwtSecret]);
        }
        catch {
            const err = new Error('Invalid or expired token');
            err.status = 401;
            throw err;
        }
    }
    // LOCAL without secrets: still refuse decode-only (fail closed for forged tokens)
    const err = new Error('JWT verification secret not configured');
    err.status = 503;
    err.code = 'JWT_SECRET_MISSING';
    throw err;
}
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if ((0, constants_1.isMockTokenAllowed)()) {
            if (authHeader && authHeader.startsWith('Bearer mock-agent-token-')) {
                const agentId = authHeader.replace('Bearer mock-agent-token-', '');
                console.warn('[AuthMiddleware] Developer mock-agent-token auth bypass triggered.');
                req.user = {
                    id: agentId,
                    role: 'AGENT',
                    email: 'agent@invify.app',
                    tenantId: null,
                };
                return next();
            }
            if (authHeader && (authHeader.startsWith('Bearer mock-super-admin') || authHeader === 'Bearer mock-admin-token')) {
                console.warn('[AuthMiddleware] Developer mock-super-admin auth bypass triggered.');
                req.user = {
                    id: constants_1.SYSTEM_USER_UUID,
                    email: 'superadmin@invify.app',
                    role: 'super_admin',
                    tenantId: null,
                };
                return next();
            }
        }
        // Offline blanket bypass ONLY when OFFLINE_LOCAL_AUTH=true AND local/test guards pass.
        // NODE_ENV=test alone must NOT accept arbitrary Bearer tokens.
        if ((0, constants_1.isMockAuthAllowed)() &&
            process.env.OFFLINE_LOCAL_AUTH === 'true' &&
            authHeader &&
            authHeader.startsWith('Bearer ') &&
            authHeader !== 'Bearer invalid.jwt.token') {
            console.warn('[AuthMiddleware] Developer offline auth bypass triggered.');
            req.user = {
                id: constants_1.SYSTEM_USER_UUID,
                email: 'superadmin@invify.app',
                role: 'super_admin',
                tenantId: null,
            };
            return next();
        }
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or malformed Authorization header' });
        }
        const token = authHeader.split(' ')[1];
        // Reject known unsigned / mock markers outside LOCAL mock gates
        if (token === 'mock-super-admin' || token.includes('local_dev_signature')) {
            if (!(0, constants_1.isMockTokenAllowed)() && !(0, constants_1.isMockAuthAllowed)()) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
        }
        try {
            let jwtPayload;
            try {
                jwtPayload = await verifyBearerToken(token);
            }
            catch (verifyErr) {
                const status = verifyErr.status || 401;
                return res.status(status).json({
                    error: verifyErr.message || 'Invalid or expired token',
                    code: verifyErr.code,
                });
            }
            const userId = jwtPayload.sub || jwtPayload.id;
            const userEmail = jwtPayload.email || jwtPayload.user_metadata?.email || '';
            if (!userId) {
                return res.status(401).json({ error: 'Token missing subject claim' });
            }
            const cached = getCachedProfile(userId, userEmail);
            if (cached) {
                if (!cached.is_active) {
                    return res.status(403).json({ error: 'Your account has been disabled' });
                }
                req.user = {
                    id: cached.id,
                    email: cached.email,
                    role: cached.role,
                    tenantId: cached.tenant_id,
                };
                return next();
            }
            let profile = null;
            let profileError = null;
            let dbTimedOut = false;
            try {
                const byId = await withTimeout(supabase_1.supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle(), DB_TIMEOUT_MS, 'users.byId');
                profile = byId.data;
                profileError = byId.error;
                if (!profile && userEmail) {
                    const byEmail = await withTimeout(supabase_1.supabaseAdmin.from('users').select('*').ilike('email', userEmail.trim()).maybeSingle(), DB_TIMEOUT_MS, 'users.byEmail');
                    if (byEmail.data) {
                        profile = byEmail.data;
                        profileError = null;
                        console.warn(`[AuthMiddleware] Resolved profile by email for JWT sub=${userId} → users.id=${profile.id} tenant=${profile.tenant_id}`);
                    }
                    else if (byEmail.error) {
                        profileError = byEmail.error;
                    }
                }
            }
            catch (err) {
                if (isTimeoutError(err)) {
                    dbTimedOut = true;
                    console.error(`[AuthMiddleware] Supabase users database query timed out (${DB_TIMEOUT_MS}ms).`);
                }
                else {
                    throw err;
                }
            }
            // On DB timeout: least-privilege claim fallback ONLY in LOCAL; staging/prod fail closed
            if (dbTimedOut && !profile) {
                if (requiresVerifiedJwt()) {
                    return res.status(503).json({
                        error: 'Authentication service temporarily unavailable. Please retry.',
                    });
                }
                const fallback = claimsFromJwt(jwtPayload, userId, userEmail);
                console.warn(`[AuthMiddleware] LOCAL JWT-claim fallback user=${fallback.id} role=${fallback.role} tenant=${fallback.tenant_id || 'n/a'}`);
                req.user = {
                    id: fallback.id,
                    email: fallback.email,
                    role: fallback.role,
                    tenantId: fallback.tenant_id,
                };
                return next();
            }
            if (profileError && !profile) {
                if (isTimeoutError(profileError)) {
                    if (requiresVerifiedJwt()) {
                        return res.status(503).json({
                            error: 'Authentication service temporarily unavailable. Please retry.',
                        });
                    }
                    const fallback = claimsFromJwt(jwtPayload, userId, userEmail);
                    req.user = {
                        id: fallback.id,
                        email: fallback.email,
                        role: fallback.role,
                        tenantId: fallback.tenant_id,
                    };
                    return next();
                }
                if (profileError.code !== 'PGRST116' && !profileError.message?.includes('No rows found')) {
                    console.error('[AuthMiddleware] Supabase users query failed:', profileError);
                    const deviceOwner = deviceOwnerFromJwt(jwtPayload, userId, userEmail);
                    if (deviceOwner) {
                        req.user = deviceOwner;
                        return next();
                    }
                    return res.status(403).json({ error: 'User profile not found in Invify' });
                }
            }
            // Missing profile: NEVER auto-create as super_admin. Reject or create least-privilege owner.
            if (!profile) {
                const agentRow = await loadAgentForJwt(userId, userEmail);
                const agentStatus = String(agentRow?.status || '').toUpperCase();
                if (agentRow && agentStatus !== 'TERMINATED' && agentStatus !== 'SUSPENDED') {
                    req.user = {
                        id: String(agentRow.auth_user_id || userId),
                        email: String(agentRow.email || userEmail || ''),
                        role: 'agent',
                        tenantId: null,
                        agentId: String(agentRow.id),
                    };
                    return next();
                }
                const leastRole = 'owner';
                let decodedTenantId = jwtPayload.tenantId ||
                    jwtPayload.tenant_id ||
                    jwtPayload.app_metadata?.tenantId ||
                    jwtPayload.user_metadata?.tenantId ||
                    null;
                if (decodedTenantId === 'undefined' || decodedTenantId === 'null')
                    decodedTenantId = null;
                // Staging/prod: onboarded device JWTs carry tenantId+owner and may have
                // no users row (token `id` is not a Supabase auth uid). Accept the
                // verified claims the same way Socket.io does — do not auto-insert.
                if (requiresVerifiedJwt()) {
                    const deviceOwner = deviceOwnerFromJwt(jwtPayload, userId, userEmail);
                    if (deviceOwner) {
                        req.user = deviceOwner;
                        return next();
                    }
                    return res.status(403).json({
                        error: 'User profile not provisioned in Invify. Contact an administrator.',
                        code: 'PROFILE_NOT_PROVISIONED',
                    });
                }
                try {
                    const { data: newProfile, error: insertError } = await withTimeout(supabase_1.supabaseAdmin
                        .from('users')
                        .insert({
                        id: userId,
                        email: userEmail,
                        role: leastRole,
                        tenant_id: decodedTenantId,
                        is_active: true,
                        name: jwtPayload.user_metadata?.full_name || 'User',
                    })
                        .select()
                        .single(), DB_TIMEOUT_MS, 'users.insert');
                    if (insertError) {
                        console.warn(`[AuthMiddleware] Could not auto-create user profile (least privilege). Rejecting.`);
                        return res.status(403).json({ error: 'User profile not found in Invify' });
                    }
                    profile = newProfile;
                }
                catch (insertErr) {
                    console.warn(`[AuthMiddleware] Auto-create timed out/failed: ${insertErr.message}`);
                    return res.status(503).json({
                        error: 'Authentication service temporarily unavailable. Please retry.',
                    });
                }
            }
            if (!profile.is_active) {
                return res.status(403).json({ error: 'Your account has been disabled' });
            }
            cacheProfile({
                id: profile.id,
                email: profile.email,
                role: profile.role,
                tenant_id: profile.tenant_id,
                is_active: profile.is_active !== false,
                name: profile.name,
            });
            req.user = {
                id: profile.id,
                email: profile.email,
                role: profile.role,
                tenantId: profile.tenant_id,
            };
            next();
        }
        catch (netError) {
            if (isTimeoutError(netError)) {
                console.error('[AuthMiddleware] Database connection timed out during auth.');
                return res.status(503).json({
                    error: 'Authentication service temporarily unavailable. Please retry.',
                });
            }
            throw netError;
        }
    }
    catch (error) {
        console.error('[AuthMiddleware] Error:', error.message);
        return res.status(500).json({ error: 'Authentication processing failed' });
    }
};
exports.authenticate = authenticate;
const optionalAuthenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }
    try {
        let responded = false;
        const proxyRes = {
            status: (code) => {
                responded = true;
                return {
                    json: () => {
                        req.user = null;
                        return next();
                    }
                };
            },
            json: () => {
                responded = true;
                req.user = null;
                return next();
            }
        };
        await (0, exports.authenticate)(req, proxyRes, (err) => {
            if (responded)
                return;
            if (err) {
                req.user = null;
            }
            return next();
        });
    }
    catch {
        req.user = null;
        return next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=auth.middleware.js.map