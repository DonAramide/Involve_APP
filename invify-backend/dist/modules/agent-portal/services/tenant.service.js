"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantService = exports.TenantService = void 0;
const tenant_repository_1 = require("../repositories/tenant.repository");
class TenantService {
    async updateActivation(agentTenantId, stage, actorId) {
        // In reality this updates flags dynamically based on the stage and calculates completion_percentage
        return tenant_repository_1.tenantRepository.updateActivation(agentTenantId, { current_stage: stage });
    }
    async getTenantsByAgent(agentId) {
        return tenant_repository_1.tenantRepository.findByAgent(agentId);
    }
    async getAllTenants() {
        return tenant_repository_1.tenantRepository.findAll();
    }
}
exports.TenantService = TenantService;
exports.tenantService = new TenantService();
//# sourceMappingURL=tenant.service.js.map