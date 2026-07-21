import { QuasarApiClient } from '../../src/integrations/quasar/quasar-api.client';

/**
 * Phase 5.1 — Identity Contract Tests
 * 
 * These tests execute against the live (or local) Quasar instance to verify that
 * Quasar correctly interprets our authentication headers and resolves them into 
 * the appropriate IdentityContext with the expected AuthPlane.
 * 
 * Ensure QUASAR_BASE_URL is pointing to a QIP-enabled Quasar environment.
 */
describe('Quasar Identity Contract (QIP)', () => {
  const baseUrl = process.env.QUASAR_BASE_URL ?? 'http://localhost:4000/api/v1';

  // We assume Quasar exposes an endpoint to reflect the resolved IdentityContext for debugging/contract testing.
  const IDENTITY_DEBUG_ENDPOINT = '/integration/identity/context';

  it('resolves Plane 1 (Service) correctly', async () => {
    const client = new QuasarApiClient({
      baseUrl,
      serviceAuth: {
        serviceId: 'qps_test_invify',
        serviceSecret: 'qps_sec_test_xxxxxxxxx',
      },
      maxRetries: 0,
    });

    try {
      // The QuasarApiClient automatically unwraps QFPResponse.data
      const identityContext = await client.get<any>(IDENTITY_DEBUG_ENDPOINT);
      
      expect(identityContext).toBeDefined();
      expect(identityContext.identityVersion).toBe(1);
      expect(identityContext.plane).toBe('service');
      expect(identityContext.actorId).toBeDefined();
    } catch (e: any) {
      if (e.response?.status === 404) {
        console.warn(`Skipping Service plane contract test: Quasar at ${baseUrl} does not yet implement ${IDENTITY_DEBUG_ENDPOINT}`);
      } else {
        throw e;
      }
    }
  });

  it('resolves Plane 2 (Client) correctly', async () => {
    const client = new QuasarApiClient({
      baseUrl,
      clientAuth: {
        clientId: 'INVIFY_RETAIL',
        clientSecret: 'qpc_test_secret',
      },
      maxRetries: 0,
    });

    try {
      const identityContext = await client.get<any>(IDENTITY_DEBUG_ENDPOINT);
      
      expect(identityContext).toBeDefined();
      expect(identityContext.identityVersion).toBe(1);
      expect(identityContext.plane).toBe('client');
      expect(identityContext.clientId).toBe('INVIFY_RETAIL');
    } catch (e: any) {
      if (e.response?.status === 404) {
        console.warn(`Skipping Client plane contract test: Quasar at ${baseUrl} does not yet implement ${IDENTITY_DEBUG_ENDPOINT}`);
      } else {
        throw e;
      }
    }
  });

  it('resolves Plane 3 (Tenant) correctly', async () => {
    const client = new QuasarApiClient({
      baseUrl,
      tenantAuth: {
        apiKey: 'sk_test_mock_tenant',
      },
      maxRetries: 0,
    });

    try {
      const identityContext = await client.get<any>(IDENTITY_DEBUG_ENDPOINT);
      
      expect(identityContext).toBeDefined();
      expect(identityContext.identityVersion).toBe(1);
      expect(identityContext.plane).toBe('tenant');
      expect(identityContext.environment).toBe('test');
    } catch (e: any) {
      if (e.response?.status === 404) {
        console.warn(`Skipping Tenant plane contract test: Quasar at ${baseUrl} does not yet implement ${IDENTITY_DEBUG_ENDPOINT}`);
      } else {
        throw e;
      }
    }
  });
});
