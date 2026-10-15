// invify-backend/src/modules/health-insurance/adapters/provider-adapter.interface.ts

export interface ProviderCapabilities {
  plans: boolean;
  enrolmentSubmit: boolean;
  enrolmentStatus: boolean;
  eligibility: boolean;
  facilities: boolean;
  claims: boolean;
  renewals: boolean;
}

export interface EnrolmentSubmissionPayload {
  enrolmentId: string;
  memberReference: string;
  planCode: string;
  periodStart: string;
  periodEnd: string;
  applicant: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    category: string;
  };
}

export interface EnrolmentSubmissionResponse {
  success: boolean;
  providerTrackingId: string;
  status: 'submitted' | 'active' | 'rejected';
  rejectionReason?: string;
}

export interface ClaimStatusResponse {
  claimReference: string;
  status: 'submitted' | 'pending' | 'approved' | 'rejected' | 'settled';
  authorisedAmountMinor?: number;
  reason?: string;
  lastUpdated: string;
}

export interface HealthProviderAdapter {
  providerCode: string;
  getCapabilities(): ProviderCapabilities;
  
  submitEnrolment(payload: EnrolmentSubmissionPayload): Promise<EnrolmentSubmissionResponse>;
  getEnrolmentStatus(trackingId: string): Promise<{ status: string; policyNumber?: string }>;
  getClaimStatus(claimReference: string): Promise<ClaimStatusResponse>;
  syncFacilities?(): Promise<Array<{ externalRef: string; name: string; state: string; lga: string; services: string[] }>>;
  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
}
