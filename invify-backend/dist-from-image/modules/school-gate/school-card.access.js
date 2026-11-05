"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRoleAllowed = assertRoleAllowed;
exports.assertCardManager = assertCardManager;
exports.assertScanOperator = assertScanOperator;
const school_card_errors_1 = require("./school-card.errors");
const CARD_MANAGERS = ['owner', 'tenant_admin'];
function assertRoleAllowed(role, allowed, message = 'ID cards can be managed by the school owner or a tenant administrator.') {
    if (role == null || role.trim() === '') {
        throw new school_card_errors_1.SchoolCardError(message, 403, 'FORBIDDEN');
    }
    let seen = false;
    for (const part of role.toLowerCase().split(',')) {
        const token = part.trim();
        if (!token)
            continue;
        if (!allowed.includes(token)) {
            throw new school_card_errors_1.SchoolCardError(message, 403, 'FORBIDDEN');
        }
        seen = true;
    }
    if (!seen) {
        throw new school_card_errors_1.SchoolCardError(message, 403, 'FORBIDDEN');
    }
}
/** Tenant scope comes only from the authenticated profile. */
function assertCardManager(user) {
    if (!user?.id) {
        throw new school_card_errors_1.SchoolCardError('Authentication is required.', 401, 'UNAUTHENTICATED');
    }
    const tenantId = String(user.tenantId || '').trim();
    if (!tenantId) {
        throw new school_card_errors_1.SchoolCardError('ID cards can be managed by the school owner or a tenant administrator.', 403, 'FORBIDDEN');
    }
    assertRoleAllowed(user.role, CARD_MANAGERS);
    return { userId: user.id, tenantId };
}
const SCAN_OPERATORS = ['owner', 'tenant_admin', 'teacher', 'tenant_operator'];
/** A scan uses the signed-in school account. Body, query, and header tenant values are ignored. */
function assertScanOperator(user) {
    if (!user?.id) {
        throw new school_card_errors_1.SchoolCardError('Authentication is required.', 401, 'UNAUTHENTICATED');
    }
    const tenantId = String(user.tenantId || '').trim();
    if (!tenantId) {
        throw new school_card_errors_1.SchoolCardError('Gate scans require a school account.', 403, 'FORBIDDEN');
    }
    assertRoleAllowed(user.role, SCAN_OPERATORS, 'Gate scans require a school owner, administrator, teacher, or operator.');
    return { userId: user.id, tenantId };
}
//# sourceMappingURL=school-card.access.js.map