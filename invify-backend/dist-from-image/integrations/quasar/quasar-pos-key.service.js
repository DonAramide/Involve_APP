"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarPosKeyService = void 0;
exports.testQuasarAdminLogin = testQuasarAdminLogin;
/**
 * Rotate Quasar tenant POS ICC encryption key and persist on Invify.
 * Quasar: POST /admin/tenants/{quasarTenantId}/pos-encryption-key/rotate (admin JWT)
 */
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const quasar_base_url_1 = require("./quasar-base-url");
const quasar_integration_store_1 = require("./quasar-integration.store");
const integration_vault_service_1 = require("../../services/integration-vault.service");
const supabase_1 = require("../../db/supabase");
function fingerprintKey(b64) {
    const cleaned = String(b64 || '').trim();
    if (cleaned.length < 12)
        return '****';
    return `${cleaned.slice(0, 6)}…${cleaned.slice(-4)} (len=${cleaned.length})`;
}
function quasarAdminOrigin() {
    // Admin routes live under same /api/v1 as tenant API in local Quasar
    return (0, quasar_base_url_1.resolveQuasarBaseUrl)();
}
async function resolveAdminJwt(explicit) {
    const fromBody = String(explicit || '').trim();
    if (fromBody) {
        // Reject / skip obvious Invify JWTs and fall through to vault username/password
        let looksLikeInvify = false;
        try {
            const payloadPart = fromBody.split('.')[1];
            if (payloadPart) {
                const json = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
                if (json?.tenantId || json?.role === 'owner' || json?.role === 'admin') {
                    looksLikeInvify = true;
                    console.warn('[QuasarPosKey] Ignoring Invify JWT in adminJwt field — using vault/env Quasar admin login instead');
                }
            }
        }
        catch {
            /* treat as opaque Quasar token */
        }
        if (!looksLikeInvify)
            return fromBody;
    }
    const fromEnvJwt = process.env.QUASAR_ADMIN_JWT?.trim();
    if (fromEnvJwt)
        return fromEnvJwt;
    return loginQuasarAdminAndGetToken();
}
async function loginQuasarAdminAndGetToken(override) {
    let username = String(override?.username || '').trim();
    let password = String(override?.password || '');
    if (!username || !password) {
        try {
            const { IntegrationVaultService } = require('../../services/integration-vault.service');
            const fromVault = await IntegrationVaultService.getQuasarAdminCredentials('PRODUCTION');
            if (fromVault?.username && fromVault?.password) {
                username = fromVault.username;
                password = fromVault.password;
            }
        }
        catch {
            /* ignore */
        }
    }
    if (!username || !password) {
        username =
            process.env.QUASAR_ADMIN_USERNAME?.trim() ||
                process.env.QUASAR_ADMIN_EMAIL?.trim() ||
                '';
        password = process.env.QUASAR_ADMIN_PASSWORD?.trim() || '';
    }
    if (!username || !password) {
        throw new Error('Quasar admin auth missing. Save username/password in Enterprise Integration Vault → Quasar → Quasar Admin Login, ' +
            'or set QUASAR_ADMIN_USERNAME + QUASAR_ADMIN_PASSWORD, or paste a Quasar admin JWT.');
    }
    const base = quasarAdminOrigin();
    let res;
    try {
        res = await axios_1.default.post(`${base}/admin/auth/login`, { username, password }, { timeout: 20_000, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
    }
    catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.responseMessage ||
            err?.response?.data?.message ||
            err?.message ||
            'login failed';
        throw new Error(`Quasar admin login failed (${status || 'network'}): ${detail}. ` +
            `Check username/password against Quasar at ${base}/admin/auth/login`);
    }
    const envelope = res.data?.data ?? res.data;
    const token = envelope?.accessToken ||
        envelope?.access_token ||
        envelope?.token ||
        res.data?.accessToken ||
        res.data?.access_token;
    if (!token) {
        // Challenge responses (2FA / password change)
        if (envelope?.requires_2fa || res.data?.requires_2fa) {
            throw new Error('Quasar admin login requires 2FA — complete login in Quasar Admin and paste the admin JWT instead.');
        }
        if (envelope?.requires_password_change || res.data?.requires_password_change) {
            throw new Error('Quasar admin must change password first — log in via Quasar Admin UI, then retry.');
        }
        throw new Error('Quasar admin login succeeded but no accessToken was returned. ' +
            `Response keys: ${Object.keys(res.data || {}).join(',')}`);
    }
    return String(token);
}
/** Ping Quasar admin login using vault/env or override credentials. */
async function testQuasarAdminLogin(params) {
    const base = quasarAdminOrigin();
    const started = Date.now();
    let resolvedUsername = String(params?.username || '').trim();
    try {
        if (!resolvedUsername) {
            try {
                const { IntegrationVaultService } = require('../../services/integration-vault.service');
                const fromVault = await IntegrationVaultService.getQuasarAdminCredentials('PRODUCTION');
                resolvedUsername = String(fromVault?.username || '').trim();
            }
            catch {
                /* ignore */
            }
        }
        if (!resolvedUsername) {
            resolvedUsername =
                process.env.QUASAR_ADMIN_USERNAME?.trim() ||
                    process.env.QUASAR_ADMIN_EMAIL?.trim() ||
                    'vault/env';
        }
        await loginQuasarAdminAndGetToken(params);
        return {
            ok: true,
            quasarBaseUrl: base,
            username: resolvedUsername,
            latencyMs: Date.now() - started,
            message: `Login OK as ${resolvedUsername} — Quasar returned an admin accessToken`,
        };
    }
    catch (e) {
        return {
            ok: false,
            quasarBaseUrl: base,
            username: resolvedUsername || 'vault/env',
            latencyMs: Date.now() - started,
            message: e.message || 'Login ping failed',
        };
    }
}
async function callQuasarRotate(quasarTenantId, adminJwt) {
    const base = quasarAdminOrigin();
    const url = `${base}/admin/tenants/${quasarTenantId}/pos-encryption-key/rotate`;
    let res;
    try {
        res = await axios_1.default.post(url, {}, {
            timeout: 30_000,
            headers: {
                Authorization: `Bearer ${adminJwt}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
    }
    catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.responseMessage ||
            err?.response?.data?.message ||
            err?.message ||
            'rotate failed';
        if (status === 401 || status === 403) {
            throw new Error(`Quasar rejected admin auth (${status}): ${detail}. ` +
                'Use a Quasar admin JWT (super_admin/ops) from POST /admin/auth/login — ' +
                'not the Invify Bearer token. Or set QUASAR_ADMIN_USERNAME + QUASAR_ADMIN_PASSWORD on Invify.');
        }
        throw new Error(`Quasar POS key rotate failed (${status || 'network'}): ${detail}`);
    }
    // Quasar controller returns `{ data: { encryption_key_base64 } }`, then the
    // global interceptor wraps again → `{ responseCode, data: { data: { … } } }`.
    const payload = unwrapQuasarRotatePayload(res.data);
    const encryptionKeyBase64 = payload?.encryption_key_base64 ||
        payload?.encryptionKeyBase64 ||
        payload?.key ||
        payload?.pos_encryption_key_base64;
    const keyVersion = Number(payload?.key_version ?? payload?.keyVersion ?? 1);
    if (!encryptionKeyBase64 || String(encryptionKeyBase64).length < 20) {
        const topKeys = res.data && typeof res.data === 'object' ? Object.keys(res.data) : [];
        const payloadKeys = payload && typeof payload === 'object' ? Object.keys(payload) : [];
        console.error(`[QuasarPosKey] Unexpected rotate response shape topKeys=${topKeys.join(',')} payloadKeys=${payloadKeys.join(',')}`);
        throw new Error('Quasar rotate response did not include encryption_key_base64. ' +
            `Got keys: [${payloadKeys.join(', ') || topKeys.join(', ') || 'empty'}]`);
    }
    return {
        keyVersion,
        encryptionKeyBase64: String(encryptionKeyBase64).trim(),
        warning: payload?.warning,
    };
}
/** Peel Quasar envelope / nested `{ data: … }` until the rotate fields are found. */
function unwrapQuasarRotatePayload(body) {
    let cur = body;
    for (let i = 0; i < 4 && cur && typeof cur === 'object'; i++) {
        if (cur.encryption_key_base64 ||
            cur.encryptionKeyBase64 ||
            cur.pos_encryption_key_base64 ||
            (typeof cur.key === 'string' && cur.key.length >= 20)) {
            return cur;
        }
        if (cur.data != null && typeof cur.data === 'object') {
            cur = cur.data;
            continue;
        }
        break;
    }
    return cur && typeof cur === 'object' ? cur : null;
}
async function upsertTenantPosKey(invifyTenantId, keyBase64) {
    const serviceIdentifier = `quasarTenant:${invifyTenantId}`;
    let vaultId = null;
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('integration_vault')
        .select('id')
        .eq('service_identifier', serviceIdentifier)
        .eq('tenant_id', invifyTenantId)
        .eq('scope', 'TENANT')
        .maybeSingle();
    if (existing?.id) {
        vaultId = existing.id;
    }
    else {
        const created = await integration_vault_service_1.IntegrationVaultService.registerIntegration({
            service_identifier: serviceIdentifier,
            name: `Quasar Tenant POS (${invifyTenantId.slice(0, 8)})`,
            description: 'Quasar POS ICC encryption key (AES-256) for card-transaction',
            category: 'PAYMENTS',
            scope: 'TENANT',
            tenant_id: invifyTenantId,
        });
        vaultId = created.id;
    }
    await integration_vault_service_1.IntegrationVaultService.addCredential(vaultId, {
        credential_type: 'SECRET',
        environment: 'PRODUCTION',
        plaintext_value: keyBase64,
        key_name: 'posEncryptionKey',
        rotate_existing: true,
    });
}
function persistGlobalSettingsKey(keyBase64) {
    const settingsPath = path.join(process.cwd(), 'global_settings.json');
    let current = {};
    if (fs.existsSync(settingsPath)) {
        try {
            current = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        catch {
            current = {};
        }
    }
    current.quasar_pos_encryption_key_base64 = keyBase64;
    current.quasar_pos_encryption_key_updated_at = new Date().toISOString();
    fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2), 'utf8');
}
class QuasarPosKeyService {
    static async getStatus(invifyTenantId) {
        const fromEnv = Boolean(process.env.QUASAR_POS_ENCRYPTION_KEY_BASE64?.trim());
        let fromSettings = false;
        try {
            const settingsPath = path.join(process.cwd(), 'global_settings.json');
            if (fs.existsSync(settingsPath)) {
                const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                fromSettings = Boolean(String(raw?.quasar_pos_encryption_key_base64 || '').trim());
            }
        }
        catch {
            /* ignore */
        }
        let fromTenantVault = false;
        let quasarTenantId = null;
        if (invifyTenantId) {
            fromTenantVault = Boolean(await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(`quasarTenant:${invifyTenantId}`, 'PRODUCTION', invifyTenantId, 'posEncryptionKey'));
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
            quasarTenantId = integration?.quasar_tenant_id || null;
        }
        return {
            configured: fromTenantVault || fromSettings || fromEnv,
            globalConfigured: fromSettings || fromEnv,
            sources: {
                tenantVault: fromTenantVault,
                globalSettings: fromSettings,
                runtimeEnv: fromEnv,
            },
            invifyTenantId: invifyTenantId || null,
            quasarTenantId,
            quasarBaseUrl: (0, quasar_base_url_1.resolveQuasarBaseUrl)(),
        };
    }
    /**
     * Rotate on Quasar and store on Invify (tenant vault + optional platform default).
     */
    static async rotateAndStore(params) {
        let invifyTenantId = params.invifyTenantId?.trim() || null;
        let quasarTenantId = params.quasarTenantId?.trim() || null;
        if (!quasarTenantId && invifyTenantId) {
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
            if (!integration?.quasar_tenant_id) {
                throw new Error(`No Quasar integration mapping for Invify tenant ${invifyTenantId}. Activate Financial Platform first.`);
            }
            quasarTenantId = integration.quasar_tenant_id;
        }
        if (!invifyTenantId && quasarTenantId) {
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByQuasarTenantId(quasarTenantId);
            invifyTenantId = integration?.invify_tenant_id || null;
        }
        if (!quasarTenantId) {
            throw new Error('quasarTenantId or invifyTenantId (with Quasar mapping) is required');
        }
        let adminJwt = await resolveAdminJwt(params.adminJwt);
        console.log(`[QuasarPosKey] Rotating POS key on Quasar tenant=${quasarTenantId} invify=${invifyTenantId || 'n/a'}`);
        let rotated;
        try {
            rotated = await callQuasarRotate(quasarTenantId, adminJwt);
        }
        catch (err) {
            const msg = String(err?.message || '');
            const usedExplicitJwt = Boolean(String(params.adminJwt || '').trim());
            if (usedExplicitJwt && /rejected admin auth \(401\)|rejected admin auth \(403\)/.test(msg)) {
                console.warn('[QuasarPosKey] Pasted admin JWT rejected — retrying rotate with vault/env Quasar admin login');
                adminJwt = await loginQuasarAdminAndGetToken();
                rotated = await callQuasarRotate(quasarTenantId, adminJwt);
            }
            else {
                throw err;
            }
        }
        const stored = { tenantVault: false, globalSettings: false, runtimeEnv: false };
        if (invifyTenantId) {
            await upsertTenantPosKey(invifyTenantId, rotated.encryptionKeyBase64);
            stored.tenantVault = true;
        }
        const applyGlobal = params.applyAsPlatformDefault !== false;
        if (applyGlobal) {
            persistGlobalSettingsKey(rotated.encryptionKeyBase64);
            process.env.QUASAR_POS_ENCRYPTION_KEY_BASE64 = rotated.encryptionKeyBase64;
            stored.globalSettings = true;
            stored.runtimeEnv = true;
        }
        return {
            invifyTenantId,
            quasarTenantId,
            keyVersion: rotated.keyVersion,
            encryptionKeyBase64: rotated.encryptionKeyBase64,
            fingerprint: fingerprintKey(rotated.encryptionKeyBase64),
            stored,
            warning: rotated.warning ||
                'Store this key securely. Quasar cannot retrieve it again — rotating again invalidates this value.',
        };
    }
    /** Manual paste path — store a key already rotated outside Invify. */
    static async storeExistingKey(params) {
        const key = String(params.encryptionKeyBase64 || '').trim();
        if (!key || key.length < 20) {
            throw new Error('encryption_key_base64 is required');
        }
        // Validate base64 → ~32 bytes
        const raw = Buffer.from(key, 'base64');
        if (raw.length !== 32) {
            throw new Error(`POS key must decode to 32 bytes (got ${raw.length}). Check the Quasar rotate response.`);
        }
        let invifyTenantId = params.invifyTenantId?.trim() || null;
        let quasarTenantId = null;
        if (invifyTenantId) {
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
            quasarTenantId = integration?.quasar_tenant_id || null;
            await upsertTenantPosKey(invifyTenantId, key);
        }
        const stored = {
            tenantVault: Boolean(invifyTenantId),
            globalSettings: false,
            runtimeEnv: false,
        };
        if (params.applyAsPlatformDefault !== false) {
            persistGlobalSettingsKey(key);
            process.env.QUASAR_POS_ENCRYPTION_KEY_BASE64 = key;
            stored.globalSettings = true;
            stored.runtimeEnv = true;
        }
        return {
            invifyTenantId,
            quasarTenantId: quasarTenantId || '',
            keyVersion: null,
            encryptionKeyBase64: key,
            fingerprint: fingerprintKey(key),
            stored,
            warning: 'Key stored on Invify. Ensure it matches the active Quasar tenant key version.',
        };
    }
}
exports.QuasarPosKeyService = QuasarPosKeyService;
//# sourceMappingURL=quasar-pos-key.service.js.map