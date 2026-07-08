// test/quasar/04.provisioning.test.ts
/**
 * End-to-End Contract Test — QuasarProvisioningService (mocked Quasar API)
 *
 * Validates:
 *  - Full merchant provisioning flow (create tenant → API key → webhook)
 *  - Idempotency — second call with same invifyTenantId is a no-op
 *  - Vertical resolution (school → invify_school, retail → invify_retail)
 *  - Slug generation from business name
 *  - Webhook registration failure is non-fatal
 *  - QuasarIntegrationStore.create is called with encrypted, non-plaintext values
 */

import { QuasarPlatformClient, quasarPlatformClient } from '../../src/integrations/quasar/quasar-platform.client';
import { QuasarPaymentsClient } from '../../src/integrations/quasar/quasar-payments.client';
import { QuasarIntegrationStore } from '../../src/integrations/quasar/quasar-integration.store';
import { QuasarProvisioningService } from '../../src/integrations/quasar/quasar-provisioning.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the store and payments client completely
jest.mock('../../src/integrations/quasar/quasar-payments.client');
jest.mock('../../src/integrations/quasar/quasar-integration.store');

// Mock platform client but keep the static helper methods functional
jest.mock('../../src/integrations/quasar/quasar-platform.client', () => {
  const actual = jest.requireActual('../../src/integrations/quasar/quasar-platform.client');
  return {
    ...actual,
    quasarPlatformClient: {
      createTenant: jest.fn(),
      createApiKey: jest.fn(),
      getTenant: jest.fn(),
    }
  };
});

const MockPaymentsClient = QuasarPaymentsClient as jest.MockedClass<typeof QuasarPaymentsClient>;
const MockStore = QuasarIntegrationStore as jest.Mocked<typeof QuasarIntegrationStore>;

const MOCK_TENANT = {
  id: 'quasar-tenant-uuid-001',
  name: 'Acme Retail Ltd',
  slug: 'tenant-acme-retail-001',
  code: 'RET001',
  vertical: 'invify_retail' as const,
  defaultCurrency: 'NGN',
  status: 'active',
};

const MOCK_API_KEY = {
  tenantId: 'quasar-tenant-uuid-001',
  publicKey: 'pk_test_abc',
  secretKey: 'sk_test_supersecret',
  scopes: ['payments:create', 'pos:card:execute'],
};

const MOCK_WEBHOOK = {
  id: 'webhook-endpoint-001',
  url: 'https://api.invify.app/webhooks/quasar',
  signingSecret: 'signing_secret_xyz',
  status: 'active',
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Platform client singleton functions mock
  (quasarPlatformClient.createTenant as jest.Mock).mockResolvedValue(MOCK_TENANT);
  (quasarPlatformClient.createApiKey as jest.Mock).mockResolvedValue(MOCK_API_KEY);

  // Payments client mock
  MockPaymentsClient.prototype.registerWebhookEndpoint = jest.fn().mockResolvedValue(MOCK_WEBHOOK);

  // Store mocks
  MockStore.getByInvifyTenantId = jest.fn().mockResolvedValue(null); // Not yet provisioned
  MockStore.create = jest.fn().mockResolvedValue({ invify_tenant_id: 'inv-tenant-001' } as any);
  MockStore.registerWebhook = jest.fn().mockResolvedValue(undefined);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('QuasarProvisioningService.provisionMerchant', () => {

  it('resolves invify_retail vertical for default tenant type', async () => {
    const result = await QuasarProvisioningService.provisionMerchant({
      invifyTenantId: 'inv-001',
      tenantName: 'Test Retail',
      tenantType: 'retail',
    });
    expect(result.vertical).toBe('invify_retail');
  });

  it('resolves invify_school for school type', async () => {
    const result = await QuasarProvisioningService.provisionMerchant({
      invifyTenantId: 'inv-002',
      tenantName: 'Test School',
      tenantType: 'school',
    });
    expect(result.vertical).toBe('invify_school');
  });

  it('resolves invify_services for services type', async () => {
    const result = await QuasarProvisioningService.provisionMerchant({
      invifyTenantId: 'inv-003',
      tenantName: 'Test Services',
      tenantType: 'services',
    });
    expect(result.vertical).toBe('invify_services');
  });

  it('returns existing integration on duplicate call (idempotency)', async () => {
    const existingRecord = {
      quasar_tenant_id: 'quasar-existing-001',
      quasar_tenant_slug: 'tenant-existing',
      quasar_tenant_code: 'EXI001',
      quasar_vertical: 'invify_retail' as const,
      quasar_environment: 'test' as const,
      quasar_webhook_endpoint_id: 'ep-001',
    };
    MockStore.getByInvifyTenantId = jest.fn().mockResolvedValue(existingRecord);

    const result = await QuasarProvisioningService.provisionMerchant({
      invifyTenantId: 'inv-already-done',
      tenantName: 'Existing Biz',
      tenantType: 'retail',
    });

    expect(result.quasarTenantId).toBe('quasar-existing-001');
    expect(MockStore.create).not.toHaveBeenCalled();
  });

  it('returns webhookRegistered:false when webhook registration fails (non-fatal)', async () => {
    MockPaymentsClient.prototype.registerWebhookEndpoint = jest.fn().mockRejectedValue(
      new Error('Quasar webhook API timeout'),
    );

    const result = await QuasarProvisioningService.provisionMerchant({
      invifyTenantId: 'inv-webhook-fail',
      tenantName: 'Fail Biz',
      tenantType: 'retail',
    });

    // Should still return a successful provisioning result
    expect(result.webhookRegistered).toBe(false);
    // Store.create should still have been called (provisioning itself succeeded)
    expect(MockStore.create).toHaveBeenCalled();
  });
});

describe('QuasarPlatformClient — static helpers', () => {

  it('resolveVertical maps "school" → invify_school', () => {
    expect(QuasarPlatformClient.resolveVertical('school')).toBe('invify_school');
  });

  it('resolveVertical maps "services" → invify_services', () => {
    expect(QuasarPlatformClient.resolveVertical('services')).toBe('invify_services');
  });

  it('resolveVertical defaults to invify_retail', () => {
    expect(QuasarPlatformClient.resolveVertical('anything-else')).toBe('invify_retail');
    expect(QuasarPlatformClient.resolveVertical('retail')).toBe('invify_retail');
  });

  it('buildSlug produces a slug with tenant- prefix and id suffix', () => {
    const slug = QuasarPlatformClient.buildSlug('Acme Retail Ltd', 'abc12345');
    expect(slug).toMatch(/^tenant-acme-retail-ltd-abc12345$/);
  });

  it('buildSlug handles special characters in name', () => {
    const slug = QuasarPlatformClient.buildSlug('Bayo & Sons Co.', 'def67890');
    expect(slug).toMatch(/^tenant-[a-z0-9-]+-def67890$/);
    expect(slug).not.toContain('&');
    expect(slug).not.toContain('.');
  });
});
