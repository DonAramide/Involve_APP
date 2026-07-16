import { OperationsSDK, OperationsResponse } from './operations.sdk';

export class OperationsRepository {
  static async listUsers(params?: any): Promise<OperationsResponse<any[]>> {
    return OperationsSDK.get('/operations/users', params);
  }

  static async createUser(data: any): Promise<OperationsResponse<any>> {
    return OperationsSDK.post('/operations/users', data);
  }

  static async updateSettings(group: string, data: any): Promise<OperationsResponse<any>> {
    return OperationsSDK.put(`/operations/settings/${group}`, data);
  }

  static async listAuditLogs(params?: any): Promise<OperationsResponse<any[]>> {
    return OperationsSDK.get('/operations/audit', params);
  }
}
