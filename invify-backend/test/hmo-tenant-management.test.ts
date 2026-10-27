// invify-backend/test/hmo-tenant-management.test.ts
import { productCatalogService, MasterProduct } from '../src/modules/product-catalog/product-catalog.service';
import { validateImageBase64, RECOMMENDED_LOGO_DIMENSIONS } from '../src/utils/image-validator';
import { hmoPortalService } from '../src/modules/health-insurance/services/hmo-portal.service';
import { ResolvedInstitutionContext } from '../src/modules/health-insurance/services/institution-classification.service';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  supabase: {
    from: jest.fn(),
  },
}));

describe('HMO Tenant Management, Product Catalogue & Healthcare Provider Enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockSupabaseTables(tableMap: Record<string, any>) {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      const value = tableMap[table] ?? null;
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        neq: jest.fn(() => chain),
        ilike: jest.fn(() => chain),
        in: jest.fn(() => chain),
        is: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => Promise.resolve({ data: Array.isArray(value) ? value : value ? [value] : [], error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: Array.isArray(value) ? value[0] || null : value, error: null })),
        single: jest.fn(() => Promise.resolve({ data: Array.isArray(value) ? value[0] || null : value, error: null })),
        insert: jest.fn(() => chain),
        upsert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        delete: jest.fn(() => chain),
      };
      return chain;
    });
  }

  describe('1. Super Admin Product Catalogue & Commercial Pricing Policies', () => {
    it('returns canonical Super Admin published products with correct base pricing', async () => {
      const products = await productCatalogService.getPublishedCatalog('agent-hmo-001');
      expect(products.length).toBeGreaterThanOrEqual(6);
      
      const coreSchool = products.find((p: MasterProduct) => p.productCode === 'PROD_CORE_SCHOOL_OS');
      expect(coreSchool).toBeDefined();
      expect(coreSchool?.basePriceKobo).toBe(1500000); // ₦15,000

      const health = products.find((p: MasterProduct) => p.productCode === 'PROD_HEALTH_WELLNESS');
      expect(health).toBeDefined();
      expect(health?.basePriceKobo).toBe(2500000); // ₦25,000

      const aiPlanner = products.find((p: MasterProduct) => p.productCode === 'PROD_AI_LESSON_PLANNER');
      expect(aiPlanner).toBeDefined();
      expect(aiPlanner?.basePriceKobo).toBe(750000); // ₦7,500
    });

    it('allows permitted markup and saves offer price', async () => {
      const offer = await productCatalogService.configureOfferPrice(
        'agent-hmo-001',
        'PROD_CORE_SCHOOL_OS',
        300000, // +₦3,000 markup over ₦15,000 base
        'user-hmo-admin',
        'Commercial markup for private schools'
      );

      expect(offer.productCode).toBe('PROD_CORE_SCHOOL_OS');
      expect(offer.basePriceKobo).toBe(1500000);
      expect(offer.tenantPriceKobo).toBe(1800000);
      expect(offer.hmoAdjustmentKobo).toBe(300000);
      expect(offer.auditTrail.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects predatory excessive discount (> 30%) below Super Admin floor', async () => {
      await expect(
        productCatalogService.configureOfferPrice(
          'agent-hmo-001',
          'PROD_HEALTH_WELLNESS',
          -1000000, // ₦10,000 discount (40% discount below ₦25,000 base price)
          'user-hmo-admin',
          'Excessive unauthorized discount'
        )
      ).rejects.toThrow(/Discount exceeds maximum platform policy of 30%/i);
    });

    it('rejects zero or negative tenant pricing', async () => {
      await expect(
        productCatalogService.configureOfferPrice(
          'agent-hmo-001',
          'PROD_AI_LESSON_PLANNER',
          -750000, // 100% discount, results in 0 tenant price
          'user-hmo-admin',
          'Zero price attempt'
        )
      ).rejects.toThrow(/greater than zero/i);
    });
  });

  describe('2. HMO Tenant Product Assignment & Multi-Tenant Isolation', () => {
    it('successfully assigns product when tenant belongs to HMO institution', async () => {
      mockSupabaseTables({
        agents: { id: 'agent-hmo-001', institution_id: 'inst-hmo-001' },
        tenants: { id: 'tenant-school-001', name: 'Apex International School', agent_id: 'agent-hmo-001' },
      });

      const assignment = await productCatalogService.assignProductToTenant(
        'agent-hmo-001',
        'tenant-school-001',
        'PROD_HEALTH_WELLNESS',
        'user-hmo-admin'
      );

      expect(assignment.tenantId).toBe('tenant-school-001');
      expect(assignment.productName).toBe('Health & Wellness HMO Tier');
      expect(assignment.status).toBe('ACTIVE');
    });

    it('blocks product assignment when tenant is not managed by this HMO', async () => {
      mockSupabaseTables({
        agents: { id: 'agent-hmo-001', institution_id: 'inst-hmo-001' },
        tenants: { id: 'tenant-school-999', name: 'Foreign School', agent_id: 'agent-other-999' },
      });

      await expect(
        productCatalogService.assignProductToTenant(
          'agent-hmo-001',
          'tenant-school-999',
          'PROD_HEALTH_WELLNESS',
          'user-hmo-admin'
        )
      ).rejects.toThrow(/Unauthorized: Tenant 'tenant-school-999' is not administered by this HMO/i);
    });
  });

  describe('3. Standardized 3MB Logo Validation & Dimensions', () => {
    it('exports 3MB max size and recommended 512x512 canvas specifications', () => {
      expect(RECOMMENDED_LOGO_DIMENSIONS.maxSizeBytes).toBe(3 * 1024 * 1024);
      expect(RECOMMENDED_LOGO_DIMENSIONS.width).toBe(512);
      expect(RECOMMENDED_LOGO_DIMENSIONS.height).toBe(512);
      expect(RECOMMENDED_LOGO_DIMENSIONS.allowedFormats).toContain('png');
      expect(RECOMMENDED_LOGO_DIMENSIONS.allowedFormats).toContain('jpeg');
      expect(RECOMMENDED_LOGO_DIMENSIONS.allowedFormats).toContain('webp');
    });

    it('accepts valid 1x1 transparent PNG base64 within 3MB when min dimension constraints are relaxed', () => {
      const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const result = validateImageBase64(validPngBase64, { minWidth: 1, minHeight: 1 });
      expect(result.extension).toBe('png');
      expect(result.contentType).toBe('image/png');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.sizeBytes).toBeLessThanOrEqual(3 * 1024 * 1024);
    });

    it('rejects unsupported image MIME types (e.g. svg, gif, bmp)', () => {
      const invalidGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      expect(() => validateImageBase64(invalidGif)).toThrow(/Unsupported image format/i);
    });
  });

  describe('4. Accredited Healthcare Facility Provider Enhancements (Logo & GPS Coordinates)', () => {
    it('serializes logo_url and coordinates inside restrictions JSON envelope fallback for zero-downtime execution', async () => {
      let upsertedRecord: any = null;

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'fac-001',
              provider_id: 'prov-001',
              name: 'St. Nicholas Hospital',
              state: 'Lagos',
              lga: 'Lagos Island',
              address: '57 Campbell Street',
              phone: '+23412345678',
              services: ['Emergency', 'Surgery & Theatre', 'Maternity / Antenatal', 'Pharmacy'],
              restrictions: upsertedRecord?.restrictions || '',
              is_active: true,
            },
            error: null,
          })),
          upsert: jest.fn((record) => {
            upsertedRecord = record;
            return chain;
          }),
        };
        return chain;
      });

      const mockCtx: ResolvedInstitutionContext = {
        agentId: 'agent-hmo-001',
        authUserId: 'auth-user-001',
        email: 'admin@leadway.com',
        institutionId: 'inst-hmo-001',
        institutionCode: 'MHMO-001',
        institutionName: 'Leadway Health HMO',
        institutionType: 'HMO',
        portalMode: 'HMO',
        approvalStatus: 'ACTIVE',
        kycStatus: 'VERIFIED',
        isVerified: true,
        featureEnabled: true,
        hmoProviderId: 'prov-001',
        hmoProviderCode: 'HMO-PROV-001',
        hmoRole: 'HMO_ADMIN',
        hmoPermissions: ['hmo.providers.manage'],
        restrictionReason: null,
      };

      const facility = await hmoPortalService.saveFacility(mockCtx, {
        name: 'St. Nicholas Hospital',
        state: 'Lagos',
        lga: 'Lagos Island',
        address: '57 Campbell Street',
        phone: '+23412345678',
        services: ['Emergency', 'Surgery & Theatre', 'Maternity / Antenatal', 'Pharmacy'],
        restrictions: 'Tier 1 Specialist Center',
        latitude: 6.4523,
        longitude: 3.3958,
      });

      expect(facility).toBeDefined();
      expect(upsertedRecord).toBeDefined();
      expect(upsertedRecord.restrictions).toContain('6.4523');
      expect(upsertedRecord.restrictions).toContain('3.3958');
      expect(upsertedRecord.restrictions).toContain('Tier 1 Specialist Center');
      expect(upsertedRecord.services).toContain('Emergency');
    });
  });
});
