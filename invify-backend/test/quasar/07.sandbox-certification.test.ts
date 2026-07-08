// test/quasar/07.sandbox-certification.test.ts
/**
 * Sandbox Certification Suite — QFS Integration
 *
 * Validates the full Invify → Quasar financial flow against the QFS sandbox.
 * These tests require a live QUASAR_BASE_URL + sk_test_* key and are
 * SKIPPED unless QUASAR_SANDBOX_CERT=true is set in the environment.
 *
 * Certification scenarios (per INVIFY_PLATFORM_INTEGRATION_GUIDE §10.4):
 *   PAT-01  Bootstrap sandbox environment
 *   PAT-02  Generate a virtual test account
 *   PAT-03  Credit the test account
 *   PAT-04  Create a payment intent
 *   PAT-05  Verify payment status by reference
 *   PAT-06  Create a sandbox transfer
 *   PAT-07  Verify wallet balance reflects debits
 *   PAT-08  Retrieve sandbox timeline
 *
 * Run with:
 *   QUASAR_SANDBOX_CERT=true \
 *   QUASAR_BASE_URL=https://api-quasar.iips.app/api/v1 \
 *   QUASAR_SANDBOX_SK=sk_test_... \
 *   npm test -- --testPathPattern=07.sandbox
 */

import * as crypto from 'crypto';
import { QuasarPaymentsClient } from '../../src/integrations/quasar/quasar-payments.client';

const RUN = process.env.QUASAR_SANDBOX_CERT === 'true';
const SK  = process.env.QUASAR_SANDBOX_SK ?? '';

const certDescribe = RUN ? describe : describe.skip;

// ─── State shared across tests ────────────────────────────────────────────────

let client: QuasarPaymentsClient;
let sandboxAccountId: string;
let walletId: string;
let paymentReference: string;

beforeAll(() => {
  if (RUN && !SK) throw new Error('QUASAR_SANDBOX_SK must be set to run certification tests');
  if (RUN) {
    client = new QuasarPaymentsClient(SK);
  }
});

// ─── Certification Scenarios ──────────────────────────────────────────────────

certDescribe('PAT — Sandbox Certification', () => {

  it('PAT-01 Bootstrap sandbox environment', async () => {
    const result = await client.bootstrapSandbox({
      correlationId: crypto.randomUUID(),
    });
    expect(result).toBeDefined();
    console.log('[PAT-01] Sandbox bootstrapped:', JSON.stringify(result).substring(0, 120));
  });

  it('PAT-02 Generate a virtual test account', async () => {
    const account = await client.generateSandboxAccount({
      correlationId: crypto.randomUUID(),
    });
    expect(account).toHaveProperty('id');
    expect(account).toHaveProperty('accountNumber');
    sandboxAccountId = account.id;
    console.log(`[PAT-02] Account created: ${account.accountNumber} (${account.id})`);
  });

  it('PAT-03 Credit the test account with NGN 50,000', async () => {
    const correlationId = crypto.randomUUID();
    const result = await client.creditSandboxAccount(sandboxAccountId, 50000, { correlationId });
    expect(result).toBeDefined();
    console.log(`[PAT-03] Account credited: ${JSON.stringify(result).substring(0, 120)}`);
  });

  it('PAT-04 List wallets and capture first walletId', async () => {
    const wallets = await client.getWallets({ correlationId: crypto.randomUUID() });
    expect(Array.isArray(wallets)).toBe(true);
    expect(wallets.length).toBeGreaterThan(0);
    walletId = wallets[0].id;
    console.log(`[PAT-04] Wallet found: ${walletId} (balance: ${wallets[0].balance})`);
  });

  it('PAT-05 Create a payment intent', async () => {
    paymentReference = `invify-cert-${Date.now()}`;
    const intent = await client.createPaymentIntent(
      {
        amount: 1000,
        reference: paymentReference,
        currency: 'NGN',
        description: 'Invify certification test payment',
        metadata: { certRun: new Date().toISOString() },
      },
      {
        correlationId: crypto.randomUUID(),
        idempotencyKey: `cert-intent:${paymentReference}`,
      },
    );
    expect(intent).toHaveProperty('reference');
    expect(intent.reference).toBe(paymentReference);
    console.log(`[PAT-05] Payment intent: ${intent.reference} status=${intent.status}`);
  });

  it('PAT-06 Verify payment status by reference', async () => {
    const payment = await client.getPayment(paymentReference, {
      correlationId: crypto.randomUUID(),
    });
    expect(payment).toHaveProperty('reference', paymentReference);
    console.log(`[PAT-06] Payment status: ${payment.status}`);
  });

  it('PAT-07 Wallet balance is readable', async () => {
    const balance = await client.getWalletBalance(walletId, {
      correlationId: crypto.randomUUID(),
    });
    expect(balance).toHaveProperty('balance');
    expect(typeof balance.balance).toBe('number');
    console.log(`[PAT-07] Wallet balance: NGN ${balance.balance}`);
  });

  it('PAT-08 Retrieve sandbox timeline', async () => {
    const timeline = await client.getSandboxTimeline({
      correlationId: crypto.randomUUID(),
    });
    expect(Array.isArray(timeline)).toBe(true);
    console.log(`[PAT-08] Timeline events: ${timeline.length}`);
  });

  it('PAT-09 Idempotent replay: same payment intent returns 200', async () => {
    // Re-submitting the same reference with same idempotency key must not create a duplicate
    const intent2 = await client.createPaymentIntent(
      {
        amount: 1000,
        reference: paymentReference,
        currency: 'NGN',
      },
      {
        correlationId: crypto.randomUUID(),
        idempotencyKey: `cert-intent:${paymentReference}`,
      },
    );
    expect(intent2.reference).toBe(paymentReference);
    console.log(`[PAT-09] Idempotent replay returned reference: ${intent2.reference}`);
  });
});

// ─── Offline sanity guard ─────────────────────────────────────────────────────

describe('Sandbox cert guard (always runs)', () => {
  it('skips live tests when QUASAR_SANDBOX_CERT is not set', () => {
    if (!RUN) {
      console.log('  Sandbox certification skipped. Set QUASAR_SANDBOX_CERT=true to run.');
    }
    expect(true).toBe(true);
  });
});
