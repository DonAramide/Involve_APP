export const CATALOG_SCHEMA_UNAVAILABLE = {
  code: 'CATALOG_SCHEMA_UNAVAILABLE',
  error: 'Catalog mutation was not published. Durable event and version were not committed.',
  published: false,
} as const;

/** Existing cloud rows are inventory-only for devices. Name/price/kind stay server-authored. */
export function isCloudResidentItem(existing: { id?: string } | undefined | null): boolean {
  return Boolean(existing?.id);
}
