const COST_KEYS = ['cost_price', 'costPrice', 'base_cost_price_kobo', 'baseCostPriceKobo'];

export type CatalogKind = 'shop' | 'fee' | 'internal';

export function catalogKindOf(row: Record<string, unknown> | null | undefined): CatalogKind {
  const raw = String(row?.catalog_kind ?? row?.catalogKind ?? 'shop').toLowerCase();
  if (raw === 'fee' || raw === 'internal') return raw;
  return 'shop';
}

/** Shop sync must never include tuition / fee-structure rows. */
export function isShopCatalogItem(row: Record<string, unknown> | null | undefined): boolean {
  return catalogKindOf(row) === 'shop';
}

export function stripCostPrice<T>(value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => stripCostPrice(entry)) as T;
  }
  if (typeof value !== 'object') return value;
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(src)) {
    if (COST_KEYS.includes(key)) continue;
    out[key] = stripCostPrice(nested);
  }
  return out as T;
}

export function presentCatalogItem(
  item: Record<string, unknown> | null | undefined,
  opts: { includeCost: boolean },
): Record<string, unknown> | null {
  if (!item) return null;
  return opts.includeCost ? { ...item } : stripCostPrice(item);
}

export function presentCatalogItems(
  items: Array<Record<string, unknown>>,
  opts: { includeCost: boolean },
): Array<Record<string, unknown>> {
  return items.map((item) => presentCatalogItem(item, opts) as Record<string, unknown>);
}

export function assertNonNegativeMoney(label: string, amount: unknown): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) {
    const err: any = new Error(`${label} must be a non-negative finite amount`);
    err.status = 400;
    err.code = 'CATALOG_INVALID_PRICE';
    throw err;
  }
  return n;
}
