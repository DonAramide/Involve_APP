// test/quasar/03.api-client.test.ts
/**
 * Contract Test — QuasarApiClient (mocked HTTP)
 *
 * Validates:
 *  - Correct auth headers injected per client type (partner vs tenant)
 *  - X-Correlation-Id present on every request
 *  - Idempotency-Key forwarded when provided
 *  - QFP envelope unwrapping (responseCode "00" → success, non-00 → throws)
 *  - Retry triggered on 429/500
 *  - No retry on 400/403
 *  - Circuit breaker state exposed correctly
 *
 * Offline — axios instance is spied on directly.
 */

import axios, { AxiosInstance } from 'axios';
import { QuasarApiClient, QuasarApiError, QuasarApiClientOptions } from '../../src/integrations/quasar/quasar-api.client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset shared circuit breaker state so tests don't bleed into each other
  QuasarApiClient.resetCircuit();
});

/**
 * Build a client and immediately replace its internal http.request with a spy.
 * This avoids the axios.create() mock timing problem.
 */
function buildClientWithSpy(opts?: Partial<QuasarApiClientOptions>): {
  client: QuasarApiClient;
  spy: jest.Mock;
} {
  const client = new QuasarApiClient({
    baseUrl: 'https://test.quasar.local/api/v1',
    tenantApiKey: 'sk_test_unit',
    maxRetries: 3,
    ...opts,
  });
  const spy = jest.fn();
  // Replace the private http instance's request method
  (client as any).http = { request: spy };
  return { client, spy };
}

function qfpSuccess(data: any) {
  return { data: { responseCode: '00', responseMessage: 'Success', data } };
}

function axiosErr(status: number, responseCode = '01', message = 'Error') {
  const err: any = new Error(message);
  err.response = { status, data: { responseCode, responseMessage: message } };
  return err;
}

// ─── Auth header injection ────────────────────────────────────────────────────

describe('QuasarApiClient — auth header injection', () => {

  it('injects Authorization: Bearer for tenant API key', async () => {
    const { client, spy } = buildClientWithSpy({ tenantApiKey: 'sk_test_abc' });
    spy.mockResolvedValue(qfpSuccess({ wallets: [] }));

    await client.get('/wallets');

    const callArgs = spy.mock.calls[0][0];
    expect(callArgs.headers['Authorization']).toBe('Bearer sk_test_abc');
  });

  it('injects X-Quasar-Client-Id/Secret for partner credentials', async () => {
    const { client, spy } = buildClientWithSpy({
      tenantApiKey: undefined,
      partnerAuth: { clientId: 'INVIFY_RETAIL', clientSecret: 'qpc_test' },
    });
    spy.mockResolvedValue(qfpSuccess({}));

    await client.get('/integration/platform/tenants/abc');

    const callArgs = spy.mock.calls[0][0];
    expect(callArgs.headers['X-Quasar-Client-Id']).toBe('INVIFY_RETAIL');
    expect(callArgs.headers['X-Quasar-Client-Secret']).toBe('qpc_test');
    expect(callArgs.headers['Authorization']).toBeUndefined();
  });

  it('always includes X-Correlation-Id as a UUID', async () => {
    const { client, spy } = buildClientWithSpy();
    spy.mockResolvedValue(qfpSuccess({}));

    await client.get('/wallets');

    const callArgs = spy.mock.calls[0][0];
    const correlationId = callArgs.headers['X-Correlation-Id'];
    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('uses provided correlationId when given', async () => {
    const { client, spy } = buildClientWithSpy();
    spy.mockResolvedValue(qfpSuccess({}));

    await client.get('/wallets', { correlationId: 'fixed-correlation-id' });

    const callArgs = spy.mock.calls[0][0];
    expect(callArgs.headers['X-Correlation-Id']).toBe('fixed-correlation-id');
  });

  it('forwards Idempotency-Key when provided', async () => {
    const { client, spy } = buildClientWithSpy();
    spy.mockResolvedValue(qfpSuccess({}));

    await client.post('/payments/intents', {}, { idempotencyKey: 'idem-key-001' });

    const callArgs = spy.mock.calls[0][0];
    expect(callArgs.headers['Idempotency-Key']).toBe('idem-key-001');
  });

  it('omits Idempotency-Key when not provided', async () => {
    const { client, spy } = buildClientWithSpy();
    spy.mockResolvedValue(qfpSuccess({}));

    await client.get('/wallets');

    const callArgs = spy.mock.calls[0][0];
    expect(callArgs.headers['Idempotency-Key']).toBeUndefined();
  });
});

// ─── QFP envelope ─────────────────────────────────────────────────────────────

describe('QuasarApiClient — QFP envelope', () => {

  it('unwraps data on responseCode "00"', async () => {
    const { client, spy } = buildClientWithSpy();
    spy.mockResolvedValue(qfpSuccess({ id: 'tenant-1' }));

    const result = await client.get<{ id: string }>('/integration/platform/tenants/1');
    expect(result).toEqual({ id: 'tenant-1' });
  });

  it('throws QuasarApiError on non-"00" responseCode', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 1 });
    spy.mockResolvedValue({ data: { responseCode: '22', responseMessage: 'Tenant already exists' } });

    await expect(client.get('/test')).rejects.toThrow(QuasarApiError);
  });

  it('QuasarApiError includes responseCode', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 1 });
    spy.mockResolvedValue({ data: { responseCode: '22', responseMessage: 'Conflict' } });

    await expect(client.get('/test')).rejects.toMatchObject({ responseCode: '22' });
  });
});

// ─── Retry behaviour ──────────────────────────────────────────────────────────

describe('QuasarApiClient — retry behaviour', () => {

  it('retries on HTTP 429 up to maxRetries', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 3 });
    spy.mockRejectedValue(axiosErr(429, '29', 'Rate limited'));

    await expect(client.get('/wallets')).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(3);
  }, 15000);

  it('retries on HTTP 500', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 3 });
    spy.mockRejectedValue(axiosErr(500));

    await expect(client.get('/wallets')).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(3);
  }, 15000);

  it('does NOT retry on HTTP 403 (client error)', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 3 });
    spy.mockRejectedValue(axiosErr(403, '03', 'Forbidden'));

    await expect(client.get('/wallets')).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on HTTP 400 (bad request)', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 3 });
    spy.mockRejectedValue(axiosErr(400, '40', 'Bad request'));

    await expect(client.get('/wallets')).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('succeeds on second attempt after one 503', async () => {
    const { client, spy } = buildClientWithSpy({ maxRetries: 3 });
    spy
      .mockRejectedValueOnce(axiosErr(503))
      .mockResolvedValueOnce(qfpSuccess({ id: 'ok' }));

    const result = await client.get('/wallets');
    expect(result).toEqual({ id: 'ok' });
    expect(spy).toHaveBeenCalledTimes(2);
  }, 10000);
});

// ─── Circuit breaker ──────────────────────────────────────────────────────────

describe('QuasarApiClient — circuit breaker', () => {

  it('exposes circuit state via static getter', () => {
    const state = QuasarApiClient.getCircuitState();
    expect(state).toHaveProperty('failures');
    expect(state).toHaveProperty('isOpen');
    expect(state).toHaveProperty('openedAt');
  });

  it('circuit state is a snapshot (not a reference)', () => {
    const state1 = QuasarApiClient.getCircuitState();
    const state2 = QuasarApiClient.getCircuitState();
    expect(state1).not.toBe(state2); // different object references
  });
});
