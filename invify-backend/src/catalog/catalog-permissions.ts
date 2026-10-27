export const CATALOG_PERMISSIONS = [
  'catalog.view',
  'catalog.create',
  'catalog.update',
  'catalog.delete',
  'catalog.category.manage',
  'catalog.cost.view',
  'catalog.cost.update',
  'catalog.price.update',
  'catalog.inventory.view',
  'catalog.inventory.adjust',
  'catalog.sync.view',
  'catalog.sync.retry',
  'catalog.import',
  'catalog.export',
] as const;

export type CatalogPermission = (typeof CATALOG_PERMISSIONS)[number];

export type CatalogActor = {
  tenantId?: string;
  role?: unknown;
  permissions?: string[];
  deviceId?: string;
  userId?: string;
};

function rolesOf(actor: CatalogActor | undefined): string[] {
  const raw = actor?.role;
  if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase().trim());
  return String(raw || '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
}

const ROLE_GRANTS: Record<string, CatalogPermission[]> = {
  super_admin: [...CATALOG_PERMISSIONS],
  owner: [...CATALOG_PERMISSIONS],
  tenant_admin: [...CATALOG_PERMISSIONS],
  admin: [...CATALOG_PERMISSIONS],
  branch_manager: [
    'catalog.view',
    'catalog.create',
    'catalog.update',
    'catalog.category.manage',
    'catalog.price.update',
    'catalog.inventory.view',
    'catalog.inventory.adjust',
    'catalog.sync.view',
  ],
  inventory_manager: [
    'catalog.view',
    'catalog.inventory.view',
    'catalog.inventory.adjust',
    'catalog.sync.view',
  ],
  cashier: ['catalog.view', 'catalog.inventory.view'],
  staff: ['catalog.view', 'catalog.inventory.view'],
  service_staff: ['catalog.view'],
  pos_operator: ['catalog.view'],
  device: ['catalog.view', 'catalog.sync.view'],
};

export function hasCatalogPermission(actor: CatalogActor | undefined, permission: CatalogPermission): boolean {
  if (!actor) return false;
  const explicit = actor.permissions || [];
  if (explicit.includes(permission)) return true;
  const roles = rolesOf(actor);
  return roles.some((role) => (ROLE_GRANTS[role] || []).includes(permission));
}

export function canViewCostPrice(actor: CatalogActor | undefined): boolean {
  return hasCatalogPermission(actor, 'catalog.cost.view');
}

export class CatalogForbiddenError extends Error {
  status = 403;
  code = 'CATALOG_FORBIDDEN';
  constructor(permission: string) {
    super(`Forbidden: missing ${permission}`);
  }
}

export function assertCatalogPermission(actor: CatalogActor | undefined, permission: CatalogPermission): void {
  if (!hasCatalogPermission(actor, permission)) {
    throw new CatalogForbiddenError(permission);
  }
}
