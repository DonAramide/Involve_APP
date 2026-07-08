import * as crypto from 'crypto';
import * as tls from 'tls';
import { CertificateRegistry, ProviderCertificate } from './CertificateRegistry';
import { CertificateAudit } from './CertificateAudit';
import { SecretResolverService } from '../secret-management/SecretResolverService';

export class CertificateManagerService {
  /**
   * Retrieves active client certificate for a provider.
   */
  static async getClientCertificate(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    operator = 'system'
  ): Promise<ProviderCertificate> {
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
    const certs = await CertificateRegistry.getCertificates(provider, env);

    const activeCert = certs.find(c => c.is_active && (c.status === 'ACTIVE' || c.status === 'ROTATING'));

    if (!activeCert) {
      const inactive = certs.find(c => !c.is_active || c.status === 'REVOKED' || c.status === 'EXPIRED');
      if (inactive) {
        await CertificateAudit.log('ERROR', inactive.id, 'FAILED', `Certificate is in status ${inactive.status}`, operator);
        throw new Error(`Certificate for ${provider} in ${env} is ${inactive.status}`);
      }
      await CertificateAudit.log('ERROR', null, 'FAILED', 'No active certificate found', operator);
      throw new Error(`No active certificate found for ${provider} in ${env}`);
    }

    // 1. Expiry validation
    if (new Date() > new Date(activeCert.valid_to)) {
      await CertificateRegistry.updateCertificate(activeCert.id, { status: 'EXPIRED', is_active: false });
      await CertificateAudit.log('ERROR', activeCert.id, 'FAILED', 'Certificate validation failed: EXPIRED', operator);
      throw new Error(`Certificate for ${provider} is EXPIRED`);
    }

    // 2. Revocation validation
    if (activeCert.status === 'REVOKED') {
      await CertificateAudit.log('ERROR', activeCert.id, 'FAILED', 'Certificate validation failed: REVOKED', operator);
      throw new Error(`Certificate for ${provider} is REVOKED`);
    }

    await CertificateAudit.log('READ', activeCert.id, 'SUCCESS', 'Certificate retrieved successfully', operator);
    return activeCert;
  }

  /**
   * Generates a Node.js mTLS Secure Context configuration.
   */
  static async configureMtls(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    operator = 'system'
  ): Promise<tls.SecureContextOptions & { rejectUnauthorized?: boolean }> {
    const cert = await this.getClientCertificate(provider, operator);

    // Resolve private key using SecretResolverService
    let privateKey = '';
    try {
      privateKey = await SecretResolverService.resolve(provider, operator);
    } catch (err: any) {
      await CertificateAudit.log('ERROR', cert.id, 'FAILED', `Failed to resolve private key from vault: ${err.message}`, operator);
      throw new Error(`mTLS configuration failed: Private key resolution failed: ${err.message}`);
    }

    // Return the configuration for tls.createSecureContext() or https.Agent
    const options: tls.SecureContextOptions & { rejectUnauthorized?: boolean } = {
      cert: cert.pem_content,
      key: privateKey,
      rejectUnauthorized: true,
    };

    await CertificateAudit.log('READ', cert.id, 'SUCCESS', `mTLS configuration established for ${provider}`, operator);
    return options;
  }

  /**
   * Computes the SHA-256 pin hash (SPKI fingerprint equivalent) of a PEM public key/cert.
   */
  static computePin(pemContent: string): string {
    const cleanPem = pemContent
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '');
    const der = Buffer.from(cleanPem, 'base64');
    return crypto.createHash('sha256').update(der).digest('base64');
  }

  /**
   * Verifies the peer public key hash against pinned certificate hashes for the domain.
   */
  static async verifyPinning(
    domain: string,
    peerCertPem: string,
    operator = 'system'
  ): Promise<boolean> {
    const rule = await CertificateRegistry.getPinningRule(domain);
    if (!rule) {
      // If no rule exists, pinning check is skipped (success)
      return true;
    }

    const peerPin = this.computePin(peerCertPem);
    const isMatched = rule.pinned_hashes.includes(peerPin);

    if (!isMatched) {
      const details = `SSL Pinning failure for domain ${domain}. Peer fingerprint: sha256//${peerPin}. Pinned hashes: ${rule.pinned_hashes.join(', ')}`;
      await CertificateAudit.log('ERROR', null, 'FAILED', details, operator);
      throw new Error(`SSL Pinning Verification Failed for domain ${domain}`);
    }

    await CertificateAudit.log('READ', null, 'SUCCESS', `SSL Pinning verified for domain ${domain}`, operator);
    return true;
  }
}
