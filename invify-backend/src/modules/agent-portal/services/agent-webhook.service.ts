import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../../db/supabase';
import { GovAuditService } from '../../../services/gov-audit.service';
import { isAgentPayoutExecutionEnabled, isFeeOrchestrationLive } from './agent-fee-read-model';
import {
  allowedCommissionEvent,
  assertAgentOwns,
  buildCommissionEnvelope,
  generateEd25519Keypair,
  nextBackoffSeconds,
  publicWebhookCredential,
  signWebhook,
  validateWebhookUrl,
  WEBHOOK_MAX_ATTEMPTS,
} from './agent-webhook-crypto';

function audit(action: string, email: string, target: string, metadata: Record<string, unknown>) {
  return GovAuditService.logAction({
    id: randomUUID(),
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

export async function resolveAgentFromAuth(authUserId: string) {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('id, agent_code, email, first_name, last_name, status')
    .eq('auth_user_id', authUserId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) throw Object.assign(new Error('Agent profile not found'), { status: 403 });
  return data;
}

async function ensureWebhookSigning(agentId: string, agentCode: string) {
  const { data: existing } = await supabaseAdmin
    .from('agent_webhook_signing_keys')
    .select('id, key_id, public_key, fingerprint, status, created_at, rotated_at, revoked_at')
    .eq('agent_id', agentId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (existing) return existing;
  const pair = generateEd25519Keypair('WEBHOOK_SIGNING');
  const row = {
    id: randomUUID(),
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
  const { error } = await supabaseAdmin.from('agent_webhook_signing_keys').insert(row);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit('WEBHOOK_KEY_CREATED', '', agentId, { fingerprint: pair.fingerprint, agent_code: agentCode });
  return publicWebhookCredential(row);
}

async function ensureApiCredential(agentId: string, agentCode: string, revealPrivate: boolean) {
  const { data: existing } = await supabaseAdmin
    .from('agent_api_credentials')
    .select('id, key_id, public_key, fingerprint, status, created_at, rotated_at, revoked_at')
    .eq('agent_id', agentId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (existing) return { ...existing, private_key: revealPrivate ? null : undefined, private_key_shown: false };
  const pair = generateEd25519Keypair('AGENT_API');
  const row = {
    id: randomUUID(),
    agent_id: agentId,
    key_id: pair.key_id,
    public_key: pair.public_key,
    fingerprint: pair.fingerprint,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    rotated_at: null,
    revoked_at: null,
  };
  const { error } = await supabaseAdmin.from('agent_api_credentials').insert(row);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit('API_CREDENTIAL_CREATED', '', agentId, { fingerprint: pair.fingerprint, agent_code: agentCode });
  return {
    ...row,
    private_key: pair.private_key,
    private_key_shown: true,
    notice: 'Your private key will not be shown again. Invify will never request your private key.',
  };
}

async function ensureConfig(agentId: string) {
  const { data: existing } = await supabaseAdmin
    .from('agent_webhook_configs')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();
  if (existing) return existing;
  const row = {
    id: randomUUID(),
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
  const { error } = await supabaseAdmin.from('agent_webhook_configs').insert(row);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit('WEBHOOK_CREATED', '', agentId, {});
  return row;
}

export async function getDeveloperSnapshot(authUserId: string, opts: { revealApiPrivateIfNew?: boolean } = {}) {
  const agent = await resolveAgentFromAuth(authUserId);
  const config = await ensureConfig(agent.id);
  const webhookKey = await ensureWebhookSigning(agent.id, agent.agent_code);
  const apiKey = await ensureApiCredential(agent.id, agent.agent_code, Boolean(opts.revealApiPrivateIfNew));
  const { count: total } = await supabaseAdmin
    .from('agent_webhook_events')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.id);
  const { count: failed } = await supabaseAdmin
    .from('agent_webhook_events')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .in('status', ['FAILED', 'DEAD_LETTER']);
  const { count: succeeded } = await supabaseAdmin
    .from('agent_webhook_events')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .eq('status', 'DELIVERED');
  return {
    agent: { id: agent.id, agent_code: agent.agent_code, email: agent.email },
    webhook: config,
    webhook_signing: publicWebhookCredential(webhookKey as any),
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
    payout_execution_enabled: isAgentPayoutExecutionEnabled(),
    fee_orchestration_live: isFeeOrchestrationLive(),
  };
}

export async function saveWebhook(authUserId: string, url: string, email: string) {
  const agent = await resolveAgentFromAuth(authUserId);
  const webhookUrl = validateWebhookUrl(url);
  await ensureConfig(agent.id);
  const { data, error } = await supabaseAdmin
    .from('agent_webhook_configs')
    .update({ webhook_url: webhookUrl, status: 'ENABLED', updated_at: new Date().toISOString() })
    .eq('agent_id', agent.id)
    .select()
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit('WEBHOOK_UPDATED', email, agent.id, { webhook_url_host: new URL(webhookUrl).host });
  return data;
}

export async function setWebhookStatus(authUserId: string, status: 'ENABLED' | 'DISABLED', email: string) {
  const agent = await resolveAgentFromAuth(authUserId);
  const { data, error } = await supabaseAdmin
    .from('agent_webhook_configs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('agent_id', agent.id)
    .select()
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit(status === 'ENABLED' ? 'WEBHOOK_ENABLED' : 'WEBHOOK_DISABLED', email, agent.id, {});
  return data;
}

export async function rotateWebhookSigning(authUserId: string, email: string, confirm: boolean) {
  if (!confirm) throw Object.assign(new Error('Rotation requires confirmation'), { code: 'CONFIRM_REQUIRED', status: 400 });
  const agent = await resolveAgentFromAuth(authUserId);
  const { data: old } = await supabaseAdmin
    .from('agent_webhook_signing_keys')
    .select('id, fingerprint')
    .eq('agent_id', agent.id)
    .eq('status', 'ACTIVE');
  const now = new Date().toISOString();
  if (old?.length) {
    await supabaseAdmin
      .from('agent_webhook_signing_keys')
      .update({ status: 'REVOKED', revoked_at: now, rotated_at: now })
      .eq('agent_id', agent.id)
      .eq('status', 'ACTIVE');
  }
  const pair = generateEd25519Keypair('WEBHOOK_SIGNING');
  const row = {
    id: randomUUID(),
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
  const { error } = await supabaseAdmin.from('agent_webhook_signing_keys').insert(row);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit('WEBHOOK_KEY_ROTATED', email, agent.id, {
    old_fingerprint: old?.[0]?.fingerprint || null,
    new_fingerprint: pair.fingerprint,
  });
  // Signing private key stays server-side. Agents verify with the public key.
  return publicWebhookCredential(row);
}

export async function rotateApiCredential(authUserId: string, email: string, confirm: boolean) {
  if (!confirm) throw Object.assign(new Error('Rotation requires confirmation'), { code: 'CONFIRM_REQUIRED', status: 400 });
  const agent = await resolveAgentFromAuth(authUserId);
  const { data: old } = await supabaseAdmin
    .from('agent_api_credentials')
    .select('id, fingerprint, key_id')
    .eq('agent_id', agent.id)
    .eq('status', 'ACTIVE');
  const now = new Date().toISOString();
  if (old?.length) {
    await supabaseAdmin
      .from('agent_api_credentials')
      .update({ status: 'REVOKED', revoked_at: now, rotated_at: now })
      .eq('agent_id', agent.id)
      .eq('status', 'ACTIVE');
  }
  const pair = generateEd25519Keypair('AGENT_API');
  const row = {
    id: randomUUID(),
    agent_id: agent.id,
    key_id: pair.key_id,
    public_key: pair.public_key,
    fingerprint: pair.fingerprint,
    status: 'ACTIVE',
    created_at: now,
    rotated_at: now,
    revoked_at: null,
  };
  const { error } = await supabaseAdmin.from('agent_api_credentials').insert(row);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
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

export async function listDeliveries(authUserId: string) {
  const agent = await resolveAgentFromAuth(authUserId);
  const { data } = await supabaseAdmin
    .from('agent_webhook_events')
    .select('id, event_type, status, attempt_count, last_http_status, created_at, last_attempt_at, tenant_id, payload')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data || []).map((row: any) => ({
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

export async function enqueueCommissionEvent(input: {
  agentId: string;
  agentCode: string;
  type: string;
  tenantId?: string | null;
  assessmentId?: string | null;
  payload: Record<string, unknown>;
}) {
  try {
    const live = isFeeOrchestrationLive();
    const payouts = isAgentPayoutExecutionEnabled();
    if (!allowedCommissionEvent(input.type, { live, payouts })) return null;
    const { data: config } = await supabaseAdmin
      .from('agent_webhook_configs')
      .select('id, webhook_url, status')
      .eq('agent_id', input.agentId)
      .maybeSingle();
    if (!config?.webhook_url || config.status !== 'ENABLED') return null;
    const eventId = randomUUID();
    const envelope = buildCommissionEnvelope({
      id: eventId,
      type: input.type,
      agent: { id: input.agentId, agent_code: input.agentCode },
      tenant: input.tenantId ? { id: input.tenantId } : undefined,
      commission: {
        currency: 'NGN',
        mode: live ? 'LIVE' : 'SHADOW',
        status: live ? 'AVAILABLE' : 'PENDING',
        available_kobo: live ? Number((input.payload as any).available_kobo || 0) : 0,
        ...input.payload,
      },
    });
    if (!live) {
      (envelope.commission as any).status = 'PENDING';
      (envelope.commission as any).available_kobo = 0;
      (envelope.commission as any).mode = 'SHADOW';
    }
    const { error } = await supabaseAdmin.from('agent_webhook_events').insert({
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
  } catch (err: any) {
    console.warn('[agent-webhook] enqueue swallowed', err?.message || err);
    return null;
  }
}

export async function enqueueTestEvent(authUserId: string, email: string) {
  const agent = await resolveAgentFromAuth(authUserId);
  const eventId = randomUUID();
  const envelope = buildCommissionEnvelope({
    id: eventId,
    type: 'webhook.test',
    agent: { id: agent.id, agent_code: agent.agent_code },
    test: true,
    commission: { currency: 'NGN', assessed_kobo: 0, agent_share_kobo: 0, mode: 'SHADOW', status: 'PENDING', available_kobo: 0 },
  });
  await supabaseAdmin.from('agent_webhook_events').insert({
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

export type WebhookTransport = (url: string, body: string, headers: Record<string, string>) => Promise<{ status: number }>;

export async function deliverDueEvents(transport?: WebhookTransport, now = new Date()) {
  const { data: due } = await supabaseAdmin
    .from('agent_webhook_events')
    .select('*')
    .in('status', ['PENDING', 'RETRY'])
    .lte('next_attempt_at', now.toISOString())
    .limit(25);
  const results = [];
  for (const event of due || []) {
    const claimUntil = new Date(now.getTime() + 60_000).toISOString();
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('agent_webhook_events')
      .update({ next_attempt_at: claimUntil, updated_at: now.toISOString() })
      .eq('id', event.id)
      .eq('attempt_count', event.attempt_count)
      .in('status', ['PENDING', 'RETRY'])
      .select('id')
      .maybeSingle();
    if (claimErr || !claimed?.id) continue;
    results.push(await deliverOne({ ...event, next_attempt_at: claimUntil }, transport));
  }
  return results;
}

async function deliverOne(event: any, transport?: WebhookTransport) {
  const { data: config } = await supabaseAdmin
    .from('agent_webhook_configs')
    .select('*')
    .eq('agent_id', event.agent_id)
    .maybeSingle();
  const { data: key } = await supabaseAdmin
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
  const signature = signWebhook(key.private_key, timestamp, event.payload);
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
  } catch (err: any) {
    await retryOrDead(event, attempt, 0, err?.message || 'delivery error');
    return { event_id: event.id, ok: false };
  }
}

async function retryOrDead(event: any, attempt: number, httpStatus: number, reason: string) {
  const dead = attempt >= WEBHOOK_MAX_ATTEMPTS;
  await markDelivery(event, attempt, dead ? 'DEAD_LETTER' : 'RETRY', httpStatus, reason, dead ? null : nextBackoffSeconds(attempt));
  await audit('WEBHOOK_DELIVERY_FAILED', '', event.agent_id, { event_id: event.id, attempt, reason: String(reason).slice(0, 200) });
}

async function markDelivery(
  event: any,
  attempt: number,
  status: string,
  httpStatus: number,
  reason: string | null,
  backoffSec?: number | null,
) {
  const now = new Date().toISOString();
  await supabaseAdmin.from('agent_webhook_deliveries').insert({
    id: randomUUID(),
    event_id: event.id,
    agent_id: event.agent_id,
    attempt_no: attempt,
    status,
    http_status: httpStatus,
    failure_reason: reason,
    created_at: now,
  });
  const patch: any = {
    status,
    attempt_count: attempt,
    last_attempt_at: now,
    last_http_status: httpStatus,
    last_error: reason,
    updated_at: now,
  };
  if (status === 'DELIVERED') patch.delivered_at = now;
  if (status === 'RETRY' && backoffSec) {
    patch.next_attempt_at = new Date(Date.now() + backoffSec * 1000).toISOString();
  }
  await supabaseAdmin.from('agent_webhook_events').update(patch).eq('id', event.id);
  const cfgPatch: any = { last_delivery_at: now, updated_at: now };
  if (status === 'DELIVERED') {
    cfgPatch.last_success_at = now;
    cfgPatch.failure_count = 0;
  } else {
    cfgPatch.last_failure_at = now;
  }
  if (status !== 'DELIVERED') {
    const { data: cfg } = await supabaseAdmin.from('agent_webhook_configs').select('failure_count').eq('agent_id', event.agent_id).maybeSingle();
    cfgPatch.failure_count = Number(cfg?.failure_count || 0) + 1;
  }
  await supabaseAdmin.from('agent_webhook_configs').update(cfgPatch).eq('agent_id', event.agent_id);
}

async function defaultTransport(url: string, body: string, headers: Record<string, string>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { method: 'POST', body, headers, signal: ctrl.signal });
    return { status: res.status };
  } finally {
    clearTimeout(t);
  }
}

export async function adminListWebhooks() {
  const { data } = await supabaseAdmin
    .from('agent_webhook_configs')
    .select('agent_id, webhook_url, status, failure_count, last_delivery_at, last_success_at, last_failure_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);
  const { data: agents } = await supabaseAdmin.from('agents').select('id, agent_code, email');
  const { data: keys } = await supabaseAdmin
    .from('agent_webhook_signing_keys')
    .select('agent_id, fingerprint, key_id, status')
    .eq('status', 'ACTIVE');
  const agentMap = new Map((agents || []).map((a: any) => [a.id, a]));
  const keyMap = new Map((keys || []).map((k: any) => [k.agent_id, k]));
  return (data || []).map((row: any) => ({
    ...row,
    agent_code: agentMap.get(row.agent_id)?.agent_code,
    email: agentMap.get(row.agent_id)?.email,
    fingerprint: keyMap.get(row.agent_id)?.fingerprint,
    key_id: keyMap.get(row.agent_id)?.key_id,
  }));
}

export async function adminSetWebhookStatus(agentId: string, status: 'ENABLED' | 'DISABLED', email: string) {
  const { data, error } = await supabaseAdmin
    .from('agent_webhook_configs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('agent_id', agentId)
    .select()
    .single();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  await audit(status === 'ENABLED' ? 'WEBHOOK_ENABLED' : 'WEBHOOK_DISABLED', email, agentId, { admin: true });
  return data;
}

export async function adminListDeliveries(agentId: string) {
  const { data } = await supabaseAdmin
    .from('agent_webhook_events')
    .select('id, event_type, status, attempt_count, last_http_status, created_at, last_attempt_at, tenant_id, payload')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data || []).map((row: any) => ({
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

export async function verifyAgentApiRequest(keyId: string, timestamp: string, envelope: unknown, signature: string) {
  const { data } = await supabaseAdmin
    .from('agent_api_credentials')
    .select('agent_id, public_key, status, key_id')
    .eq('key_id', keyId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (!data) throw Object.assign(new Error('Invalid API credential'), { status: 401, code: 'API_CREDENTIAL_INVALID' });
  const { isTimestampFresh, verifyWebhook } = await import('./agent-webhook-crypto');
  if (!isTimestampFresh(timestamp)) {
    throw Object.assign(new Error('Expired timestamp'), { status: 401, code: 'TIMESTAMP_EXPIRED' });
  }
  if (!verifyWebhook(data.public_key, timestamp, envelope, signature)) {
    throw Object.assign(new Error('Invalid signature'), { status: 401, code: 'INVALID_SIGNATURE' });
  }
  return { agent_id: data.agent_id, key_id: data.key_id };
}

export { assertAgentOwns };
