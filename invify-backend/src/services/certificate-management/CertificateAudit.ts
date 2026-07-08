import { CertificateRegistry } from './CertificateRegistry';

export class CertificateAudit {
  static async log(
    action: 'READ' | 'GENERATE' | 'ROTATE' | 'REVOKE' | 'ERROR',
    certificateId: string | null,
    status: 'SUCCESS' | 'FAILED',
    details: string,
    operator = 'system'
  ): Promise<void> {
    await CertificateRegistry.insertAudit({
      action,
      certificate_id: certificateId,
      status,
      details,
      operator,
    });
  }
}
