"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMISSION_EVENT_TYPES = exports.WEBHOOK_MAX_ATTEMPTS = exports.WEBHOOK_TIMEOUT_MS = exports.WEBHOOK_MAX_SKEW_SECONDS = exports.WEBHOOK_EVENT_VERSION = void 0;
exports.canonicalJson = canonicalJson;
exports.fingerprintPublicKey = fingerprintPublicKey;
exports.generateEd25519Keypair = generateEd25519Keypair;
exports.signingPayload = signingPayload;
exports.signWebhook = signWebhook;
exports.verifyWebhook = verifyWebhook;
exports.isTimestampFresh = isTimestampFresh;
exports.validateWebhookUrl = validateWebhookUrl;
exports.allowedCommissionEvent = allowedCommissionEvent;
exports.nextBackoffSeconds = nextBackoffSeconds;
exports.publicWebhookCredential = publicWebhookCredential;
exports.assertNoSecrets = assertNoSecrets;
exports.buildCommissionEnvelope = buildCommissionEnvelope;
exports.assertAgentOwns = assertAgentOwns;
const crypto_1 = require("crypto");
exports.WEBHOOK_EVENT_VERSION = '2026-01';
exports.WEBHOOK_MAX_SKEW_SECONDS = 300;
exports.WEBHOOK_TIMEOUT_MS = 5000;
exports.WEBHOOK_MAX_ATTEMPTS = 8;
exports.COMMISSION_EVENT_TYPES = [
    'commission.assessed',
    'commission.pending',
    'commission.available',
    'commission.withdrawal.requested',
    'commission.withdrawal.approved',
    'commission.withdrawal.rejected',
    'commission.withdrawal.completed',
    'commission.withdrawal.failed',
    'webhook.test',
];
function canonicalJson(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}
function fingerprintPublicKey(publicKeyPem) {
    const hash = (0, crypto_1.createHash)('sha256').update(publicKeyPem).digest('hex');
    return hash.match(/.{2}/g)?.join(':') || hash;
}
function generateEd25519Keypair(purpose) {
    const pair = (0, crypto_1.generateKeyPairSync)('ed25519');
    const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const keyId = `key_${purpose === 'WEBHOOK_SIGNING' ? 'wh' : 'api'}_${(0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 16)}`;
    return {
        purpose,
        key_id: keyId,
        public_key: publicKey,
        private_key: privateKey,
        fingerprint: fingerprintPublicKey(publicKey),
    };
}
function signingPayload(timestamp, envelope) {
    return Buffer.from(`${timestamp}.${canonicalJson(envelope)}`, 'utf8');
}
function signWebhook(privateKeyPem, timestamp, envelope) {
    const key = { key: privateKeyPem, format: 'pem' };
    return (0, crypto_1.sign)(null, signingPayload(timestamp, envelope), key).toString('base64');
}
function verifyWebhook(publicKeyPem, timestamp, envelope, signatureB64) {
    try {
        const key = { key: publicKeyPem, format: 'pem' };
        const sig = Buffer.from(signatureB64, 'base64');
        return (0, crypto_1.verify)(null, signingPayload(timestamp, envelope), key, sig);
    }
    catch {
        return false;
    }
}
function isTimestampFresh(timestamp, nowMs = Date.now(), maxSkewSeconds = exports.WEBHOOK_MAX_SKEW_SECONDS) {
    const ts = Date.parse(timestamp) || Number(timestamp) * 1000;
    if (!Number.isFinite(ts))
        return false;
    return Math.abs(nowMs - ts) <= maxSkewSeconds * 1000;
}
function validateWebhookUrl(raw) {
    const url = String(raw || '').trim();
    if (!url)
        throw Object.assign(new Error('Webhook URL is required'), { code: 'INVALID_WEBHOOK_URL' });
    if (url.length > 2048)
        throw Object.assign(new Error('Webhook URL is too long'), { code: 'INVALID_WEBHOOK_URL' });
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw Object.assign(new Error('Webhook URL is invalid'), { code: 'INVALID_WEBHOOK_URL' });
    }
    const host = parsed.hostname.toLowerCase();
    const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (parsed.protocol === 'http:') {
        if (!local)
            throw Object.assign(new Error('Webhook URL must use HTTPS'), { code: 'INVALID_WEBHOOK_URL' });
    }
    else if (parsed.protocol !== 'https:') {
        throw Object.assign(new Error('Webhook URL must use HTTPS'), { code: 'INVALID_WEBHOOK_URL' });
    }
    return parsed.toString();
}
function allowedCommissionEvent(type, opts) {
    if (type === 'webhook.test')
        return true;
    if (type === 'commission.assessed' || type === 'commission.pending')
        return true;
    if (type === 'commission.available')
        return opts.live === true;
    if (type === 'commission.withdrawal.completed')
        return opts.payouts === true;
    if (type.startsWith('commission.withdrawal.'))
        return true;
    return false;
}
function nextBackoffSeconds(attempt) {
    const exp = Math.min(8, Math.max(1, attempt));
    return Math.min(3600, 15 * 2 ** (exp - 1));
}
function publicWebhookCredential(row) {
    const { private_key, private_key_pem, secret, ...rest } = row;
    return rest;
}
function assertNoSecrets(payload) {
    const raw = JSON.stringify(payload || {});
    if (/BEGIN (PRIVATE|RSA) KEY|private_key|api_secret|service_role|cvv|pan\b/i.test(raw)) {
        throw Object.assign(new Error('Payload contains forbidden secret material'), { code: 'SECRET_LEAK' });
    }
}
function buildCommissionEnvelope(input) {
    const envelope = {
        id: input.id,
        type: input.type,
        version: exports.WEBHOOK_EVENT_VERSION,
        created_at: new Date().toISOString(),
        agent: { id: input.agent.id, agent_code: input.agent.agent_code },
        tenant: input.tenant || null,
        transaction: input.transaction || null,
        commission: input.commission || null,
        test: input.test === true,
    };
    assertNoSecrets(envelope);
    return envelope;
}
function assertAgentOwns(resourceAgentId, authAgentId) {
    if (!resourceAgentId || resourceAgentId !== authAgentId) {
        throw Object.assign(new Error('Forbidden'), { code: 'AGENT_ISOLATION', status: 403 });
    }
}
//# sourceMappingURL=agent-webhook-crypto.js.map