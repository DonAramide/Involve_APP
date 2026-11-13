import { HealthProviderAdapter, ProviderCapabilities, EnrolmentSubmissionPayload, EnrolmentSubmissionResponse, ClaimStatusResponse } from './provider-adapter.interface';
/**
 * Sandbox Health Provider Adapter.
 * Used for development, testing, and staging demonstration.
 * STRICT SECURITY RULE: Absolutely rejected in production environments.
 */
export declare class SandboxHealthProviderAdapter implements HealthProviderAdapter {
    readonly providerCode = "sandbox_hmo";
    constructor();
    getCapabilities(): ProviderCapabilities;
    submitEnrolment(payload: EnrolmentSubmissionPayload): Promise<EnrolmentSubmissionResponse>;
    getEnrolmentStatus(trackingId: string): Promise<{
        status: string;
        policyNumber?: string;
    }>;
    getClaimStatus(claimReference: string): Promise<ClaimStatusResponse>;
    syncFacilities(): Promise<{
        externalRef: string;
        name: string;
        state: string;
        lga: string;
        services: string[];
    }[]>;
    verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
}
