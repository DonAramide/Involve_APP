import { createHash, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify, randomUUID } from 'crypto';

export const WEBHOOK_EVENT_VERSION = '2026-01';
export const WEBHOOK_MAX_SKEW_SECONDS = 300;
export const WEBHOOK_TIMEOUT_MS = 5000;
export const WEBHOOK_MAX_ATTEMPTS = 8;

export const COMMISSION_EVENT_TYPES = [
  'commission.assessed',
  'commission.pending',
  'commission.available',
  'commission.withdrawal.requested',
  'commission.withdrawal.approved',
  'commission.withdrawal.rejected',
  'commission.withdrawal.completed',
  'commission.withdrawal.failed',
  'webhook.test',
] as const;

export type CommissionEventType = (typeof COMMISSION_EVENT_TYPES)[number];

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

export function fingerprintPublicKey(publicKeyPem: string): string {
  const hash = createHash('sha256').update(publicKeyPem).digest('hex');
  return hash.match(/.{2}/g)?.join(':') || hash;
}

export function generateEd25519Keypair(purpose: 'WEBHOOK_SIGNING' | 'AGENT_API') {
  const pair = generateKeyPairSync('ed25519');
  const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const keyId = `key_${purpose === 'WEBHOOK_SIGNING' ? 'wh' : 'api'}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return {
    purpose,
    key_id: keyId,
    public_key: publicKey,
    private_key: privateKey,
    fingerprint: fingerprintPublicKey(publicKey),
  };
}

export function signingPayload(timestamp: string, envelope: unknown): Buffer {
  return Buffer.from(`${timestamp}.${canonicalJson(envelope)}`, 'utf8');
}

export function signWebhook(privateKeyPem: string, timestamp: string, envelope: unknown): string {
  const key = { key: privateKeyPem, format: 'pem' as const };
  return cryptoSign(null, signingPayload(timestamp, envelope), key).toString('base64');
}

export function verifyWebhook(
  publicKeyPem: string,
  timestamp: string,
  envelope: unknown,
  signatureB64: string,
): boolean {
  try {
    const key = { key: publicKeyPem, format: 'pem' as const };
    const sig = Buffer.from(signatureB64, 'base64');
    return cryptoVerify(null, signingPayload(timestamp, envelope), key, sig);
  } catch {
    return false;
  }
}

export function isTimestampFresh(timestamp: string, nowMs = Date.now(), maxSkewSeconds = WEBHOOK_MAX_SKEW_SECONDS): boolean {
  const ts = Date.parse(timestamp) || Number(timestamp) * 1000;
  if (!Number.isFinite(ts)) return false;
  return Math.abs(nowMs - ts) <= maxSkewSeconds * 1000;
}

export function validateWebhookUrl(raw: string): string {
  const url = String(raw || '').trim();
  if (!url) throw Object.assign(new Error('Webhook URL is required'), { code: 'INVALID_WEBHOOK_URL' });
  if (url.length > 2048) throw Object.assign(new Error('Webhook URL is too long'), { code: 'INVALID_WEBHOOK_URL' });
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error('Webhook URL is invalid'), { code: 'INVALID_WEBHOOK_URL' });
  }
  const host = parsed.hostname.toLowerCase();
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (parsed.protocol === 'http:') {
    if (!local) throw Object.assign(new Error('Webhook URL must use HTTPS'), { code: 'INVALID_WEBHOOK_URL' });
  } else if (parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Webhook URL must use HTTPS'), { code: 'INVALID_WEBHOOK_URL' });
  }
  return parsed.toString();
}

export function allowedCommissionEvent(type: string, opts: { live: boolean; payouts: boolean }): boolean {
  if (type === 'webhook.test') return true;
  if (type === 'commission.assessed' || type === 'commission.pending') return true;
  if (type === 'commission.available') return opts.live === true;
  if (type === 'commission.withdrawal.completed') return opts.payouts === true;
  if (type.startsWith('commission.withdrawal.')) return true;
  return false;
}

export function nextBackoffSeconds(attempt: number): number {
  const exp = Math.min(8, Math.max(1, attempt));
  return Math.min(3600, 15 * 2 ** (exp - 1));
}

export function publicWebhookCredential(row: Record<string, unknown>) {
  const { private_key, private_key_pem, secret, ...rest } = row as any;
  return rest;
}

export function assertNoSecrets(payload: unknown): void {
  const raw = JSON.stringify(payload || {});
  if (/BEGIN (PRIVATE|RSA) KEY|private_key|api_secret|service_role|cvv|pan\b/i.test(raw)) {
    throw Object.assign(new Error('Payload contains forbidden secret material'), { code: 'SECRET_LEAK' });
  }
}

export function buildCommissionEnvelope(input: {
  id: string;
  type: string;
  agent: { id: string; agent_code: string };
  tenant?: { id: string; tenant_code?: string | null };
  transaction?: { id?: string | null; type?: string | null; reference?: string | null };
  commission?: Record<string, unknown>;
  test?: boolean;
}) {
  const envelope = {
    id: input.id,
    type: input.type,
    version: WEBHOOK_EVENT_VERSION,
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

export function assertAgentOwns(resourceAgentId: string, authAgentId: string) {
  if (!resourceAgentId || resourceAgentId !== authAgentId) {
    throw Object.assign(new Error('Forbidden'), { code: 'AGENT_ISOLATION', status: 403 });
  }
}
