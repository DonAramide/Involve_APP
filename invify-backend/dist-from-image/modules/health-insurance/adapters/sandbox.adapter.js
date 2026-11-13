"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxHealthProviderAdapter = void 0;
// invify-backend/src/modules/health-insurance/adapters/sandbox.adapter.ts
const crypto_1 = __importDefault(require("crypto"));
/**
 * Sandbox Health Provider Adapter.
 * Used for development, testing, and staging demonstration.
 * STRICT SECURITY RULE: Absolutely rejected in production environments.
 */
class SandboxHealthProviderAdapter {
    providerCode = 'sandbox_hmo';
    constructor() {
        const isProd = process.env.NODE_ENV === 'production' || process.env.BUILD_VARIANT === 'prod';
        if (isProd) {
            throw new Error('[SECURITY FATAL] SandboxHealthProviderAdapter is strictly prohibited in production.');
        }
    }
    getCapabilities() {
        return {
            plans: true,
            enrolmentSubmit: true,
            enrolmentStatus: true,
            eligibility: true,
            facilities: true,
            claims: true,
            renewals: true
        };
    }
    async submitEnrolment(payload) {
        const trackingId = `SBX-TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        // In sandbox, auto-accept valid submissions
        return {
            success: true,
            providerTrackingId: trackingId,
            status: 'submitted'
        };
    }
    async getEnrolmentStatus(trackingId) {
        // Generate simulated active policy reference
        const policyNumber = `SBX-POL-${trackingId.split('-').pop()}`;
        return {
            status: 'active',
            policyNumber
        };
    }
    async getClaimStatus(claimReference) {
        // Deterministic simulation based on ref
        const isApproved = !claimReference.toLowerCase().includes('reject');
        return {
            claimReference,
            status: isApproved ? 'approved' : 'rejected',
            authorisedAmountMinor: isApproved ? 1500000 : 0, // ₦15,000.00
            reason: isApproved ? 'Consultation & generic medications authorised' : 'Facility out of network',
            lastUpdated: new Date().toISOString()
        };
    }
    async syncFacilities() {
        return [
            {
                externalRef: 'SBX-FAC-001',
                name: 'St. Nicholas Hospital - Victoria Island',
                state: 'Lagos',
                lga: 'Lagos Island',
                services: ['General Outpatient', 'Pediatrics', 'Dentistry', 'Emergency']
            },
            {
                externalRef: 'SBX-FAC-002',
                name: 'Reddington Multi-Specialist Hospital',
                state: 'Lagos',
                lga: 'Eti-Osa',
                services: ['Cardiology', 'Surgery', 'Pediatrics', 'Diagnostics']
            },
            {
                externalRef: 'SBX-FAC-003',
                name: 'Cedarcrest Hospitals',
                state: 'Abuja',
                lga: 'Garki',
                services: ['Orthopedics', 'General Medicine', 'Radiology']
            }
        ];
    }
    verifyWebhookSignature(rawBody, headers) {
        const signature = headers['x-provider-signature'];
        const secret = process.env.HEALTH_SANDBOX_WEBHOOK_SECRET || 'sandbox-secret-key-12345';
        if (!signature)
            return false;
        const computed = crypto_1.default.createHmac('sha256', secret).update(rawBody).digest('hex');
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'));
        }
        catch {
            return false;
        }
    }
}
exports.SandboxHealthProviderAdapter = SandboxHealthProviderAdapter;
//# sourceMappingURL=sandbox.adapter.js.map