// test/quasar/01.signature.test.ts
/**
 * Contract Test — QuasarWebhookService.verifySignature
 *
 * Validates the exact HMAC-SHA256 algorithm, constant-time comparison,
 * timestamp replay protection, and edge cases.
 *
 * These tests run offline — no Quasar network calls.
 */

import * as crypto from 'crypto';
import { QuasarWebhookService } from '../../src/integrations/quasar/quasar-webhook.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

const SECRET = 'test_signing_secret_abcdef1234567890';
const BODY   = JSON.stringify({ event: 'payment.completed', data: { reference: 'REF-001', amount: 5000 }, timestamp: Math.floor(Date.now() / 1000) });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('QuasarWebhookService.verifySignature', () => {

  it('accepts a valid HMAC-SHA256 signature', () => {
    const sig = makeSignature(BODY, SECRET);
    expect(QuasarWebhookService.verifySignature(BODY, sig, SECRET)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = makeSignature(BODY, SECRET);
    const tamperedBody = BODY + 'x';
    expect(QuasarWebhookService.verifySignature(tamperedBody, sig, SECRET)).toBe(false);
  });

  it('rejects an invalid signature', () => {
    const sig = 'a'.repeat(64); // wrong hex
    expect(QuasarWebhookService.verifySignature(BODY, sig, SECRET)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const sig = makeSignature(BODY, 'wrong-secret');
    expect(QuasarWebhookService.verifySignature(BODY, sig, SECRET)).toBe(false);
  });

  it('rejects a payload with timestamp > 5 minutes old (replay attack)', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6m40s ago
    const oldBody = JSON.stringify({ event: 'payment.completed', data: {}, timestamp: oldTimestamp });
    const sig = makeSignature(oldBody, SECRET);
    expect(QuasarWebhookService.verifySignature(oldBody, sig, SECRET, oldTimestamp)).toBe(false);
  });

  it('accepts a payload with timestamp within 5 minutes', () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1m ago
    const body = JSON.stringify({ event: 'payment.completed', data: {}, timestamp: recentTimestamp });
    const sig = makeSignature(body, SECRET);
    expect(QuasarWebhookService.verifySignature(body, sig, SECRET, recentTimestamp)).toBe(true);
  });

  it('accepts no timestamp (backward compat — no replay check)', () => {
    const body = JSON.stringify({ event: 'transfer.completed', data: {} });
    const sig = makeSignature(body, SECRET);
    expect(QuasarWebhookService.verifySignature(body, sig, SECRET, undefined)).toBe(true);
  });

  it('rejects mismatched buffer lengths (padding attack)', () => {
    const shortSig = 'ab12';
    expect(QuasarWebhookService.verifySignature(BODY, shortSig, SECRET)).toBe(false);
  });
});

// ─── Idempotency key generation ───────────────────────────────────────────────

describe('QuasarWebhookService.dedupeKey', () => {
  it('produces stable keys for the same inputs', () => {
    const k1 = QuasarWebhookService.dedupeKey('payment.completed', 'REF-001');
    const k2 = QuasarWebhookService.dedupeKey('payment.completed', 'REF-001');
    expect(k1).toBe(k2);
  });

  it('produces different keys for different events', () => {
    const k1 = QuasarWebhookService.dedupeKey('payment.completed', 'REF-001');
    const k2 = QuasarWebhookService.dedupeKey('transfer.completed', 'REF-001');
    expect(k1).not.toBe(k2);
  });

  it('produces different keys for different references', () => {
    const k1 = QuasarWebhookService.dedupeKey('payment.completed', 'REF-001');
    const k2 = QuasarWebhookService.dedupeKey('payment.completed', 'REF-002');
    expect(k1).not.toBe(k2);
  });
});

// ─── Event dispatch ───────────────────────────────────────────────────────────

describe('QuasarWebhookService.dispatch', () => {
  it('calls the matching handler with payload and tenantId', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const payload = { event: 'payment.completed', data: { reference: 'REF-X' }, timestamp: Date.now() };

    const result = await QuasarWebhookService.dispatch(payload, 'tenant-123', {
      'payment.completed': handler,
    });

    expect(handler).toHaveBeenCalledWith(payload, 'tenant-123');
    expect(result).toEqual({ handled: true, event: 'payment.completed' });
  });

  it('returns handled:false for unknown events without throwing', async () => {
    const payload = { event: 'unknown.event', data: {}, timestamp: Date.now() };
    const result = await QuasarWebhookService.dispatch(payload, 'tenant-123', {});
    expect(result).toEqual({ handled: false, event: 'unknown.event' });
  });

  it('returns handled:false when event field is missing', async () => {
    const payload = { event: '', data: {}, timestamp: Date.now() };
    const result = await QuasarWebhookService.dispatch(payload, 'tenant-123', {});
    expect(result.handled).toBe(false);
  });

  it('propagates handler errors', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('handler failure'));
    const payload = { event: 'payment.completed', data: {}, timestamp: Date.now() };

    await expect(
      QuasarWebhookService.dispatch(payload, 'tenant-123', { 'payment.completed': handler }),
    ).rejects.toThrow('handler failure');
  });
});
