export declare const CATALOG_PERMISSIONS: readonly ["catalog.view", "catalog.create", "catalog.update", "catalog.delete", "catalog.category.manage", "catalog.cost.view", "catalog.cost.update", "catalog.price.update", "catalog.inventory.view", "catalog.inventory.adjust", "catalog.sync.view", "catalog.sync.retry", "catalog.import", "catalog.export"];
export type CatalogPermission = (typeof CATALOG_PERMISSIONS)[number];
export type CatalogActor = {
    tenantId?: string;
    role?: unknown;
    permissions?: string[];
    deviceId?: string;
    userId?: string;
};
export declare function hasCatalogPermission(actor: CatalogActor | undefined, permission: CatalogPermission): boolean;
export declare function canViewCostPrice(actor: CatalogActor | undefined): boolean;
export declare class CatalogForbiddenError extends Error {
    status: number;
    code: string;
    constructor(permission: string);
}
export declare function assertCatalogPermission(actor: CatalogActor | undefined, permission: CatalogPermission): void;
