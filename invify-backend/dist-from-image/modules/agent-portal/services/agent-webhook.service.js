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
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAgentOwns = void 0;
exports.resolveAgentFromAuth = resolveAgentFromAuth;
exports.getDeveloperSnapshot = getDeveloperSnapshot;
exports.saveWebhook = saveWebhook;
exports.setWebhookStatus = setWebhookStatus;
exports.rotateWebhookSigning = rotateWebhookSigning;
exports.rotateApiCredential = rotateApiCredential;
exports.listDeliveries = listDeliveries;
exports.enqueueCommissionEvent = enqueueCommissionEvent;
exports.enqueueTestEvent = enqueueTestEvent;
exports.deliverDueEvents = deliverDueEvents;
exports.adminListWebhooks = adminListWebhooks;
exports.adminSetWebhookStatus = adminSetWebhookStatus;
exports.adminListDeliveries = adminListDeliveries;
exports.verifyAgentApiRequest = verifyAgentApiRequest;
const crypto_1 = require("crypto");
const supabase_1 = require("../../../db/supabase");
const gov_audit_service_1 = require("../../../services/gov-audit.service");
const agent_fee_read_model_1 = require("./agent-fee-read-model");
const agent_webhook_crypto_1 = require("./agent-webhook-crypto");
Object.defineProperty(exports, "assertAgentOwns", { enumerable: true, get: function () { return agent_webhook_crypto_1.assertAgentOwns; } });
function audit(action, email, target, metadata) {
    return gov_audit_service_1.GovAuditService.logAction({
        id: (0, crypto_1.randomUUID)(),
        timestamp: new Date().toISOString(),
        module: 'FINANCIAL',
        action,
        user_email: email || 'agent',
        user_name: email || 'agent',
        ip_address: '127.0.0.1',
        target,
        status: 'success',
        metadata: { ...metadata, secrets: undefined },
    });
}
async function resolveAgentFromAuth(authUserId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('agents')
        .select('id, agent_code, email, first_name, last_name, status')
        .eq('auth_user_id', authUserId)
        .is('deleted_at', null)
        .maybeSingle();
    if (error || !data)
        throw Object.assign(new Error('Agent profile not found'), { status: 403 });
    return data;
}
async function ensureWebhookSigning(agentId, agentCode) {
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('agent_webhook_signing_keys')
        .select('id, key_id, public_key, fingerprint, status, created_at, rotated_at, revoked_at')
        .eq('agent_id', agentId)
        .eq('status', 'ACTIVE')
        .maybeSingle();
    if (existing)
        return existing;
    const pair = (0, agent_webhook_crypto_1.generateEd25519Keypair)('WEBHOOK_SIGNING');
    const row = {
        id: (0, crypto_1.randomUUID)(),
        agent_id: agentId,
        key_id: pair.key_id,
        public_key: pair.public_key,
        private_key: pair.private_key,
        fingerprint: pair.fingerprint,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        rotated_at: null,
        revoked_at: null,
    };
    const { error } = await supabase_1.supabaseAdmin.from('agent_webhook_signing_keys').insert(row);
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit('WEBHOOK_KEY_CREATED', '', agentId, { fingerprint: pair.fingerprint, agent_code: agentCode });
    return (0, agent_webhook_crypto_1.publicWebhookCredential)(row);
}
async function ensureApiCredential(agentId, agentCode, revealPrivate) {
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('agent_api_credentials')
        .select('id, key_id, public_key, fingerprint, status, created_at, rotated_at, revoked_at')
        .eq('agent_id', agentId)
        .eq('status', 'ACTIVE')
        .maybeSingle();
    if (existing)
        return { ...existing, private_key: revealPrivate ? null : undefined, private_key_shown: false };
    const pair = (0, agent_webhook_crypto_1.generateEd25519Keypair)('AGENT_API');
    const row = {
        id: (0, crypto_1.randomUUID)(),
        agent_id: agentId,
        key_id: pair.key_id,
        public_key: pair.public_key,
        fingerprint: pair.fingerprint,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        rotated_at: null,
        revoked_at: null,
    };
    const { error } = await supabase_1.supabaseAdmin.from('agent_api_credentials').insert(row);
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit('API_CREDENTIAL_CREATED', '', agentId, { fingerprint: pair.fingerprint, agent_code: agentCode });
    return {
        ...row,
        private_key: pair.private_key,
        private_key_shown: true,
        notice: 'Your private key will not be shown again. Invify will never request your private key.',
    };
}
async function ensureConfig(agentId) {
    const { data: existing } = await supabase_1.supabaseAdmin
        .from('agent_webhook_configs')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
    if (existing)
        return existing;
    const row = {
        id: (0, crypto_1.randomUUID)(),
        agent_id: agentId,
        webhook_url: null,
        status: 'DISABLED',
        failure_count: 0,
        last_delivery_at: null,
        last_success_at: null,
        last_failure_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    const { error } = await supabase_1.supabaseAdmin.from('agent_webhook_configs').insert(row);
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit('WEBHOOK_CREATED', '', agentId, {});
    return row;
}
async function getDeveloperSnapshot(authUserId, opts = {}) {
    const agent = await resolveAgentFromAuth(authUserId);
    const config = await ensureConfig(agent.id);
    const webhookKey = await ensureWebhookSigning(agent.id, agent.agent_code);
    const apiKey = await ensureApiCredential(agent.id, agent.agent_code, Boolean(opts.revealApiPrivateIfNew));
    const { count: total } = await supabase_1.supabaseAdmin
        .from('agent_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id);
    const { count: failed } = await supabase_1.supabaseAdmin
        .from('agent_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .in('status', ['FAILED', 'DEAD_LETTER']);
    const { count: succeeded } = await supabase_1.supabaseAdmin
        .from('agent_webhook_events')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .eq('status', 'DELIVERED');
    return {
        agent: { id: agent.id, agent_code: agent.agent_code, email: agent.email },
        webhook: config,
        webhook_signing: (0, agent_webhook_crypto_1.publicWebhookCredential)(webhookKey),
        api_credentials: {
            ...apiKey,
            private_key: apiKey.private_key_shown ? apiKey.private_key : undefined,
        },
        stats: {
            total_events: total || 0,
            failed_events: failed || 0,
            successful_events: succeeded || 0,
            success_rate: total ? Math.round(((succeeded || 0) / total) * 100) : 0,
        },
        notices: [
            'Never share your private key.',
            'Invify will never request your private key.',
            'Webhook events are signed by Invify.',
            'Test events do not affect your balance.',
        ],
        payout_execution_enabled: (0, agent_fee_read_model_1.isAgentPayoutExecutionEnabled)(),
        fee_orchestration_live: (0, agent_fee_read_model_1.isFeeOrchestrationLive)(),
    };
}
async function saveWebhook(authUserId, url, email) {
    const agent = await resolveAgentFromAuth(authUserId);
    const webhookUrl = (0, agent_webhook_crypto_1.validateWebhookUrl)(url);
    await ensureConfig(agent.id);
    const { data, error } = await supabase_1.supabaseAdmin
        .from('agent_webhook_configs')
        .update({ webhook_url: webhookUrl, status: 'ENABLED', updated_at: new Date().toISOString() })
        .eq('agent_id', agent.id)
        .select()
        .single();
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit('WEBHOOK_UPDATED', email, agent.id, { webhook_url_host: new URL(webhookUrl).host });
    return data;
}
async function setWebhookStatus(authUserId, status, email) {
    const agent = await resolveAgentFromAuth(authUserId);
    const { data, error } = await supabase_1.supabaseAdmin
        .from('agent_webhook_configs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('agent_id', agent.id)
        .select()
        .single();
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit(status === 'ENABLED' ? 'WEBHOOK_ENABLED' : 'WEBHOOK_DISABLED', email, agent.id, {});
    return data;
}
async function rotateWebhookSigning(authUserId, email, confirm) {
    if (!confirm)
        throw Object.assign(new Error('Rotation requires confirmation'), { code: 'CONFIRM_REQUIRED', status: 400 });
    const agent = await resolveAgentFromAuth(authUserId);
    const { data: old } = await supabase_1.supabaseAdmin
        .from('agent_webhook_signing_keys')
        .select('id, fingerprint')
        .eq('agent_id', agent.id)
        .eq('status', 'ACTIVE');
    const now = new Date().toISOString();
    if (old?.length) {
        await supabase_1.supabaseAdmin
            .from('agent_webhook_signing_keys')
            .update({ status: 'REVOKED', revoked_at: now, rotated_at: now })
            .eq('agent_id', agent.id)
            .eq('status', 'ACTIVE');
    }
    const pair = (0, agent_webhook_crypto_1.generateEd25519Keypair)('WEBHOOK_SIGNING');
    const row = {
        id: (0, crypto_1.randomUUID)(),
        agent_id: agent.id,
        key_id: pair.key_id,
        public_key: pair.public_key,
        private_key: pair.private_key,
        fingerprint: pair.fingerprint,
        status: 'ACTIVE',
        created_at: now,
        rotated_at: now,
        revoked_at: null,
    };
    const { error } = await supabase_1.supabaseAdmin.from('agent_webhook_signing_keys').insert(row);
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit('WEBHOOK_KEY_ROTATED', email, agent.id, {
        old_fingerprint: old?.[0]?.fingerprint || null,
        new_fingerprint: pair.fingerprint,
    });
    // Signing private key stays server-side. Agents verify with the public key.
    return (0, agent_webhook_crypto_1.publicWebhookCredential)(row);
}
async function rotateApiCredential(authUserId, email, confirm) {
    if (!confirm)
        throw Object.assign(new Error('Rotation requires confirmation'), { code: 'CONFIRM_REQUIRED', status: 400 });
    const agent = await resolveAgentFromAuth(authUserId);
    const { data: old } = await supabase_1.supabaseAdmin
        .from('agent_api_credentials')
        .select('id, fingerprint, key_id')
        .eq('agent_id', agent.id)
        .eq('status', 'ACTIVE');
    const now = new Date().toISOString();
    if (old?.length) {
        await supabase_1.supabaseAdmin
            .from('agent_api_credentials')
            .update({ status: 'REVOKED', revoked_at: now, rotated_at: now })
            .eq('agent_id', agent.id)
            .eq('status', 'ACTIVE');
    }
    const pair = (0, agent_webhook_crypto_1.generateEd25519Keypair)('AGENT_API');
    const row = {
        id: (0, crypto_1.randomUUID)(),
        agent_id: agent.id,
        key_id: pair.key_id,
        public_key: pair.public_key,
        fingerprint: pair.fingerprint,
        status: 'ACTIVE',
        created_at: now,
        rotated_at: now,
        revoked_at: null,
    };
    const { error } = await supabase_1.supabaseAdmin.from('agent_api_credentials').insert(row);
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit('API_CREDENTIAL_ROTATED', email, agent.id, {
        old_fingerprint: old?.[0]?.fingerprint || null,
        new_fingerprint: pair.fingerprint,
        old_key_id: old?.[0]?.key_id || null,
    });
    return {
        ...row,
        private_key: pair.private_key,
        private_key_shown: true,
        notice: 'Your private key will not be shown again.',
    };
}
async function listDeliveries(authUserId) {
    const agent = await resolveAgentFromAuth(authUserId);
    const { data } = await supabase_1.supabaseAdmin
        .from('agent_webhook_events')
        .select('id, event_type, status, attempt_count, last_http_status, created_at, last_attempt_at, tenant_id, payload')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(100);
    return (data || []).map((row) => ({
        event_id: row.id,
        event_type: row.event_type,
        tenant_id: row.tenant_id,
        commission: row.payload?.commission || null,
        status: row.status,
        attempts: row.attempt_count,
        http_status: row.last_http_status,
        created_at: row.created_at,
        last_attempt_at: row.last_attempt_at,
    }));
}
async function enqueueCommissionEvent(input) {
    try {
        const live = (0, agent_fee_read_model_1.isFeeOrchestrationLive)();
        const payouts = (0, agent_fee_read_model_1.isAgentPayoutExecutionEnabled)();
        if (!(0, agent_webhook_crypto_1.allowedCommissionEvent)(input.type, { live, payouts }))
            return null;
        const { data: config } = await supabase_1.supabaseAdmin
            .from('agent_webhook_configs')
            .select('id, webhook_url, status')
            .eq('agent_id', input.agentId)
            .maybeSingle();
        if (!config?.webhook_url || config.status !== 'ENABLED')
            return null;
        const eventId = (0, crypto_1.randomUUID)();
        const envelope = (0, agent_webhook_crypto_1.buildCommissionEnvelope)({
            id: eventId,
            type: input.type,
            agent: { id: input.agentId, agent_code: input.agentCode },
            tenant: input.tenantId ? { id: input.tenantId } : undefined,
            commission: {
                currency: 'NGN',
                mode: live ? 'LIVE' : 'SHADOW',
                status: live ? 'AVAILABLE' : 'PENDING',
                available_kobo: live ? Number(input.payload.available_kobo || 0) : 0,
                ...input.payload,
            },
        });
        if (!live) {
            envelope.commission.status = 'PENDING';
            envelope.commission.available_kobo = 0;
            envelope.commission.mode = 'SHADOW';
        }
        const { error } = await supabase_1.supabaseAdmin.from('agent_webhook_events').insert({
            id: eventId,
            agent_id: input.agentId,
            tenant_id: input.tenantId || null,
            assessment_id: input.assessmentId || null,
            event_type: input.type,
            status: 'PENDING',
            attempt_count: 0,
            payload: envelope,
            next_attempt_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        });
        if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
            console.warn('[agent-webhook] enqueue failed', error.message);
        }
        return eventId;
    }
    catch (err) {
        console.warn('[agent-webhook] enqueue swallowed', err?.message || err);
        return null;
    }
}
async function enqueueTestEvent(authUserId, email) {
    const agent = await resolveAgentFromAuth(authUserId);
    const eventId = (0, crypto_1.randomUUID)();
    const envelope = (0, agent_webhook_crypto_1.buildCommissionEnvelope)({
        id: eventId,
        type: 'webhook.test',
        agent: { id: agent.id, agent_code: agent.agent_code },
        test: true,
        commission: { currency: 'NGN', assessed_kobo: 0, agent_share_kobo: 0, mode: 'SHADOW', status: 'PENDING', available_kobo: 0 },
    });
    await supabase_1.supabaseAdmin.from('agent_webhook_events').insert({
        id: eventId,
        agent_id: agent.id,
        event_type: 'webhook.test',
        status: 'PENDING',
        attempt_count: 0,
        payload: envelope,
        next_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
    });
    await audit('WEBHOOK_TEST_SENT', email, agent.id, { event_id: eventId });
    return { event_id: eventId, envelope, financial_mutation: false };
}
async function deliverDueEvents(transport, now = new Date()) {
    const { data: due } = await supabase_1.supabaseAdmin
        .from('agent_webhook_events')
        .select('*')
        .in('status', ['PENDING', 'RETRY'])
        .lte('next_attempt_at', now.toISOString())
        .limit(25);
    const results = [];
    for (const event of due || []) {
        const claimUntil = new Date(now.getTime() + 60_000).toISOString();
        const { data: claimed, error: claimErr } = await supabase_1.supabaseAdmin
            .from('agent_webhook_events')
            .update({ next_attempt_at: claimUntil, updated_at: now.toISOString() })
            .eq('id', event.id)
            .eq('attempt_count', event.attempt_count)
            .in('status', ['PENDING', 'RETRY'])
            .select('id')
            .maybeSingle();
        if (claimErr || !claimed?.id)
            continue;
        results.push(await deliverOne({ ...event, next_attempt_at: claimUntil }, transport));
    }
    return results;
}
async function deliverOne(event, transport) {
    const { data: config } = await supabase_1.supabaseAdmin
        .from('agent_webhook_configs')
        .select('*')
        .eq('agent_id', event.agent_id)
        .maybeSingle();
    const { data: key } = await supabase_1.supabaseAdmin
        .from('agent_webhook_signing_keys')
        .select('key_id, private_key, public_key')
        .eq('agent_id', event.agent_id)
        .eq('status', 'ACTIVE')
        .maybeSingle();
    const attempt = Number(event.attempt_count || 0) + 1;
    if (!config?.webhook_url || config.status !== 'ENABLED' || !key?.private_key) {
        await markDelivery(event, attempt, 'FAILED', 0, 'Webhook disabled or signing key missing');
        return { event_id: event.id, ok: false };
    }
    const timestamp = new Date().toISOString();
    const signature = (0, agent_webhook_crypto_1.signWebhook)(key.private_key, timestamp, event.payload);
    const headers = {
        'Content-Type': 'application/json',
        'X-Invify-Event-ID': event.id,
        'X-Invify-Timestamp': timestamp,
        'X-Invify-Key-ID': key.key_id,
        'X-Invify-Signature': signature,
    };
    const body = JSON.stringify(event.payload);
    try {
        const res = transport
            ? await transport(config.webhook_url, body, headers)
            : await defaultTransport(config.webhook_url, body, headers);
        if (res.status >= 200 && res.status < 300) {
            await markDelivery(event, attempt, 'DELIVERED', res.status, null);
            await audit('WEBHOOK_DELIVERY_SUCCEEDED', '', event.agent_id, { event_id: event.id, http_status: res.status });
            return { event_id: event.id, ok: true, http_status: res.status };
        }
        await retryOrDead(event, attempt, res.status, `HTTP ${res.status}`);
        return { event_id: event.id, ok: false, http_status: res.status };
    }
    catch (err) {
        await retryOrDead(event, attempt, 0, err?.message || 'delivery error');
        return { event_id: event.id, ok: false };
    }
}
async function retryOrDead(event, attempt, httpStatus, reason) {
    const dead = attempt >= agent_webhook_crypto_1.WEBHOOK_MAX_ATTEMPTS;
    await markDelivery(event, attempt, dead ? 'DEAD_LETTER' : 'RETRY', httpStatus, reason, dead ? null : (0, agent_webhook_crypto_1.nextBackoffSeconds)(attempt));
    await audit('WEBHOOK_DELIVERY_FAILED', '', event.agent_id, { event_id: event.id, attempt, reason: String(reason).slice(0, 200) });
}
async function markDelivery(event, attempt, status, httpStatus, reason, backoffSec) {
    const now = new Date().toISOString();
    await supabase_1.supabaseAdmin.from('agent_webhook_deliveries').insert({
        id: (0, crypto_1.randomUUID)(),
        event_id: event.id,
        agent_id: event.agent_id,
        attempt_no: attempt,
        status,
        http_status: httpStatus,
        failure_reason: reason,
        created_at: now,
    });
    const patch = {
        status,
        attempt_count: attempt,
        last_attempt_at: now,
        last_http_status: httpStatus,
        last_error: reason,
        updated_at: now,
    };
    if (status === 'DELIVERED')
        patch.delivered_at = now;
    if (status === 'RETRY' && backoffSec) {
        patch.next_attempt_at = new Date(Date.now() + backoffSec * 1000).toISOString();
    }
    await supabase_1.supabaseAdmin.from('agent_webhook_events').update(patch).eq('id', event.id);
    const cfgPatch = { last_delivery_at: now, updated_at: now };
    if (status === 'DELIVERED') {
        cfgPatch.last_success_at = now;
        cfgPatch.failure_count = 0;
    }
    else {
        cfgPatch.last_failure_at = now;
    }
    if (status !== 'DELIVERED') {
        const { data: cfg } = await supabase_1.supabaseAdmin.from('agent_webhook_configs').select('failure_count').eq('agent_id', event.agent_id).maybeSingle();
        cfgPatch.failure_count = Number(cfg?.failure_count || 0) + 1;
    }
    await supabase_1.supabaseAdmin.from('agent_webhook_configs').update(cfgPatch).eq('agent_id', event.agent_id);
}
async function defaultTransport(url, body, headers) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
        const res = await fetch(url, { method: 'POST', body, headers, signal: ctrl.signal });
        return { status: res.status };
    }
    finally {
        clearTimeout(t);
    }
}
async function adminListWebhooks() {
    const { data } = await supabase_1.supabaseAdmin
        .from('agent_webhook_configs')
        .select('agent_id, webhook_url, status, failure_count, last_delivery_at, last_success_at, last_failure_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200);
    const { data: agents } = await supabase_1.supabaseAdmin.from('agents').select('id, agent_code, email');
    const { data: keys } = await supabase_1.supabaseAdmin
        .from('agent_webhook_signing_keys')
        .select('agent_id, fingerprint, key_id, status')
        .eq('status', 'ACTIVE');
    const agentMap = new Map((agents || []).map((a) => [a.id, a]));
    const keyMap = new Map((keys || []).map((k) => [k.agent_id, k]));
    return (data || []).map((row) => ({
        ...row,
        agent_code: agentMap.get(row.agent_id)?.agent_code,
        email: agentMap.get(row.agent_id)?.email,
        fingerprint: keyMap.get(row.agent_id)?.fingerprint,
        key_id: keyMap.get(row.agent_id)?.key_id,
    }));
}
async function adminSetWebhookStatus(agentId, status, email) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('agent_webhook_configs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId)
        .select()
        .single();
    if (error)
        throw Object.assign(new Error(error.message), { status: 500 });
    await audit(status === 'ENABLED' ? 'WEBHOOK_ENABLED' : 'WEBHOOK_DISABLED', email, agentId, { admin: true });
    return data;
}
async function adminListDeliveries(agentId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('agent_webhook_events')
        .select('id, event_type, status, attempt_count, last_http_status, created_at, last_attempt_at, tenant_id, payload')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);
    return (data || []).map((row) => ({
        event_id: row.id,
        event_type: row.event_type,
        tenant_id: row.tenant_id,
        commission: row.payload?.commission || null,
        status: row.status,
        attempts: row.attempt_count,
        http_status: row.last_http_status,
        created_at: row.created_at,
        last_attempt_at: row.last_attempt_at,
    }));
}
async function verifyAgentApiRequest(keyId, timestamp, envelope, signature) {
    const { data } = await supabase_1.supabaseAdmin
        .from('agent_api_credentials')
        .select('agent_id, public_key, status, key_id')
        .eq('key_id', keyId)
        .eq('status', 'ACTIVE')
        .maybeSingle();
    if (!data)
        throw Object.assign(new Error('Invalid API credential'), { status: 401, code: 'API_CREDENTIAL_INVALID' });
    const { isTimestampFresh, verifyWebhook } = await Promise.resolve().then(() => __importStar(require('./agent-webhook-crypto')));
    if (!isTimestampFresh(timestamp)) {
        throw Object.assign(new Error('Expired timestamp'), { status: 401, code: 'TIMESTAMP_EXPIRED' });
    }
    if (!verifyWebhook(data.public_key, timestamp, envelope, signature)) {
        throw Object.assign(new Error('Invalid signature'), { status: 401, code: 'INVALID_SIGNATURE' });
    }
    return { agent_id: data.agent_id, key_id: data.key_id };
}
//# sourceMappingURL=agent-webhook.service.js.map