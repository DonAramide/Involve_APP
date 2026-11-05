import { InvifyCatalogueService } from '../src/modules/health-insurance/services/invify-catalogue.service';
import { CatalogueSchemaError } from '../src/modules/health-insurance/services/invify-catalogue.rules';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

const ctx = {
  tenantId: '',
  userId: '11111111-1111-4111-8111-111111111111',
  userEmail: 'ops@example.com',
  permissions: ['platform.plans.manage'],
  isPlatformOperator: true,
  isGuardian: false,
  platformReason: 'platform catalogue mutation'
};

function chain(result: { data?: any; error?: any; count?: number } = {}) {
  const c: any = {};
  const self = () => c;
  c.select = jest.fn(self);
  c.eq = jest.fn(self);
  c.is = jest.fn(self);
  c.in = jest.fn(self);
  c.or = jest.fn(self);
  c.order = jest.fn(self);
  c.maybeSingle = jest.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }));
  c.single = jest.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }));
  c.then = undefined;
  return c;
}

describe('Invify catalogue service mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createOffering uses the atomic RPC and never writes hw_audit_events', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', code: 'INV-OUT' },
      error: null
    });
    const row = await InvifyCatalogueService.createOffering(ctx, {
      code: 'INV-OUT',
      name: 'Outpatient',
      reason: 'create master offering'
    });
    expect(row.code).toBe('INV-OUT');
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'hw_catalogue_apply_mutation',
      expect.objectContaining({
        p_op: 'create_offering',
        p_actor_user_id: ctx.userId
      })
    );
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  test('missing catalogue RPC is 503 CATALOGUE_SCHEMA_UNAPPLIED', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { code: '42883', message: 'Could not find the function public.hw_catalogue_apply_mutation' }
    });
    await expect(
      InvifyCatalogueService.createOffering(ctx, { code: 'INV-OUT', name: 'Outpatient', reason: 'create master offering' })
    ).rejects.toBeInstanceOf(CatalogueSchemaError);
  });

  test('inactive facilities are refused before assign RPC', async () => {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'hw_catalogue_products') {
        return chain({ data: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', service_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } });
      }
      if (table === 'hw_catalogue_services') {
        return chain({ data: { offering_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } });
      }
      if (table === 'hw_catalogue_offerings') {
        return chain({
          data: {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            ownership_scope: 'invify_master',
            owner_provider_id: null,
            status: 'draft'
          }
        });
      }
      if (table === 'hw_facilities') {
        return chain({ data: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Closed clinic', is_active: false } });
      }
      return chain();
    });
    await expect(
      InvifyCatalogueService.assignFacility(ctx, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
        facilityId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        reason: 'assign clinic network'
      })
    ).rejects.toThrow(/Inactive facilities/);
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  test('removeFacility checks ownership through product → service → offering then RPC', async () => {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'hw_catalogue_products') {
        return chain({ data: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', service_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } });
      }
      if (table === 'hw_catalogue_services') {
        return chain({ data: { offering_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } });
      }
      if (table === 'hw_catalogue_offerings') {
        return chain({
          data: {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            ownership_scope: 'invify_master',
            owner_provider_id: null,
            status: 'published'
          }
        });
      }
      return chain();
    });
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: { removed: true },
      error: null
    });
    const result = await InvifyCatalogueService.removeFacility(
      ctx,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'remove closed clinic'
    );
    expect(result.removed).toBe(true);
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'hw_catalogue_apply_mutation',
      expect.objectContaining({ p_op: 'remove_facility' })
    );
    const fromTables = (supabaseAdmin.from as jest.Mock).mock.calls.map((call) => call[0]);
    expect(fromTables).toEqual(expect.arrayContaining([
      'hw_catalogue_products',
      'hw_catalogue_services',
      'hw_catalogue_offerings'
    ]));
    expect(fromTables).not.toContain('hw_audit_events');
  });

  test('invalid status transitions never call the mutation RPC', async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue(chain({
      data: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ownership_scope: 'invify_master',
        owner_provider_id: null,
        status: 'draft'
      }
    }));
    await expect(
      InvifyCatalogueService.setOfferingStatus(ctx, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
        status: 'suspended',
        reason: 'skip the publication graph'
      })
    ).rejects.toThrow(/Cannot change catalogue status/);
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  test('mutations never issue table insert/update/delete on catalogue relations', async () => {
    expect(InvifyCatalogueService.createOffering.toString()).not.toMatch(/\.insert\(/);
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../src/modules/health-insurance/services/invify-catalogue.service.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/\.from\('hw_catalogue_\w+'\)[\s\S]{0,80}\.(insert|update|delete)\(/);
    expect(source).toContain("supabaseAdmin.rpc('hw_catalogue_apply_mutation'");
  });

  test('search sanitizer is applied to the PostgREST or-filter', async () => {
    const q = chain({ data: [], count: 0 });
    (supabaseAdmin.from as jest.Mock).mockReturnValue(q);
    await InvifyCatalogueService.listOfferings({ search: 'out,patient(code)' });
    expect(q.or).toHaveBeenCalledWith('name.ilike.%outpatientcode%,code.ilike.%outpatientcode%');
    expect(q.or.mock.calls[0][0]).not.toContain('out,patient');
  });
});
