export declare const UUID_RE: RegExp;
export declare function asUuid(value: unknown): string | null;
/** Deterministic UUID so local integer / INV-* keys upsert into UUID PKs. */
export declare function toStableUuid(tenantId: string, entityType: string, raw: string): string;
