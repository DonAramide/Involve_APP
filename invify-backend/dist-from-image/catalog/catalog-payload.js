"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogKindOf = catalogKindOf;
exports.isShopCatalogItem = isShopCatalogItem;
exports.stripCostPrice = stripCostPrice;
exports.presentCatalogItem = presentCatalogItem;
exports.presentCatalogItems = presentCatalogItems;
exports.assertNonNegativeMoney = assertNonNegativeMoney;
const COST_KEYS = ['cost_price', 'costPrice', 'base_cost_price_kobo', 'baseCostPriceKobo'];
function catalogKindOf(row) {
    const raw = String(row?.catalog_kind ?? row?.catalogKind ?? 'shop').toLowerCase();
    if (raw === 'fee' || raw === 'internal')
        return raw;
    return 'shop';
}
/** Shop sync must never include tuition / fee-structure rows. */
function isShopCatalogItem(row) {
    return catalogKindOf(row) === 'shop';
}
function stripCostPrice(value) {
    if (value == null)
        return value;
    if (Array.isArray(value)) {
        return value.map((entry) => stripCostPrice(entry));
    }
    if (typeof value !== 'object')
        return value;
    const src = value;
    const out = {};
    for (const [key, nested] of Object.entries(src)) {
        if (COST_KEYS.includes(key))
            continue;
        out[key] = stripCostPrice(nested);
    }
    return out;
}
function presentCatalogItem(item, opts) {
    if (!item)
        return null;
    return opts.includeCost ? { ...item } : stripCostPrice(item);
}
function presentCatalogItems(items, opts) {
    return items.map((item) => presentCatalogItem(item, opts));
}
function assertNonNegativeMoney(label, amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
        const err = new Error(`${label} must be a non-negative finite amount`);
        err.status = 400;
        err.code = 'CATALOG_INVALID_PRICE';
        throw err;
    }
    return n;
}
//# sourceMappingURL=catalog-payload.js.map