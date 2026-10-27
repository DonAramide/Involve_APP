import {
  allowedCommissionEvent,
  assertAgentOwns,
  assertNoSecrets,
  buildCommissionEnvelope,
  canonicalJson,
  generateEd25519Keypair,
  isTimestampFresh,
  publicWebhookCredential,
  signWebhook,
  validateWebhookUrl,
  verifyWebhook,
} from '../src/modules/agent-portal/services/agent-webhook-crypto';
import * as fs from 'fs';
import * as path from 'path';

describe('agent webhook crypto and policy', () => {
  test('validates https webhook URLs and localhost http', () => {
    expect(validateWebhookUrl('https://agent.example.com/hooks')).toMatch(/^https:/);
    expect(validateWebhookUrl('http://localhost:3000/hook')).toMatch(/localhost/);
    expect(() => validateWebhookUrl('http://evil.example/hook')).toThrow(/HTTPS/);
    expect(() => validateWebhookUrl('javascript:alert(1)')).toThrow();
  });

  test('Ed25519 sign/verify and reject tamper', () => {
    const pair = generateEd25519Keypair('WEBHOOK_SIGNING');
    const envelope = buildCommissionEnvelope({
      id: 'evt_1',
      type: 'commission.assessed',
      agent: { id: 'agent-a', agent_code: 'A001' },
      commission: { currency: 'NGN', assessed_kobo: 1250, agent_share_kobo: 614, mode: 'SHADOW', status: 'PENDING', available_kobo: 0 },
    });
    const ts = new Date().toISOString();
    const sig = signWebhook(pair.private_key, ts, envelope);
    expect(verifyWebhook(pair.public_key, ts, envelope, sig)).toBe(true);
    const other = generateEd25519Keypair('WEBHOOK_SIGNING');
    expect(verifyWebhook(other.public_key, ts, envelope, sig)).toBe(false);
    expect(verifyWebhook(pair.public_key, ts, { ...envelope, type: 'tamper' }, sig)).toBe(false);
  });

  test('expired timestamp rejected', () => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isTimestampFresh(old)).toBe(false);
    expect(isTimestampFresh(new Date().toISOString())).toBe(true);
  });

  test('canonical json is stable', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  test('shadow events stay pending with available 0', () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    expect(allowedCommissionEvent('commission.assessed', { live: false, payouts: false })).toBe(true);
    expect(allowedCommissionEvent('commission.pending', { live: false, payouts: false })).toBe(true);
    expect(allowedCommissionEvent('commission.available', { live: false, payouts: false })).toBe(false);
    expect(allowedCommissionEvent('commission.withdrawal.completed', { live: false, payouts: false })).toBe(false);
    const env = buildCommissionEnvelope({
      id: 'evt_shadow',
      type: 'commission.pending',
      agent: { id: 'a', agent_code: 'A001' },
      commission: { currency: 'NGN', assessed_kobo: 10, agent_share_kobo: 10, mode: 'SHADOW', status: 'PENDING', available_kobo: 0 },
    });
    expect(env.commission).toMatchObject({ mode: 'SHADOW', status: 'PENDING', available_kobo: 0 });
  });

  test('private key stripped from public credential view', () => {
    const view = publicWebhookCredential({ key_id: 'k', public_key: 'pub', private_key: 'SECRET', fingerprint: 'aa' });
    expect(JSON.stringify(view)).not.toMatch(/SECRET|private_key/);
  });

  test('payload rejects secrets', () => {
    expect(() => assertNoSecrets({ pan: '411111' })).toThrow();
    expect(() => assertNoSecrets({ note: 'ok' })).not.toThrow();
  });

  test('agent isolation helper', () => {
    expect(() => assertAgentOwns('a', 'b')).toThrow(/Forbidden/);
    expect(() => assertAgentOwns('a', 'a')).not.toThrow();
  });

  test('retry reuses event id contract in delivery unique constraint', () => {
    const sql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20260928020000_agent_webhooks_and_api_credentials.sql'),
      'utf8',
    );
    expect(sql).toMatch(/agent_webhook_deliveries_event_attempt_unique/);
    expect(sql).toMatch(/agent_webhook_events/);
    expect(sql).toMatch(/agent_api_credentials/);
    expect(sql).toMatch(/private_key TEXT NOT NULL/);
    expect(sql).toMatch(/GRANT SELECT \(id, agent_id, key_id, public_key, fingerprint/);
  });

  test('GET snapshot source never selects private_key for existing webhook keys', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/modules/agent-portal/services/agent-webhook.service.ts'),
      'utf8',
    );
    expect(src).toMatch(/select\('id, key_id, public_key, fingerprint, status, created_at, rotated_at, revoked_at'\)/);
    expect(src).toMatch(/WEBHOOK_TEST_SENT/);
    expect(src).toMatch(/API_CREDENTIAL_ROTATED/);
    expect(src).not.toMatch(/USER_WALLET/);
    expect(src).toMatch(/enqueue swallowed/);
  });

  test('API credential is a separate purpose from webhook signing', () => {
    const a = generateEd25519Keypair('WEBHOOK_SIGNING');
    const b = generateEd25519Keypair('AGENT_API');
    expect(a.purpose).not.toBe(b.purpose);
    expect(a.key_id).not.toBe(b.key_id);
  });

  test('v1 withdrawals remain PAYOUT_DISABLED', () => {
    const ctl = fs.readFileSync(
      path.join(__dirname, '../src/modules/agent-portal/controllers/agent-webhook.controller.ts'),
      'utf8',
    );
    expect(ctl).toMatch(/PAYOUT_DISABLED/);
    expect(ctl).toMatch(/v1Withdrawals/);
  });
});
