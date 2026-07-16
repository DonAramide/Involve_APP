import { eventEmitter } from './event.emitter';

// Mock dependencies for the facade (in a real system these would be injected or imported from their respective domains)
class MockUserService {
  static async createUser(tenantId: string, data: any) { return { id: 'u_123', ...data }; }
  static async listUsers(tenantId: string) { return [{ id: 'u_123', email: 'test@test.com' }]; }
}

class MockSettingsService {
  static async updateSettings(tenantId: string, group: string, data: any) { return { group, data }; }
}

class MockAuditService {
  static async listLogs(tenantId: string) { return [{ id: 'a_1', topic: 'test' }]; }
}

export class OperationsFacade {
  // Users
  static async createUser(tenantId: string, data: any) {
    const user = await MockUserService.createUser(tenantId, data);
    eventEmitter.emitEvent('user.created', tenantId, { userId: user.id, email: user.email, role: user.role });
    return user;
  }

  static async listUsers(tenantId: string) {
    return await MockUserService.listUsers(tenantId);
  }

  // Settings
  static async updateSettingsGroup(tenantId: string, group: string, data: any) {
    const settings = await MockSettingsService.updateSettings(tenantId, group, data);
    eventEmitter.emitEvent('settings.updated', tenantId, { group, modifiedKeys: Object.keys(data) });
    return settings;
  }

  // Audit
  static async listAuditLogs(tenantId: string) {
    return await MockAuditService.listLogs(tenantId);
  }

  // API Keys
  static async revokeApiKey(tenantId: string, keyId: string, reason: string) {
    // call integration vault service
    eventEmitter.emitEvent('api_key.revoked', tenantId, { keyId, reason });
    return { keyId, revoked: true };
  }
}
