"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsFacade = void 0;
const event_emitter_1 = require("./event.emitter");
// Mock dependencies for the facade (in a real system these would be injected or imported from their respective domains)
class MockUserService {
    static async createUser(tenantId, data) { return { id: 'u_123', ...data }; }
    static async listUsers(tenantId) { return [{ id: 'u_123', email: 'test@test.com' }]; }
}
class MockSettingsService {
    static async updateSettings(tenantId, group, data) { return { group, data }; }
}
class MockAuditService {
    static async listLogs(tenantId) { return [{ id: 'a_1', topic: 'test' }]; }
}
class OperationsFacade {
    // Users
    static async createUser(tenantId, data) {
        const user = await MockUserService.createUser(tenantId, data);
        event_emitter_1.eventEmitter.emitEvent('user.created', tenantId, { userId: user.id, email: user.email, role: user.role });
        return user;
    }
    static async listUsers(tenantId) {
        return await MockUserService.listUsers(tenantId);
    }
    // Settings
    static async updateSettingsGroup(tenantId, group, data) {
        const settings = await MockSettingsService.updateSettings(tenantId, group, data);
        event_emitter_1.eventEmitter.emitEvent('settings.updated', tenantId, { group, modifiedKeys: Object.keys(data) });
        return settings;
    }
    // Audit
    static async listAuditLogs(tenantId) {
        return await MockAuditService.listLogs(tenantId);
    }
    // API Keys
    static async revokeApiKey(tenantId, keyId, reason) {
        // call integration vault service
        event_emitter_1.eventEmitter.emitEvent('api_key.revoked', tenantId, { keyId, reason });
        return { keyId, revoked: true };
    }
}
exports.OperationsFacade = OperationsFacade;
//# sourceMappingURL=operations.facade.js.map