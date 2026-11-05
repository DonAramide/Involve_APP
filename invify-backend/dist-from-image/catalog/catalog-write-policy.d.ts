export declare const CATALOG_SCHEMA_UNAVAILABLE: {
    readonly code: "CATALOG_SCHEMA_UNAVAILABLE";
    readonly error: "Catalog mutation was not published. Durable event and version were not committed.";
    readonly published: false;
};
/** Existing cloud rows are inventory-only for devices. Name/price/kind stay server-authored. */
export declare function isCloudResidentItem(existing: {
    id?: string;
} | undefined | null): boolean;
