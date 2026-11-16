/**
 * G13 tenant isolation regressions (local, no network, no live data).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  assertTransactionTenantAccess,
  canOperateAcrossTenants,
  isPlatformFinanceOperator,
  resolveAuthoritativeTenantId,
} from '../src/utils/finance-tenant';
import { resolveTenantScope } from '../src/utils/resolve-tenant-scope';
import { checkBillingPermission, checkRole, checkTenantAccess } from '../src/middleware/rbac.middleware';
import {
  authoritativeLocationTenantId,
  DEVICE_FLEET_ROOM,
  PLATFORM_OPS_ROOM,
  roomsForAuthenticatedSocket,
} from '../src/utils/socket-tenant-rooms';
import {
  rejectClientControlledStoragePath,
  tenantCacObjectKey,
  userKycObjectKey,
} from '../src/utils/object-storage-keys';
import { requireMetricsLoopback } from '../src/middleware/metrics-loopback.middleware';
import { SYSTEM_TENANT_UUID } from '../src/config/constants';

const SRC = path.join(__dirname, '..', 'src');

function mockReq(partial: any): any {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    path: '/',
    originalUrl: '/',
    ...partial,
  };
}

async function runMw(mw: any, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(b: any) {
      this.body = b;
      return this;
    },
  };
  let next = false;
  await mw(req, res, (() => {
    next = true;
  }) as any);
  return { next, res };
}

describe('G13 tenant isolation', () => {
  describe('platform vs merchant-bound admin', () => {
    test('merchant admin with tenantId is not a platform finance operator', () => {
      expect(isPlatformFinanceOperator({ role: 'admin', tenantId: 'tenant-a' })).toBe(false);
      expect(canOperateAcrossTenants({ role: 'admin', tenantId: 'tenant-a' })).toBe(false);
    });

    test('merchant owner cannot operate across tenants', () => {
      expect(canOperateAcrossTenants({ role: 'owner', tenantId: 'tenant-a' })).toBe(false);
    });

    test('platform admin without merchant tenant may operate across tenants', () => {
      expect(isPlatformFinanceOperator({ role: 'admin', tenantId: null })).toBe(true);
      expect(canOperateAcrossTenants({ role: 'admin', tenantId: null })).toBe(true);
    });

    test('admin_finance without merchant tenant may operate across tenants', () => {
      expect(canOperateAcrossTenants({ role: 'admin_finance', tenantId: null })).toBe(true);
      expect(canOperateAcrossTenants({ role: 'admin_finance', tenantId: 'tenant-a' })).toBe(false);
    });

    test('super_admin bypasses merchant tenant binding', () => {
      expect(isPlatformFinanceOperator({ role: 'super_admin', tenantId: 'tenant-a' })).toBe(true);
      expect(canOperateAcrossTenants({ role: 'super_admin', tenantId: 'tenant-a' })).toBe(true);
    });

    test('system sentinel tenant is not treated as a merchant bind', () => {
      expect(canOperateAcrossTenants({ role: 'admin', tenantId: SYSTEM_TENANT_UUID })).toBe(true);
      expect(canOperateAcrossTenants({ role: 'admin', tenantId: 'system' })).toBe(true);
    });
  });

  describe('resolver alignment (IDOR: x-tenant-id / ?tenantId)', () => {
    const spoof = {
      headers: { 'x-tenant-id': 'tenant-b' },
      query: { tenantId: 'tenant-b' },
      body: { tenantId: 'tenant-b' },
    };

    test('merchant admin cannot switch tenants via header or query in either resolver', () => {
      const req = mockReq({
        user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
        ...spoof,
      });
      expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
      expect(resolveTenantScope(req)).toBe('tenant-a');
    });

    test('merchant owner cannot switch tenants via header or query', () => {
      const req = mockReq({
        user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
        ...spoof,
      });
      expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
      expect(resolveTenantScope(req)).toBe('tenant-a');
    });

    test('platform admin may impersonate via x-tenant-id in both resolvers', () => {
      const req = mockReq({
        user: { id: 'ops', role: 'admin', tenantId: null },
        headers: { 'x-tenant-id': 'tenant-b' },
      });
      expect(resolveAuthoritativeTenantId(req)).toBe('tenant-b');
      expect(resolveTenantScope(req)).toBe('tenant-b');
    });

    test('resolvers agree for finance_staff with a merchant tenant', () => {
      const req = mockReq({
        user: { id: 'u1', role: 'finance_staff', tenantId: 'tenant-a' },
        headers: { 'x-tenant-id': 'tenant-b' },
        query: { tenantId: 'tenant-c' },
      });
      expect(resolveAuthoritativeTenantId(req)).toBe('tenant-a');
      expect(resolveTenantScope(req)).toBe('tenant-a');
    });
  });

  describe('cross-tenant writes / IDOR helpers', () => {
    test('assertTransactionTenantAccess blocks other-tenant payment ids', () => {
      const req = mockReq({ user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' } });
      expect(() => assertTransactionTenantAccess('tenant-b', req)).toThrow(/Cross-tenant/);
    });

    test('assertTransactionTenantAccess allows own-tenant payment ids', () => {
      const req = mockReq({ user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' } });
      expect(() => assertTransactionTenantAccess('tenant-a', req)).not.toThrow();
    });

    test('checkTenantAccess stamps JWT tenant, not spoofed header, for merchant admin', async () => {
      const req = mockReq({
        user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
        headers: { 'x-tenant-id': 'tenant-b' },
      });
      const { next, res } = await runMw(checkTenantAccess, req);
      expect(next).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(req.effectiveTenantId).toBe('tenant-a');
    });
  });

  describe('admin role boundaries', () => {
    test('merchant owner cannot use super_admin mapping on /admin/tenants', async () => {
      const { next, res } = await runMw(checkRole(['super_admin']), mockReq({
        user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' },
        path: '/admin/tenants',
      }));
      expect(next).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    test('merchant admin cannot use super_admin mapping on /admin/users', async () => {
      const { next, res } = await runMw(checkRole(['super_admin']), mockReq({
        user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
        path: '/admin/users',
      }));
      expect(next).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    test('platform admin without tenant may use super_admin mapping on /admin/tenants', async () => {
      const { next } = await runMw(checkRole(['super_admin']), mockReq({
        user: { id: 'ops', role: 'admin', tenantId: null },
        path: '/admin/tenants',
      }));
      expect(next).toBe(true);
    });

    test('merchant admin still passes routes that explicitly allow admin', async () => {
      const { next } = await runMw(checkRole(['super_admin', 'admin', 'owner']), mockReq({
        user: { id: 'u1', role: 'admin', tenantId: 'tenant-a' },
        path: '/payments/history',
      }));
      expect(next).toBe(true);
    });

    test('tenant operators are denied platform billing collections', async () => {
      const { next, res } = await runMw(
        checkBillingPermission('billing.view'),
        mockReq({ user: { id: 'u1', role: 'owner', tenantId: 'tenant-a' } }),
      );
      expect(next).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('WebSocket tenant isolation', () => {
    test('join_room ignores client tenantId, deviceId, plan, type, and business', () => {
      const rooms = roomsForAuthenticatedSocket('tenant-a', {
        tenantId: 'tenant-b',
        deviceId: 'dev-foreign',
        plan: 'gold',
        type: 'pos',
        businessName: 'Other Ltd',
      });
      expect(rooms).toEqual(['tenant:tenant-a']);
      expect(rooms).not.toContain('tenant:tenant-b');
      expect(rooms).not.toContain('device:dev-foreign');
      expect(rooms).not.toContain('all');
      expect(rooms).not.toContain('plan:gold');
      expect(rooms).not.toContain('type:pos');
      expect(rooms).not.toContain('business:Other Ltd');
    });

    test('device rooms require JWT device claim, not client deviceId', () => {
      const rooms = roomsForAuthenticatedSocket('tenant-a', { deviceId: 'client-dev' }, { jwtDeviceId: 'jwt-dev' });
      expect(rooms).toContain('device:jwt-dev');
      expect(rooms).not.toContain('device:client-dev');
    });

    test('platform ops join ops:platform; device owners join ops:devices', () => {
      expect(roomsForAuthenticatedSocket('t1', {}, { isPlatformOps: true })).toContain(PLATFORM_OPS_ROOM);
      expect(roomsForAuthenticatedSocket('t1', {}, { isDeviceOwner: true })).toContain(DEVICE_FLEET_ROOM);
      expect(roomsForAuthenticatedSocket('t1', {}, {})).not.toContain(PLATFORM_OPS_ROOM);
    });

    test('location broadcast tenant is the socket tenant, not the payload', () => {
      expect(authoritativeLocationTenantId('tenant-a', 'tenant-b')).toBe('tenant-a');
      expect(authoritativeLocationTenantId(undefined, 'tenant-b')).toBe('unknown');
    });
  });

  describe('object storage keys', () => {
    test('CAC keys use resolver tenant id, not a client path', () => {
      const key = tenantCacObjectKey('tenant-a', 'scan.PDF', 1);
      expect(key).toBe('tenants/tenant-a/cac/1.pdf');
      expect(() => rejectClientControlledStoragePath({ objectKey: 'tenants/tenant-b/cac/x.pdf' })).toThrow(
        /Client-controlled storage path/,
      );
    });

    test('KYC keys use authenticated user id, not x-tenant-id header', () => {
      const key = userKycObjectKey('user-1', 'GOVT_ID', 'id.jpg', 2);
      expect(key).toBe('tenants/user-1/kyc/govt_id-2.jpg');
      expect(() => rejectClientControlledStoragePath({ path: 'tenants/other/kyc/x' })).toThrow();
    });

    test('empty tenant cannot mint a CAC key', () => {
      expect(() => tenantCacObjectKey('', 'a.jpg')).toThrow(/tenant id required/);
    });
  });

  describe('metrics loopback (G17)', () => {
    test('non-loopback is forbidden', async () => {
      const { next, res } = await runMw(requireMetricsLoopback, mockReq({ ip: '8.8.8.8', socket: { remoteAddress: '8.8.8.8' } }));
      expect(next).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    test('loopback is allowed', async () => {
      const { next, res } = await runMw(requireMetricsLoopback, mockReq({ ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } }));
      expect(next).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('source contracts for remaining isolation surfaces', () => {
    const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

    test('school payments uses canOperateAcrossTenants (not role==admin)', () => {
      const src = read('controllers/school-payments.controller.ts');
      expect(src).toContain('canOperateAcrossTenants');
      expect(src).not.toMatch(/\['super_admin', 'admin', 'platform_admin'/);
    });

    test('POS history uses canOperateAcrossTenants', () => {
      expect(read('controllers/pos.controller.ts')).toContain('canOperateAcrossTenants');
    });

    test('admin ledger / tenant details / finance operator helper are merchant-safe', () => {
      const src = read('controllers/admin.controller.ts');
      expect(src).toContain('canOperateAcrossTenants');
      expect(src).toContain("from '../utils/finance-tenant'");
      expect(src).not.toMatch(/function isPlatformFinanceOperator\(/);
    });

    test('wallet getBalance uses JWT tenantId only (cannot spoof header)', () => {
      const src = read('controllers/wallet.controller.ts');
      expect(src).toMatch(/getBalance[\s\S]*user\?\.tenantId/);
      expect(src).not.toMatch(/getBalance[\s\S]*x-tenant-id/);
    });

    test('CAC uploads use tenantCacObjectKey helper', () => {
      expect(read('controllers/admin.controller.ts')).toContain('tenantCacObjectKey');
    });

    test('admin broadcast never uses unrestricted room all or client plan/type rooms', () => {
      const src = read('controllers/admin.controller.ts');
      expect(src).not.toMatch(/room = 'all'/);
      expect(src).not.toMatch(/room = `plan:/);
      expect(src).not.toMatch(/room = `type:/);
      expect(src).toContain('PLATFORM_OPS_ROOM');
    });

    test('device controller uses canOperateAcrossTenants for platform', () => {
      expect(read('controllers/device.controller.ts')).toContain('canOperateAcrossTenants');
      expect(read('controllers/device.controller.ts')).not.toMatch(/role === 'admin'/);
    });

    test('user list uses canOperateAcrossTenants', () => {
      expect(read('controllers/user.controller.ts')).toContain('canOperateAcrossTenants');
    });

    test('KYC upload does not take object key from x-tenant-id header', () => {
      const src = read('controllers/tenant-kyc.controller.ts');
      expect(src).toContain('userKycObjectKey');
      expect(src).not.toMatch(/uploadKyc[\s\S]*x-tenant-id/);
    });

    test('KYC document fetch uses canOperateAcrossTenants (merchant admin cannot read other tenants)', () => {
      const src = read('controllers/tenant-kyc.controller.ts');
      expect(src).toMatch(/getKycDocuments[\s\S]*canOperateAcrossTenants/);
      expect(src).not.toMatch(/const isAdmin = \['super_admin', 'admin', 'internal_staff'\]/);
    });

    test('user create/update/reset-mfa use canOperateAcrossTenants for the actor, not only super_admin', () => {
      const src = read('controllers/user.controller.ts');
      expect(src).toContain('canOperateAcrossTenants(currentUser)');
      expect(src).not.toMatch(/if \(currentUser\.role !== 'super_admin'\)/);
    });

    test('socket bootstrap never joins unrestricted room all', () => {
      const src = read('app.ts');
      expect(src).not.toMatch(/socket\.join\(['"]all['"]\)/);
      expect(src).not.toMatch(/io\.to\(['"]all['"]\)/);
      expect(src).toContain('PLATFORM_OPS_ROOM');
    });

    test('device_identity_pong does not join a client deviceId without JWT or claim', () => {
      const src = read('app.ts');
      expect(src).toMatch(/device_identity_pong[\s\S]*jwtDevice[\s\S]*saved\.claimed/);
    });

    test('payout poller applies status using the row tenant_id', () => {
      const src = read('services/payout-status.service.ts');
      expect(src).toMatch(/pollOpenPayouts[\s\S]*row\.tenant_id/);
    });

    test('HMO finance report is admin-routed (not merchant allTenants)', () => {
      const src = read('modules/hmo-monetisation/register-routes.ts');
      expect(src).toMatch(/admin\.get\('\/hmo-finance-report'/);
      expect(src).toContain("checkRole(adminRoles)");
    });

    test('platform KYC queue requires canOperateAcrossTenants', () => {
      const src = read('controllers/tenant-kyc.controller.ts');
      expect(src).toContain('canOperateAcrossTenants');
    });

    test('platform agent directory is not on the merchant admin allowlist', () => {
      const src = read('app.ts');
      expect(src).toMatch(/registerCollisionAdmin\('get', '\/agents', authenticate, checkRole\(\['super_admin'\]\)/);
      expect(src).not.toMatch(/registerCollisionAdmin\('get', '\/agents', authenticate, checkRole\(\['super_admin', 'admin'\]\)/);
    });

    test('retention at-risk list is platform-only', () => {
      expect(read('controllers/retention.controller.ts')).toContain('canOperateAcrossTenants');
      expect(read('app.ts')).toMatch(/retention\/at-risk', authenticate, checkRole\(\['super_admin'\]\)/);
    });
  });
});
