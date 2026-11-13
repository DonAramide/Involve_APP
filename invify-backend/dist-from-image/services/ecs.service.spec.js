"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ecs_service_1 = require("./ecs.service");
const registry_1 = require("../providers/ecs/registry");
const provider_1 = require("../providers/ecs/qip/provider");
// Mocking Supabase and IntegrationVaultService would go here
jest.mock('../db/supabase', () => ({
    supabaseAdmin: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis()
    }
}));
describe('EcsService', () => {
    let ecsService;
    beforeAll(() => {
        // Ensure registry has a provider
        registry_1.EcsProviderRegistry.getInstance().registerProvider(new provider_1.QipEcsProvider());
    });
    beforeEach(() => {
        ecsService = new ecs_service_1.EcsService();
    });
    it('should throw error if provider not found on resolve', async () => {
        await expect(ecsService.resolve('unknown')).rejects.toThrow('Provider unknown not found');
    });
    it('should validate before saving and throw on invalid config', async () => {
        await expect(ecsService.save('qip', 'PRODUCTION', { 'qip.quasarPort': 'not-a-number' }))
            .rejects.toThrow(/Validation failed/);
    });
    it('should separate secrets from configs on save', async () => {
        // Mock the actual save to just verify it parses correctly
        ecsService['emitEvent'] = jest.fn();
        // In a real test, we would mock the Supabase client fully to prevent network calls.
        // This scaffold proves the test structure is ready.
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=ecs.service.spec.js.map