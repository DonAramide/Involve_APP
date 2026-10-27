// invify-backend/test/hmo-institution-portal.test.ts
import {
  institutionClassificationService,
  HMO_ROLE_PERMISSIONS,
} from '../src/modules/health-insurance/services/institution-classification.service';
import {
  hmoExcelExchangeService,
  sanitizeSpreadsheetCell,
  cleanInboundCell,
  escapeCsvField,
  parseCsvContent,
} from '../src/modules/health-insurance/services/hmo-excel-exchange.service';
import { requireHmoInstitution, requireBankOrAggregatorInstitution } from '../src/modules/health-insurance/guards/hmo-institution.guard';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
  supabase: {
    from: jest.fn(),
  },
}));

describe('HMO-Aware Institution Portal — Classification, Security & Excel/CSV Exchange', () => {
  const originalEnv = process.env.FEATURE_HEALTH_INSURANCE_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FEATURE_HEALTH_INSURANCE_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.FEATURE_HEALTH_INSURANCE_ENABLED = originalEnv;
  });

  // Helper to mock Supabase query chains by table name
  function mockSupabaseTables(tableMap: Record<string, any>) {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      const value = tableMap[table] ?? null;
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        ilike: jest.fn(() => chain),
        in: jest.fn(() => chain),
        is: jest.fn(() => chain),
        limit: jest.fn(() => Promise.resolve({ data: Array.isArray(value) ? value : value ? [value] : [], error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: Array.isArray(value) ? value[0] || null : value, error: null })),
        single: jest.fn(() => Promise.resolve({ data: Array.isArray(value) ? value[0] || null : value, error: null })),
        upsert: jest.fn(() => chain),
      };
      return chain;
    });
  }

  describe('1. Institution Classification & Login Routing', () => {
    it('classifies a Bank institution (PROV01 / BANK) as portalMode = BANK', async () => {
      mockSupabaseTables({
        hw_hmo_user_memberships: null,
        institutions: {
          id: 'inst-bank-1',
          institution_code: 'PROV01',
          legal_name: 'Providus Bank PLC',
          trading_name: 'Providus Bank',
          institution_type: 'BANK',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
        hw_providers: null,
      });

      const ctx = await institutionClassificationService.resolveForAgentOrUser({
        authUserId: 'user-bank-1',
        email: 'desk@providusbank.com',
        agentRecord: {
          id: 'agent-bank-1',
          agent_code: 'PROV01',
          email: 'desk@providusbank.com',
          status: 'ACTIVE',
        },
      });

      expect(ctx.institutionType).toBe('BANK');
      expect(ctx.portalMode).toBe('BANK');
      expect(ctx.isVerified).toBe(true);
      expect(ctx.hmoRole).toBeNull();
      expect(ctx.hmoPermissions).toEqual([]);
    });

    it('classifies an approved HMO institution (MHMO) as institutionType = HMO and portalMode = HMO', async () => {
      mockSupabaseTables({
        hw_hmo_user_memberships: null,
        institutions: {
          id: '00000000-0000-0000-0000-000000000060',
          institution_code: 'MHMO',
          legal_name: 'Managed Health Maintenance Organisation Ltd',
          trading_name: 'MHMO Health Insurance',
          institution_type: 'HMO',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
        hw_providers: {
          id: 'prov-mhmo-1',
          code: 'mhmo',
          display_name: 'MHMO Health Insurance',
          institution_id: '00000000-0000-0000-0000-000000000060',
          integration_status: 'verified',
        },
      });

      const ctx = await institutionClassificationService.resolveForAgentOrUser({
        authUserId: 'user-mhmo-1',
        email: 'operations@mhmo.ng',
        agentRecord: {
          id: 'agent-mhmo-1',
          agent_code: 'MHMO',
          email: 'operations@mhmo.ng',
          status: 'ACTIVE',
        },
      });

      expect(ctx.institutionType).toBe('HMO');
      expect(ctx.portalMode).toBe('HMO');
      expect(ctx.hmoProviderId).toBe('prov-mhmo-1');
      expect(ctx.hmoRole).toBe('HMO_ADMIN');
      expect(ctx.hmoPermissions).toContain('hmo.batches.export');
      expect(ctx.hmoPermissions).toContain('hmo.batches.reconcile');
    });

    it('restricts an unapproved / PENDING_APPROVAL HMO institution to portalMode = RESTRICTED', async () => {
      mockSupabaseTables({
        hw_hmo_user_memberships: null,
        institutions: {
          id: 'inst-hmo-pending',
          institution_code: 'NEWHMO',
          legal_name: 'New HMO Ltd',
          institution_type: 'HMO',
          status: 'PENDING_APPROVAL',
          kyc_status: 'PENDING',
        },
        hw_providers: {
          id: 'prov-new-1',
          code: 'newhmo',
          display_name: 'New HMO Ltd',
          integration_status: 'pending_verification',
        },
      });

      const ctx = await institutionClassificationService.resolveForAgentOrUser({
        authUserId: 'user-newhmo',
        email: 'admin@newhmo.ng',
        agentRecord: {
          id: 'agent-newhmo',
          agent_code: 'NEWHMO',
          status: 'PENDING_APPROVAL',
        },
      });

      expect(ctx.institutionType).toBe('HMO');
      expect(ctx.portalMode).toBe('RESTRICTED');
      expect(ctx.isVerified).toBe(false);
      expect(ctx.restrictionReason).toMatch(/PENDING_APPROVAL/);
    });

    it('restricts a HOSPITAL or UNKNOWN institution type to portalMode = RESTRICTED', async () => {
      mockSupabaseTables({
        hw_hmo_user_memberships: null,
        institutions: {
          id: 'inst-hosp-1',
          institution_code: 'LUTH01',
          legal_name: 'Lagoon Hospital',
          institution_type: 'HOSPITAL',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
      });

      const ctx = await institutionClassificationService.resolveForAgentOrUser({
        authUserId: 'user-hosp',
        email: 'desk@hospital.ng',
        agentRecord: {
          id: 'agent-hosp',
          agent_code: 'LUTH01',
          status: 'ACTIVE',
        },
      });

      expect(ctx.institutionType).toBe('HOSPITAL');
      expect(ctx.portalMode).toBe('RESTRICTED');
    });

    it('restricts HMO portal when FEATURE_HEALTH_INSURANCE_ENABLED is explicitly false', async () => {
      process.env.FEATURE_HEALTH_INSURANCE_ENABLED = 'false';
      mockSupabaseTables({
        institutions: {
          id: '00000000-0000-0000-0000-000000000060',
          institution_code: 'MHMO',
          legal_name: 'MHMO Ltd',
          institution_type: 'HMO',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
        hw_providers: {
          id: 'prov-mhmo-1',
          code: 'mhmo',
          display_name: 'MHMO',
          integration_status: 'verified',
        },
      });

      const ctx = await institutionClassificationService.resolveForAgentOrUser({
        authUserId: 'user-mhmo-1',
        email: 'operations@mhmo.ng',
        agentRecord: { id: 'agent-mhmo-1', agent_code: 'MHMO', status: 'ACTIVE' },
      });

      expect(ctx.institutionType).toBe('HMO');
      expect(ctx.featureEnabled).toBe(false);
      expect(ctx.portalMode).toBe('RESTRICTED');
    });
  });

  describe('2. Backend Guard Enforcement (Spoofing & Cross-Type Isolation)', () => {
    it('blocks a BANK user from calling HMO endpoints even if they spoof X-Institution-Type: HMO', async () => {
      mockSupabaseTables({
        hw_hmo_user_memberships: null,
        institutions: {
          id: 'inst-bank-1',
          institution_code: 'PROV01',
          legal_name: 'Providus Bank',
          institution_type: 'BANK',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
      });

      const req: any = {
        user: { id: 'user-bank-1', email: 'desk@providusbank.com' },
        headers: { 'x-institution-type': 'HMO' },
        body: { institutionType: 'HMO' },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      const guard = requireHmoInstitution('hmo.dashboard.view');
      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INSTITUTION_TYPE_MISMATCH',
            resolvedInstitutionType: 'BANK',
          }),
        })
      );
    });

    it('blocks an HMO user from calling Bank-only hardware/terminal endpoints', async () => {
      mockSupabaseTables({
        agents: {
          id: 'agent-mhmo-1',
          agent_code: 'MHMO',
          email: 'operations@mhmo.ng',
          status: 'ACTIVE',
        },
        institutions: {
          id: '00000000-0000-0000-0000-000000000060',
          institution_code: 'MHMO',
          legal_name: 'MHMO Ltd',
          institution_type: 'HMO',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
        hw_providers: {
          id: 'prov-mhmo-1',
          code: 'mhmo',
          display_name: 'MHMO',
          integration_status: 'verified',
        },
      });

      const req: any = {
        user: { id: 'user-mhmo-1', email: 'operations@mhmo.ng' },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      await requireBankOrAggregatorInstitution(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BANK_ENDPOINT_FORBIDDEN_FOR_HMO',
          }),
        })
      );
    });

    it('enforces granular HMO RBAC permissions (e.g. AUDITOR cannot export batches or adjudicate claims)', async () => {
      mockSupabaseTables({
        hw_hmo_user_memberships: {
          id: 'mem-auditor-1',
          institution_id: '00000000-0000-0000-0000-000000000060',
          provider_id: 'prov-mhmo-1',
          user_id: 'user-auditor-1',
          email: 'auditor@mhmo.ng',
          hmo_role: 'AUDITOR',
          status: 'ACTIVE',
          permissions: HMO_ROLE_PERMISSIONS.AUDITOR,
        },
        institutions: {
          id: '00000000-0000-0000-0000-000000000060',
          institution_code: 'MHMO',
          legal_name: 'MHMO Ltd',
          institution_type: 'HMO',
          status: 'ACTIVE',
          kyc_status: 'VERIFIED',
        },
        hw_providers: {
          id: 'prov-mhmo-1',
          code: 'mhmo',
          display_name: 'MHMO',
          integration_status: 'verified',
        },
      });

      const req: any = {
        user: { id: 'user-auditor-1', email: 'auditor@mhmo.ng' },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      // Auditor attempting to reconcile an enrollment batch must be rejected
      const guard = requireHmoInstitution('hmo.batches.reconcile');
      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'HMO_INSUFFICIENT_PERMISSION',
            hmoRole: 'AUDITOR',
          }),
        })
      );
    });
  });

  describe('3. Excel / CSV Integration Centre & Formula Injection Defense', () => {
    it('neutralizes spreadsheet formula injection payloads (=, +, -, @)', () => {
      expect(sanitizeSpreadsheetCell('=CMD|\'/C calc\'!A0')).toBe("'=CMD|'/C calc'!A0");
      expect(sanitizeSpreadsheetCell('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)");
      expect(sanitizeSpreadsheetCell('@HYPERLINK("http://evil.com")')).toBe("'@HYPERLINK(\"http://evil.com\")");
      expect(sanitizeSpreadsheetCell('-2+3+cmd')).toBe("'-2+3+cmd");
      // Pure negative numbers remain unescaped
      expect(sanitizeSpreadsheetCell('-1500.50')).toBe('-1500.50');
      expect(escapeCsvField('=1+1, "injected"')).toBe('"\'=1+1, ""injected"""');
    });

    it('cleans inbound spreadsheet formula prefixes on HMO response cells', () => {
      expect(cleanInboundCell("'=MHMO/2026/001")).toBe('MHMO/2026/001');
      expect(cleanInboundCell('  CONFIRMED  ')).toBe('CONFIRMED');
    });

    it('generates a valid, formula-safe CSV batch export with custom date formatting', () => {
      const exportResult = hmoExcelExchangeService.generateBatchCsv({
        batchReference: 'BATCH-MHMO-202601',
        dateFormat: 'DD/MM/YYYY',
        items: [
          {
            enrolment_reference: 'ENR-1001AAAA',
            school_name: 'Kings College Lagos',
            member_full_name: '=EvilStudentName',
            member_category: 'student',
            date_of_birth: '2012-04-25',
            sex: 'male',
            plan_code: 'MHMO-GOLD',
            period_start: '2026-09-01',
            period_end: '2027-08-31',
            guardian_or_staff_contact: '+2348031234567',
            hospital_preference: 'Lagoon Hospital',
          },
        ],
      });

      expect(exportResult.rowCount).toBe(1);
      expect(exportResult.filename).toMatch(/^BATCH-MHMO-202601_HMO_ENROLMENT_/);
      expect(exportResult.csv).toContain("'=EvilStudentName");
      expect(exportResult.csv).toContain("'+2348031234567");
      expect(exportResult.csv).toContain('25/04/2012');
      expect(exportResult.csv).toContain('01/09/2026');
    });

    it('reconciles processed HMO response rows idempotently: handles confirmed, rejected, duplicate, unmatched, and cross-HMO rows', () => {
      const csvText = [
        'BATCH_REF,INVIFY_ENROLMENT_REF,HMO_MEMBER_ID,HMO_POLICY_NUMBER,HMO_CONFIRMATION_STATUS,CONFIRMED_START_DATE,CONFIRMED_END_DATE,REJECTION_CODE,REJECTION_REASON',
        'BATCH-MHMO-01,ENR-VALID-01,MHMO/26/1001,POL-1001,CONFIRMED,2026-09-01,2027-08-31,,',
        'BATCH-MHMO-01,ENR-VALID-01,MHMO/26/1001,POL-1001,CONFIRMED,2026-09-01,2027-08-31,,', // duplicate in same file
        'BATCH-MHMO-01,ENR-REJECT-02,,,REJECTED,,,AGE_LIMIT,Member exceeds age band',
        'BATCH-MHMO-01,ENR-ALREADY-03,MHMO/26/1003,POL-1003,CONFIRMED,2026-09-01,2027-08-31,,', // already confirmed with same ID
        'BATCH-MHMO-01,ENR-UNKNOWN-99,MHMO/26/9999,POL-9999,CONFIRMED,2026-09-01,2027-08-31,,', // unmatched
        'BATCH-MHMO-01,ENR-OTHERHMO-04,OTHER/26/0004,POL-0004,CONFIRMED,2026-09-01,2027-08-31,,', // belongs to another HMO
      ].join('\n');

      const parsed = hmoExcelExchangeService.parseResponseCsvToRows(csvText);
      expect(parsed.rows).toHaveLength(6);

      const reconciliation = hmoExcelExchangeService.reconcileRowsInMemory({
        providerId: 'prov-mhmo-1',
        parsedRows: parsed.rows,
        existingBatchItems: [
          {
            id: 'item-1',
            batch_id: 'batch-1',
            provider_id: 'prov-mhmo-1',
            tenant_id: 'tenant-sch-1',
            enrolment_id: 'enr-1',
            member_id: 'mem-1',
            enrolment_reference: 'ENR-VALID-01',
            reconciliation_status: 'exported',
            period_start: '2026-09-01',
            period_end: '2027-08-31',
          },
          {
            id: 'item-2',
            batch_id: 'batch-1',
            provider_id: 'prov-mhmo-1',
            tenant_id: 'tenant-sch-1',
            enrolment_id: 'enr-2',
            member_id: 'mem-2',
            enrolment_reference: 'ENR-REJECT-02',
            reconciliation_status: 'exported',
            period_start: '2026-09-01',
            period_end: '2027-08-31',
          },
          {
            id: 'item-3',
            batch_id: 'batch-1',
            provider_id: 'prov-mhmo-1',
            tenant_id: 'tenant-sch-1',
            enrolment_id: 'enr-3',
            member_id: 'mem-3',
            enrolment_reference: 'ENR-ALREADY-03',
            reconciliation_status: 'confirmed',
            hmo_member_id: 'MHMO/26/1003',
            hmo_policy_number: 'POL-1003',
            period_start: '2026-09-01',
            period_end: '2027-08-31',
          },
          {
            id: 'item-4',
            batch_id: 'batch-2',
            provider_id: 'prov-other-hmo-2', // Another HMO!
            tenant_id: 'tenant-sch-2',
            enrolment_id: 'enr-4',
            member_id: 'mem-4',
            enrolment_reference: 'ENR-OTHERHMO-04',
            reconciliation_status: 'exported',
            period_start: '2026-09-01',
            period_end: '2027-08-31',
          },
        ],
      });

      expect(reconciliation.summary.totalRows).toBe(6);
      expect(reconciliation.summary.confirmedRows).toBe(1);
      expect(reconciliation.summary.rejectedRows).toBe(1);
      expect(reconciliation.summary.duplicateRows).toBe(2); // 1 in-file duplicate + 1 already confirmed idempotent
      expect(reconciliation.summary.unmatchedRows).toBe(1);
      expect(reconciliation.summary.invalidRows).toBe(1); // cross_hmo_violation counted as invalid

      const outcomes = reconciliation.results.map((r) => r.outcome);
      expect(outcomes).toEqual([
        'matched_confirmed',
        'duplicate_ignored',
        'matched_rejected',
        'duplicate_ignored',
        'unmatched_reference',
        'cross_hmo_violation',
      ]);
    });
  });
});
