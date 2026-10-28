import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { relationMissing } from './health-institution-context';
import {
  CatalogueSchemaError,
  CatalogueValidationError,
  assertInvifyMasterOwnership,
  assertStatusTransition,
  bankSubscriptionReference,
  clientSafeCatalogueError,
  rejectAaa000Owner,
  requireAuditReason,
  requireCatalogueCode,
  requireName,
  sanitizeCatalogueSearch
} from './invify-catalogue.rules';

const OFFERING_SELECT = `
  id, code, name, description, status, ownership_scope, owner_provider_id,
  created_by, published_by, published_at, retired_at, created_at, updated_at
`;

function schemaOrThrow(error: any, fallback: string): never {
  if (relationMissing(error)) throw new CatalogueSchemaError();
  throw clientSafeCatalogueError(error, fallback);
}

function uuid(value: unknown, label: string): string {
  const id = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new CatalogueValidationError(`${label} must be a UUID`);
  }
  return id;
}

function mapMutationError(error: any, fallback: string): never {
  if (relationMissing(error)) throw new CatalogueSchemaError();
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === '23505' || /already exists|duplicate key/i.test(message)) {
    throw new CatalogueValidationError('A catalogue row with this code already exists.', 409);
  }
  if (code === '22023' || code === 'P0001' || /inactive facilities|retired offering|not found|invify_master|plan version|ownership/i.test(message)) {
    throw new CatalogueValidationError(message.replace(/^ERROR:\s*/i, '').split('\n')[0].slice(0, 220));
  }
  throw clientSafeCatalogueError(error, fallback);
}

async function applyCatalogueMutation(
  op: string,
  payload: Record<string, unknown>,
  ctx: HealthContext,
  fallback: string
) {
  const reason = requireAuditReason(payload.reason || ctx.platformReason);
  const { data, error } = await supabaseAdmin.rpc('hw_catalogue_apply_mutation', {
    p_op: op,
    p_payload: { ...payload, reason },
    p_actor_user_id: ctx.userId,
    p_reason: reason
  });
  if (error) mapMutationError(error, fallback);
  if (!data) throw new CatalogueValidationError(fallback, 500, 'CATALOGUE_UNAVAILABLE');
  return data;
}

async function loadOffering(id: string) {
  const { data, error } = await supabaseAdmin
    .from('hw_catalogue_offerings')
    .select(OFFERING_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) schemaOrThrow(error, 'Failed to read offering');
  if (!data) throw new CatalogueValidationError('Offering was not found.', 404, 'CATALOGUE_NOT_FOUND');
  assertInvifyMasterOwnership(data);
  return data;
}

async function loadProductOffering(productId: string) {
  const { data: product, error: productError } = await supabaseAdmin
    .from('hw_catalogue_products')
    .select('id, service_id')
    .eq('id', productId)
    .maybeSingle();
  if (productError) schemaOrThrow(productError, 'Failed to read product');
  if (!product) throw new CatalogueValidationError('Product was not found.', 404);
  const { data: service, error: serviceError } = await supabaseAdmin
    .from('hw_catalogue_services')
    .select('offering_id')
    .eq('id', product.service_id)
    .maybeSingle();
  if (serviceError) schemaOrThrow(serviceError, 'Failed to read service');
  if (!service?.offering_id) throw new CatalogueValidationError('Product is not linked to an Invify offering.', 404);
  const offering = await loadOffering(service.offering_id);
  return { product, service, offering };
}

export class InvifyCatalogueService {
  static bankSubscriptionReference = bankSubscriptionReference;

  static async listOfferings(query: any) {
    const search = sanitizeCatalogueSearch(query?.search);
    const status = String(query?.status || '').trim();
    let q = supabaseAdmin
      .from('hw_catalogue_offerings')
      .select(OFFERING_SELECT, { count: 'exact' })
      .eq('ownership_scope', 'invify_master')
      .is('owner_provider_id', null)
      .order('updated_at', { ascending: false });
    if (search) q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    if (status) q = q.eq('status', status);
    const { data, error, count } = await q;
    if (error) schemaOrThrow(error, 'Failed to list offerings');
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

  static async getOfferingTree(offeringId: string) {
    const offering = await loadOffering(uuid(offeringId, 'offeringId'));
    const { data: services, error: serviceError } = await supabaseAdmin
      .from('hw_catalogue_services')
      .select('id, offering_id, code, name, description, status, sort_order, created_at, updated_at')
      .eq('offering_id', offering.id)
      .order('sort_order');
    if (serviceError) schemaOrThrow(serviceError, 'Failed to list services');
    const serviceIds = (services || []).map((row) => row.id);
    const { data: products, error: productError } = serviceIds.length
      ? await supabaseAdmin
          .from('hw_catalogue_products')
          .select('id, service_id, code, name, description, status, plan_id, plan_version_id, price_minor, currency, coverage, created_at, updated_at')
          .in('service_id', serviceIds)
      : { data: [] as any[], error: null };
    if (productError) schemaOrThrow(productError, 'Failed to list products');
    const productIds = (products || []).map((row) => row.id);
    const { data: facilities, error: facilityError } = productIds.length
      ? await supabaseAdmin
          .from('hw_catalogue_product_facilities')
          .select('product_id, facility_id, is_eligible, hw_facilities (id, name, provider_id, is_active)')
          .in('product_id', productIds)
      : { data: [] as any[], error: null };
    if (facilityError) schemaOrThrow(facilityError, 'Failed to list product facilities');
    const facilitiesByProduct = new Map<string, any[]>();
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
            bankReference: bankSubscriptionReference({
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

  static async createOffering(ctx: HealthContext, body: any) {
    rejectAaa000Owner(body || {});
    const reason = requireAuditReason(body?.reason || ctx.platformReason);
    const code = requireCatalogueCode(body?.code, 'Offering code');
    const name = requireName(body?.name, 'Offering name');
    assertInvifyMasterOwnership({
      ownership_scope: 'invify_master',
      owner_provider_id: body?.ownerProviderId || null,
      owner_tenant_id: body?.ownerTenantId || null
    });
    return applyCatalogueMutation(
      'create_offering',
      {
        code,
        name,
        description: String(body?.description || '').trim() || null,
        reason
      },
      ctx,
      'Failed to create offering'
    );
  }

  static async updateOffering(ctx: HealthContext, offeringId: string, body: any) {
    const offering = await loadOffering(uuid(offeringId, 'offeringId'));
    if (offering.status === 'retired') throw new CatalogueValidationError('A retired offering cannot be edited.');
    const reason = requireAuditReason(body?.reason || ctx.platformReason);
    const patch: Record<string, unknown> = {
      offering_id: offering.id,
      reason
    };
    if (body?.name != null) patch.name = requireName(body.name, 'Offering name');
    if (body?.description != null) patch.description = String(body.description || '').trim() || null;
    return applyCatalogueMutation('update_offering', patch, ctx, 'Failed to update offering');
  }

  static async setOfferingStatus(ctx: HealthContext, offeringId: string, body: any) {
    const offering = await loadOffering(uuid(offeringId, 'offeringId'));
    const reason = requireAuditReason(body?.reason || ctx.platformReason);
    const next = String(body?.status || '').trim();
    assertStatusTransition(offering.status, next);
    return applyCatalogueMutation(
      'set_offering_status',
      { offering_id: offering.id, status: next, reason },
      ctx,
      'Failed to change offering status'
    );
  }

  static async addService(ctx: HealthContext, offeringId: string, body: any) {
    const offering = await loadOffering(uuid(offeringId, 'offeringId'));
    if (offering.status === 'retired') throw new CatalogueValidationError('Cannot add a service to a retired offering.');
    const reason = requireAuditReason(body?.reason || ctx.platformReason);
    return applyCatalogueMutation(
      'add_service',
      {
        offering_id: offering.id,
        code: requireCatalogueCode(body?.code, 'Service code'),
        name: requireName(body?.name, 'Service name'),
        description: String(body?.description || '').trim() || null,
        sort_order: Number.isInteger(body?.sortOrder) ? body.sortOrder : 0,
        reason
      },
      ctx,
      'Failed to add service'
    );
  }

  static async addProduct(ctx: HealthContext, serviceId: string, body: any) {
    const sid = uuid(serviceId, 'serviceId');
    const reason = requireAuditReason(body?.reason || ctx.platformReason);
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('hw_catalogue_services')
      .select('id, offering_id, status')
      .eq('id', sid)
      .maybeSingle();
    if (serviceError) schemaOrThrow(serviceError, 'Failed to read service');
    if (!service) throw new CatalogueValidationError('Service was not found.', 404);
    await loadOffering(service.offering_id);

    let planId: string | null = null;
    let planVersionId: string | null = null;
    if (body?.planVersionId) {
      planVersionId = uuid(body.planVersionId, 'planVersionId');
      const { data: version, error: versionError } = await supabaseAdmin
        .from('hw_plan_versions')
        .select('id, plan_id, status')
        .eq('id', planVersionId)
        .maybeSingle();
      if (versionError) schemaOrThrow(versionError, 'Failed to resolve plan version');
      if (!version) throw new CatalogueValidationError('Linked plan version was not found.', 404);
      if (version.status !== 'published') {
        throw new CatalogueValidationError('A product may only associate a published plan version.');
      }
      planId = version.plan_id;
      if (body?.planId && uuid(body.planId, 'planId') !== planId) {
        throw new CatalogueValidationError('planId does not match the linked plan version.');
      }
    }

    return applyCatalogueMutation(
      'add_product',
      {
        service_id: service.id,
        code: requireCatalogueCode(body?.code, 'Product code'),
        name: requireName(body?.name, 'Product name'),
        description: String(body?.description || '').trim() || null,
        plan_id: planId,
        plan_version_id: planVersionId,
        price_minor: Number.isInteger(body?.priceMinor) ? body.priceMinor : null,
        currency: String(body?.currency || 'NGN').trim() || 'NGN',
        coverage: Array.isArray(body?.coverage) ? body.coverage : [],
        reason
      },
      ctx,
      'Failed to add product'
    );
  }

  static async assignFacility(ctx: HealthContext, productId: string, body: any) {
    const pid = uuid(productId, 'productId');
    const facilityId = uuid(body?.facilityId, 'facilityId');
    const reason = requireAuditReason(body?.reason || ctx.platformReason);
    await loadProductOffering(pid);

    const { data: facility, error: facilityError } = await supabaseAdmin
      .from('hw_facilities')
      .select('id, name, is_active')
      .eq('id', facilityId)
      .maybeSingle();
    if (facilityError) schemaOrThrow(facilityError, 'Failed to resolve facility');
    if (!facility) throw new CatalogueValidationError('Facility was not found in hw_facilities.', 404);
    if (facility.is_active === false) {
      throw new CatalogueValidationError('Inactive facilities cannot be assigned to a catalogue product.');
    }

    return applyCatalogueMutation(
      'assign_facility',
      {
        product_id: pid,
        facility_id: facilityId,
        is_eligible: body?.isEligible !== false,
        reason
      },
      ctx,
      'Failed to assign facility'
    );
  }

  static async removeFacility(ctx: HealthContext, productId: string, facilityId: string, reason: unknown) {
    const pid = uuid(productId, 'productId');
    const fid = uuid(facilityId, 'facilityId');
    const auditReason = requireAuditReason(reason);
    await loadProductOffering(pid);
    await applyCatalogueMutation(
      'remove_facility',
      { product_id: pid, facility_id: fid, reason: auditReason },
      ctx,
      'Failed to remove facility assignment'
    );
    return { productId: pid, facilityId: fid, removed: true };
  }
}
