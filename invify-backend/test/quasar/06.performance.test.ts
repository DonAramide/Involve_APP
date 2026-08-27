// test/quasar/06.performance.test.ts
/**
 * Performance Benchmarks — Quasar Integration Layer
 *
 * Validates that critical operations complete within defined SLA thresholds
 * when running against the mocked HTTP layer (pure compute budget — no network).
 *
 * Thresholds (offline, no I/O):
 *   - HMAC signature verification:  < 2ms per call
 *   - AES-256-GCM encrypt/decrypt:  < 5ms per call
 *   - QFP envelope parse + unwrap:  < 5ms per call (mocked)
 *   - 1000 concurrent QFP calls:    < 2000ms total
 *   - Deduplication key generation: < 1ms per call
 */

import * as crypto from 'crypto';
import { VaultEncryptionUtil } from '../../src/utils/vault-encryption.util';
import { QuasarWebhookService } from '../../src/integrations/quasar/quasar-webhook.service';
import { QuasarApiClient } from '../../src/integrations/quasar/quasar-api.client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockAxiosInstance(requestFn: jest.Mock) {
  mockedAxios.create.mockReturnValue({
    request: requestFn,
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  } as any);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ITERATIONS = 100;
const SECRET = 'perf_test_signing_secret_32bytes!!';
const SK     = 'sk_test_perf_secret_for_encryption_benchmark_001';

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function p99(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.99)];
}

// ─── HMAC Signature Benchmark ─────────────────────────────────────────────────

describe('Performance — HMAC signature verification', () => {

  const body = JSON.stringify({ event: 'payment.completed', data: { reference: 'PERF-001', amount: 5000 }, timestamp: Math.floor(Date.now() / 1000) });
  const sig  = crypto.createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');

  it(`verifies ${ITERATIONS} signatures with median < 2ms`, () => {
    const times: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      QuasarWebhookService.verifySignature(body, sig, SECRET);
      times.push(performance.now() - start);
    }
    const med = median(times);
    console.log(`  HMAC verify: median=${med.toFixed(3)}ms  p99=${p99(times).toFixed(3)}ms`);
    expect(med).toBeLessThan(2);
  });
});

// ─── AES-256-GCM Encryption Benchmark ────────────────────────────────────────

describe('Performance — AES-256-GCM encrypt/decrypt', () => {

  it(`encrypts ${ITERATIONS} secrets with median < 5ms`, () => {
    const times: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      VaultEncryptionUtil.encrypt(SK);
      times.push(performance.now() - start);
    }
    const med = median(times);
    console.log(`  AES-256-GCM encrypt: median=${med.toFixed(3)}ms  p99=${p99(times).toFixed(3)}ms`);
    expect(med).toBeLessThan(5);
  });

  it(`decrypts ${ITERATIONS} secrets with median < 5ms`, () => {
    const enc = VaultEncryptionUtil.encrypt(SK);
    const times: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      VaultEncryptionUtil.decrypt(enc);
      times.push(performance.now() - start);
    }
    const med = median(times);
    console.log(`  AES-256-GCM decrypt: median=${med.toFixed(3)}ms  p99=${p99(times).toFixed(3)}ms`);
    expect(med).toBeLessThan(5);
  });
});

// ─── QFP Unwrap Benchmark ─────────────────────────────────────────────────────

describe('Performance — QFP envelope unwrap (mocked HTTP)', () => {

  beforeEach(() => {
    const requestFn = jest.fn().mockResolvedValue({
      data: {
        responseCode: '00',
        responseMessage: 'Success',
        data: { id: 'wallet-perf', balance: 99999 },
      },
    });
    mockAxiosInstance(requestFn);
  });

  it(`processes ${ITERATIONS} mocked responses in < 1000ms total`, async () => {
    const client = new QuasarApiClient({ baseUrl: 'http://x', tenantAuth: { apiKey: 'sk_test' } });

    const start = performance.now();
    await Promise.all(Array.from({ length: ITERATIONS }, () => client.get('/wallets/1')));
    const total = performance.now() - start;

    console.log(`  QFP unwrap ×${ITERATIONS}: total=${total.toFixed(1)}ms  avg=${(total / ITERATIONS).toFixed(3)}ms`);
    expect(total).toBeLessThan(1000);
  });
});

// ─── Deduplication Key Generation ─────────────────────────────────────────────

describe('Performance — Deduplication key generation', () => {

  it(`generates ${ITERATIONS} dedupe keys with median < 1ms`, () => {
    const times: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      QuasarWebhookService.dedupeKey('payment.completed', `REF-${i}`);
      times.push(performance.now() - start);
    }
    const med = median(times);
    console.log(`  Dedupe key gen: median=${med.toFixed(3)}ms  p99=${p99(times).toFixed(3)}ms`);
    expect(med).toBeLessThan(1);
  });
});

// ─── Concurrent Load ──────────────────────────────────────────────────────────

describe('Performance — concurrent load (1000 calls)', () => {

  it('handles 1000 concurrent mocked API calls in < 3000ms', async () => {
    const requestFn = jest.fn().mockResolvedValue({
      data: { responseCode: '00', responseMessage: 'Success', data: {} },
    });
    mockAxiosInstance(requestFn);

    const client = new QuasarApiClient({ baseUrl: 'http://x', tenantAuth: { apiKey: 'sk_test' } });

    const start = performance.now();
    await Promise.all(Array.from({ length: 1000 }, (_, i) => client.get(`/wallets/${i % 10}`)));
    const total = performance.now() - start;

    console.log(`  1000 concurrent calls: total=${total.toFixed(1)}ms  avg=${(total / 1000).toFixed(3)}ms`);
    expect(total).toBeLessThan(3000);
  });
});
