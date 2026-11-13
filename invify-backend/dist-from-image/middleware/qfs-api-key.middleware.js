"use strict";
// src/middleware/qfs-api-key.middleware.ts
// Authenticates requests using sk_test_* Quasar Financial Sandbox API keys.
// Usage: router.use(qfsApiKeyAuth(['sandbox:read']))
// The key is hashed (SHA-256) and looked up in qfs_api_keys table.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qfsApiKeyAuth = qfsApiKeyAuth;
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../db/supabase");
function hashKey(raw) {
    return crypto_1.default.createHash('sha256').update(raw).digest('hex');
}
/**
 * Middleware factory. Pass required scopes e.g. ['sandbox:read'] or ['sandbox:write'].
 * Rejects sk_live_* keys — sandbox only.
 */
function qfsApiKeyAuth(requiredScopes = []) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer sk_')) {
            return res.status(401).json({
                error: 'Missing or invalid API key. Use: Authorization: Bearer sk_test_...'
            });
        }
        const rawKey = authHeader.replace('Bearer ', '').trim();
        // Reject live keys on sandbox endpoints
        if (rawKey.startsWith('sk_live_')) {
            return res.status(403).json({
                error: 'Live keys are rejected on sandbox endpoints. Use sk_test_* keys.'
            });
        }
        if (!rawKey.startsWith('sk_test_')) {
            return res.status(401).json({ error: 'Invalid key format. Expected sk_test_...' });
        }
        const keyHash = hashKey(rawKey);
        // Lookup key by hash
        const { data: keyRecord, error } = await supabase_1.supabaseAdmin
            .from('qfs_api_keys')
            .select('id, tenant_id, scopes, environment, label, is_active, expires_at')
            .eq('key_hash', keyHash)
            .eq('environment', 'test')
            .single();
        if (error || !keyRecord) {
            return res.status(401).json({ error: 'Invalid or unrecognized API key' });
        }
        if (!keyRecord.is_active) {
            return res.status(403).json({ error: 'API key has been revoked' });
        }
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
            return res.status(403).json({ error: 'API key has expired' });
        }
        // Scope check
        if (requiredScopes.length > 0) {
            const grantedScopes = keyRecord.scopes || [];
            const missing = requiredScopes.filter(s => !grantedScopes.includes(s));
            if (missing.length > 0) {
                return res.status(403).json({
                    error: `Insufficient scopes. Required: ${requiredScopes.join(', ')}`,
                    granted: grantedScopes,
                    missing
                });
            }
        }
        // Update last_used_at in background (don't await)
        supabase_1.supabaseAdmin
            .from('qfs_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyRecord.id)
            .then(() => { });
        req.qfsKey = {
            keyId: keyRecord.id,
            tenantId: keyRecord.tenant_id,
            scopes: keyRecord.scopes,
            environment: keyRecord.environment,
            label: keyRecord.label
        };
        next();
    };
}
//# sourceMappingURL=qfs-api-key.middleware.js.map