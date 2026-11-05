import fs from 'fs';
import path from 'path';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));

jest.mock('../src/modules/health-insurance/services/health-audit.service', () => ({
  HealthAuditService: {
    recordEvent: jest.fn(async () => undefined)
  }
}));

jest.mock('../src/utils/image-validator', () => ({
  validateImageBase64: jest.fn()
}));

jest.mock('../src/modules/agent-portal/utils/kyc-storage', () => ({
  uploadBase64ToContabo: jest.fn(async () => 'https://cdn.example/logo.png')
}));

jest.mock('../src/modules/health-insurance/services/health-institution-context', () => ({
  collectProviderTenantCounts: jest.fn(async (providers: { id: string }[]) => {
    const map = new Map<string, number>();
    for (const p of providers) map.set(p.id, 2);
    return map;
  }),
  relationMissing: jest.fn(() => false)
}));

import { supabaseAdmin } from '../src/db/supabase';
import { HealthAuditService } from '../src/modules/health-insurance/services/health-audit.service';
import { HealthProviderGovernanceService } from '../src/modules/health-insurance/services/health-provider-governance.service';

type Ctx = { userId: string; platformReason: string };

function ctx(): Ctx {
  return { userId: 'user-1', platformReason: 'provider-governance-test' };
}

function chain(result: { data?: any; error?: any; count?: number | null }) {
  const api: any = {
    select: jest.fn(() => api),
    insert: jest.fn(() => api),
    update: jest.fn(() => api),
    eq: jest.fn(() => api),
    neq: jest.fn(() => api),
    not: jest.fn(() => api),
    ilike: jest.fn(() => api),
    or: jest.fn(() => api),
    order: jest.fn(() => api),
    range: jest.fn(() => api),
    limit: jest.fn(() => api),
    maybeSingle: jest.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })),
    then: undefined
  };
  // terminal for list queries
  api.range.mockImplementation(async () => ({
    data: Array.isArray(result.data) ? result.data : result.data ? [result.data] : [],
    error: result.error ?? null,
    count: result.count ?? null
  }));
  api.limit.mockImplementation(() => {
    api.then = (resolve: any) =>
      Promise.resolve({
        data: Array.isArray(result.data) ? result.data : result.data ? [result.data] : [],
        error: result.error ?? null,
        count: result.count ?? null
      }).then(resolve);
    return api;
  });
  return api;
}

describe('HealthProviderGovernanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registerProvider starts pending_verification and audits', async () => {
    const inserted = {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'acme_hmo',
      display_name: 'Acme HMO',
      legal_name: 'Acme Health Ltd',
      licence_reference: 'NHIA/001',
      integration_status: 'pending_verification',
      contact_email: 'ops@acme.test'
    };

    const codeCheck = chain({ data: null });
    const licenceCheck = chain({ data: [] });
    licenceCheck.limit = jest.fn(async () => ({ data: [], error: null }));
    const insertChain = chain({ data: inserted });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table !== 'hw_providers') throw new Error(`unexpected ${table}`);
      // first call uniqueness code, second licence, third insert
      const calls = (supabaseAdmin.from as jest.Mock).mock.calls.filter((c) => c[0] === 'hw_providers').length;
      if (calls === 1) return codeCheck;
      if (calls === 2) return licenceCheck;
      return insertChain;
    });

    const result = await HealthProviderGovernanceService.registerProvider(ctx() as any, {
      displayName: 'Acme HMO',
      legalName: 'Acme Health Ltd',
      code: 'acme_hmo',
      licenceReference: 'NHIA/001',
      contactEmail: 'ops@acme.test'
    });

    expect(result.integration_status).toBe('pending_verification');
    expect(result.governance_status).toBe('PENDING_APPROVAL');
    expect(result.assignable).toBe(false);
    expect(HealthAuditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'provider.registered', resourceId: inserted.id })
    );
  });

  test('registerProvider rejects duplicate licence', async () => {
    const codeCheck = chain({ data: null });
    const licenceCheck: any = {
      select: jest.fn(() => licenceCheck),
      ilike: jest.fn(() => licenceCheck),
      limit: jest.fn(async () => ({
        data: [{ id: '22222222-2222-2222-2222-222222222222', licence_reference: 'NHIA/001' }],
        error: null
      }))
    };
    (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
      const calls = (supabaseAdmin.from as jest.Mock).mock.calls.length;
      return calls === 1 ? codeCheck : licenceCheck;
    });

    await expect(
      HealthProviderGovernanceService.registerProvider(ctx() as any, {
        displayName: 'Other',
        code: 'other_hmo',
        licenceReference: 'NHIA/001'
      })
    ).rejects.toMatchObject({ status: 409, code: 'PROVIDER_DUPLICATE_LICENCE' });
  });

  test('approveProvider transitions pending to verified', async () => {
    const existing = {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'acme_hmo',
      display_name: 'Acme HMO',
      integration_status: 'pending_verification'
    };
    const updated = { ...existing, integration_status: 'verified' };
    const read = chain({ data: existing });
    const write = chain({ data: updated });
    let stage = 0;
    (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
      stage += 1;
      return stage === 1 ? read : write;
    });

    const result = await HealthProviderGovernanceService.approveProvider(ctx() as any, existing.id);
    expect(result.integration_status).toBe('verified');
    expect(result.governance_status).toBe('ACTIVE');
    expect(result.assignable).toBe(true);
    expect(HealthAuditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'provider.approved' })
    );
  });

  test('rejectProvider requires a reason', async () => {
    const existing = {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'acme_hmo',
      display_name: 'Acme HMO',
      integration_status: 'pending_verification'
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({ data: existing }));
    await expect(
      HealthProviderGovernanceService.rejectProvider(ctx() as any, existing.id, {})
    ).rejects.toMatchObject({ status: 400 });
  });

  test('suspendProvider requires a reason and audits', async () => {
    const existing = {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'acme_hmo',
      display_name: 'Acme HMO',
      integration_status: 'verified'
    };
    const updated = { ...existing, integration_status: 'suspended', status_reason: 'Compliance hold' };
    let stage = 0;
    (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
      stage += 1;
      return stage === 1 ? chain({ data: existing }) : chain({ data: updated });
    });

    const result = await HealthProviderGovernanceService.suspendProvider(ctx() as any, existing.id, {
      reason: 'Compliance hold'
    });
    expect(result.integration_status).toBe('suspended');
    expect(HealthAuditService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'provider.suspended' })
    );
  });

  test('reactivateProvider only from suspended', async () => {
    const existing = {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'acme_hmo',
      display_name: 'Acme HMO',
      integration_status: 'verified'
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({ data: existing }));
    await expect(
      HealthProviderGovernanceService.reactivateProvider(ctx() as any, existing.id, {})
    ).rejects.toMatchObject({ status: 409, code: 'INVALID_TRANSITION' });
  });

  test('updateProvider blocks direct status mutation', async () => {
    const existing = {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'acme_hmo',
      display_name: 'Acme HMO',
      integration_status: 'verified',
      licence_reference: null
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({ data: existing }));
    await expect(
      HealthProviderGovernanceService.updateProvider(ctx() as any, existing.id, {
        displayName: 'Acme',
        integrationStatus: 'suspended'
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('provider governance routes and institution isolation', () => {
  const routes = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/register-routes.ts'),
    'utf8'
  );
  const planService = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/services/health-plan.service.ts'),
    'utf8'
  );
  const platformService = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/services/health-platform.service.ts'),
    'utf8'
  );

  test('lifecycle routes sit behind platform.providers.manage and health is before :providerId', () => {
    expect(routes).toContain(
      "router.get('/platform/providers/health', requireHealthPermission('platform.integration.health')"
    );
    expect(routes).toContain(
      "router.post('/platform/providers', requireHealthPermission('platform.providers.manage'), HealthPlatformController.registerProvider)"
    );
    expect(routes).toContain(
      "router.post('/platform/providers/:providerId/approve', requireHealthPermission('platform.providers.manage')"
    );
    expect(routes).toContain(
      "router.post('/platform/providers/:providerId/reject', requireHealthPermission('platform.providers.manage')"
    );
    expect(routes).toContain(
      "router.post('/platform/providers/:providerId/suspend', requireHealthPermission('platform.providers.manage')"
    );
    expect(routes).toContain(
      "router.post('/platform/providers/:providerId/reactivate', requireHealthPermission('platform.providers.manage')"
    );
    const healthIdx = routes.indexOf("router.get('/platform/providers/health'");
    const detailIdx = routes.indexOf("router.get('/platform/providers/:providerId'");
    expect(healthIdx).toBeGreaterThan(-1);
    expect(detailIdx).toBeGreaterThan(healthIdx);
  });

  test('tenant provider list only returns verified HMO organisations', () => {
    const method = planService.slice(
      planService.indexOf('static async listProviders'),
      planService.indexOf('static async listPlans')
    );
    expect(method).toContain(".eq('integration_status', 'verified')");
  });

  test('tenant assignment rejects non-verified providers', () => {
    expect(platformService).toContain('PROVIDER_NOT_ASSIGNABLE');
    expect(platformService).toContain("provider.integration_status !== 'verified'");
  });

  test('tenant POST /providers is not registered for global creation', () => {
    expect(routes).not.toMatch(/router\.post\('\/providers'/);
  });
});
