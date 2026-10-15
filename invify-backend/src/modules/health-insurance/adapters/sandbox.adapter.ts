// invify-backend/src/modules/health-insurance/adapters/sandbox.adapter.ts
import crypto from 'crypto';
import { 
  HealthProviderAdapter, 
  ProviderCapabilities, 
  EnrolmentSubmissionPayload, 
  EnrolmentSubmissionResponse, 
  ClaimStatusResponse 
} from './provider-adapter.interface';

/**
 * Sandbox Health Provider Adapter.
 * Used for development, testing, and staging demonstration.
 * STRICT SECURITY RULE: Absolutely rejected in production environments.
 */
export class SandboxHealthProviderAdapter implements HealthProviderAdapter {
  public readonly providerCode = 'sandbox_hmo';

  constructor() {
    const isProd = process.env.NODE_ENV === 'production' || process.env.BUILD_VARIANT === 'prod';
    if (isProd) {
      throw new Error('[SECURITY FATAL] SandboxHealthProviderAdapter is strictly prohibited in production.');
    }
  }

  getCapabilities(): ProviderCapabilities {
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

  async submitEnrolment(payload: EnrolmentSubmissionPayload): Promise<EnrolmentSubmissionResponse> {
    const trackingId = `SBX-TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // In sandbox, auto-accept valid submissions
    return {
      success: true,
      providerTrackingId: trackingId,
      status: 'submitted'
    };
  }

  async getEnrolmentStatus(trackingId: string): Promise<{ status: string; policyNumber?: string }> {
    // Generate simulated active policy reference
    const policyNumber = `SBX-POL-${trackingId.split('-').pop()}`;
    return {
      status: 'active',
      policyNumber
    };
  }

  async getClaimStatus(claimReference: string): Promise<ClaimStatusResponse> {
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

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
    const signature = headers['x-provider-signature'] as string;
    const secret = process.env.HEALTH_SANDBOX_WEBHOOK_SECRET || 'sandbox-secret-key-12345';
    
    if (!signature) return false;
    
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'));
    } catch {
      return false;
    }
  }
}
