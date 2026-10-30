import { CatalogActor } from './catalog-permissions';
import { CatalogCategory, CatalogChangeEvent, CatalogItem, CatalogStore } from './catalog-store';
export type CatalogMutationResult = {
    catalog_version: number;
    item?: CatalogItem;
    category?: CatalogCategory;
    event: CatalogChangeEvent;
    replayed?: boolean;
};
export declare class CatalogService {
    readonly store: CatalogStore;
    static instance: CatalogService | null;
    static use(service: CatalogService | null): void;
    static get(): CatalogService;
    constructor(store: CatalogStore);
    private present;
    listItems(actor: CatalogActor, tenantId: string, opts?: {
        shopOnly?: boolean;
    }): Record<string, unknown>[];
    getItem(actor: CatalogActor, tenantId: string, id: string): Record<string, unknown> | null;
    listCategories(actor: CatalogActor, tenantId: string): CatalogCategory[];
    createCategory(actor: CatalogActor, tenantId: string, payload: Partial<CatalogCategory>, idempotencyKey?: string): Promise<CatalogMutationResult>;
    updateCategory(actor: CatalogActor, tenantId: string, id: string, payload: Partial<CatalogCategory>, idempotencyKey?: string): Promise<CatalogMutationResult>;
    createItem(actor: CatalogActor, tenantId: string, payload: Partial<CatalogItem>, idempotencyKey?: string): Promise<CatalogMutationResult>;
    updateItem(actor: CatalogActor, tenantId: string, id: string, payload: Partial<CatalogItem>, idempotencyKey?: string): Promise<CatalogMutationResult>;
    getChanges(actor: CatalogActor, tenantId: string, sinceVersion: number): {
        catalog_version: number;
        changes: {
            payload: Record<string, unknown>;
            tenant_id: string;
            catalog_version: number;
            entity_type: "category" | "item" | "variant" | "stock" | "price";
            entity_id: string;
            op: "upsert" | "archive";
            created_at: string;
        }[];
    };
    acknowledge(actor: CatalogActor, tenantId: string, deviceId: string, appliedVersion: number): import("./catalog-store").DeviceCatalogSyncState;
    listDeviceSync(actor: CatalogActor, tenantId: string): {
        catalog_version: number;
        devices: import("./catalog-store").DeviceCatalogSyncState[];
    };
    private syncPayload;
    private publish;
}
