import { HealthContext } from '../types';
export declare class HealthGuardianService {
    /**
     * Issue an invitation to link a parent or guardian to a student.
     */
    static inviteGuardian(ctx: HealthContext, params: {
        studentId: string;
        relationship: 'mother' | 'father' | 'legal_guardian' | 'other_relative' | 'other';
        channel: 'email' | 'sms' | 'whatsapp';
        contactValue: string;
        isPrimary?: boolean;
    }): Promise<{
        linkId: any;
        invitationId: any;
        rawToken: string;
        expiresAt: string;
    }>;
    /**
     * Accept an invitation using the authenticated user identity.
     * State transitions to 'pending_verification'. Access to health records remains BLOCKED.
     */
    static acceptInvitation(userId: string, rawToken: string): Promise<{
        linkId: any;
        status: any;
        studentName: string;
    }>;
    /**
     * Verify relationship by an authorized school administrator.
     * Transitions status to 'verified' and assigns explicit capability flags.
     */
    static verifyRelationship(ctx: HealthContext, linkId: string, params: {
        decision: 'approve' | 'reject';
        verificationMethod?: 'school_record_check' | 'document_sighted' | 'in_person';
        reason?: string;
        capabilities?: {
            canViewCoverage?: boolean;
            canViewPremiums?: boolean;
            canPayPremiums?: boolean;
            canManageEnrolment?: boolean;
        };
    }): Promise<any>;
    /**
     * List children linked to the authenticated guardian.
     */
    static listGuardianChildren(userId: string): Promise<{
        id: any;
        relationship: any;
        status: any;
        can_view_coverage: any;
        can_view_premiums: any;
        can_pay_premiums: any;
        can_manage_enrolment: any;
        students: {
            id: any;
            first_name: any;
            last_name: any;
            admission_number: any;
            current_class: any;
            tenants: {
                id: any;
                name: any;
            }[];
        }[];
    }[]>;
}
