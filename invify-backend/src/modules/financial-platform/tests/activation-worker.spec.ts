import { ActivationWorker } from '../activation/activation.worker';
import { QuasarAdminClient } from '../quasar/quasar-admin.client';
import { QuasarCredentialService } from '../vault/quasar-credential.service';
import { QuasarConfigurationService } from '../ecs/quasar-configuration.service';
import { FinancialPlatformAuditService, AuditStatus } from '../audit/financial-platform-audit.service';

describe('ActivationWorker', () => {
  let worker: ActivationWorker;
  let mockQuasarClient: jest.Mocked<QuasarAdminClient>;
  let mockCredentialService: jest.Mocked<QuasarCredentialService>;
  let mockConfigService: jest.Mocked<QuasarConfigurationService>;
  let mockAuditService: jest.Mocked<FinancialPlatformAuditService>;

  beforeEach(() => {
    mockQuasarClient = {
      createTenant: jest.fn(),
      getHealth: jest.fn(),
    } as any;
    
    mockCredentialService = {
      storeCredentials: jest.fn(),
    } as any;

    mockConfigService = {
      register: jest.fn(),
    } as any;

    mockAuditService = {
      logActivation: jest.fn(),
    } as any;

    worker = new ActivationWorker(
      mockQuasarClient,
      mockCredentialService,
      mockConfigService,
      mockAuditService
    );
  });

  it('should successfully orchestrate the full activation flow', async () => {
    mockQuasarClient.createTenant.mockResolvedValue({
      tenantId: 'quasar-123',
      apiKey: 'api-key',
      clientSecret: 'secret',
      webhookSigningSecret: 'webhook'
    });
    mockCredentialService.storeCredentials.mockResolvedValue({
      apiKeyUrn: 'urn1',
      clientSecretUrn: 'urn2',
      webhookSigningSecretUrn: 'urn3'
    });
    mockConfigService.register.mockResolvedValue(undefined);
    mockQuasarClient.getHealth.mockResolvedValue(true);
    mockAuditService.logActivation.mockResolvedValue(undefined);

    await worker.processActivation('tenant-1', 'actor-1', 'Biz', 'biz@test.com');

    expect(mockQuasarClient.createTenant).toHaveBeenCalledTimes(1);
    expect(mockCredentialService.storeCredentials).toHaveBeenCalledTimes(1);
    expect(mockConfigService.register).toHaveBeenCalledTimes(1);
    expect(mockQuasarClient.getHealth).toHaveBeenCalledTimes(1);
    expect(mockAuditService.logActivation).toHaveBeenCalledWith(
      'tenant-1',
      'actor-1',
      AuditStatus.SUCCESS,
      expect.any(Object)
    );
  });

  it('should rollback and audit failure if Vault fails', async () => {
    mockQuasarClient.createTenant.mockResolvedValue({
      tenantId: 'quasar-123',
      apiKey: 'api-key',
      clientSecret: 'secret',
      webhookSigningSecret: 'webhook'
    });
    mockCredentialService.storeCredentials.mockRejectedValue(new Error('Vault unavailable'));

    await expect(worker.processActivation('tenant-1', 'actor-1', 'Biz', 'biz@test.com')).rejects.toThrow('Vault unavailable');

    expect(mockQuasarClient.createTenant).toHaveBeenCalledTimes(1);
    expect(mockConfigService.register).not.toHaveBeenCalled();
    expect(mockAuditService.logActivation).toHaveBeenCalledWith(
      'tenant-1',
      'actor-1',
      AuditStatus.FAILURE,
      expect.objectContaining({ error: 'Vault unavailable' })
    );
  });
});
