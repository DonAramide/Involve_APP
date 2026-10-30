"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const activation_worker_1 = require("../activation/activation.worker");
const financial_platform_audit_service_1 = require("../audit/financial-platform-audit.service");
describe('ActivationWorker', () => {
    let worker;
    let mockQuasarClient;
    let mockCredentialService;
    let mockConfigService;
    let mockAuditService;
    beforeEach(() => {
        mockQuasarClient = {
            createTenant: jest.fn(),
            getHealth: jest.fn(),
        };
        mockCredentialService = {
            storeCredentials: jest.fn(),
        };
        mockConfigService = {
            register: jest.fn(),
        };
        mockAuditService = {
            logActivation: jest.fn(),
        };
        worker = new activation_worker_1.ActivationWorker(mockQuasarClient, mockCredentialService, mockConfigService, mockAuditService);
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
        expect(mockAuditService.logActivation).toHaveBeenCalledWith('tenant-1', 'actor-1', financial_platform_audit_service_1.AuditStatus.SUCCESS, expect.any(Object));
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
        expect(mockAuditService.logActivation).toHaveBeenCalledWith('tenant-1', 'actor-1', financial_platform_audit_service_1.AuditStatus.FAILURE, expect.objectContaining({ error: 'Vault unavailable' }));
    });
});
//# sourceMappingURL=activation-worker.spec.js.map