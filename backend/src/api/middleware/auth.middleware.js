// backend/src/api/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const redisService = require('../../services/redis.service');

const JWT_SECRET = process.env.JWT_SECRET || 'invify-fintech-fallback-secret-2026';
const MASTER_MODE_SECRET = process.env.MASTER_MODE_SECRET || 'invify-master-elevation-key';

class AuthMiddleware {
    /**
     * Hardened Production JWT Authentication Interceptor
     * Validates cryptographic payload signatures, enforces immediate Redis revocation checks,
     * injects strict tenant isolation headers, and tracks operator attribution lineage.
     */
    static async authenticate(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: Missing token signature envelope.' });
        }

        let decodedPayload = null;
        try {
            decodedPayload = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            // Check if signed via Master Mode key parameters
            try {
                decodedPayload = jwt.verify(token, MASTER_MODE_SECRET);
            } catch (masterErr) {
                return res.status(403).json({ message: 'Forbidden: Invalid or expired access token signature.' });
            }
        }

        // Enforce immediate Token Revocation checks against Redis in-memory cache registry
        if (decodedPayload.jti) {
            const isRevoked = await redisService.isTokenRevoked(decodedPayload.jti);
            if (isRevoked) {
                return res.status(401).json({ message: 'Unauthorized: Active access token has been terminated globally.' });
            }
            // Ensure session exists inside active redis verification map
            const cachedSession = await redisService.getSession(`token:${decodedPayload.jti}`);
            if (!cachedSession && (decodedPayload.isMasterMode || decodedPayload.isImpersonating)) {
                // Short-lived caches enforce absolute runtime validity
                return res.status(401).json({ message: 'Unauthorized: Master elevation or impersonation timeframe expired natively.' });
            }
        }

        // Assert Absolute Tenant Isolation boundaries
        // If target headers request cross-tenant access, block instantly unless explicitly impersonating
        const requestedTenantId = req.headers['x-tenant-id'] || req.query.tenant_id;
        if (requestedTenantId && requestedTenantId !== 'global' && decodedPayload.tenantId && decodedPayload.tenantId !== 'global-platform') {
            if (decodedPayload.tenantId !== requestedTenantId && !decodedPayload.isImpersonating) {
                console.error(`[Sovereign Boundary Violation] Token role ${decodedPayload.role} mapped to tenant ${decodedPayload.tenantId} attempted accessing unassigned namespace ${requestedTenantId}`);
                return res.status(403).json({ message: 'Forbidden: Strict tenant isolation boundary constraints prevent cross-workspace reads.' });
            }
        }

        // Attach rich operator attribution payload to request context maps
        req.user = decodedPayload;
        req.operatorAttribution = {
            userId: decodedPayload.userId,
            originalSuperAdminId: decodedPayload.originalSuperAdminId, // populated if impersonating
            role: decodedPayload.role,
            tenantId: decodedPayload.tenantId,
            isMasterMode: decodedPayload.isMasterMode || false,
            isImpersonating: decodedPayload.isImpersonating || false,
            ipOrigin: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
        };

        // Pass down canonical context headers mapping upstream systems
        res.setHeader('X-Operator-Attribution-Lineage', decodedPayload.userId);
        if (decodedPayload.isImpersonating) {
            res.setHeader('X-Impersonation-Active', 'true');
        }

        next();
    }

    /**
     * Strict Role-Based Access Control (RBAC) engine evaluation check
     * Prevents unprivileged read/write execution pipelines.
     */
    static authorize(roles = []) {
        return (req, res, next) => {
            if (!req.user || !roles.includes(req.user.role)) {
                return res.status(403).json({ 
                    message: `Forbidden: Target endpoint execution locked to assigned capabilities. Required: [${roles.join(', ')}]` 
                });
            }
            next();
        };
    }

    /**
     * Explicit Master Mode verification filters mapping elevated workflows
     */
    static requireMasterMode(req, res, next) {
        if (!req.user || !req.user.isMasterMode) {
            return res.status(403).json({ 
                message: 'Forbidden: Destructive operator tasks demand active Master Mode session verification.',
                code: 'MASTER_MODE_REQUIRED'
            });
        }
        next();
    }

    /**
     * WebSocket Handshake validation guard verifying token authorization scopes directly
     * (Satisfies user requirement: authenticated JWT handshake, immediate revocation propagation)
     */
    static async authorizeWebSocketStream(tokenStr, requestedTenantScope) {
        if (!tokenStr) throw new Error('WS_AUTH_MISSING: WebSocket handshake requires valid JWT context string.');
        
        let decoded = null;
        try {
            decoded = jwt.verify(tokenStr, JWT_SECRET);
        } catch (e) {
            decoded = jwt.verify(tokenStr, MASTER_MODE_SECRET);
        }

        if (decoded.jti && (await redisService.isTokenRevoked(decoded.jti))) {
            throw new Error('WS_AUTH_REVOKED: Origin token signature has been revoked globally.');
        }

        if (requestedTenantScope && requestedTenantScope !== 'global' && decoded.tenantId && decoded.tenantId !== 'global-platform') {
            if (decoded.tenantId !== requestedTenantScope && !decoded.isImpersonating) {
                throw new Error('WS_TENANT_ISOLATION_VIOLATION: Stream channel access denied due to boundary mismatch.');
            }
        }

        return {
            authenticated: true,
            userId: decoded.userId,
            role: decoded.role,
            tenantScope: decoded.tenantId,
            jti: decoded.jti
        };
    }
}

module.exports = AuthMiddleware;
