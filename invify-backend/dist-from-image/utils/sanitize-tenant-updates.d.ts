/** Admin-editable tenant columns. Anything else in a PATCH body is dropped. */
export declare const TENANT_UPDATE_ALLOWED_KEYS: readonly ["name", "type", "plan", "plan_expires_at", "status", "support_phone", "support_email", "support_whatsapp", "phone", "owner_email", "owner_name", "location", "country", "state", "lga", "street_address"];
export type TenantUpdateKey = (typeof TENANT_UPDATE_ALLOWED_KEYS)[number];
/** Columns that may be missing on older staging DBs — strip and retry. */
export declare const TENANT_UPDATE_OPTIONAL_KEYS: readonly ["plan_expires_at"];
export declare function normalizeTenantType(type: unknown): string | undefined;
/**
 * Strip computed list-row fields and unknown keys so PostgREST does not 500
 * on schema-cache misses (e.g. device_registrations, plan_expires_at).
 */
export declare function sanitizeTenantUpdates(body: Record<string, unknown> | null | undefined): Record<string, unknown>;
export declare function isMissingTenantColumnError(error: {
    message?: string;
    code?: string;
} | null | undefined, column: string): boolean;
export declare function withoutOptionalTenantColumns(updates: Record<string, unknown>, error: {
    message?: string;
    code?: string;
} | null | undefined): Record<string, unknown> | null;
