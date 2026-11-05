"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEB_ISSUER_DEVICE_ID = exports.DEVICE_LINK_TTL_MS = void 0;
exports.createDeviceLinkToken = createDeviceLinkToken;
exports.buildDeviceLinkQrPayload = buildDeviceLinkQrPayload;
exports.issueDeviceLinkQr = issueDeviceLinkQr;
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../db/supabase");
exports.DEVICE_LINK_TTL_MS = 3 * 60 * 1000;
exports.WEB_ISSUER_DEVICE_ID = 'WEB-PORTAL';
function createDeviceLinkToken(now = Date.now()) {
    return {
        token: crypto_1.default.randomBytes(16).toString('hex'),
        expiresAt: new Date(now + exports.DEVICE_LINK_TTL_MS),
    };
}
function buildDeviceLinkQrPayload(input) {
    const expiresAt = typeof input.expiresAt === 'string' ? input.expiresAt : input.expiresAt.toISOString();
    return JSON.stringify({
        action: 'LINK_DEVICE',
        token: input.token,
        tenantId: input.tenantId,
        businessName: input.businessName,
        industry: input.industry || null,
        expiresAt,
    });
}
async function issueDeviceLinkQr(opts) {
    const tenantId = String(opts.tenantId || '').trim();
    if (!tenantId) {
        return { ok: false, status: 400, error: 'tenantId is required' };
    }
    const { data: tenant, error: tenantErr } = await supabase_1.supabaseAdmin
        .from('tenants')
        .select('id, name, type, phone, plan')
        .eq('id', tenantId)
        .single();
    if (tenantErr || !tenant) {
        return { ok: false, status: 404, error: 'Tenant not found' };
    }
    const { token, expiresAt } = createDeviceLinkToken();
    const expiresAtIso = expiresAt.toISOString();
    try {
        await supabase_1.supabaseAdmin.from('device_link_tokens').insert({
            token,
            tenant_id: tenantId,
            issuer_device_id: opts.issuerDeviceId || null,
            issuer_agent_code: opts.agentCode || 'AAA000',
            expires_at: expiresAtIso,
            used: false,
        });
    }
    catch (storeErr) {
        console.warn('[issueDeviceLinkQr] device_link_tokens insert failed:', storeErr.message);
    }
    const qrPayload = buildDeviceLinkQrPayload({
        token,
        tenantId: tenant.id,
        businessName: tenant.name,
        industry: tenant.type,
        expiresAt: expiresAtIso,
    });
    return {
        ok: true,
        data: {
            token,
            expiresAt: expiresAtIso,
            qrPayload,
            tenant: { id: tenant.id, name: tenant.name, type: tenant.type, plan: tenant.plan },
        },
    };
}
//# sourceMappingURL=device-link-qr.js.map