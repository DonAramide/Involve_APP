"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvifyCatalogueService = void 0;
const supabase_1 = require("../../../db/supabase");
const health_institution_context_1 = require("./health-institution-context");
const invify_catalogue_rules_1 = require("./invify-catalogue.rules");
const OFFERING_SELECT = `
  id, code, name, description, status, ownership_scope, owner_provider_id,
  created_by, published_by, published_at, retired_at, created_at, updated_at
`;
function schemaOrThrow(error, fallback) {
    if ((0, health_institution_context_1.relationMissing)(error))
        throw new invify_catalogue_rules_1.CatalogueSchemaError();
    throw (0, invify_catalogue_rules_1.clientSafeCatalogueError)(error, fallback);
}
function uuid(value, label) {
    const id = String(value || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new invify_catalogue_rules_1.CatalogueValidationError(`${label} must be a UUID`);
    }
    return id;
}
function mapMutationError(error, fallback) {
    if ((0, health_institution_context_1.relationMissing)(error))
        throw new invify_catalogue_rules_1.CatalogueSchemaError();
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === '23505' || /already exists|duplicate key/i.test(message)) {
        throw new invify_catalogue_rules_1.CatalogueValidationError('A catalogue row with this code already exists.', 409);
    }
    if (code === '22023' || code === 'P0001' || /inactive facilities|retired offering|not found|invify_master|plan version|ownership/i.test(message)) {
        throw new invify_catalogue_rules_1.CatalogueValidationError(message.replace(/^ERROR:\s*/i, '').split('\n')[0].slice(0, 220));
    }
    throw (0, invify_catalogue_rules_1.clientSafeCatalogueError)(error, fallback);
}
async function applyCatalogueMutation(op, payload, ctx, fallback) {
    const reason = (0, invify_catalogue_rules_1.requireAuditReason)(payload.reason || ctx.platformReason);
    const { data, error } = await supabase_1.supabaseAdmin.rpc('hw_catalogue_apply_mutation', {
        p_op: op,
        p_payload: { ...payload, reason },
        p_actor_user_id: ctx.userId,
        p_reason: reason
    });
    if (error)
        mapMutationError(error, fallback);
    if (!data)
        throw new invify_catalogue_rules_1.CatalogueValidationError(fallback, 500, 'CATALOGUE_UNAVAILABLE');
    return data;
}
async function loadOffering(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('hw_catalogue_offerings')
        .select(OFFERING_SELECT)
        .eq('id', id)
        .maybeSingle();
    if (error)
        schemaOrThrow(error, 'Failed to read offering');
    if (!data)
        throw new invify_catalogue_rules_1.CatalogueValidationError('Offering was not found.', 404, 'CATALOGUE_NOT_FOUND');
    (0, invify_catalogue_rules_1.assertInvifyMasterOwnership)(data);
    return data;
}
async function loadProductOffering(productId) {
    const { data: product, error: productError } = await supabase_1.supabaseAdmin
        .from('hw_catalogue_products')
        .select('id, service_id')
        .eq('id', productId)
        .maybeSingle();
    if (productError)
        schemaOrThrow(productError, 'Failed to read product');
    if (!product)
        throw new invify_catalogue_rules_1.CatalogueValidationError('Product was not found.', 404);
    const { data: service, error: serviceError } = await supabase_1.supabaseAdmin
        .from('hw_catalogue_services')
        .select('offering_id')
        .eq('id', product.service_id)
        .maybeSingle();
    if (serviceError)
        schemaOrThrow(serviceError, 'Failed to read service');
    if (!service?.offering_id)
        throw new invify_catalogue_rules_1.CatalogueValidationError('Product is not linked to an Invify offering.', 404);
    const offering = await loadOffering(service.offering_id);
    return { product, service, offering };
}
class InvifyCatalogueService {
    static bankSubscriptionReference = invify_catalogue_rules_1.bankSubscriptionReference;
    static async listOfferings(query) {
        const search = (0, invify_catalogue_rules_1.sanitizeCatalogueSearch)(query?.search);
        const status = String(query?.status || '').trim();
        let q = supabase_1.supabaseAdmin
            .from('hw_catalogue_offerings')
            .select(OFFERING_SELECT, { count: 'exact' })
            .eq('ownership_scope', 'invify_master')
            .is('owner_provider_id', null)
            .order('updated_at', { ascending: false });
        if (search)
            q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        if (status)
            q = q.eq('status', status);
        const { data, error, count } = await q;
        if (error)
            schemaOrThrow(error, 'Failed to list offerings');
        return {
            offerings: data || [],
            total: typeof count === 'number' ? count : (data || []).length,
            ownership: {
                scope: 'invify_master',
                aaa000Bound: false,
                note: 'AAA000 is not used as the catalogue owner. Tenant-managed HMO plans remain on hw_plans.'
            },
            phase3: {
                subscribeBy: 'hw_catalogue_offerings.id',
                optionalProduct: 'hw_catalogue_products.id',
                existingBankSwitch: 'hw_bank_hmo_offerings.plan_version_id'
            }
        };
    }
    static async getOfferingTree(offeringId) {
        const offering = await loadOffering(uuid(offeringId, 'offeringId'));
        const { data: services, error: serviceError } = await supabase_1.supabaseAdmin
            .from('hw_catalogue_services')
            .select('id, offering_id, code, name, description, status, sort_order, created_at, updated_at')
            .eq('offering_id', offering.id)
            .order('sort_order');
        if (serviceError)
            schemaOrThrow(serviceError, 'Failed to list services');
        const serviceIds = (services || []).map((row) => row.id);
        const { data: products, error: productError } = serviceIds.length
            ? await supabase_1.supabaseAdmin
                .from('hw_catalogue_products')
                .select('id, service_id, code, name, description, status, plan_id, plan_version_id, price_minor, currency, coverage, created_at, updated_at')
                .in('service_id', serviceIds)
            : { data: [], error: null };
        if (productError)
            schemaOrThrow(productError, 'Failed to list products');
        const productIds = (products || []).map((row) => row.id);
        const { data: facilities, error: facilityError } = productIds.length
            ? await supabase_1.supabaseAdmin
                .from('hw_catalogue_product_facilities')
                .select('product_id, facility_id, is_eligible, hw_facilities (id, name, provider_id, is_active)')
                .in('product_id', productIds)
            : { data: [], error: null };
        if (facilityError)
            schemaOrThrow(facilityError, 'Failed to list product facilities');
        const facilitiesByProduct = new Map();
        for (const row of facilities || []) {
            const list = facilitiesByProduct.get(row.product_id) || [];
            list.push(row);
            facilitiesByProduct.set(row.product_id, list);
        }
        return {
            offering,
            services: (services || []).map((service) => ({
                ...service,
                products: (products || [])
                    .filter((product) => product.service_id === service.id)
                    .map((product) => ({
                    ...product,
                    facilities: facilitiesByProduct.get(product.id) || [],
                    bankReference: (0, invify_catalogue_rules_1.bankSubscriptionReference)({
                        offeringId: offering.id,
                        productId: product.id,
                        planVersionId: product.plan_version_id
                    })
                }))
            })),
            financial: {
                enrolsMembers: false,
                issuesInvoice: false,
                postsPayout: false
            }
        };
    }
    static async createOffering(ctx, body) {
        (0, invify_catalogue_rules_1.rejectAaa000Owner)(body || {});
        const reason = (0, invify_catalogue_rules_1.requireAuditReason)(body?.reason || ctx.platformReason);
        const code = (0, invify_catalogue_rules_1.requireCatalogueCode)(body?.code, 'Offering code');
        const name = (0, invify_catalogue_rules_1.requireName)(body?.name, 'Offering name');
        (0, invify_catalogue_rules_1.assertInvifyMasterOwnership)({
            ownership_scope: 'invify_master',
            owner_provider_id: body?.ownerProviderId || null,
            owner_tenant_id: body?.ownerTenantId || null
        });
        return applyCatalogueMutation('create_offering', {
            code,
            name,
            description: String(body?.description || '').trim() || null,
            reason
        }, ctx, 'Failed to create offering');
    }
    static async updateOffering(ctx, offeringId, body) {
        const offering = await loadOffering(uuid(offeringId, 'offeringId'));
        if (offering.status === 'retired')
            throw new invify_catalogue_rules_1.CatalogueValidationError('A retired offering cannot be edited.');
        const reason = (0, invify_catalogue_rules_1.requireAuditReason)(body?.reason || ctx.platformReason);
        const patch = {
            offering_id: offering.id,
            reason
        };
        if (body?.name != null)
            patch.name = (0, invify_catalogue_rules_1.requireName)(body.name, 'Offering name');
        if (body?.description != null)
            patch.description = String(body.description || '').trim() || null;
        return applyCatalogueMutation('update_offering', patch, ctx, 'Failed to update offering');
    }
    static async setOfferingStatus(ctx, offeringId, body) {
        const offering = await loadOffering(uuid(offeringId, 'offeringId'));
        const reason = (0, invify_catalogue_rules_1.requireAuditReason)(body?.reason || ctx.platformReason);
        const next = String(body?.status || '').trim();
        (0, invify_catalogue_rules_1.assertStatusTransition)(offering.status, next);
        return applyCatalogueMutation('set_offering_status', { offering_id: offering.id, status: next, reason }, ctx, 'Failed to change offering status');
    }
    static async addService(ctx, offeringId, body) {
        const offering = await loadOffering(uuid(offeringId, 'offeringId'));
        if (offering.status === 'retired')
            throw new invify_catalogue_rules_1.CatalogueValidationError('Cannot add a service to a retired offering.');
        const reason = (0, invify_catalogue_rules_1.requireAuditReason)(body?.reason || ctx.platformReason);
        return applyCatalogueMutation('add_service', {
            offering_id: offering.id,
            code: (0, invify_catalogue_rules_1.requireCatalogueCode)(body?.code, 'Service code'),
            name: (0, invify_catalogue_rules_1.requireName)(body?.name, 'Service name'),
            description: String(body?.description || '').trim() || null,
            sort_order: Number.isInteger(body?.sortOrder) ? body.sortOrder : 0,
            reason
        }, ctx, 'Failed to add service');
    }
    static async addProduct(ctx, serviceId, body) {
        const sid = uuid(serviceId, 'serviceId');
        const reason = (0, invify_catalogue_rules_1.requireAuditReason)(body?.reason || ctx.platformReason);
        const { data: service, error: serviceError } = await supabase_1.supabaseAdmin
            .from('hw_catalogue_services')
            .select('id, offering_id, status')
            .eq('id', sid)
            .maybeSingle();
        if (serviceError)
            schemaOrThrow(serviceError, 'Failed to read service');
        if (!service)
            throw new invify_catalogue_rules_1.CatalogueValidationError('Service was not found.', 404);
        await loadOffering(service.offering_id);
        let planId = null;
        let planVersionId = null;
        if (body?.planVersionId) {
            planVersionId = uuid(body.planVersionId, 'planVersionId');
            const { data: version, error: versionError } = await supabase_1.supabaseAdmin
                .from('hw_plan_versions')
                .select('id, plan_id, status')
                .eq('id', planVersionId)
                .maybeSingle();
            if (versionError)
                schemaOrThrow(versionError, 'Failed to resolve plan version');
            if (!version)
                throw new invify_catalogue_rules_1.CatalogueValidationError('Linked plan version was not found.', 404);
            if (version.status !== 'published') {
                throw new invify_catalogue_rules_1.CatalogueValidationError('A product may only associate a published plan version.');
            }
            planId = version.plan_id;
            if (body?.planId && uuid(body.planId, 'planId') !== planId) {
                throw new invify_catalogue_rules_1.CatalogueValidationError('planId does not match the linked plan version.');
            }
        }
        return applyCatalogueMutation('add_product', {
            service_id: service.id,
            code: (0, invify_catalogue_rules_1.requireCatalogueCode)(body?.code, 'Product code'),
            name: (0, invify_catalogue_rules_1.requireName)(body?.name, 'Product name'),
            description: String(body?.description || '').trim() || null,
            plan_id: planId,
            plan_version_id: planVersionId,
            price_minor: Number.isInteger(body?.priceMinor) ? body.priceMinor : null,
            currency: String(body?.currency || 'NGN').trim() || 'NGN',
            coverage: Array.isArray(body?.coverage) ? body.coverage : [],
            reason
        }, ctx, 'Failed to add product');
    }
    static async assignFacility(ctx, productId, body) {
        const pid = uuid(productId, 'productId');
        const facilityId = uuid(body?.facilityId, 'facilityId');
        const reason = (0, invify_catalogue_rules_1.requireAuditReason)(body?.reason || ctx.platformReason);
        await loadProductOffering(pid);
        const { data: facility, error: facilityError } = await supabase_1.supabaseAdmin
            .from('hw_facilities')
            .select('id, name, is_active')
            .eq('id', facilityId)
            .maybeSingle();
        if (facilityError)
            schemaOrThrow(facilityError, 'Failed to resolve facility');
        if (!facility)
            throw new invify_catalogue_rules_1.CatalogueValidationError('Facility was not found in hw_facilities.', 404);
        if (facility.is_active === false) {
            throw new invify_catalogue_rules_1.CatalogueValidationError('Inactive facilities cannot be assigned to a catalogue product.');
        }
        return applyCatalogueMutation('assign_facility', {
            product_id: pid,
            facility_id: facilityId,
            is_eligible: body?.isEligible !== false,
            reason
        }, ctx, 'Failed to assign facility');
    }
    static async removeFacility(ctx, productId, facilityId, reason) {
        const pid = uuid(productId, 'productId');
        const fid = uuid(facilityId, 'facilityId');
        const auditReason = (0, invify_catalogue_rules_1.requireAuditReason)(reason);
        await loadProductOffering(pid);
        await applyCatalogueMutation('remove_facility', { product_id: pid, facility_id: fid, reason: auditReason }, ctx, 'Failed to remove facility assignment');
        return { productId: pid, facilityId: fid, removed: true };
    }
}
exports.InvifyCatalogueService = InvifyCatalogueService;
//# sourceMappingURL=invify-catalogue.service.js.map