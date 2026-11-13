export type CatalogKind = 'shop' | 'fee' | 'internal';
export declare function catalogKindOf(row: Record<string, unknown> | null | undefined): CatalogKind;
/** Shop sync must never include tuition / fee-structure rows. */
export declare function isShopCatalogItem(row: Record<string, unknown> | null | undefined): boolean;
export declare function stripCostPrice<T>(value: T): T;
export declare function presentCatalogItem(item: Record<string, unknown> | null | undefined, opts: {
    includeCost: boolean;
}): Record<string, unknown> | null;
export declare function presentCatalogItems(items: Array<Record<string, unknown>>, opts: {
    includeCost: boolean;
}): Array<Record<string, unknown>>;
export declare function assertNonNegativeMoney(label: string, amount: unknown): number;
