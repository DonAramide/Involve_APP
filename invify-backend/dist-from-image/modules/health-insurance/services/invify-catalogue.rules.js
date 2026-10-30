"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueSchemaError = exports.CatalogueValidationError = exports.CATALOGUE_STATUSES = exports.INVIFY_DEFAULT_AGENT_CODE = void 0;
exports.requireAuditReason = requireAuditReason;
exports.requireCatalogueCode = requireCatalogueCode;
exports.sanitizeCatalogueSearch = sanitizeCatalogueSearch;
exports.clientSafeCatalogueError = clientSafeCatalogueError;
exports.requireName = requireName;
exports.rejectAaa000Owner = rejectAaa000Owner;
exports.assertInvifyMasterOwnership = assertInvifyMasterOwnership;
exports.canTransitionCatalogueStatus = canTransitionCatalogueStatus;
exports.assertStatusTransition = assertStatusTransition;
exports.bankSubscriptionReference = bankSubscriptionReference;
exports.INVIFY_DEFAULT_AGENT_CODE = 'AAA000';
exports.CATALOGUE_STATUSES = ['draft', 'published', 'suspended', 'retired'];
const CODE = /^[A-Za-z0-9_\-]{2,60}$/;
class CatalogueValidationError extends Error {
    status;
    code;
    constructor(message, status = 400, code = 'CATALOGUE_INVALID') {
        super(message);
        this.name = 'CatalogueValidationError';
        this.status = status;
        this.code = code;
    }
}
exports.CatalogueValidationError = CatalogueValidationError;
class CatalogueSchemaError extends CatalogueValidationError {
    constructor() {
        super('Invify catalogue tables are not applied. Proposed SQL is UNAPPLIED. Live schema was not changed.', 503, 'CATALOGUE_SCHEMA_UNAPPLIED');
        this.name = 'CatalogueSchemaError';
    }
}
exports.CatalogueSchemaError = CatalogueSchemaError;
function requireAuditReason(reason) {
    const text = String(reason || '').trim();
    if (text.length < 5) {
        throw new CatalogueValidationError('An audit reason of at least 5 characters is required for this catalogue action.');
    }
    return text;
}
function requireCatalogueCode(value, label) {
    const code = String(value || '').trim();
    if (!CODE.test(code)) {
        throw new CatalogueValidationError(`${label} must be 2–60 characters of letters, numbers, underscore, or hyphen.`);
    }
    return code;
}
function sanitizeCatalogueSearch(value) {
    return String(value || '')
        .trim()
        .replace(/[%_\\,().]/g, '')
        .slice(0, 64);
}
function clientSafeCatalogueError(error, fallback) {
    const message = String(error?.message || fallback);
    if (/does not exist|schema cache|PGRST205|42P01|42883|could not find the function/i.test(message)) {
        return new CatalogueSchemaError();
    }
    return new CatalogueValidationError(fallback, 500, 'CATALOGUE_UNAVAILABLE');
}
function requireName(value, label) {
    const name = String(value || '').trim();
    if (name.length < 2 || name.length > 160) {
        throw new CatalogueValidationError(`${label} must be between 2 and 160 characters.`);
    }
    return name;
}
function asCode(value) {
    return String(value || '').trim().toUpperCase();
}
/** AAA000 is an agent/aggregator code, not a unique tenant or HMO owner. */
function rejectAaa000Owner(input) {
    const codes = [input.tenantCode, input.agentCode, input.institutionCode, input.ownerCode].map(asCode);
    if (codes.includes(exports.INVIFY_DEFAULT_AGENT_CODE)) {
        throw new CatalogueValidationError('AAA000 is not a verified Invify HMO catalogue owner. Use ownership_scope=invify_master without binding that code.');
    }
}
function assertInvifyMasterOwnership(row) {
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
function canTransitionCatalogueStatus(from, to) {
    if (from === to)
        return true;
    if (from === 'retired')
        return false;
    if (to === 'retired')
        return true;
    if (from === 'draft' && to === 'published')
        return true;
    if (from === 'published' && to === 'suspended')
        return true;
    if (from === 'suspended' && to === 'published')
        return true;
    return false;
}
function assertStatusTransition(from, to) {
    if (!exports.CATALOGUE_STATUSES.includes(to)) {
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
function bankSubscriptionReference(input) {
    return {
        masterOfferingId: input.offeringId,
        masterProductId: input.productId || null,
        planVersionId: input.planVersionId || null,
        overrideStorage: 'bank-scoped row that must not UPDATE hw_catalogue_* or hw_plan_versions',
        note: 'Existing hw_bank_hmo_offerings already references plan_version_id without mutating the version.'
    };
}
//# sourceMappingURL=invify-catalogue.rules.js.map