"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarConfigurationService = void 0;
class QuasarConfigurationService {
    /**
     * Registers the Quasar configuration into the ECS provider.
     * Isolates the background worker from ECS implementation details.
     */
    async register(tenantId, config) {
        // In a real implementation, this interacts with QIP / ECS service.
        console.log(`Registered Quasar ECS config for tenant ${tenantId}`);
    }
    async update(tenantId, config) {
        throw new Error('Method not implemented yet');
    }
    async remove(tenantId) {
        throw new Error('Method not implemented yet');
    }
    async testConfiguration(tenantId) {
        throw new Error('Method not implemented yet');
    }
}
exports.QuasarConfigurationService = QuasarConfigurationService;
//# sourceMappingURL=quasar-configuration.service.js.map