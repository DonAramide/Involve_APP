// invify-backend/test/health-insurance.test.ts
import { requireHealthInsuranceEnabled } from '../src/modules/health-insurance/guards/health-flag.guard';
import { requireHealthPermission } from '../src/modules/health-insurance/guards/health-permission.guard';
import { requireGuardianLink } from '../src/modules/health-insurance/guards/guardian-access.guard';
import { SandboxHealthProviderAdapter } from '../src/modules/health-insurance/adapters/sandbox.adapter';
import { HealthMemberService } from '../src/modules/health-insurance/services/health-member.service';
import { HealthGuardianService } from '../src/modules/health-insurance/services/health-guardian.service';
import { HealthEnrolmentService } from '../src/modules/health-insurance/services/health-enrolment.service';
import { HealthContext } from '../src/modules/health-insurance/types';
import { supabaseAdmin } from '../src/db/supabase';

// Mock supabaseAdmin
jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

describe('Invify Health & Wellness — Unit & Security Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── 1. Feature Flag Guard ───────────────────────────────────────────────
  describe('1. Feature Flag Guard (Default Safety)', () => {
    it('rejects access with 503 when FEATURE_HEALTH_INSURANCE_ENABLED is absent or false', () => {
      delete process.env.FEATURE_HEALTH_INSURANCE_ENABLED;

      const req: any = {};
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      requireHealthInsuranceEnabled(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'HEALTH_MODULE_DISABLED' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('allows access to proceed when FEATURE_HEALTH_INSURANCE_ENABLED is "true"', () => {
      process.env.FEATURE_HEALTH_INSURANCE_ENABLED = 'true';

      const req: any = {};
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      requireHealthInsuranceEnabled(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ─── 2. Role-Based Access Control & Super Admin Isolation ─────────────────
  describe('2. Authorization & Super Admin Isolation', () => {
    it('strictly denies implicit super_admin bypass when user lacks health permissions', async () => {
      const req: any = {
        user: { id: 'super-admin-user-id' }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Mock user profile returning role='super_admin' but with a standard tenant
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'super-admin-user-id',
                role: 'super_admin',
                tenant_id: 'tenant-school-1',
                is_active: true
              },
              error: null
            })
          };
        }
        if (table === 'hw_permission_grants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockResolvedValue({
              data: [], // No explicit grants
              error: null
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      // Require specific HR permission
      const guard = requireHealthPermission('health.hr_admin');
      await guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'HEALTH_FORBIDDEN',
            message: expect.stringContaining('health.hr_admin')
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('permits platform operator access only when explicit unexpired grant and valid reason header exist', async () => {
      const req: any = {
        user: { id: 'platform-operator-id' },
        headers: { 'x-platform-reason': 'Auditing partner integration health for support ticket #4920' },
        query: { tenantId: 'target-tenant-uuid' }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'platform-operator-id', is_active: true },
              error: null
            })
          };
        }
        if (table === 'hw_platform_grants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            gt: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'grant-uuid', expires_at: new Date(Date.now() + 3600000).toISOString() },
              error: null
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const guard = requireHealthPermission('platform.integration.health');
      await guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.healthContext.isPlatformOperator).toBe(true);
      expect(req.healthContext.platformReason).toBe('Auditing partner integration health for support ticket #4920');
    });
  });

  // ─── 3. Strict Tenant Isolation ───────────────────────────────────────────
  describe('3. Tenant Isolation Enforcement', () => {
    it('rejects cross-tenant student enrolment when student belongs to a different tenant', async () => {
      const ctx: HealthContext = {
        tenantId: 'school-a-tenant-uuid',
        userId: 'admin-user-id',
        permissions: ['health.members.manage'],
        isPlatformOperator: false,
        isGuardian: false
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'students') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'student-b-uuid',
                tenant_id: 'school-b-tenant-uuid', // Belongs to School B!
                school_id: 'school-b-tenant-uuid',
                first_name: 'John',
                last_name: 'Doe'
              },
              error: null
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      await expect(
        HealthMemberService.enrolStudentMember(ctx, 'student-b-uuid')
      ).rejects.toThrow('Cross-tenant student enrolment rejected');
    });
  });

  // ─── 4. Guardian Verification & Child Protection ──────────────────────────
  describe('4. Guardian Relationship & State Verification', () => {
    it('blocks access to student coverage while guardian link is in pending_verification', async () => {
      const req: any = {
        user: { id: 'parent-user-id' },
        params: { studentId: 'student-123' }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Mock DB query finding link in 'pending_verification' rather than 'verified'
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_guardian_links') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null, // Guard queries .eq('status', 'verified')
              error: null
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const guard = requireGuardianLink('can_view_coverage');
      await guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── 5. Policy Activation Boundary ────────────────────────────────────────
  describe('5. Policy Activation Safety Boundary', () => {
    it('enforces that enrolment verification transitions to awaiting_premium_payment and NEVER active directly', async () => {
      const ctx: HealthContext = {
        tenantId: 'school-a-tenant-uuid',
        userId: 'admin-user-id',
        permissions: ['health.enrolments.verify'],
        isPlatformOperator: false,
        isGuardian: false
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_enrolments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'enrolment-123',
                status: 'awaiting_verification',
                hw_plan_versions: { activation_requires_payment: true }
              },
              error: null
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'enrolment-123', status: 'awaiting_premium_payment' },
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'hw_audit_events') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const result = await HealthEnrolmentService.verifyEnrolment(ctx, 'enrolment-123', {
        decision: 'approve',
        reason: 'Birth certificate sighted'
      });

      expect(result.status).toBe('awaiting_premium_payment');
    });
  });

  // ─── 6. Sandbox Security Isolation ────────────────────────────────────────
  describe('6. Sandbox Adapter Security Gating', () => {
    it('throws a fatal security error if instantiated in production mode', () => {
      process.env.NODE_ENV = 'production';
      expect(() => new SandboxHealthProviderAdapter()).toThrow(
        '[SECURITY FATAL] SandboxHealthProviderAdapter is strictly prohibited in production.'
      );
    });

    it('throws a fatal security error if BUILD_VARIANT is prod', () => {
      delete process.env.NODE_ENV;
      process.env.BUILD_VARIANT = 'prod';
      expect(() => new SandboxHealthProviderAdapter()).toThrow(
        '[SECURITY FATAL] SandboxHealthProviderAdapter is strictly prohibited in production.'
      );
    });

    it('instantiates safely in staging / test mode', () => {
      process.env.NODE_ENV = 'staging';
      process.env.BUILD_VARIANT = 'staging';
      const adapter = new SandboxHealthProviderAdapter();
      expect(adapter.providerCode).toBe('sandbox_hmo');
      expect(adapter.getCapabilities().enrolmentSubmit).toBe(true);
    });
  });
});
