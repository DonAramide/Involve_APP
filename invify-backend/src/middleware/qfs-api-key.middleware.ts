// src/middleware/qfs-api-key.middleware.ts
// Authenticates requests using sk_test_* Quasar Financial Sandbox API keys.
// Usage: router.use(qfsApiKeyAuth(['sandbox:read']))
// The key is hashed (SHA-256) and looked up in qfs_api_keys table.

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase';

export interface QfsKeyContext {
  keyId: string;
  tenantId: string;
  scopes: string[];
  environment: 'test' | 'live';
  label: string | null;
}

declare global {
  namespace Express {
    interface Request {
      qfsKey?: QfsKeyContext;
    }
  }
}

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Middleware factory. Pass required scopes e.g. ['sandbox:read'] or ['sandbox:write'].
 * Rejects sk_live_* keys — sandbox only.
 */
export function qfsApiKeyAuth(requiredScopes: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
    const { data: keyRecord, error } = await supabaseAdmin
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
      const grantedScopes: string[] = keyRecord.scopes || [];
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
    supabaseAdmin
      .from('qfs_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id)
      .then(() => {});

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
