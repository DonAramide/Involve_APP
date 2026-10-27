import { CardActor } from './school-card.types';
import { SchoolCardError } from './school-card.errors';

const CARD_MANAGERS = ['owner', 'tenant_admin'];

export function assertRoleAllowed(
  role: string | null | undefined,
  allowed: string[],
  message = 'ID cards can be managed by the school owner or a tenant administrator.',
): void {
  if (role == null || role.trim() === '') {
    throw new SchoolCardError(message, 403, 'FORBIDDEN');
  }
  let seen = false;
  for (const part of role.toLowerCase().split(',')) {
    const token = part.trim();
    if (!token) continue;
    if (!allowed.includes(token)) {
      throw new SchoolCardError(message, 403, 'FORBIDDEN');
    }
    seen = true;
  }
  if (!seen) {
    throw new SchoolCardError(message, 403, 'FORBIDDEN');
  }
}

/** Tenant scope comes only from the authenticated profile. */
export function assertCardManager(user: CardActor | undefined): { userId: string; tenantId: string } {
  if (!user?.id) {
    throw new SchoolCardError('Authentication is required.', 401, 'UNAUTHENTICATED');
  }
  const tenantId = String(user.tenantId || '').trim();
  if (!tenantId) {
    throw new SchoolCardError('ID cards can be managed by the school owner or a tenant administrator.', 403, 'FORBIDDEN');
  }
  assertRoleAllowed(user.role, CARD_MANAGERS);
  return { userId: user.id, tenantId };
}

const SCAN_OPERATORS = ['owner', 'tenant_admin', 'teacher', 'tenant_operator'];

/** A scan uses the signed-in school account. Body, query, and header tenant values are ignored. */
export function assertScanOperator(user: CardActor | undefined): { userId: string; tenantId: string } {
  if (!user?.id) {
    throw new SchoolCardError('Authentication is required.', 401, 'UNAUTHENTICATED');
  }
  const tenantId = String(user.tenantId || '').trim();
  if (!tenantId) {
    throw new SchoolCardError('Gate scans require a school account.', 403, 'FORBIDDEN');
  }
  assertRoleAllowed(user.role, SCAN_OPERATORS, 'Gate scans require a school owner, administrator, teacher, or operator.');
  return { userId: user.id, tenantId };
}
