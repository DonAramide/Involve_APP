import { OperationsRepository } from './operations.repository';

export class OperationsAdapter {
  static async fetchUsers(params?: any) {
    const response = await OperationsRepository.listUsers(params);
    if (!response.success) throw new Error(response.error?.message || 'Failed to fetch users');
    return { data: response.data || [], meta: response.meta };
  }

  static async fetchAuditLogs(params?: any) {
    const response = await OperationsRepository.listAuditLogs(params);
    if (!response.success) throw new Error(response.error?.message || 'Failed to fetch audit logs');
    return { data: response.data || [], meta: response.meta };
  }

  static async updateSettingsGroup(group: string, payload: any) {
    const response = await OperationsRepository.updateSettings(group, payload);
    if (!response.success) throw new Error(response.error?.message || 'Failed to update settings');
    return response.data;
  }
}
