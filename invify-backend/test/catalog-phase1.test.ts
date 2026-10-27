import { CatalogService } from '../src/catalog/catalog.service';
import { MemoryCatalogStore } from '../src/catalog/catalog-store';
import {
  deviceInsertRow,
  deviceUpdateRow,
  isWebPublishedCatalog,
} from '../src/catalog/catalog-bulk-sync';
import { presentCatalogItem, stripCostPrice } from '../src/catalog/catalog-payload';
import { hasCatalogPermission } from '../src/catalog/catalog-permissions';
import { CATALOG_SCHEMA_UNAVAILABLE } from '../src/catalog/catalog-write-policy';

const tenantA = '11111111-1111-1111-1111-111111111111';
const tenantB = '22222222-2222-2222-2222-222222222222';

const adminA = { tenantId: tenantA, role: 'tenant_admin', userId: 'user-a' };
const adminB = { tenantId: tenantB, role: 'owner', userId: 'user-b' };
const cashierA = { tenantId: tenantA, role: 'cashier', userId: 'cash-a' };
const deviceA = { tenantId: tenantA, role: 'device', deviceId: 'dev-a' };
const deviceB = { tenantId: tenantB, role: 'device', deviceId: 'dev-b' };

function service() {
  const store = new MemoryCatalogStore();
  const svc = new CatalogService(store);
  CatalogService.use(svc);
  return { store, svc };
}

describe('catalog phase 1 foundation', () => {
  afterEach(() => CatalogService.use(null));

  test('tenant A cannot read or modify tenant B catalog', async () => {
    const { svc } = service();
    const created = await svc.createItem(adminA, tenantA, { name: 'Notebook', price: 500, sku: 'NB-1' });
    expect(() => svc.getItem(adminB, tenantA, created.item!.id)).toThrow(/Forbidden/);
    await expect(
      svc.updateItem(adminB, tenantA, created.item!.id, { price: 1 }),
    ).rejects.toThrow(/Forbidden/);
    expect(svc.listItems(adminB, tenantB)).toEqual([]);
  });

  test('unauthorized users cannot change categories or prices', async () => {
    const { svc } = service();
    const created = await svc.createItem(adminA, tenantA, { name: 'Pen', price: 100, cost_price: 40 });
    await expect(svc.createCategory(cashierA, tenantA, { name: 'Shop' })).rejects.toThrow(/catalog.category.manage/);
    await expect(svc.updateItem(cashierA, tenantA, created.item!.id, { price: 120 })).rejects.toThrow(/catalog.update/);
    expect(hasCatalogPermission(cashierA, 'catalog.price.update')).toBe(false);
  });

  test('cashiers cannot retrieve cost prices through list, detail, or change payloads', async () => {
    const { svc } = service();
    const created = await svc.createItem(adminA, tenantA, { name: 'Blazer', price: 8000, cost_price: 4500 });
    const listed = svc.listItems(cashierA, tenantA);
    const detail = svc.getItem(cashierA, tenantA, created.item!.id);
    const changes = svc.getChanges(cashierA, tenantA, 0);
    expect(listed[0].cost_price).toBeUndefined();
    expect(detail!.cost_price).toBeUndefined();
    expect((changes.changes[0] as any).payload.cost_price).toBeUndefined();
    expect(stripCostPrice({ cost_price: 9, price: 10 })).toEqual({ price: 10 });
    expect(presentCatalogItem({ cost_price: 1, sku: 'x' }, { includeCost: false })!.cost_price).toBeUndefined();
  });

  test('school fee items are excluded from the shop catalog', async () => {
    const { store, svc } = service();
    const now = new Date().toISOString();
    store.upsertItem({
      id: 'fee-1',
      tenant_id: tenantA,
      name: 'Term 1 Tuition',
      type: 'service',
      catalog_kind: 'fee',
      price: 50000,
      cost_price: 0,
      stock_qty: 0,
      min_stock_qty: 0,
      status: 'active',
      catalog_version: 1,
      created_at: now,
      updated_at: now,
    });
    await svc.createItem(adminA, tenantA, { name: 'School Polo', price: 2500 });
    const shop = svc.listItems(adminA, tenantA);
    expect(shop.map((row) => row.name)).toEqual(['School Polo']);
    await expect(svc.updateItem(adminA, tenantA, 'fee-1', { price: 1 })).rejects.toThrow(/protected catalog kind/);
    const changes = svc.getChanges(adminA, tenantA, 0);
    expect(changes.changes).toHaveLength(1);
    expect((changes.changes[0] as any).payload.name).toBe('School Polo');
  });

  test('a catalog update creates exactly one durable event and advances version', async () => {
    const { store, svc } = service();
    await svc.createCategory(adminA, tenantA, { name: 'Uniforms' });
    const created = await svc.createItem(adminA, tenantA, { name: 'Tie', price: 700 });
    expect(store.listEventsSince(tenantA, 0)).toHaveLength(2);
    expect(created.catalog_version).toBe(2);
    expect(store.getTenantVersion(tenantA)).toBe(2);
  });

  test('price history and version commit atomically with the catalog mutation', async () => {
    const { store, svc } = service();
    const created = await svc.createItem(adminA, tenantA, { name: 'Socks', price: 200, cost_price: 80 });
    store.invoiceLines.push({
      id: 'inv-line-1',
      tenant_id: tenantA,
      item_id: created.item!.id,
      unit_price: 200,
    });
    const updated = await svc.updateItem(adminA, tenantA, created.item!.id, { price: 250, cost_price: 90 });
    expect(updated.catalog_version).toBe(2);
    expect(store.listPriceHistory(tenantA, created.item!.id).map((row) => row.new_amount)).toEqual(
      expect.arrayContaining([200, 80, 250, 90]),
    );
    expect(store.listInvoiceLines(tenantA)[0].unit_price).toBe(200);
  });

  test('failed publication rolls back item, version, history, and event', async () => {
    const { store, svc } = service();
    const original = store.appendEvent.bind(store);
    store.appendEvent = () => {
      throw new Error('event write failed');
    };
    await expect(svc.createItem(adminA, tenantA, { name: 'Broken', price: 10 })).rejects.toThrow('event write failed');
    store.appendEvent = original;
    expect(store.listItems(tenantA)).toHaveLength(0);
    expect(store.getTenantVersion(tenantA)).toBe(0);
    expect(store.listPriceHistory(tenantA)).toHaveLength(0);
    expect(store.listEventsSince(tenantA, 0)).toHaveLength(0);
  });

  test('duplicate idempotency keys do not create duplicate publication events', async () => {
    const { store, svc } = service();
    const first = await svc.createItem(adminA, tenantA, { name: 'Badge', price: 50 }, 'idem-1');
    const second = await svc.createItem(adminA, tenantA, { name: 'Badge', price: 50 }, 'idem-1');
    expect(second.replayed).toBe(true);
    expect(second.catalog_version).toBe(first.catalog_version);
    expect(store.listEventsSince(tenantA, 0)).toHaveLength(1);
    await expect(
      svc.createItem(adminA, tenantA, { name: 'Badge', price: 99 }, 'idem-1'),
    ).rejects.toThrow(/idempotency key reuse/);
    expect(store.listEventsSince(tenantA, 0)).toHaveLength(1);
  });

  test('a stale device cannot overwrite a web-published selling price', async () => {
    const existing = { id: 'item-1', sku: 'SKU-1', price: 2800, cost_price: 1000, catalog_version: 4, name: 'Rice 50kg' };
    expect(isWebPublishedCatalog(existing)).toBe(true);
    const update = deviceUpdateRow(existing, {
      sku: 'SKU-1',
      name: 'Hacked name',
      price: 1,
      cost_price: 1,
      stock_qty: 40,
      min_stock_qty: 5,
      barcode: '123',
    });
    expect(update.price).toBeUndefined();
    expect(update.cost_price).toBeUndefined();
    expect(update.name).toBeUndefined();
    expect(update.stock_qty).toBe(40);
    const insert = deviceInsertRow(tenantA, {
      name: 'Local draft',
      sku: 'NEW-1',
      price: 100,
      cost_price: 70,
      catalog_kind: 'fee',
    });
    expect(insert.price).toBe(100);
    expect(insert.cost_price).toBeUndefined();
    expect(insert.catalog_kind).toBe('shop');
    expect(insert.catalog_version).toBe(0);
  });

  test('device acknowledgements cannot advance another tenant sync state', async () => {
    const { store, svc } = service();
    await svc.createItem(adminA, tenantA, { name: 'Cap', price: 900 });
    await svc.createItem(adminB, tenantB, { name: 'Oil', price: 1200 });
    expect(() => svc.acknowledge(deviceB, tenantA, 'dev-b', 1)).toThrow(/Forbidden/);
    const ack = svc.acknowledge(deviceA, tenantA, 'dev-a', 1);
    expect(ack.last_applied_version).toBe(1);
    expect(store.getDeviceSync(tenantB, 'dev-b')).toBeUndefined();
    expect(() => svc.acknowledge(deviceA, tenantA, 'dev-a', 99)).toThrow(/not been published/);
  });

  test('invalid prices are rejected', async () => {
    const { svc } = service();
    await expect(svc.createItem(adminA, tenantA, { name: 'Bad', price: -1 })).rejects.toThrow(/non-negative/);
    await expect(svc.createItem(adminA, tenantA, { name: 'Missing price' } as any)).rejects.toThrow(/selling price is required/);
  });

  test('inventory bulk-sync remains compatible for stock on unpublished drafts', () => {
    const existing = { id: 'draft-1', sku: 'DRAFT', price: 10, catalog_version: 0, name: 'Draft' };
    const row = deviceUpdateRow(existing, { stock_qty: 8, min_stock_qty: 2, barcode: 'b', name: 'Draft renamed' });
    expect(row.stock_qty).toBe(8);
    expect(row.name).toBeUndefined();
    expect(row.price).toBeUndefined();
  });

  test('cashiers do not see unpublished device drafts', async () => {
    const { store, svc } = service();
    const now = new Date().toISOString();
    store.upsertItem({
      id: 'draft-pos',
      tenant_id: tenantA,
      name: 'Unapproved POS item',
      type: 'product',
      catalog_kind: 'shop',
      price: 12,
      cost_price: 3,
      stock_qty: 1,
      min_stock_qty: 0,
      status: 'active',
      catalog_version: 0,
      created_at: now,
      updated_at: now,
    });
    expect(svc.listItems(cashierA, tenantA)).toEqual([]);
    expect(svc.listItems(adminA, tenantA).map((row) => row.name)).toEqual(['Unapproved POS item']);
  });

  test('web catalog writes must not report success without a durable publication', () => {
    expect(CATALOG_SCHEMA_UNAVAILABLE.published).toBe(false);
    expect(CATALOG_SCHEMA_UNAVAILABLE.code).toBe('CATALOG_SCHEMA_UNAVAILABLE');
  });
});
