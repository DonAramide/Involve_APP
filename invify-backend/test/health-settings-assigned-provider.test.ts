import { HealthSettingsService } from '../src/modules/health-insurance/services/health-settings.service';
import { HealthContext } from '../src/modules/health-insurance/types';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));

function chain(result: { data?: any; error?: any }) {
  const terminal = jest.fn().mockResolvedValue(result);
  const api: any = {};
  const step = () => api;
  api.select = jest.fn(step);
  api.eq = jest.fn(step);
  api.in = jest.fn(step);
  api.order = jest.fn(step);
  api.limit = jest.fn(step);
  api.maybeSingle = terminal;
  api.single = terminal;
  return api;
}

describe('HealthSettingsService assigned HMO for mobile', () => {
  const ctx: HealthContext = {
    tenantId: 'tenant-school-1',
    userId: 'user-1',
    permissions: ['guardian.access'],
    isPlatformOperator: false,
    isGuardian: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns assignedProvider from hw_tenant_settings.assigned_provider_id', async () => {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'hw_tenant_settings') {
        return chain({
          data: {
            tenant_id: 'tenant-school-1',
            enabled: true,
            school_enabled: true,
            retail_enabled: false,
            services_enabled: false,
            retention_months: 84,
            enabled_at: '2026-10-01T00:00:00Z',
            assigned_provider_id: 'prov-leadway',
            assigned_institution_id: 'inst-leadway',
            assignment_mode: 'LOCKED',
            assignment_source: 'ADMIN_ASSIGNED'
          },
          error: null
        });
      }
      if (table === 'hw_providers') {
        return chain({
          data: {
            id: 'prov-leadway',
            code: '3op0kk',
            display_name: 'LeadwayTest Agent HMO',
            legal_name: 'Leadway Health',
            licence_reference: 'NHIA/1',
            integration_status: 'verified',
            contact_email: 'support@leadway.test',
            contact_phone: '+2348000000000',
            support_email: null,
            website_url: null,
            head_office_address: 'Lagos',
            institution_id: 'inst-leadway'
          },
          error: null
        });
      }
      if (table === 'institutions') {
        return chain({
          data: {
            id: 'inst-leadway',
            code: '3op0kk',
            name: 'LeadwayTest Agent HMO',
            institution_type: 'HMO',
            type: 'HMO'
          },
          error: null
        });
      }
      return chain({ data: null, error: null });
    });

    const settings = await HealthSettingsService.getSettings(ctx);

    expect(settings.enabled).toBe(true);
    expect(settings.assignmentMode).toBe('LOCKED');
    expect(settings.canChangeProvider).toBe(false);
    expect(settings.assignedProvider).toEqual(
      expect.objectContaining({
        id: 'prov-leadway',
        code: '3op0kk',
        name: 'LeadwayTest Agent HMO',
        supportEmail: 'support@leadway.test',
        supportPhone: '+2348000000000'
      })
    );
    expect(settings.onboardingInstitution).toEqual(
      expect.objectContaining({
        institutionCode: '3op0kk',
        institutionName: 'LeadwayTest Agent HMO',
        institutionType: 'HMO'
      })
    );
    expect(settings.viewerContext).toEqual(
      expect.objectContaining({
        role: 'parent_guardian',
        canManageSettings: false
      })
    );
  });

  it('falls back to active hw_hmo_school_links when assigned_provider_id is null', async () => {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'hw_tenant_settings') {
        return chain({
          data: {
            tenant_id: 'tenant-school-1',
            enabled: true,
            school_enabled: true,
            retail_enabled: false,
            services_enabled: false,
            retention_months: 84,
            assigned_provider_id: null,
            assignment_mode: 'SELECTABLE',
            assignment_source: 'UNASSIGNED'
          },
          error: null
        });
      }
      if (table === 'hw_hmo_school_links') {
        return chain({
          data: {
            provider_id: 'prov-leadway',
            institution_id: 'inst-leadway',
            onboarding_status: 'ACTIVE',
            hw_providers: {
              id: 'prov-leadway',
              code: '3op0kk',
              display_name: 'LeadwayTest Agent HMO',
              integration_status: 'verified',
              contact_email: 'a@b.c',
              contact_phone: '0800'
            }
          },
          error: null
        });
      }
      if (table === 'institutions') {
        return chain({
          data: {
            id: 'inst-leadway',
            code: '3op0kk',
            name: 'LeadwayTest Agent HMO',
            institution_type: 'HMO'
          },
          error: null
        });
      }
      return chain({ data: null, error: null });
    });

    const settings = await HealthSettingsService.getSettings(ctx);
    expect(settings.assignedProvider?.name).toBe('LeadwayTest Agent HMO');
    expect(settings.assignmentSource).toBe('CODE_INHERITED');
  });
});
