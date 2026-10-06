import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { attachTenantBillingRoutes } from '../src/modules/tenant-billing/register-routes';

const CATCHALL_BODY = {
  error: 'Endpoint not found',
  message: 'This section could not be loaded. Please refresh and try again.',
};

function installCatchAll(application: express.Express) {
  application.use((_req, res) => {
    res.status(404).json(CATCHALL_BODY);
  });
}

function billingLayerIndex(application: any): number {
  const stack = application._router?.stack || [];
  return stack.findIndex((layer: any) => layer.route && String(layer.route.path).includes('tenant-billing'));
}

function catchAllLayerIndex(application: any): number {
  const stack = application._router?.stack || [];
  let idx = -1;
  stack.forEach((layer: any, i: number) => {
    if (!layer.route && typeof layer.handle === 'function' && layer.handle.length === 2) {
      idx = i;
    }
  });
  return idx;
}

function countBillingLayers(application: any): number {
  const stack = application._router?.stack || [];
  return stack.filter((layer: any) => layer.route && String(layer.route.path).includes('tenant-billing')).length;
}

function appTs(): string {
  return fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
}

describe('Phase 33.2-R1 tenant billing route order', () => {
  it('places attachTenantBillingRoutes before the catch-all 404 in app.ts', () => {
    const src = appTs();
    const attachAt = src.indexOf('attachTenantBillingRoutes(app)');
    const catchAllAt = src.indexOf('// 3. 404 HANDLER');
    expect(attachAt).toBeGreaterThan(0);
    expect(catchAllAt).toBeGreaterThan(attachAt);
    expect(src.includes("registerCollisionAdmin('get', '/tenant-billing/overview'")).toBe(false);
  });

  it('keeps known admin tenants registration before the catch-all', () => {
    const src = appTs();
    const tenantsAt = src.indexOf("registerCollisionAdmin('get', '/tenants'");
    const catchAllAt = src.indexOf('// 3. 404 HANDLER');
    expect(tenantsAt).toBeGreaterThan(0);
    expect(catchAllAt).toBeGreaterThan(tenantsAt);
  });

  it('registers billing routes before catch-all on the Express stack', () => {
    const application = express();
    attachTenantBillingRoutes(application);
    installCatchAll(application);
    const billingIdx = billingLayerIndex(application);
    const catchAllIdx = catchAllLayerIndex(application);
    expect(billingIdx).toBeGreaterThanOrEqual(0);
    expect(catchAllIdx).toBeGreaterThan(billingIdx);
  });

  it('GET /api/admin/tenant-billing/overview does not return the catch-all 404', async () => {
    const application = express();
    attachTenantBillingRoutes(application);
    installCatchAll(application);
    const res = await request(application).get('/api/admin/tenant-billing/overview');
    expect(res.status).not.toBe(404);
    expect(res.body.error).not.toBe(CATCHALL_BODY.error);
    expect([401, 403, 503]).toContain(res.status);
  });

  it('unauthenticated billing access still hits authentication/RBAC', async () => {
    const application = express();
    attachTenantBillingRoutes(application);
    installCatchAll(application);
    const res = await request(application).get('/admin/tenant-billing/overview');
    expect([401, 403, 503]).toContain(res.status);
  });

  it('unknown routes still return the normal catch-all 404', async () => {
    const application = express();
    attachTenantBillingRoutes(application);
    installCatchAll(application);
    const res = await request(application).get('/does-not-exist-billing-order-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(CATCHALL_BODY.error);
  });

  it('does not duplicate billing routes when attach is called twice', () => {
    const application = express();
    attachTenantBillingRoutes(application);
    const once = countBillingLayers(application);
    attachTenantBillingRoutes(application);
    expect(countBillingLayers(application)).toBe(once);
    expect(once).toBeGreaterThan(0);
  });

  it('billing is unreachable if attach runs after catch-all (regression guard)', async () => {
    const broken = express();
    installCatchAll(broken);
    attachTenantBillingRoutes(broken);
    const res = await request(broken).get('/api/admin/tenant-billing/overview');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(CATCHALL_BODY.error);
  });
});
