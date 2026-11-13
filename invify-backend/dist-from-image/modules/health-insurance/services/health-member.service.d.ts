import { HealthContext, HealthMemberCategory } from '../types';
export interface CreateMemberParams {
    category: HealthMemberCategory;
    studentId?: string;
    tenantStaffId?: string;
    staffCategory?: 'teaching' | 'non_teaching';
    department?: string;
    customerId?: string;
    cohortLabel?: string;
}
export declare class HealthMemberService {
    /**
     * List insured members for the authenticated tenant.
     */
    static listMembers(ctx: HealthContext, params: {
        category?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: any;
            mode: any;
            member_category: any;
            insurer_member_ref: any;
            cohort_label: any;
            status: any;
            created_at: any;
            students: {
                id: any;
                first_name: any;
                last_name: any;
                admission_number: any;
                current_class: any;
            }[];
            hw_staff_profiles: {
                id: any;
                employment_category: any;
                department: any;
                tenant_staff: {
                    id: any;
                    name: any;
                    staff_id: any;
                    phone: any;
                }[];
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
     * Enrol an existing student as a health member.
     */
    static enrolStudentMember(ctx: HealthContext, studentId: string, cohortLabel?: string): Promise<any>;
    /**
     * Enrol an existing staff member from tenant_staff as a health member.
     * Requires health.hr_admin permission.
     */
    static enrolStaffMember(ctx: HealthContext, params: {
        tenantStaffId: string;
        employmentCategory: 'teaching' | 'non_teaching';
        department?: string;
        userId?: string;
    }): Promise<any>;
}
