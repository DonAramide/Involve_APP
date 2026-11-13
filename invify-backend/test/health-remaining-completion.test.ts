import fs from 'fs';
import path from 'path';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: { from: jest.fn() }
}));

jest.mock('../src/modules/health-insurance/services/health-audit.service', () => ({
  HealthAuditService: { log: jest.fn(async () => undefined), recordEvent: jest.fn(async () => undefined) }
}));

jest.mock('../src/modules/health-insurance/services/health-notification.service', () => ({
  HealthNotificationService: {
    notifyTenantAdmins: jest.fn(async () => undefined),
    notifyPlatformActor: jest.fn(async () => undefined),
    notifyUser: jest.fn(async () => undefined)
  }
}));

jest.mock('../src/modules/health-insurance/adapters/sandbox.adapter', () => ({
  SandboxHealthProviderAdapter: jest.fn().mockImplementation(() => ({
    getClaimStatus: jest.fn(async () => ({ status: 'pending' })),
    verifyWebhookSignature: jest.fn(() => true)
  }))
}));

import { supabaseAdmin } from '../src/db/supabase';
import { HealthClaimService } from '../src/modules/health-insurance/services/health-claim.service';
import { HealthEnrolmentService } from '../src/modules/health-insurance/services/health-enrolment.service';
import { HealthAuditService } from '../src/modules/health-insurance/services/health-audit.service';

describe('HMO remaining completion — routes', () => {
  const routes = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/register-routes.ts'),
    'utf8'
  );

  test('finance profitability routes are mounted under platform/finance/*', () => {
    expect(routes).toContain("router.get('/platform/finance/overview'");
    expect(routes).toContain('HealthFinanceController.getConsolidatedOverview');
    expect(routes).toContain("router.get('/platform/bank-offerings'");
    expect(routes).toContain("router.get('/platform/claims-overview'");
  });

  test('claims submit/approve/reject/settle are separate routes behind health.claims.manage', () => {
    expect(routes).toContain("router.post('/claims', requireHealthPermission('health.claims.manage')");
    expect(routes).toContain("router.post('/claims/:id/approve', requireHealthPermission('health.claims.manage')");
    expect(routes).toContain("router.post('/claims/:id/reject', requireHealthPermission('health.claims.manage')");
    expect(routes).toContain("router.post('/claims/:id/settle', requireHealthPermission('health.claims.manage')");
    expect(routes).toContain("router.get('/claims/:id/history', requireHealthPermission('health.claims.read')");
  });

  test('finance mutations use dedicated finance permissions', () => {
    expect(routes).toContain("requireHealthPermission('platform.finance.manage'), HealthFinanceController.createAgreement");
    expect(routes).toContain("requireHealthPermission('platform.agreements.approve'), HealthFinanceController.approveAgreement");
    expect(routes).toContain("requireHealthPermission('platform.statements.approve'), HealthFinanceController.approveStatement");
    expect(routes).toContain("requireHealthPermission('platform.finance.reconcile'), HealthFinanceController.reconcileSettlement");
    expect(routes).not.toContain(
      "requireHealthPermission('platform.integration.health'), HealthFinanceController.createAgreement"
    );
  });

  test('affiliation routes exist and tenant POST /providers does not', () => {
    expect(routes).toContain("router.post('/affiliations'");
    expect(routes).toContain("router.get('/eligible-providers'");
    expect(routes).not.toMatch(/router\.post\('\/providers'/);
  });
});

describe('enrolment plan eligibility', () => {
  beforeEach(() => jest.clearAllMocks());

  test('blocks unpublished plan versions', async () => {
    await expect(
      HealthEnrolmentService.assertPlanVersionEnrolable('v1', {
        id: 'v1',
        status: 'draft',
        effective_from: '2020-01-01',
        effective_to: null,
        hw_plans: { id: 'p1', status: 'active', hw_providers: { id: 'h1', integration_status: 'verified' } }
      })
    ).rejects.toThrow(/not published/);
  });

  test('blocks non-verified providers', async () => {
    await expect(
      HealthEnrolmentService.assertPlanVersionEnrolable('v1', {
        id: 'v1',
        status: 'published',
        effective_from: '2020-01-01',
        effective_to: null,
        hw_plans: { id: 'p1', status: 'active', hw_providers: { id: 'h1', integration_status: 'suspended' } }
      })
    ).rejects.toThrow(/not active for new enrolments/);
  });

  test('allows published active verified plans', async () => {
    await expect(
      HealthEnrolmentService.assertPlanVersionEnrolable('v1', {
        id: 'v1',
        status: 'published',
        effective_from: '2020-01-01',
        effective_to: null,
        hw_plans: { id: 'p1', status: 'active', hw_providers: { id: 'h1', integration_status: 'verified' } }
      })
    ).resolves.toBeUndefined();
  });
});

describe('claims lifecycle separation', () => {
  const ctx = { tenantId: 't1', userId: 'u1' } as any;

  function chain(result: any) {
    const api: any = {
      select: jest.fn(() => api),
      eq: jest.fn(() => api),
      maybeSingle: jest.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })),
      update: jest.fn(() => api),
      insert: jest.fn(() => api),
      single: jest.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }))
    };
    return api;
  }

  beforeEach(() => jest.clearAllMocks());

  test('reject requires a reason', async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue(
      chain({ data: { id: 'c1', status: 'submitted', claim_reference: 'CL-1', tenant_id: 't1' } })
    );
    await expect(HealthClaimService.rejectClaim(ctx, 'c1', {})).rejects.toMatchObject({ status: 400 });
  });

  test('settle is not allowed from submitted (approval first)', async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue(
      chain({ data: { id: 'c1', status: 'submitted', claim_reference: 'CL-1', tenant_id: 't1' } })
    );
    await expect(HealthClaimService.settleClaim(ctx, 'c1', {})).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_CLAIM_TRANSITION'
    });
  });

  test('approve from submitted audits and notifies', async () => {
    const existing = { id: 'c1', status: 'submitted', claim_reference: 'CL-1', tenant_id: 't1' };
    const updated = { ...existing, status: 'approved' };
    let calls = 0;
    (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
      calls += 1;
      if (calls === 1) return chain({ data: existing });
      if (calls === 2) return chain({ data: updated });
      return chain({ data: null });
    });
    const result = await HealthClaimService.approveClaim(ctx, 'c1', { authorisedAmountMinor: 1000 });
    expect(result.status).toBe('approved');
    expect(HealthAuditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'claim.approved' }));
  });
});
