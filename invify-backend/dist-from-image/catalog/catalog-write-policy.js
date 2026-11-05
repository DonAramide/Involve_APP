"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATALOG_SCHEMA_UNAVAILABLE = void 0;
exports.isCloudResidentItem = isCloudResidentItem;
exports.CATALOG_SCHEMA_UNAVAILABLE = {
    code: 'CATALOG_SCHEMA_UNAVAILABLE',
    error: 'Catalog mutation was not published. Durable event and version were not committed.',
    published: false,
};
/** Existing cloud rows are inventory-only for devices. Name/price/kind stay server-authored. */
function isCloudResidentItem(existing) {
    return Boolean(existing?.id);
}
//# sourceMappingURL=catalog-write-policy.js.map