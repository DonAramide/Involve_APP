import { ensureTenantOffersFromAssignedHmo } from '../src/modules/health-insurance/services/tenant-plan-offer-sync';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));

describe('ensureTenantOffersFromAssignedHmo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upserts offers for published versions of the assigned HMO', async () => {
    const upsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id: 'offer-1' }, { id: 'offer-2' }], error: null })
    });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'hw_tenant_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { assigned_provider_id: 'prov-1' }, error: null })
            })
          })
        };
      }
      if (table === 'hw_hmo_school_links') {
        const maybeSingle = async () => ({ data: { allowed_plan_ids: [] }, error: null });
        const node: any = { maybeSingle, eq: undefined as any };
        node.eq = () => node;
        return { select: () => node };
      }
      if (table === 'hw_plans') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: [{ id: 'plan-1' }], error: null })
            })
          })
        };
      }
      if (table === 'hw_plan_versions') {
        return {
          select: () => ({
            in: () => ({
              order: async () => ({
                data: [{ id: 'ver-1', plan_id: 'plan-1', status: 'published', version: 1 }],
                error: null
              })
            })
          })
        };
      }
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { type: 'school' }, error: null })
            })
          })
        };
      }
      if (table === 'hw_tenant_plan_offers') {
        return { upsert };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const count = await ensureTenantOffersFromAssignedHmo('tenant-1', 'user-1');
    expect(count).toBe(2);
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          tenant_id: 'tenant-1',
          plan_version_id: 'ver-1',
          default_funding: 'school',
          is_active: true
        })
      ],
      { onConflict: 'tenant_id,plan_version_id' }
    );
  });

  it('returns 0 when tenant has no assigned HMO', async () => {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'hw_tenant_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { assigned_provider_id: null }, error: null })
            })
          })
        };
      }
      if (table === 'hw_hmo_school_links') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null })
                  })
                })
              })
            })
          })
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    await expect(ensureTenantOffersFromAssignedHmo('tenant-orphan')).resolves.toBe(0);
  });
});
