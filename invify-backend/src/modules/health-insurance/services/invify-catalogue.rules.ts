export const INVIFY_DEFAULT_AGENT_CODE = 'AAA000';

export const CATALOGUE_STATUSES = ['draft', 'published', 'suspended', 'retired'] as const;
export type CatalogueStatus = (typeof CATALOGUE_STATUSES)[number];
export type CatalogueOwnershipScope = 'invify_master' | 'hmo_provider';

const CODE = /^[A-Za-z0-9_\-]{2,60}$/;

export class CatalogueValidationError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'CATALOGUE_INVALID') {
    super(message);
    this.name = 'CatalogueValidationError';
    this.status = status;
    this.code = code;
  }
}

export class CatalogueSchemaError extends CatalogueValidationError {
  constructor() {
    super(
      'Invify catalogue tables are not applied. Proposed SQL is UNAPPLIED. Live schema was not changed.',
      503,
      'CATALOGUE_SCHEMA_UNAPPLIED'
    );
    this.name = 'CatalogueSchemaError';
  }
}

export function requireAuditReason(reason: unknown): string {
  const text = String(reason || '').trim();
  if (text.length < 5) {
    throw new CatalogueValidationError('An audit reason of at least 5 characters is required for this catalogue action.');
  }
  return text;
}

export function requireCatalogueCode(value: unknown, label: string): string {
  const code = String(value || '').trim();
  if (!CODE.test(code)) {
    throw new CatalogueValidationError(`${label} must be 2–60 characters of letters, numbers, underscore, or hyphen.`);
  }
  return code;
}

export function sanitizeCatalogueSearch(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/[%_\\,().]/g, '')
    .slice(0, 64);
}

export function clientSafeCatalogueError(error: unknown, fallback: string): CatalogueValidationError {
  const message = String((error as { message?: string } | null)?.message || fallback);
  if (/does not exist|schema cache|PGRST205|42P01|42883|could not find the function/i.test(message)) {
    return new CatalogueSchemaError();
  }
  return new CatalogueValidationError(fallback, 500, 'CATALOGUE_UNAVAILABLE');
}

export function requireName(value: unknown, label: string): string {
  const name = String(value || '').trim();
  if (name.length < 2 || name.length > 160) {
    throw new CatalogueValidationError(`${label} must be between 2 and 160 characters.`);
  }
  return name;
}

function asCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

/** AAA000 is an agent/aggregator code, not a unique tenant or HMO owner. */
export function rejectAaa000Owner(input: {
  tenantCode?: unknown;
  agentCode?: unknown;
  institutionCode?: unknown;
  ownerCode?: unknown;
}): void {
  const codes = [input.tenantCode, input.agentCode, input.institutionCode, input.ownerCode].map(asCode);
  if (codes.includes(INVIFY_DEFAULT_AGENT_CODE)) {
    throw new CatalogueValidationError(
      'AAA000 is not a verified Invify HMO catalogue owner. Use ownership_scope=invify_master without binding that code.'
    );
  }
}

export function assertInvifyMasterOwnership(row: {
  ownership_scope?: string;
  owner_provider_id?: string | null;
  owner_tenant_id?: string | null;
}): void {
  if (String(row.ownership_scope || '') !== 'invify_master') {
    throw new CatalogueValidationError('Platform catalogue writes are limited to ownership_scope=invify_master.');
  }
  if (row.owner_provider_id) {
    throw new CatalogueValidationError('Invify master offerings cannot be owned by an HMO provider. Tenant-managed HMO plans stay on hw_plans.');
  }
  if (row.owner_tenant_id) {
    throw new CatalogueValidationError('Invify master offerings cannot be owned by a tenant row.');
  }
}

export function canTransitionCatalogueStatus(from: string, to: string): boolean {
  if (from === to) return true;
  if (from === 'retired') return false;
  if (to === 'retired') return true;
  if (from === 'draft' && to === 'published') return true;
  if (from === 'published' && to === 'suspended') return true;
  if (from === 'suspended' && to === 'published') return true;
  return false;
}

export function assertStatusTransition(from: string, to: string): void {
  if (!CATALOGUE_STATUSES.includes(to as CatalogueStatus)) {
    throw new CatalogueValidationError('Status must be draft, published, suspended, or retired.');
  }
  if (!canTransitionCatalogueStatus(from, to)) {
    throw new CatalogueValidationError(`Cannot change catalogue status from ${from} to ${to}.`);
  }
}

/**
 * Stable ids Phase 3 banks will subscribe to. Master rows are referenced,
 * not copied, and not updated by a bank write.
 */
export function bankSubscriptionReference(input: {
  offeringId: string;
  productId?: string | null;
  planVersionId?: string | null;
}) {
  return {
    masterOfferingId: input.offeringId,
    masterProductId: input.productId || null,
    planVersionId: input.planVersionId || null,
    overrideStorage: 'bank-scoped row that must not UPDATE hw_catalogue_* or hw_plan_versions',
    note: 'Existing hw_bank_hmo_offerings already references plan_version_id without mutating the version.'
  };
}
