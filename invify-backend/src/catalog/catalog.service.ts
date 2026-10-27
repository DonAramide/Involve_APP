import { randomUUID } from 'crypto';
import {
  assertCatalogPermission,
  CatalogActor,
  canViewCostPrice,
  CatalogForbiddenError,
  hasCatalogPermission,
} from './catalog-permissions';
import { assertNonNegativeMoney, isShopCatalogItem, presentCatalogItem, presentCatalogItems } from './catalog-payload';
import {
  CatalogCategory,
  CatalogChangeEvent,
  CatalogItem,
  CatalogStore,
  MemoryCatalogStore,
} from './catalog-store';

export type CatalogMutationResult = {
  catalog_version: number;
  item?: CatalogItem;
  category?: CatalogCategory;
  event: CatalogChangeEvent;
  replayed?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function requireTenant(actor: CatalogActor, tenantId: string) {
  if (!actor.tenantId) {
    const err: any = new Error('Unauthenticated');
    err.status = 401;
    throw err;
  }
  if (actor.tenantId !== tenantId && !String(actor.role || '').toLowerCase().includes('super_admin')) {
    throw new CatalogForbiddenError('catalog.tenant');
  }
}

export class CatalogService {
  static instance: CatalogService | null = null;

  static use(service: CatalogService | null) {
    this.instance = service;
  }

  static get(): CatalogService {
    if (!this.instance) this.instance = new CatalogService(new MemoryCatalogStore());
    return this.instance;
  }

  constructor(public readonly store: CatalogStore) {}

  private present(item: CatalogItem | undefined, actor: CatalogActor) {
    return presentCatalogItem(item as any, { includeCost: canViewCostPrice(actor) });
  }

  listItems(actor: CatalogActor, tenantId: string, opts?: { shopOnly?: boolean }) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.view');
    let items = this.store.listItems(tenantId);
    if (opts?.shopOnly !== false) items = items.filter((row) => isShopCatalogItem(row as any));
    if (!hasCatalogPermission(actor, 'catalog.create')) {
      items = items.filter((row) => Number(row.catalog_version) > 0);
    }
    return presentCatalogItems(items as any, { includeCost: canViewCostPrice(actor) });
  }

  getItem(actor: CatalogActor, tenantId: string, id: string) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.view');
    const item = this.store.getItem(tenantId, id);
    if (!item) {
      const err: any = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    if (!isShopCatalogItem(item as any) && !canViewCostPrice(actor)) {
      const err: any = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    if (!hasCatalogPermission(actor, 'catalog.create') && Number(item.catalog_version) <= 0) {
      const err: any = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    return this.present(item, actor);
  }

  listCategories(actor: CatalogActor, tenantId: string) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.view');
    return this.store.listCategories(tenantId);
  }

  async createCategory(actor: CatalogActor, tenantId: string, payload: Partial<CatalogCategory>, idempotencyKey?: string) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.category.manage');
    if (!payload.name?.trim()) {
      const err: any = new Error('Category name is required');
      err.status = 400;
      throw err;
    }
    return this.publish(actor, tenantId, idempotencyKey, { type: 'createCategory', payload }, () => {
      const category: CatalogCategory = {
        id: payload.id || randomUUID(),
        tenant_id: tenantId,
        parent_category_id: payload.parent_category_id || null,
        name: payload.name!.trim(),
        description: payload.description || null,
        image_url: payload.image_url || null,
        sort_order: payload.sort_order || 0,
        status: payload.status || 'active',
        catalog_version: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      return { entityType: 'category' as const, entityId: category.id, op: 'upsert' as const, category, payload: { name: category.name } };
    });
  }

  async updateCategory(
    actor: CatalogActor,
    tenantId: string,
    id: string,
    payload: Partial<CatalogCategory>,
    idempotencyKey?: string,
  ) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.category.manage');
    return this.publish(actor, tenantId, idempotencyKey, { type: 'updateCategory', id, payload }, () => {
      const existing = this.store.getCategory(tenantId, id);
      if (!existing) {
        const err: any = new Error('Category not found');
        err.status = 404;
        throw err;
      }
      const category: CatalogCategory = {
        ...existing,
        ...payload,
        id: existing.id,
        tenant_id: tenantId,
        updated_at: nowIso(),
      };
      return { entityType: 'category' as const, entityId: id, op: 'upsert' as const, category, payload: { name: category.name } };
    });
  }

  async createItem(actor: CatalogActor, tenantId: string, payload: Partial<CatalogItem>, idempotencyKey?: string) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.create');
    if (payload.price != null) assertCatalogPermission(actor, 'catalog.price.update');
    if (payload.cost_price != null) assertCatalogPermission(actor, 'catalog.cost.update');
    if (!payload.name?.trim()) {
      const err: any = new Error('Item name is required');
      err.status = 400;
      throw err;
    }
    if (payload.price == null) {
      const err: any = new Error('selling price is required when creating an item');
      err.status = 400;
      throw err;
    }
    const price = assertNonNegativeMoney('selling price', payload.price);
    const cost = assertNonNegativeMoney('cost price', payload.cost_price ?? 0);
    return this.publish(actor, tenantId, idempotencyKey, { type: 'createItem', payload }, () => {
      if (payload.sku) {
        const dup = this.store.findItemBySku(tenantId, payload.sku);
        if (dup) {
          const err: any = new Error('SKU already exists for this tenant');
          err.status = 409;
          throw err;
        }
      }
      const item: CatalogItem = {
        id: payload.id || randomUUID(),
        tenant_id: tenantId,
        category_id: payload.category_id || null,
        name: payload.name!.trim(),
        description: payload.description || null,
        sku: payload.sku || null,
        barcode: payload.barcode || null,
        image_url: payload.image_url || null,
        type: payload.type || 'product',
        catalog_kind: 'shop',
        price,
        cost_price: cost,
        stock_qty: payload.stock_qty ?? 0,
        min_stock_qty: payload.min_stock_qty ?? 0,
        status: payload.status || 'active',
        catalog_version: 0,
        created_by: actor.userId || null,
        updated_by: actor.userId || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      return {
        entityType: 'item' as const,
        entityId: item.id,
        op: 'upsert' as const,
        item,
        priceChanges: [
          { price_type: 'selling' as const, old_amount: 0, new_amount: price },
          ...(cost ? [{ price_type: 'cost' as const, old_amount: 0, new_amount: cost }] : []),
        ],
        payload: this.syncPayload(item),
      };
    });
  }

  async updateItem(actor: CatalogActor, tenantId: string, id: string, payload: Partial<CatalogItem>, idempotencyKey?: string) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.update');
    if (payload.price != null) assertCatalogPermission(actor, 'catalog.price.update');
    if (payload.cost_price != null) assertCatalogPermission(actor, 'catalog.cost.update');
    if (payload.price != null) assertNonNegativeMoney('selling price', payload.price);
    if (payload.cost_price != null) assertNonNegativeMoney('cost price', payload.cost_price);
    return this.publish(actor, tenantId, idempotencyKey, { type: 'updateItem', id, payload }, () => {
      const existing = this.store.getItem(tenantId, id);
      if (!existing) {
        const err: any = new Error('Item not found');
        err.status = 404;
        throw err;
      }
      if (existing.catalog_kind === 'fee' || existing.catalog_kind === 'internal') {
        const err: any = new Error('protected catalog kind cannot be mutated via shop publisher');
        err.status = 403;
        err.code = 'CATALOG_KIND_PROTECTED';
        throw err;
      }
      const item: CatalogItem = {
        ...existing,
        ...payload,
        id: existing.id,
        tenant_id: tenantId,
        price: payload.price != null ? Number(payload.price) : existing.price,
        cost_price: payload.cost_price != null ? Number(payload.cost_price) : existing.cost_price,
        updated_by: actor.userId || null,
        updated_at: nowIso(),
      };
      const priceChanges = [];
      if (payload.price != null && Number(payload.price) !== Number(existing.price)) {
        priceChanges.push({
          price_type: 'selling' as const,
          old_amount: Number(existing.price),
          new_amount: Number(payload.price),
        });
      }
      if (payload.cost_price != null && Number(payload.cost_price) !== Number(existing.cost_price)) {
        priceChanges.push({
          price_type: 'cost' as const,
          old_amount: Number(existing.cost_price),
          new_amount: Number(payload.cost_price),
        });
      }
      return {
        entityType: 'item' as const,
        entityId: id,
        op: item.status === 'archived' ? ('archive' as const) : ('upsert' as const),
        item,
        priceChanges,
        payload: this.syncPayload(item),
      };
    });
  }

  getChanges(actor: CatalogActor, tenantId: string, sinceVersion: number) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.view');
    const includeCost = canViewCostPrice(actor);
    const changes = this.store
      .listEventsSince(tenantId, sinceVersion)
      .filter((event) => event.entity_type !== 'item' || isShopCatalogItem(event.payload))
      .map((event) => ({
        ...event,
        payload: includeCost ? event.payload : presentCatalogItem(event.payload, { includeCost: false }) || {},
      }));
    return {
      catalog_version: this.store.getTenantVersion(tenantId),
      changes,
    };
  }

  acknowledge(actor: CatalogActor, tenantId: string, deviceId: string, appliedVersion: number) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.view');
    if (!deviceId) {
      const err: any = new Error('device_id is required');
      err.status = 400;
      throw err;
    }
    if (actor.deviceId && actor.deviceId !== deviceId && !String(actor.role || '').toLowerCase().includes('super_admin')) {
      throw new CatalogForbiddenError('catalog.sync.retry');
    }
    const published = this.store.getTenantVersion(tenantId);
    const applied = Number(appliedVersion || 0);
    if (applied > published) {
      const err: any = new Error('Cannot acknowledge a catalog version that has not been published');
      err.status = 409;
      throw err;
    }
    const status =
      applied === published ? 'up_to_date' : applied < published ? 'pending' : 'unknown';
    return this.store.upsertDeviceSync({
      tenant_id: tenantId,
      device_id: deviceId,
      last_applied_version: applied,
      last_sync_at: nowIso(),
      last_acknowledged_at: nowIso(),
      sync_status: status,
      last_error: null,
    });
  }

  listDeviceSync(actor: CatalogActor, tenantId: string) {
    requireTenant(actor, tenantId);
    assertCatalogPermission(actor, 'catalog.sync.view');
    // store has no list-all helper besides map; memory store exposes deviceSync
    return {
      catalog_version: this.store.getTenantVersion(tenantId),
      devices: this.store.listDeviceSync(tenantId),
    };
  }

  private syncPayload(item: CatalogItem): Record<string, unknown> {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      type: item.type,
      catalog_kind: item.catalog_kind,
      price: item.price,
      status: item.status,
      category_id: item.category_id,
      stock_qty: item.stock_qty,
      image_url: item.image_url,
      description: item.description,
    };
  }

  private async publish(
    actor: CatalogActor,
    tenantId: string,
    idempotencyKey: string | undefined,
    fingerprint: unknown,
    build: () => {
      entityType: CatalogChangeEvent['entity_type'];
      entityId: string;
      op: CatalogChangeEvent['op'];
      item?: CatalogItem;
      category?: CatalogCategory;
      payload: Record<string, unknown>;
      priceChanges?: Array<{ price_type: 'selling' | 'cost'; old_amount: number; new_amount: number }>;
    },
  ): Promise<CatalogMutationResult> {
    const requestHash = JSON.stringify(fingerprint);
    if (idempotencyKey) {
      const existing = this.store.getIdempotency(tenantId, idempotencyKey);
      if (existing) {
        if (existing.request_hash !== requestHash) {
          const err: any = new Error('idempotency key reuse with different request');
          err.status = 409;
          throw err;
        }
        return { ...(existing.body as CatalogMutationResult), replayed: true };
      }
    }

    return this.store.runAtomic(async () => {
      const built = build();
      const nextVersion = this.store.getTenantVersion(tenantId) + 1;
      if (built.item) {
        built.item.catalog_version = nextVersion;
        this.store.upsertItem(built.item);
      }
      if (built.category) {
        built.category.catalog_version = nextVersion;
        this.store.upsertCategory(built.category);
      }
      for (const change of built.priceChanges || []) {
        this.store.appendPriceHistory({
          tenant_id: tenantId,
          item_id: built.item!.id,
          price_type: change.price_type,
          old_amount: change.old_amount,
          new_amount: change.new_amount,
          changed_by: actor.userId || null,
          reason: null,
          created_at: nowIso(),
        });
      }
      this.store.setTenantVersion(tenantId, nextVersion);
      const event: CatalogChangeEvent = {
        tenant_id: tenantId,
        catalog_version: nextVersion,
        entity_type: built.entityType,
        entity_id: built.entityId,
        op: built.op,
        payload: { ...built.payload, catalog_version: nextVersion },
        created_at: nowIso(),
      };
      this.store.appendEvent(event);
      const result: CatalogMutationResult = {
        catalog_version: nextVersion,
        item: built.item,
        category: built.category,
        event,
      };
      if (idempotencyKey) this.store.putIdempotency(tenantId, idempotencyKey, nextVersion, result, requestHash);
      return result;
    });
  }
}
