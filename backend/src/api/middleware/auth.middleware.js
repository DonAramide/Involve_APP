// backend/src/api/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'invify-fintech-fallback-secret-2026';
const MASTER_MODE_SECRET = process.env.MASTER_MODE_SECRET || 'invify-master-elevation-key';

class AuthMiddleware {
    /**
     * Standard JWT Authentication
     */
    static authenticate(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ message: 'Unauthorized: Missing token' });

        try {
            // Decode with Standard Secret
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = payload;
            next();
        } catch (err) {
            // Fallback: Check if it's a valid Master Mode token
            try {
                const masterPayload = jwt.verify(token, MASTER_MODE_SECRET);
                req.user = masterPayload;
                next();
            } catch (masterErr) {
                return res.status(403).json({ message: 'Forbidden: Invalid token' });
            }
        }
    }

    /**
     * RBAC: Restrict to specific roles
     */
    static authorize(roles = []) {
        return (req, res, next) => {
            if (!req.user || !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            }
            next();
        };
    }

    /**
     * Strictly enforce Master Mode session
     */
    static requireMasterMode(req, res, next) {
        if (!req.user || !req.user.isMasterMode) {
            return res.status(403).json({ 
                message: 'Forbidden: Master Mode session required for this operation',
                code: 'MASTER_MODE_REQUIRED'
            });
        }
        next();
    }
}

module.exports = AuthMiddleware;
