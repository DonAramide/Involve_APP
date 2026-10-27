import { validateImageBase64 } from '../src/utils/image-validator';
import {
  CANONICAL_INSTITUTION_TYPES,
  agentService,
} from '../src/modules/agent-portal/services/agent.service';
import { AgentAccessError } from '../src/modules/agent-portal/services/agent-access.service';
import { agentRepository } from '../src/modules/agent-portal/repositories/agent.repository';
import { agentAccessService } from '../src/modules/agent-portal/services/agent-access.service';

describe('Institution Onboarding & Tenant Branding Validation Suite', () => {
  // Minimal valid 1x1 8-bit PNG
  const validPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Minimal valid 1x1 JPEG
  const validJpegBase64 =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  // Minimal valid WebP (VP8 header)
  const validWebpBase64 =
    'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/v02wAA=';

  let createAgentSpy: jest.SpyInstance;
  let findConflictSpy: jest.SpyInstance;
  let createLoginSpy: jest.SpyInstance;
  let sendWelcomeSpy: jest.SpyInstance;
  let logAuditSpy: jest.SpyInstance;

  beforeEach(() => {
    findConflictSpy = jest.spyOn(agentRepository, 'findConflict').mockResolvedValue(null);
    createLoginSpy = jest.spyOn(agentAccessService, 'createLogin').mockResolvedValue('auth-user-999');
    sendWelcomeSpy = jest.spyOn(agentAccessService, 'sendWelcome').mockResolvedValue(true);
    logAuditSpy = jest.spyOn(agentRepository, 'logAudit').mockResolvedValue();

    createAgentSpy = jest.spyOn(agentRepository, 'createAgent').mockImplementation(
      async (agentData: any, profileData: any) => {
        return {
          id: 'mock-agent-123',
          ...agentData,
          agent_profiles: [profileData],
        };
      }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Canonical Institution Categories', () => {
    test('defines all 6 canonical categories required by product spec', () => {
      expect(CANONICAL_INSTITUTION_TYPES).toContain('SCHOOL');
      expect(CANONICAL_INSTITUTION_TYPES).toContain('HMO');
      expect(CANONICAL_INSTITUTION_TYPES).toContain('BANK');
      expect(CANONICAL_INSTITUTION_TYPES).toContain('MERCHANT');
      expect(CANONICAL_INSTITUTION_TYPES).toContain('PTSP');
      expect(CANONICAL_INSTITUTION_TYPES).toContain('CORPORATE');
      expect(CANONICAL_INSTITUTION_TYPES.length).toBe(6);
    });

    test('rejects unrecognized institution categories with 400', async () => {
      try {
        await agentService.onboardAgent('actor-1', {
          email: 'invalid@example.com',
          name: 'Invalid Institute',
          institutionType: 'NGO' as any,
          phone: '+2348011112233',
        });
        fail('Should have thrown AgentAccessError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AgentAccessError);
        expect(err.status).toBe(400);
        expect(err.message).toContain('Invalid institution category');
      }

      try {
        await agentService.onboardAgent('actor-1', {
          email: 'invalid@example.com',
          name: 'Invalid Institute',
          institutionType: 'GOVERNMENT' as any,
          phone: '+2348011112233',
        });
        fail('Should have thrown AgentAccessError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AgentAccessError);
        expect(err.status).toBe(400);
        expect(err.message).toContain('Invalid institution category');
      }
    });
  });

  describe('2. Conditional Regulatory Field Enforcement', () => {
    test('HMO onboarding requires NHIA accreditation number', async () => {
      try {
        await agentService.onboardAgent('actor-1', {
          email: 'hmo@example.com',
          name: 'Apex Health HMO',
          institutionType: 'HMO',
          phone: '+2348011112233',
        });
        fail('Should have thrown AgentAccessError for missing NHIA accreditation');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AgentAccessError);
        expect(err.status).toBe(400);
        expect(err.message).toMatch(/NHIA accreditation or license number/i);
      }
    });

    test('BANK & PTSP onboarding requires CBN approval / license reference', async () => {
      for (const cat of ['BANK', 'PTSP'] as const) {
        try {
          await agentService.onboardAgent('actor-1', {
            email: `${cat.toLowerCase()}@example.com`,
            name: `${cat} Institution Ltd`,
            institutionType: cat,
            phone: '+2348011112233',
          });
          fail(`Should have thrown AgentAccessError for missing CBN reference on ${cat}`);
        } catch (err: any) {
          expect(err).toBeInstanceOf(AgentAccessError);
          expect(err.status).toBe(400);
          expect(err.message).toMatch(/CBN license \/ approval reference/i);
        }
      }
    });

    test('SCHOOL onboarding requires Ministry of Education approval or registration ref', async () => {
      try {
        await agentService.onboardAgent('actor-1', {
          email: 'school@example.com',
          name: 'Apex Academy High',
          institutionType: 'SCHOOL',
          phone: '+2348011112233',
        });
        fail('Should have thrown AgentAccessError for missing Ministry of Education ref on SCHOOL');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AgentAccessError);
        expect(err.status).toBe(400);
        expect(err.message).toMatch(/Ministry of Education approval/i);
      }
    });

    test('MERCHANT & CORPORATE onboarding requires CAC RC number or TIN', async () => {
      for (const cat of ['MERCHANT', 'CORPORATE'] as const) {
        try {
          await agentService.onboardAgent('actor-1', {
            email: `${cat.toLowerCase()}@example.com`,
            name: `${cat} Holdings Ltd`,
            institutionType: cat,
            phone: '+2348011112233',
          });
          fail(`Should have thrown AgentAccessError for missing CAC/TIN on ${cat}`);
        } catch (err: any) {
          expect(err).toBeInstanceOf(AgentAccessError);
          expect(err.status).toBe(400);
          expect(err.message).toMatch(/CAC RC number or Tax Identification Number/i);
        }
      }
    });
  });

  describe('3. Binary Magic Bytes & Logo Validation', () => {
    test('accepts valid PNG image data', () => {
      const res = validateImageBase64(validPngBase64, {
        maxSizeBytes: 2 * 1024 * 1024,
        minWidth: 1,
        minHeight: 1,
      });
      expect(res.contentType).toBe('image/png');
      expect(res.extension).toBe('png');
      expect(res.width).toBe(1);
      expect(res.height).toBe(1);
    });

    test('accepts valid JPEG image data', () => {
      const res = validateImageBase64(validJpegBase64, {
        maxSizeBytes: 2 * 1024 * 1024,
        minWidth: 1,
        minHeight: 1,
      });
      expect(res.contentType).toBe('image/jpeg');
      expect(res.extension).toBe('jpeg');
    });

    test('accepts valid WebP image data', () => {
      const res = validateImageBase64(validWebpBase64, {
        maxSizeBytes: 2 * 1024 * 1024,
        minWidth: 1,
        minHeight: 1,
      });
      expect(res.contentType).toBe('image/webp');
      expect(res.extension).toBe('webp');
    });

    test('rejects corrupted or forged image content with bad magic bytes', () => {
      const forgedImage = 'data:image/png;base64,' + Buffer.from('NOT_A_REAL_PNG_HEADER_PAYLOAD_AT_ALL').toString('base64');
      expect(() => {
        validateImageBase64(forgedImage);
      }).toThrow();
    });

    test('rejects image files exceeding 2MB limit', () => {
      // Create a 2.2MB dummy payload
      const largeBuffer = Buffer.alloc(2.2 * 1024 * 1024, 0);
      const largeBase64 = `data:image/png;base64,${largeBuffer.toString('base64')}`;
      expect(() => {
        validateImageBase64(largeBase64, { maxSizeBytes: 2 * 1024 * 1024 });
      }).toThrow(/maximum allowed size/i);
    });
  });

  describe('4. Strict Default KYC PENDING Status & Provisioning Pipeline', () => {
    test('provisions an HMO with valid regulatory data and verifies PENDING KYC status', async () => {
      const result = await agentService.onboardAgent('actor-1', {
        email: 'compliance@leadwayhealth.com',
        name: 'Leadway Health Ltd',
        tradingName: 'Leadway Health HMO',
        institutionType: 'HMO',
        nhiaLicenseNumber: 'NHIA/HMO/2026/042',
        phone: '+2348033334444',
        address: '12 Health Way, Victoria Island, Lagos',
      });

      expect(result.agent).toBeDefined();
      expect(createAgentSpy).toHaveBeenCalledTimes(1);

      const [passedAgentData, passedProfileData] = createAgentSpy.mock.calls[0];

      // Verification of core agent classification
      expect(passedAgentData.institution_type).toBe('HMO');
      expect(passedAgentData.trading_name).toBe('Leadway Health HMO');
      // CRITICAL: Newly provisioned institution status MUST be non-active 'PENDING'
      expect(passedAgentData.status).toBe('PENDING');

      // CRITICAL: KYC status MUST be PENDING on newly provisioned institutions
      expect(passedProfileData.kyc_status).toBe('PENDING');
      expect(passedProfileData.regulator_license_reference).toBe('NHIA/HMO/2026/042');
      expect(passedProfileData.regulatory_metadata).toEqual(
        expect.objectContaining({
          institution_type: 'HMO',
          trading_name: 'Leadway Health HMO',
          nhia_license_number: 'NHIA/HMO/2026/042',
        })
      );
    });

    test('provisions a SCHOOL with Ministry approval and verifies PENDING non-active and KYC status', async () => {
      const result = await agentService.onboardAgent('actor-1', {
        email: 'admin@apexacademy.edu.ng',
        name: 'Apex Academy International',
        tradingName: 'Apex Academy',
        institutionType: 'SCHOOL',
        ministryApprovalNumber: 'MOE/ED/REG/2026/99',
        phone: '+2348055556666',
        address: '88 Education Crescent, Ikeja, Lagos',
      });

      expect(result.agent).toBeDefined();
      const [passedAgentData, passedProfileData] = createAgentSpy.mock.calls[0];

      expect(passedAgentData.institution_type).toBe('SCHOOL');
      expect(passedAgentData.status).toBe('PENDING');
      expect(passedProfileData.kyc_status).toBe('PENDING');
      expect(passedProfileData.regulator_license_reference).toBe('MOE/ED/REG/2026/99');
    });

    test('provisions a BANK with CBN license reference and verifies PENDING non-active and KYC status', async () => {
      const result = await agentService.onboardAgent('actor-1', {
        email: 'support@apexbank.ng',
        name: 'Apex Microfinance Bank Plc',
        institutionType: 'BANK',
        cbnLicenseNumber: 'CBN/BPSD/2026/108',
        phone: '+2348077778888',
        address: '1 Banking Plaza, Abuja',
      });

      expect(result.agent).toBeDefined();
      const [passedAgentData, passedProfileData] = createAgentSpy.mock.calls[0];

      expect(passedAgentData.institution_type).toBe('BANK');
      expect(passedAgentData.status).toBe('PENDING');
      expect(passedProfileData.kyc_status).toBe('PENDING');
      expect(passedProfileData.regulator_license_reference).toBe('CBN/BPSD/2026/108');
    });
  });

  describe('5. Distinct Representative Passport vs Institution Logo Storage', () => {
    test('keeps representative passport photo separate from institution official logo', async () => {
      const mockLogoUrl = 'https://s3.contabo.com/invify-kyc/institution-logos/AG-123456_logo.png';
      jest.spyOn(require('../src/modules/agent-portal/utils/kyc-storage'), 'uploadInstitutionLogo').mockResolvedValue({
        logoUrl: mockLogoUrl,
        key: 'institution-logos/AG-123456_logo.png',
      });
      jest.spyOn(require('../src/modules/agent-portal/utils/kyc-storage'), 'uploadBase64ToContabo').mockResolvedValue(
        'https://s3.contabo.com/invify-kyc/passports/rep_passport.jpg'
      );

      await agentService.onboardAgent('actor-1', {
        email: 'director@sterlinghealth.com',
        name: 'Sterling Health HMO',
        institutionType: 'HMO',
        nhiaLicenseNumber: 'NHIA/HMO/2026/999',
        phone: '+2348011223344',
        passportImage: validJpegBase64,
        logoImage: validPngBase64,
      });

      expect(createAgentSpy).toHaveBeenCalledTimes(1);
      const [passedAgentData, passedProfileData] = createAgentSpy.mock.calls[0];

      // Official Logo must be stored in core agent and profile branding fields
      expect(passedAgentData.logo_url).toBe(mockLogoUrl);
      expect(passedProfileData.logo_url).toBe(mockLogoUrl);

      // Representative passport photo must be in profile_photo_url, distinct from logo
      expect(passedProfileData.profile_photo_url).toBe('https://s3.contabo.com/invify-kyc/passports/rep_passport.jpg');
      expect(passedProfileData.profile_photo_url).not.toBe(passedAgentData.logo_url);
    });
  });

  describe('6. Logo Persistence and Lifecycle Management', () => {
    test('updateLogo updates both core agents and agent_profiles records', async () => {
      const updateLogoSpy = jest.spyOn(agentRepository, 'updateLogo').mockResolvedValue(undefined);
      jest.spyOn(agentRepository, 'findById').mockResolvedValue({
        id: 'agent-uuid-77',
        agent_code: 'AG-777777',
        logo_url: null,
      });
      jest.spyOn(require('../src/modules/agent-portal/utils/kyc-storage'), 'uploadInstitutionLogo').mockResolvedValue({
        logoUrl: 'https://s3.contabo.com/invify-kyc/institution-logos/AG-777777_logo.png',
        key: 'institution-logos/AG-777777_logo.png',
      });

      const res = await agentService.updateLogo('agent-uuid-77', validPngBase64, 'actor-admin');
      expect(res.logoUrl).toBe('https://s3.contabo.com/invify-kyc/institution-logos/AG-777777_logo.png');
      expect(updateLogoSpy).toHaveBeenCalledWith(
        'agent-uuid-77',
        'https://s3.contabo.com/invify-kyc/institution-logos/AG-777777_logo.png'
      );
    });

    test('removeLogo clears logo from both agents and agent_profiles records', async () => {
      const updateLogoSpy = jest.spyOn(agentRepository, 'updateLogo').mockResolvedValue(undefined);
      const deleteLogoSpy = jest.spyOn(require('../src/modules/agent-portal/utils/kyc-storage'), 'deleteInstitutionLogo').mockResolvedValue(undefined);

      jest.spyOn(agentRepository, 'findById').mockResolvedValue({
        id: 'agent-uuid-77',
        agent_code: 'AG-777777',
        logo_url: 'https://s3.contabo.com/invify-kyc/institution-logos/old_logo.png',
      });

      const res = await agentService.removeLogo('agent-uuid-77', 'actor-admin');
      expect(res.success).toBe(true);
      expect(deleteLogoSpy).toHaveBeenCalledWith('https://s3.contabo.com/invify-kyc/institution-logos/old_logo.png');
      expect(updateLogoSpy).toHaveBeenCalledWith('agent-uuid-77', null);
    });
  });

  describe('7. Category Boundaries & Tenant Isolation', () => {
    test('enforces category isolation between HMO, SCHOOL, BANK, and MERCHANT', () => {
      const hmoCat = CANONICAL_INSTITUTION_TYPES.find(c => c === 'HMO');
      const schoolCat = CANONICAL_INSTITUTION_TYPES.find(c => c === 'SCHOOL');
      const bankCat = CANONICAL_INSTITUTION_TYPES.find(c => c === 'BANK');
      const merchantCat = CANONICAL_INSTITUTION_TYPES.find(c => c === 'MERCHANT');

      expect(hmoCat).toBe('HMO');
      expect(schoolCat).toBe('SCHOOL');
      expect(bankCat).toBe('BANK');
      expect(merchantCat).toBe('MERCHANT');

      // Canonical categories must be mutually exclusive distinct strings
      const set = new Set(CANONICAL_INSTITUTION_TYPES);
      expect(set.size).toBe(CANONICAL_INSTITUTION_TYPES.length);
    });
  });

  describe('8. Edit Institute Profile & Category Reclassification', () => {
    test('updates institute profile category, trading name, and contact details', async () => {
      const existingAgent = {
        id: 'agent-100',
        agent_code: '30P0KK',
        email: 'bukkyabadaki@gmail.com',
        first_name: 'LeadwayTest',
        last_name: 'Agent',
        institution_type: 'BANK',
        trading_name: 'Leadway Bank',
        phone: '08023552282',
        agent_profiles: [
          {
            agent_id: 'agent-100',
            address: 'Old Address',
            regulatory_metadata: { institution_type: 'BANK' },
          },
        ],
      };

      const updateAgentSpy = jest.spyOn(agentRepository, 'updateAgent').mockResolvedValue(existingAgent as any);
      const updateProfileSpy = jest.spyOn(agentRepository, 'updateAgentProfile').mockResolvedValue(existingAgent.agent_profiles[0] as any);
      const findByIdSpy = jest.spyOn(agentRepository, 'findById').mockResolvedValue(existingAgent as any);

      const result = await agentService.updateAgentProfileDetails(
        'agent-100',
        {
          institutionType: 'HMO',
          tradingName: 'Leadway Health Insurer',
          phone: '08023552282',
          whatsappNumber: '08023552282',
          address: 'Plot 10 Commercial Ave, Lagos',
          nhiaLicenseNumber: 'NHIA/HMO/2026/888',
        },
        'actor-admin'
      );

      expect(result).toBeDefined();
      expect(updateAgentSpy).toHaveBeenCalledWith(
        'agent-100',
        expect.objectContaining({
          institution_type: 'HMO',
          trading_name: 'Leadway Health Insurer',
          phone: '08023552282',
        })
      );
      expect(updateProfileSpy).toHaveBeenCalledWith(
        'agent-100',
        expect.objectContaining({
          address: 'Plot 10 Commercial Ave, Lagos',
          regulator_license_reference: 'NHIA/HMO/2026/888',
          regulatory_metadata: expect.objectContaining({
            institution_type: 'HMO',
            trading_name: 'Leadway Health Insurer',
            whatsapp_number: '08023552282',
            nhia_license_number: 'NHIA/HMO/2026/888',
          }),
        })
      );
    });

    test('rejects profile update with invalid category', async () => {
      jest.spyOn(agentRepository, 'findById').mockResolvedValue({
        id: 'agent-100',
        agent_code: '30P0KK',
        institution_type: 'BANK',
        agent_profiles: [],
      } as any);

      try {
        await agentService.updateAgentProfileDetails(
          'agent-100',
          { institutionType: 'UNKNOWN_CAT' },
          'actor-admin'
        );
        fail('Should have thrown AgentAccessError for invalid category');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AgentAccessError);
        expect(err.status).toBe(400);
        expect(err.message).toMatch(/Invalid institution category/i);
      }
    });

    test('rejects profile update to HMO if NHIA reference is missing', async () => {
      jest.spyOn(agentRepository, 'findById').mockResolvedValue({
        id: 'agent-100',
        agent_code: '30P0KK',
        institution_type: 'BANK',
        agent_profiles: [
          { regulatory_metadata: {} },
        ],
      } as any);

      try {
        await agentService.updateAgentProfileDetails(
          'agent-100',
          { institutionType: 'HMO' },
          'actor-admin'
        );
        fail('Should have thrown AgentAccessError for missing NHIA reference');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AgentAccessError);
        expect(err.status).toBe(400);
        expect(err.message).toMatch(/HMO category requires NHIA accreditation/i);
      }
    });
  });
});
