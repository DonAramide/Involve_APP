import { CertificateRegistry, ProviderCertificate } from './CertificateRegistry';
import { CertificateAudit } from './CertificateAudit';

export class CertificateRotationService {
  /**
   * Execute certificate rotation.
   * Inserts the new certificate as 'ROTATING' and keeps the old active one active (Dual-Active Phase).
   */
  static async executeRotation(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    newVersion: string,
    newPemContent: string,
    newPrivateKeyRef: string,
    operator = 'system'
  ): Promise<{ oldCertId?: string; newCertId: string }> {
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';

    await CertificateAudit.log('ROTATE', null, 'SUCCESS', `Starting certificate rotation for ${provider}`, operator);

    // 1. Get current active certificate
    const certs = await CertificateRegistry.getCertificates(provider, env);
    const oldActive = certs.find(c => c.is_active && c.status === 'ACTIVE');

    // 2. Insert new certificate as ROTATING
    const newCert = await CertificateRegistry.insertCertificate({
      provider,
      certificate_version: newVersion,
      cert_type: 'CLIENT_CERT',
      pem_content: newPemContent,
      private_key_ref: newPrivateKeyRef,
      status: 'ROTATING',
      environment: env,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
    });

    await CertificateAudit.log(
      'ROTATE',
      newCert.id,
      'SUCCESS',
      `Dual-active certificate state established. New certificate version: ${newVersion}`,
      operator
    );

    return {
      oldCertId: oldActive?.id,
      newCertId: newCert.id,
    };
  }

  /**
   * Completes the rotation by making the new certificate ACTIVE and retiring the old.
   */
  static async completeRotation(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    newCertId: string,
    oldCertId?: string,
    operator = 'system'
  ): Promise<void> {
    // 1. Complete rotation for new certificate
    await CertificateRegistry.updateCertificate(newCertId, { status: 'ACTIVE' });

    // 2. Retire old certificate
    if (oldCertId) {
      const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
      const certs = await CertificateRegistry.getCertificates(provider, env);
      const oldCert = certs.find(c => c.id === oldCertId);
      if (oldCert) {
        await CertificateRegistry.updateCertificate(oldCertId, {
          status: 'RETIRED',
          is_active: false,
        });
        await CertificateAudit.log(
          'ROTATE',
          oldCertId,
          'SUCCESS',
          `Old certificate version ${oldCert.certificate_version} retired`,
          operator
        );
      }
    }

    await CertificateAudit.log('ROTATE', newCertId, 'SUCCESS', `Certificate rotation completed successfully`, operator);
  }

  /**
   * Emergency revocation of a compromised certificate.
   */
  static async revokeCertificate(
    certId: string,
    operator = 'system'
  ): Promise<void> {
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
    
    // Locate cert
    let targetCert: ProviderCertificate | undefined;
    for (const provider of ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'] as const) {
      const certs = await CertificateRegistry.getCertificates(provider, env);
      const found = certs.find(c => c.id === certId);
      if (found) {
        targetCert = found;
        break;
      }
    }

    if (!targetCert) {
      throw new Error(`Certificate ID ${certId} not found`);
    }

    await CertificateRegistry.updateCertificate(certId, {
      status: 'REVOKED',
      is_active: false,
    });

    await CertificateAudit.log(
      'REVOKE',
      certId,
      'SUCCESS',
      `Certificate revoked immediately: version ${targetCert.certificate_version}`,
      operator
    );
  }
}
