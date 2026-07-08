// Force NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { CertificateRegistry } from '../src/services/certificate-management/CertificateRegistry';
import { CertificateManagerService } from '../src/services/certificate-management/CertificateManagerService';
import { CertificateRotationService } from '../src/services/certificate-management/CertificateRotationService';
import { SecretDatabaseService } from '../src/services/secret-management/SecretDatabaseService';
import { SecretResolverService } from '../src/services/secret-management/SecretResolverService';
import { SupabaseVaultProvider } from '../src/services/secret-management/VaultProvider';

// Dummy PEM contents for test certs
const mockClientCertPemV1 = `-----BEGIN CERTIFICATE-----
MIIBiTCCATagAwIBAgIQSN1234567890ABCDEFGHANBgkqhkiG9w0BAQsFADAV
MRMwEQYDVQQDEwpJSVBTIFJvb3QgQ0ExFzAVBgNVBAMTDmNsaWVudC53ZW1h
LmNvbTAeFw0yNjA2MjYwMDAwMDBaFw0yNzA2MjYwMDAwMDBaMBkxFzAVBgNV
BAMTDmNsaWVudC53ZW1hLmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkC
gYEA3fI6w33yX3rB54a2o6Kx9x6r76yA46zM2x4x5z2e7z0=
-----END CERTIFICATE-----`;

const mockClientCertPemV2 = `-----BEGIN CERTIFICATE-----
MIIBiTCCATagAwIBAgIQSN9876543210ZYXWVUTSANBgkqhkiG9w0BAQsFADAV
MRMwEQYDVQQDEwpJSVBTIFJvb3QgQ0ExFzAVBgNVBAMTDmNsaWVudC53ZW1h
LmNvbTAeFw0yNjA2MjYwMDAwMDBaFw0yNzA2MjYwMDAwMDBaMBkxFzAVBgNV
BAMTDmNsaWVudC53ZW1hLmNvbTCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkC
gYEA92mN2nN93mNz82mNx9283mNz8n2Mx923nNz82mNz8mN=
-----END CERTIFICATE-----`;

async function run() {
  console.log('=== PHASE 3.2 ENTERPRISE CERTIFICATE INFRASTRUCTURE CERTIFICATION (verify_p06b.ts) ===\n');

  const results: Record<string, string> = {};

  try {
    // 0. Cleanup state
    CertificateRegistry.clearMockData();
    SecretDatabaseService.clearMockData();
    SecretResolverService.clearProviders();

    const vault = new SupabaseVaultProvider();
    SecretResolverService.registerProvider(vault);

    // ---------------------------------------------------------
    // Gate 1: client_certificates
    // Verify client certificates can be registered, retrieved, and parse correctly.
    console.log('Gate 1: Verifying Client Certificates Registry...');
    const cert = await CertificateRegistry.insertCertificate({
      provider: 'WEMA',
      certificate_version: '1.0.0',
      cert_type: 'CLIENT_CERT',
      serial_number: 'SN-WEMA-V1',
      subject: 'CN=client.wema.com',
      issuer: 'IIPS Root CA',
      pem_content: mockClientCertPemV1,
      private_key_ref: 'wema-private-key-v1-ref',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
    });

    const clientCert = await CertificateManagerService.getClientCertificate('WEMA');
    if (clientCert && clientCert.serial_number === 'SN-WEMA-V1' && clientCert.subject === 'CN=client.wema.com') {
      console.log('  ✅ Client certificate retrieved and parsed successfully: client_certificates PASS');
      results['client_certificates'] = 'PASS';
    } else {
      throw new Error('Client certificate mismatch');
    }

    // ---------------------------------------------------------
    // Gate 2: mtls_configuration
    // Verify construction of TLS secure contexts using client certs and resolved private keys.
    console.log('\nGate 2: Verifying mTLS Secure Context Configuration...');
    
    // Seed key in secret vault
    vault.setSecret('wema-private-key-v1-ref', '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDh...\n-----END PRIVATE KEY-----');
    await SecretDatabaseService.insertVersion({
      provider: 'WEMA',
      key_version: '1.0.0',
      vault_key_reference: 'wema-private-key-v1-ref',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true,
    });

    const tlsOptions = await CertificateManagerService.configureMtls('WEMA');
    if (tlsOptions && tlsOptions.cert === mockClientCertPemV1 && tlsOptions.key && tlsOptions.rejectUnauthorized === true) {
      console.log('  ✅ mTLS secure context parameters successfully configured: mtls_configuration PASS');
      results['mtls_configuration'] = 'PASS';
    } else {
      throw new Error('mTLS options verification failed');
    }

    // ---------------------------------------------------------
    // Gate 3: certificate_expiry
    // Verify that certificate manager validation fails for expired certificates immediately.
    console.log('\nGate 3: Verifying Certificate Expiry Validations...');
    
    const expiredCert = await CertificateRegistry.insertCertificate({
      provider: 'FLUTTERWAVE',
      certificate_version: '1.0.0-expired',
      cert_type: 'CLIENT_CERT',
      pem_content: mockClientCertPemV1,
      private_key_ref: 'flw-expired-key-ref',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true,
      valid_from: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
      valid_to: new Date(Date.now() - 5000).toISOString(), // expired 5 seconds ago
    });

    try {
      await CertificateManagerService.getClientCertificate('FLUTTERWAVE');
      throw new Error('Expected retrieval of expired certificate to fail, but it succeeded');
    } catch (err: any) {
      if (err.message.includes('EXPIRED')) {
        console.log(`  ✅ Expired certificate validation failed as expected: "${err.message}": certificate_expiry PASS`);
        results['certificate_expiry'] = 'PASS';
      } else {
        throw err;
      }
    }

    // ---------------------------------------------------------
    // Gate 4: certificate_pinning
    // Verify SSL/certificate pinning verification fails if peer key hash doesn't match pinning rules.
    console.log('\nGate 4: Verifying Certificate Pinning Fingerprint Checks...');
    
    // Seed pinning rule for api.wema.com
    const wemaPin = CertificateManagerService.computePin(mockClientCertPemV1);
    await CertificateRegistry.insertPinningRule({
      domain: 'api.wema.com',
      pinned_hashes: [wemaPin],
      is_active: true,
    });

    // Verify valid pin
    const pinSuccess = await CertificateManagerService.verifyPinning('api.wema.com', mockClientCertPemV1);
    if (pinSuccess) {
      console.log('  ✅ SSL Pinning succeeded for matching hash.');
    }

    // Verify pinning failure
    try {
      await CertificateManagerService.verifyPinning('api.wema.com', mockClientCertPemV2);
      throw new Error('Expected pinning verification to fail for non-matching hash, but it succeeded');
    } catch (err: any) {
      if (err.message.includes('Pinning Verification Failed')) {
        console.log(`  ✅ SSL Pinning rejected mismatched hash as expected: "${err.message}": certificate_pinning PASS`);
        results['certificate_pinning'] = 'PASS';
      } else {
        throw err;
      }
    }

    // ---------------------------------------------------------
    // Gate 5: certificate_revocation
    // Verify certificate manager blocks usage of revoked certificates.
    console.log('\nGate 5: Verifying Emergency Certificate Revocation...');
    
    await CertificateRotationService.revokeCertificate(clientCert.id);

    try {
      await CertificateManagerService.getClientCertificate('WEMA');
      throw new Error('Expected retrieval of revoked certificate to fail, but it succeeded');
    } catch (err: any) {
      if (err.message.includes('REVOKED')) {
        console.log(`  ✅ Revoked certificate blocked immediately: "${err.message}": certificate_revocation PASS`);
        results['certificate_revocation'] = 'PASS';
      } else {
        throw err;
      }
    }

    // ---------------------------------------------------------
    // Gate 6: certificate_rotation
    // Verify rotation workflow: supports dual-active states before completing retirement of old version.
    console.log('\nGate 6: Verifying Certificate Rotation (Dual-Active Phase)...');
    
    // Setup clean active cert for rotation
    const cleanCert = await CertificateRegistry.insertCertificate({
      provider: 'PAYSTACK',
      certificate_version: '1.0.0',
      cert_type: 'CLIENT_CERT',
      pem_content: mockClientCertPemV1,
      private_key_ref: 'paystack-priv-v1',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true,
    });

    // Start rotation
    const rotation = await CertificateRotationService.executeRotation(
      'PAYSTACK',
      '2.0.0',
      mockClientCertPemV2,
      'paystack-priv-v2'
    );

    // Verify dual active certs exist in registry
    const activeCerts = (await CertificateRegistry.getCertificates('PAYSTACK', 'test'))
      .filter(c => c.is_active && (c.status === 'ACTIVE' || c.status === 'ROTATING'));
    
    if (activeCerts.length === 2) {
      console.log('  ✅ Old cert and new rotating cert are active simultaneously (Dual-Active).');
    } else {
      throw new Error(`Expected 2 active certificates, got ${activeCerts.length}`);
    }

    // Complete rotation
    await CertificateRotationService.completeRotation('PAYSTACK', rotation.newCertId, rotation.oldCertId);

    const postRotCerts = await CertificateRegistry.getCertificates('PAYSTACK', 'test');
    const oldCertRet = postRotCerts.find(c => c.id === rotation.oldCertId);
    
    if (oldCertRet && oldCertRet.status === 'RETIRED' && !oldCertRet.is_active) {
      console.log('  ✅ Old certificate retired and status updated correctly: certificate_rotation PASS');
      results['certificate_rotation'] = 'PASS';
    } else {
      throw new Error('Old certificate was not retired');
    }

    // ---------------------------------------------------------
    // Gate 7: certificate_audit
    // Verify proper generation of audit trails for all critical certificate lifecycle events.
    console.log('\nGate 7: Verifying Certificate Audit Trails...');
    
    const audits = await CertificateRegistry.getAudits();
    const actions = audits.map(a => a.action);
    console.log(`  Logged audit events actions: ${[...new Set(actions)].join(', ')}`);
    if (actions.includes('READ') && actions.includes('ROTATE') && actions.includes('REVOKE') && actions.includes('ERROR')) {
      console.log('  ✅ Audit trails correctly generated for all actions: certificate_audit PASS');
      results['certificate_audit'] = 'PASS';
    } else {
      throw new Error(`Missing actions in certificate audit logs. Found: ${actions.join(', ')}`);
    }

    // Print summary
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`${gate}: ${status}`);
    }

    console.log('\n⭐ ALL 7 PHASE 3.2 CERTIFICATION GATES PASSED ⭐');
  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
