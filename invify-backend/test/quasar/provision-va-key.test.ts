import * as fs from 'fs';
import * as path from 'path';
import { BuildVariantService } from '../../src/config/build-variant';
import { QuasarIntegrationStore } from '../../src/integrations/quasar/quasar-integration.store';
import { IntegrationVaultService } from '../../src/services/integration-vault.service';
import { QuasarService } from '../../src/integrations/quasar/quasar.service';
import { getQuasarService } from '../../src/integrations/quasar/factory';

jest.mock('../../src/integrations/quasar/quasar-integration.store');
jest.mock('../../src/services/integration-vault.service');
jest.mock('../../src/integrations/quasar/quasar.service', () => ({
  QuasarService: jest.fn().mockImplementation((apiKey: string, webhookSecret: string) => ({
    apiKey,
    webhookSecret,
    createVirtualAccount: jest.fn(),
  })),
}));

const MockStore = QuasarIntegrationStore as jest.Mocked<typeof QuasarIntegrationStore>;
const MockVault = IntegrationVaultService as jest.Mocked<typeof IntegrationVaultService>;
const MockQuasarService = QuasarService as unknown as jest.Mock;

const TENANT = '958da8d2-eabe-4ffa-a892-76affac3ece0';
const SK_TEST = 'sk_test_unit_fixture_not_for_runtime';
const SK_LIVE = 'sk_live_unit_fixture_not_for_runtime';

describe('provision-va tenant Quasar key resolution', () => {
  const origBuild = process.env.BUILD_VARIANT;
  const origApp = process.env.APP_ENV;
  const origNode = process.env.NODE_ENV;
  const origQuasar = process.env.QUASAR_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.QUASAR_API_KEY;
    delete process.env.QUASER_API_KEY;
    process.env.BUILD_VARIANT = 'LOCAL';
    process.env.APP_ENV = 'test';
    process.env.NODE_ENV = 'test';
    BuildVariantService.resetInstance();
    MockStore.getByInvifyTenantId.mockResolvedValue(null as any);
    MockStore.decryptSkSecret.mockReturnValue('');
    MockVault.getDecryptedCredential.mockResolvedValue(null);
  });

  afterEach(() => {
    if (origBuild === undefined) delete process.env.BUILD_VARIANT;
    else process.env.BUILD_VARIANT = origBuild;
    if (origApp === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = origApp;
    if (origNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = origNode;
    if (origQuasar === undefined) delete process.env.QUASAR_API_KEY;
    else process.env.QUASAR_API_KEY = origQuasar;
    BuildVariantService.resetInstance();
  });

  it('A: tenant test integration uses sk_test without QUASAR_API_KEY', async () => {
    MockStore.getByInvifyTenantId.mockResolvedValue({
      quasar_sk_secret_enc: 'enc',
      quasar_environment: 'test',
    } as any);
    MockStore.decryptSkSecret.mockReturnValue(SK_TEST);

    const svc = await getQuasarService(TENANT, { tenantIntegrationOnly: true });

    expect(MockStore.getByInvifyTenantId).toHaveBeenCalledWith(TENANT);
    expect(MockVault.getDecryptedCredential).not.toHaveBeenCalled();
    expect(MockQuasarService).toHaveBeenCalledWith(SK_TEST, expect.any(String));
    expect(svc).toBeTruthy();
    expect(process.env.QUASAR_API_KEY).toBeUndefined();
  });

  it('B: missing integration fails closed and does not use demo-key', async () => {
    MockStore.getByInvifyTenantId.mockResolvedValue(null);

    await expect(getQuasarService(TENANT, { tenantIntegrationOnly: true })).rejects.toThrow(
      'QUASAR_TENANT_INTEGRATION_MISSING',
    );
    expect(MockQuasarService).not.toHaveBeenCalled();
    expect(MockVault.getDecryptedCredential).not.toHaveBeenCalled();
  });

  it('C: production variant refuses tenant sk_test', async () => {
    process.env.BUILD_VARIANT = 'PROD';
    BuildVariantService.resetInstance();
    MockStore.getByInvifyTenantId.mockResolvedValue({
      quasar_sk_secret_enc: 'enc',
      quasar_environment: 'test',
    } as any);
    MockStore.decryptSkSecret.mockReturnValue(SK_TEST);

    await expect(getQuasarService(TENANT, { tenantIntegrationOnly: true })).rejects.toThrow(
      'QUASAR_TEST_CREDENTIAL_FORBIDDEN_IN_PRODUCTION',
    );
    expect(MockQuasarService).not.toHaveBeenCalled();
  });

  it('D: factory logs only key class, never the secret', async () => {
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      logs.push(args.map((a) => String(a)).join(' '));
    });
    MockStore.getByInvifyTenantId.mockResolvedValue({
      quasar_sk_secret_enc: 'enc',
      quasar_environment: 'test',
    } as any);
    MockStore.decryptSkSecret.mockReturnValue(SK_TEST);

    await getQuasarService(TENANT, { tenantIntegrationOnly: true });
    spy.mockRestore();
    const joined = logs.join('\n');
    expect(joined).toContain('sk_test_*');
    expect(joined).not.toContain(SK_TEST);
    expect(joined).not.toContain('sk_test_unit_fixture');
  });

  it('staging refuses sk_live on tenantIntegrationOnly', async () => {
    MockStore.getByInvifyTenantId.mockResolvedValue({
      quasar_sk_secret_enc: 'enc',
      quasar_environment: 'live',
    } as any);
    MockStore.decryptSkSecret.mockReturnValue(SK_LIVE);

    await expect(getQuasarService(TENANT, { tenantIntegrationOnly: true })).rejects.toThrow(
      'QUASAR_LIVE_CREDENTIAL_FORBIDDEN_OUTSIDE_PRODUCTION',
    );
  });
});

describe('provision-va source contracts', () => {
  const adminSrc = fs.readFileSync(path.join(__dirname, '../../src/controllers/admin.controller.ts'), 'utf8');
  const customerSrc = fs.readFileSync(path.join(__dirname, '../../src/controllers/customer.controller.ts'), 'utf8');
  const studentSrc = fs.readFileSync(path.join(__dirname, '../../src/controllers/student.controller.ts'), 'utf8');
  const webhookSrc = fs.readFileSync(path.join(__dirname, '../../src/controllers/webhook.controller.ts'), 'utf8');

  it('E: customer/staff VA still call getQuasarService(tenantId) without tenantIntegrationOnly', () => {
    expect(customerSrc).toMatch(/getQuasarService\(tenantId\)/);
    expect(customerSrc).not.toMatch(/tenantIntegrationOnly/);
    expect(studentSrc).toMatch(/getQuasarService\(/);
    expect(studentSrc).not.toMatch(/tenantIntegrationOnly/);
  });

  it('F: virtual-account/init still uses QuasarProvisioningService.provisionMerchant', () => {
    expect(adminSrc).toMatch(/initVirtualAccountEngine/);
    expect(adminSrc).toMatch(/QuasarProvisioningService\.provisionMerchant/);
    const initBlock = adminSrc.slice(adminSrc.indexOf('initVirtualAccountEngine'));
    expect(initBlock).toMatch(/provisionMerchant/);
  });

  it('G: webhook inbound path is unchanged (no tenantIntegrationOnly)', () => {
    expect(webhookSrc).toMatch(/virtual_account\.credit/);
    expect(webhookSrc).not.toMatch(/tenantIntegrationOnly/);
    expect(webhookSrc).not.toMatch(/resolvePlatformApiKey/);
  });

  it('tenant provision-va uses getQuasarService tenantIntegrationOnly and not resolvePlatformApiKey', () => {
    const start = adminSrc.indexOf('static async provisionVirtualAccount');
    const end = adminSrc.indexOf('static async provisionStudentVirtualAccount');
    const block = adminSrc.slice(start, end);
    expect(block).toMatch(/rejectUnlessMakerCheckerApproved/);
    expect(block).toMatch(/getQuasarService\(tenant\.id, \{ tenantIntegrationOnly: true \}\)/);
    expect(block).not.toMatch(/resolvePlatformApiKey/);
    expect(block).toMatch(/createVirtualAccount/);
    expect(block).toMatch(/virtual_account_number/);
  });
});
