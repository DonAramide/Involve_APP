/**
 * Standing platform authority for one verified user.
 * This is not an eight-hour hw_platform_grants row and it does not include
 * payout, settlement, or withdrawal permissions.
 *
 * Bootstrap: nobody currently holds platform.tenant_access, so issuance cannot
 * depend on that grant. A different active super_admin calls the entitlement
 * endpoint. The schema also rejects every user id except the verified holder.
 * This file does not insert a row.
 *
 * Recovery: the holder cannot suspend or revoke the entitlement. Any other
 * active super_admin can. The change takes effect on the next request.
 * A compromised holder therefore keeps access until a different super_admin
 * suspends or revokes it. If no other super_admin is available, recovery is a
 * separate break-glass database change and is not implemented here.
 */
export declare const DESIGNATED_PLATFORM_ADMIN_USER_ID = "b8a6b187-9ff2-47dc-bd96-cb846cbd4a7e";
export declare const PLATFORM_ENTITLEMENT_PERMISSIONS: readonly ["platform.providers.manage", "platform.plans.manage", "platform.tenants.onboard", "platform.integration.health", "platform.tenant_access"];
export type PlatformEntitlementPermission = typeof PLATFORM_ENTITLEMENT_PERMISSIONS[number];
export type DurableEntitlementStatus = 'active' | 'suspended' | 'revoked';
export interface DurableEntitlementDiagnostic {
    permission: string;
    status: DurableEntitlementStatus;
}
export declare class PlatformEntitlementError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string);
}
export declare function isPlatformEntitlementPermission(value: string): value is PlatformEntitlementPermission;
/**
 * Active rows authorize. Suspended and revoked rows are diagnostic only.
 * A permission with no row is omitted.
 */
export declare function classifyDurableEntitlementRows(rows: {
    permission?: string;
    suspended_at?: string | null;
    revoked_at?: string | null;
}[] | null | undefined): DurableEntitlementDiagnostic[];
export declare class PlatformEntitlementService {
    static listForOperator(userId: string): Promise<DurableEntitlementDiagnostic[]>;
    static issue(actorUserId: string, permissionInput: string, reason: string, requestedUserId?: string): Promise<{
        id: any;
        user_id: any;
        permission: any;
        granted_by: any;
        granted_at: any;
    }>;
    static suspend(actorUserId: string, permissionInput: string, reason: string): Promise<{
        id: any;
        user_id: any;
        permission: any;
        suspended_at: any;
        suspended_by: any;
    }>;
    static revoke(actorUserId: string, permissionInput: string, reason: string): Promise<{
        id: any;
        user_id: any;
        permission: any;
        revoked_at: any;
        revoked_by: any;
    }>;
}
