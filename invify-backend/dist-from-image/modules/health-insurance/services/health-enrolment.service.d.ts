import { HealthContext, EnrolmentStatus } from '../types';
export declare class HealthEnrolmentService {
    /**
     * List enrolments for a tenant with pagination and filters.
     */
    static listEnrolments(ctx: HealthContext, params: {
        status?: EnrolmentStatus;
        memberId?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: any;
            status: any;
            status_reason: any;
            period_start: any;
            period_end: any;
            provider_sync_status: any;
            created_at: any;
            hw_members: {
                id: any;
                member_category: any;
                students: {
                    first_name: any;
                    last_name: any;
                    admission_number: any;
                    current_class: any;
                }[];
                hw_staff_profiles: any[];
            }[];
            hw_plan_versions: {
                id: any;
                version: any;
                premium_minor: any;
                currency: any;
                billing_frequency: any;
                hw_plans: any[];
            }[];
            hw_policies: {
                id: any;
                policy_number: any;
                status: any;
                effective_date: any;
                expiry_date: any;
            }[];
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * Create an enrolment in draft/enrolment_pending status.
     */
    static createEnrolment(ctx: HealthContext, params: {
        memberId: string;
        planVersionId: string;
        periodStart: string;
        periodEnd: string;
    }): Promise<any>;
    /**
     * Review and verify enrolment eligibility.
     * Transitions from awaiting_verification to awaiting_premium_payment or rejected.
     */
    static verifyEnrolment(ctx: HealthContext, enrolmentId: string, params: {
        decision: 'approve' | 'reject';
        reason?: string;
    }): Promise<any>;
    /**
     * Activate policy via verified insurer confirmation.
     * This is the ONLY legitimate path to setting coverage to 'active'.
     */
    static activatePolicyWithProviderEvent(tenantId: string, enrolmentId: string, providerId: string, policyNumber: string, activationEventId: string, effectiveDate: string, expiryDate: string): Promise<{
        policy: any;
        enrolment: any;
    }>;
    /**
     * Staging / Sandbox simulation: Submit to sandbox adapter and activate.
     * Rejected in production.
     */
    static simulateSandboxActivation(ctx: HealthContext, enrolmentId: string): Promise<{
        policy: any;
        enrolment: any;
    }>;
}
