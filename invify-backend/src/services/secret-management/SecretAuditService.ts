import { SecretDatabaseService } from './SecretDatabaseService';

export class SecretAuditService {
  static async log(
    action: 'READ' | 'ROTATE' | 'REVOKE' | 'ERROR',
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA' | null,
    keyVersion: string | null,
    status: 'SUCCESS' | 'FAILED',
    details: string,
    operator = 'system'
  ): Promise<void> {
    await SecretDatabaseService.insertAudit({
      action,
      provider,
      key_version: keyVersion,
      status,
      details,
      operator,
    });
  }
}
