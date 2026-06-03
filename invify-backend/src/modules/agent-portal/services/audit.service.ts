import { auditLogRepository } from '../repositories/audit.repository';

export class AuditLogService {
  async listLogs(filters?: { entity_type?: string; actor_id?: string }) {
    return auditLogRepository.listLogs(filters);
  }
}
export const auditLogService = new AuditLogService();
