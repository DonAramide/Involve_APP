"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateManagerService = void 0;
const crypto = __importStar(require("crypto"));
const CertificateRegistry_1 = require("./CertificateRegistry");
const CertificateAudit_1 = require("./CertificateAudit");
const SecretResolverService_1 = require("../secret-management/SecretResolverService");
class CertificateManagerService {
    /**
     * Retrieves active client certificate for a provider.
     */
    static async getClientCertificate(provider, operator = 'system') {
        const env = process.env.APP_ENV || process.env.NODE_ENV || 'staging';
        const certs = await CertificateRegistry_1.CertificateRegistry.getCertificates(provider, env);
        const activeCert = certs.find(c => c.is_active && (c.status === 'ACTIVE' || c.status === 'ROTATING'));
        if (!activeCert) {
            const inactive = certs.find(c => !c.is_active || c.status === 'REVOKED' || c.status === 'EXPIRED');
            if (inactive) {
                await CertificateAudit_1.CertificateAudit.log('ERROR', inactive.id, 'FAILED', `Certificate is in status ${inactive.status}`, operator);
                throw new Error(`Certificate for ${provider} in ${env} is ${inactive.status}`);
            }
            await CertificateAudit_1.CertificateAudit.log('ERROR', null, 'FAILED', 'No active certificate found', operator);
            throw new Error(`No active certificate found for ${provider} in ${env}`);
        }
        // 1. Expiry validation
        if (new Date() > new Date(activeCert.valid_to)) {
            await CertificateRegistry_1.CertificateRegistry.updateCertificate(activeCert.id, { status: 'EXPIRED', is_active: false });
            await CertificateAudit_1.CertificateAudit.log('ERROR', activeCert.id, 'FAILED', 'Certificate validation failed: EXPIRED', operator);
            throw new Error(`Certificate for ${provider} is EXPIRED`);
        }
        // 2. Revocation validation
        if (activeCert.status === 'REVOKED') {
            await CertificateAudit_1.CertificateAudit.log('ERROR', activeCert.id, 'FAILED', 'Certificate validation failed: REVOKED', operator);
            throw new Error(`Certificate for ${provider} is REVOKED`);
        }
        await CertificateAudit_1.CertificateAudit.log('READ', activeCert.id, 'SUCCESS', 'Certificate retrieved successfully', operator);
        return activeCert;
    }
    /**
     * Generates a Node.js mTLS Secure Context configuration.
     */
    static async configureMtls(provider, operator = 'system') {
        const cert = await this.getClientCertificate(provider, operator);
        // Resolve private key using SecretResolverService
        let privateKey = '';
        try {
            privateKey = await SecretResolverService_1.SecretResolverService.resolve(provider, operator);
        }
        catch (err) {
            await CertificateAudit_1.CertificateAudit.log('ERROR', cert.id, 'FAILED', `Failed to resolve private key from vault: ${err.message}`, operator);
            throw new Error(`mTLS configuration failed: Private key resolution failed: ${err.message}`);
        }
        // Return the configuration for tls.createSecureContext() or https.Agent
        const options = {
            cert: cert.pem_content,
            key: privateKey,
            rejectUnauthorized: true,
        };
        await CertificateAudit_1.CertificateAudit.log('READ', cert.id, 'SUCCESS', `mTLS configuration established for ${provider}`, operator);
        return options;
    }
    /**
     * Computes the SHA-256 pin hash (SPKI fingerprint equivalent) of a PEM public key/cert.
     */
    static computePin(pemContent) {
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
    static async verifyPinning(domain, peerCertPem, operator = 'system') {
        const rule = await CertificateRegistry_1.CertificateRegistry.getPinningRule(domain);
        if (!rule) {
            // If no rule exists, pinning check is skipped (success)
            return true;
        }
        const peerPin = this.computePin(peerCertPem);
        const isMatched = rule.pinned_hashes.includes(peerPin);
        if (!isMatched) {
            const details = `SSL Pinning failure for domain ${domain}. Peer fingerprint: sha256//${peerPin}. Pinned hashes: ${rule.pinned_hashes.join(', ')}`;
            await CertificateAudit_1.CertificateAudit.log('ERROR', null, 'FAILED', details, operator);
            throw new Error(`SSL Pinning Verification Failed for domain ${domain}`);
        }
        await CertificateAudit_1.CertificateAudit.log('READ', null, 'SUCCESS', `SSL Pinning verified for domain ${domain}`, operator);
        return true;
    }
}
exports.CertificateManagerService = CertificateManagerService;
//# sourceMappingURL=CertificateManagerService.js.map