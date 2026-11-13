/**
 * Explicit attribution for school virtual-account deposits.
 *
 * Canonical and legacy parent VAs must never be treated as child-owned
 * accounts. Excess over child debt is a parent-level credit on the tablet;
 * this helper only decides webhook / socket identity.
 */
export type DepositCustomer = {
    id?: string | null;
    tenant_id?: string | null;
};
export type DepositStudent = {
    id?: string | null;
    tenant_id?: string | null;
    school_id?: string | null;
    admission_number?: string | null;
};
export type ParentVaAttribution = {
    parentOwned: boolean;
    paidVia: 'parent_account' | 'student_account' | null;
    customerId: string | null;
    studentId: string | null;
    admissionNumber: string | null;
    tenantId: string | null;
};
export declare function isParentCustomerId(id?: string | null): boolean;
export declare function pickParentOwnedAttribution(opts: {
    customers?: DepositCustomer[] | null;
    students?: DepositStudent[] | null;
    /** True when this account number is registered as a parent canonical or legacy VA. */
    parentVaRegistered?: boolean;
    parentCustomerIdHint?: string | null;
}): ParentVaAttribution;
