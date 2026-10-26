// invify-backend/test/health-insurance.test.ts
import { requireHealthInsuranceEnabled } from '../src/modules/health-insurance/guards/health-flag.guard';
import { requireHealthPermission } from '../src/modules/health-insurance/guards/health-permission.guard';
import { requireGuardianLink } from '../src/modules/health-insurance/guards/guardian-access.guard';
import { SandboxHealthProviderAdapter } from '../src/modules/health-insurance/adapters/sandbox.adapter';
import { HealthMemberService } from '../src/modules/health-insurance/services/health-member.service';
import { HealthGuardianService } from '../src/modules/health-insurance/services/health-guardian.service';
import { HealthEnrolmentService } from '../src/modules/health-insurance/services/health-enrolment.service';
import { HealthPlatformService, boundedGrantDurationMinutes, classifyOperatorGrantRows, grantOperatorOptions, metricCount } from '../src/modules/health-insurance/services/health-platform.service';
import {
  DESIGNATED_PLATFORM_ADMIN_USER_ID,
  PLATFORM_ENTITLEMENT_PERMISSIONS,
  PlatformEntitlementService,
  classifyDurableEntitlementRows
} from '../src/modules/health-insurance/services/platform-entitlement.service';
import fs from 'fs';
import path from 'path';
import { HealthPlatformController } from '../src/modules/health-insurance/controllers/health-platform.controller';
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

  // ─── 7. Platform Super Admin Governance & Operator Grants ─────────────────
  describe('7. Platform Super Admin Governance & Operator Grants', () => {
    it('HealthPlatformService.getPlatformOverview aggregates cross-tenant counts and financial volume', async () => {
      const ctx: HealthContext = {
        tenantId: '00000000-0000-0000-0000-000000000000',
        userId: 'super-admin-uuid',
        permissions: ['platform.integration.health'],
        isPlatformOperator: true,
        isGuardian: false
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_tenant_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ count: 5, error: null })
            })
          };
        }
        if (table === 'hw_members') {
          return {
            select: jest.fn().mockResolvedValue({ count: 120, error: null })
          };
        }
        if (table === 'hw_policies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockImplementation(() => {
                  const result = Promise.resolve({ count: 85, error: null }) as Promise<{ count: number; error: null }> & {
                    lte: jest.Mock;
                  };
                  result.lte = jest.fn().mockResolvedValue({ count: 3, error: null });
                  return result;
                })
              })
            })
          };
        }
        if (table === 'hw_enrolments') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { status: 'active' },
                { status: 'active' },
                { status: 'awaiting_verification' },
                { status: 'awaiting_premium_payment' }
              ],
              error: null
            })
          };
        }
        if (table === 'hw_providers') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { id: 'p1', integration_status: 'verified' },
                { id: 'p2', integration_status: 'sandbox_active' }
              ],
              error: null
            })
          };
        }
        if (table === 'hw_premium_invoices') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { amount_due_minor: 1500000, status: 'paid' },
                { amount_due_minor: 2500000, status: 'issued' },
                { amount_due_minor: 999, status: 'draft' }
              ],
              error: null
            })
          };
        }
        if (table === 'hw_payments') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { amount_minor: 1500000, status: 'successful' },
                { amount_minor: 500, status: 'pending' }
              ],
              error: null
            })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const overview = await HealthPlatformService.getPlatformOverview(ctx);

      expect(overview.totalEnabledTenants).toBe(5);
      expect(overview.totalDistinctMembers).toBe(120);
      expect(overview.activePoliciesCount).toBe(85);
      expect(overview.expiringSoonCount).toBe(3);
      expect(overview.enrolmentStatusBreakdown.active).toBe(2);
      expect(overview.enrolmentStatusBreakdown.awaiting_verification).toBe(1);
      expect(overview.totalPremiumsBilledKobo).toBe(4000000);
      expect(overview.totalPremiumsCollectedKobo).toBe(1500000);
    });

    it('does not turn a failed member count into zero', () => {
      expect(metricCount(0, null)).toBe(0);
      expect(metricCount(null, { message: 'relation hw_members does not exist' })).toBeNull();
      expect(metricCount(undefined, null)).toBeNull();
    });

    it('does not turn a premium query failure into a zero total', async () => {
      const ctx: HealthContext = {
        tenantId: '00000000-0000-0000-0000-000000000000',
        userId: 'super-admin-uuid',
        permissions: ['platform.integration.health'],
        isPlatformOperator: true,
        isGuardian: false
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const emptyCount = {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({ count: 0, error: null })
              })
            })
          })
        };
        if (table === 'hw_tenant_settings') return emptyCount;
        if (table === 'hw_policies') return emptyCount;
        if (table === 'hw_members' || table === 'hw_enrolments' || table === 'hw_providers') {
          return { select: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }) };
        }
        if (table === 'hw_premium_invoices') {
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'column amount_due_minor does not exist' }
            })
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      await expect(HealthPlatformService.getPlatformOverview(ctx)).rejects.toThrow(
        'column amount_due_minor does not exist'
      );
    });

    it('lists the HMO registry from hw_providers and does not read plans', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_plans') {
          throw new Error('registry read must not query hw_plans');
        }
        if (table === 'hw_providers') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ id: 'p1', code: 'ACME', display_name: 'Acme HMO', integration_status: 'none', licence_reference: null }],
                error: null
              })
            })
          };
        }
        throw new Error(`unexpected table ${table}`);
      });

      const providers = await HealthPlatformService.listProviderRegistry();
      expect(providers).toEqual([
        { id: 'p1', code: 'ACME', display_name: 'Acme HMO', integration_status: 'none', licence_reference: null }
      ]);
    });

    it('rejects grant creation if justification reason is shorter than 5 characters', async () => {
      await expect(
        HealthPlatformService.createPlatformGrant('admin-uuid', {
          userId: 'target-user-uuid',
          permission: 'platform.integration.health',
          durationMinutes: 60,
          reason: 'test' // 4 chars
        })
      ).rejects.toThrow('A valid justification reason (> 5 characters) is mandatory');
    });

    it('creates platform operator grant and records audit event in hw_audit_events', async () => {
      const auditInsertMock = jest.fn().mockResolvedValue({ error: null });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'target-user-uuid', email: 'operator@invify.com', is_active: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'hw_platform_grants') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'new-grant-id',
                    user_id: 'target-user-uuid',
                    permission: 'platform.integration.health',
                    expires_at: new Date(Date.now() + 3600000).toISOString(),
                    granted_at: new Date().toISOString()
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'hw_audit_events') {
          return { insert: auditInsertMock };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const grant = await HealthPlatformService.createPlatformGrant('super-admin-actor-uuid', {
        userId: 'target-user-uuid',
        permission: 'platform.integration.health',
        durationMinutes: 60,
        reason: 'Investigating HMO webhook reconciliation discrepancy'
      });

      expect(grant.id).toBe('new-grant-id');
      expect(grant.permission).toBe('platform.integration.health');
      expect(auditInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'platform.grant.created',
          via_platform_access: true,
          platform_reason: 'Investigating HMO webhook reconciliation discrepancy'
        })
      );
    });

    it('revokes an active platform grant and records audit event in hw_audit_events', async () => {
      const auditInsertMock = jest.fn().mockResolvedValue({ error: null });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_platform_grants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'grant-to-revoke-id',
                    user_id: 'target-user-uuid',
                    permission: 'platform.tenant_access',
                    revoked_at: null
                  },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'grant-to-revoke-id',
                      revoked_at: new Date().toISOString()
                    },
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'hw_audit_events') {
          return { insert: auditInsertMock };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      const revoked = await HealthPlatformService.revokePlatformGrant(
        'super-admin-actor-uuid',
        'grant-to-revoke-id',
        'Session completed and audit concluded'
      );

      expect(revoked.id).toBe('grant-to-revoke-id');
      expect(revoked.revokedAt).toBeTruthy();
      expect(auditInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'platform.grant.revoked',
          platform_reason: 'Session completed and audit concluded'
        })
      );
    });

    it('enforces dual-authorization: rejects grant creation if actor tries to grant to themselves', async () => {
      await expect(
        HealthPlatformService.createPlatformGrant('same-user-uuid', {
          userId: 'same-user-uuid',
          permission: 'platform.integration.health',
          durationMinutes: 60,
          reason: 'Attempting self-elevation'
        })
      ).rejects.toThrow('Dual-authorization required: Administrators cannot create, expand, or approve platform grants for themselves');
    });

    it('selfActivateGrant rejects session activation with 403 when no independent grant exists', async () => {
      const req: any = {
        user: { id: 'admin-requester-id' },
        body: {
          permission: 'platform.integration.health',
          reason: 'Routine quarterly health audit session'
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'admin-requester-id', email: 'admin@invify.com', role: 'super_admin', is_active: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'hw_platform_grants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    gt: jest.fn().mockReturnValue({
                      neq: jest.fn().mockResolvedValue({
                        data: [], // No independent grant
                        error: null
                      })
                    })
                  })
                })
              })
            })
          };
        }
        if (table === 'hw_platform_entitlements') {
          const chain: any = {};
          const step = () => chain;
          chain.select = jest.fn(step);
          chain.eq = jest.fn(step);
          chain.is = jest.fn(step);
          chain.neq = jest.fn(step);
          chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
          return chain;
        }
        return { select: jest.fn().mockReturnThis() };
      });

      await HealthPlatformController.selfActivateGrant(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INDEPENDENT_AUTHORIZATION_REQUIRED'
          })
        })
      );
    });

    it('selfActivateGrant activates session and records audit event when independent grant exists', async () => {
      const auditInsertMock = jest.fn().mockResolvedValue({ error: null });

      const req: any = {
        user: { id: 'admin-requester-id' },
        body: {
          permission: 'platform.integration.health',
          reason: 'Investigating HMO webhook reconciliation discrepancy'
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'admin-requester-id', email: 'admin@invify.com', role: 'super_admin', is_active: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'hw_platform_grants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    gt: jest.fn().mockReturnValue({
                      neq: jest.fn().mockResolvedValue({
                        data: [
                          {
                            id: 'independent-grant-uuid',
                            user_id: 'admin-requester-id',
                            permission: 'platform.integration.health',
                            granted_by: 'other-governor-id',
                            expires_at: new Date(Date.now() + 7200000).toISOString(),
                            revoked_at: null
                          }
                        ],
                        error: null
                      })
                    })
                  })
                })
              })
            })
          };
        }
        if (table === 'hw_audit_events') {
          return { insert: auditInsertMock };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      await HealthPlatformController.selfActivateGrant(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          session: expect.objectContaining({
            grantId: 'independent-grant-uuid',
            permission: 'platform.integration.health',
            grantedBy: 'other-governor-id'
          })
        })
      );
      expect(auditInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'platform.session.activated',
          platform_reason: 'Investigating HMO webhook reconciliation discrepancy'
        })
      );
    });

    it('classifies active, expired, and revoked grants and omits a permission with no row', () => {
      const now = Date.parse('2026-10-26T09:00:00.000Z');
      const classified = classifyOperatorGrantRows([
        { permission: 'platform.providers.manage', expires_at: '2026-10-26T12:00:00.000Z', revoked_at: null },
        { permission: 'platform.plans.manage', expires_at: '2026-10-26T08:00:00.000Z', revoked_at: null },
        { permission: 'platform.integration.health', expires_at: '2026-10-26T12:00:00.000Z', revoked_at: '2026-10-26T07:00:00.000Z' }
      ], now);

      expect(classified.hasActiveGrants).toBe(true);
      expect(classified.activeGrants).toEqual([
        { permission: 'platform.providers.manage', expires_at: '2026-10-26T12:00:00.000Z' }
      ]);
      expect(classified.inactiveGrants).toEqual([
        { permission: 'platform.plans.manage', status: 'expired', expiresAt: '2026-10-26T08:00:00.000Z' },
        { permission: 'platform.integration.health', status: 'revoked', expiresAt: '2026-10-26T12:00:00.000Z' }
      ]);
      expect(classified.activeGrants.some((grant) => grant.permission === 'platform.plans.manage')).toBe(false);
      expect(classified.inactiveGrants.some((grant) => grant.permission === 'platform.tenant_access')).toBe(false);
      expect(JSON.stringify(classified)).not.toContain('granted_by');
    });

    it('returns an empty diagnostic when the grant query succeeds with no rows', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_platform_grants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        }
        if (table === 'hw_platform_entitlements') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        }
        throw new Error(`unexpected table ${table}`);
      });

      const status = await HealthPlatformService.getOperatorGrantStatus('operator-1');
      expect(status).toEqual({
        hasActiveGrants: false,
        activeGrants: [],
        inactiveGrants: [],
        durableEntitlements: []
      });
    });

    it('does not turn a grant query error into an empty grant list', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'hw_platform_grants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } })
            })
          };
        }
        throw new Error(`unexpected table ${table}`);
      });

      await expect(HealthPlatformService.getOperatorGrantStatus('operator-1'))
        .rejects.toThrow('Failed to check grants: connection refused');
    });

    it('returns grant lookup failure instead of a missing-grant denial when the grant query errors', async () => {
      const req: any = { user: { id: 'platform-operator-id' }, headers: {}, query: {} };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'platform-operator-id', email: 'operator@invify.com', is_active: true },
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
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'timeout' } })
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      await requireHealthPermission('platform.providers.manage')(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'PLATFORM_GRANT_LOOKUP_FAILED' })
      }));
    });
  });

  describe('8. Durable platform entitlement', () => {
    const holder = DESIGNATED_PLATFORM_ADMIN_USER_ID;
    const issuer = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const otherUser = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const reason = 'Independent review of the platform registry';

    function chain(resolved: { data: any; error: any }) {
      const query: any = {};
      const step = () => query;
      query.select = jest.fn(step);
      query.eq = jest.fn(step);
      query.is = jest.fn(step);
      query.gt = jest.fn(step);
      query.neq = jest.fn(step);
      query.maybeSingle = jest.fn().mockResolvedValue(resolved);
      query.single = jest.fn().mockResolvedValue(resolved);
      return query;
    }

    function activeEntitlement(permission: string) {
      return {
        id: 'entitlement-1',
        user_id: holder,
        permission,
        granted_by: issuer,
        suspended_at: null,
        revoked_at: null
      };
    }

    it('lists other active administrators and omits the caller, tenants, and inactive accounts', () => {
      const caller = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      expect(grantOperatorOptions([
        { id: caller, email: 'self@invify.com', role: 'SUPER_ADMIN', is_active: true },
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', email: 'ops@invify.com', role: 'admin_ops', is_active: true },
        { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', email: 'school@invify.com', role: 'tenant_admin', is_active: true },
        { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', email: 'former@invify.com', role: 'admin', is_active: false },
        { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', email: 'owner@invify.com', role: 'owner', is_active: true }
      ], caller)).toEqual([
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', email: 'ops@invify.com', role: 'admin_ops' }
      ]);
    });

    it('keeps the eight-hour ceiling for ordinary grants', async () => {
      expect(boundedGrantDurationMinutes(5)).toBe(10);
      expect(boundedGrantDurationMinutes(60)).toBe(60);
      expect(boundedGrantDurationMinutes(24 * 60)).toBe(480);

      const insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'grant-capped',
              user_id: otherUser,
              permission: 'platform.integration.health',
              expires_at: new Date().toISOString(),
              granted_at: new Date().toISOString()
            },
            error: null
          })
        })
      });
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({ data: { id: otherUser, email: 'operator@invify.com', is_active: true }, error: null });
        }
        if (table === 'hw_platform_grants') {
          return { insert };
        }
        if (table === 'hw_audit_events') return { insert: jest.fn().mockResolvedValue({ error: null }) };
        throw new Error(`unexpected table ${table}`);
      });

      await HealthPlatformService.createPlatformGrant(issuer, {
        userId: otherUser,
        permission: 'platform.integration.health',
        durationMinutes: 10000,
        reason
      });

      const payload = insert.mock.calls[0][0];
      const span = new Date(payload.expires_at).getTime() - new Date(payload.granted_at).getTime();
      expect(span).toBe(480 * 60 * 1000);
    });

    it('authorizes only the entitled permission for the designated user', async () => {
      const next = jest.fn();
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({ data: { id: holder, email: 'support@iips.app', is_active: true, tenant_id: null }, error: null });
        }
        if (table === 'hw_platform_grants') return chain({ data: null, error: null });
        if (table === 'hw_platform_entitlements') {
          const query = chain({ data: null, error: null });
          query.eq = jest.fn((column: string, value: string) => {
            if (column === 'permission') query.permission = value;
            return query;
          });
          query.maybeSingle = jest.fn(async () => ({
            data: query.permission === 'platform.providers.manage' ? activeEntitlement('platform.providers.manage') : null,
            error: null
          }));
          return query;
        }
        throw new Error(`unexpected table ${table}`);
      });

      const req: any = {
        user: { id: holder },
        headers: { 'x-platform-reason': reason },
        query: {}
      };
      await requireHealthPermission('platform.providers.manage')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.healthContext.permissions).toEqual(['platform.providers.manage']);

      next.mockClear();
      res.status.mockClear();
      const denied: any = { user: { id: holder }, headers: { 'x-platform-reason': reason }, query: {} };
      await requireHealthPermission('platform.plans.manage')(denied, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('does not give another user the designated entitlement', async () => {
      const next = jest.fn();
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') return chain({ data: { id: otherUser, is_active: true }, error: null });
        if (table === 'hw_platform_grants') return chain({ data: null, error: null });
        if (table === 'hw_platform_entitlements') return chain({ data: activeEntitlement('platform.providers.manage'), error: null });
        throw new Error(`unexpected table ${table}`);
      });

      await requireHealthPermission('platform.providers.manage')({
        user: { id: otherUser },
        headers: { 'x-platform-reason': reason },
        query: {}
      } as any, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('requires an audit reason even when the entitlement is active', async () => {
      const next = jest.fn();
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') return chain({ data: { id: holder, is_active: true }, error: null });
        if (table === 'hw_platform_grants') return chain({ data: null, error: null });
        if (table === 'hw_platform_entitlements') return chain({ data: activeEntitlement('platform.providers.manage'), error: null });
        throw new Error(`unexpected table ${table}`);
      });

      await requireHealthPermission('platform.providers.manage')({
        user: { id: holder },
        headers: {},
        query: {}
      } as any, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'PLATFORM_REASON_REQUIRED' })
      }));
    });

    it('denies a suspended or revoked entitlement on the next request', async () => {
      for (const stamp of ['suspended_at', 'revoked_at'] as const) {
        const next = jest.fn();
        const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const row = { ...activeEntitlement('platform.integration.health'), [stamp]: '2026-10-26T12:00:00.000Z' };
        (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'users') return chain({ data: { id: holder, is_active: true }, error: null });
          if (table === 'hw_platform_grants') return chain({ data: null, error: null });
          if (table === 'hw_platform_entitlements') return chain({ data: row, error: null });
          throw new Error(`unexpected table ${table}`);
        });

        await requireHealthPermission('platform.integration.health')({
          user: { id: holder },
          headers: { 'x-platform-reason': reason },
          query: {}
        } as any, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      }
    });

    it('returns a controlled error and does not authorize when entitlement lookup fails', async () => {
      const next = jest.fn();
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') return chain({ data: { id: holder, is_active: true }, error: null });
        if (table === 'hw_platform_grants') return chain({ data: null, error: null });
        if (table === 'hw_platform_entitlements') return chain({ data: null, error: { message: 'connection refused' } });
        throw new Error(`unexpected table ${table}`);
      });

      await requireHealthPermission('platform.providers.manage')({
        user: { id: holder },
        headers: { 'x-platform-reason': reason },
        query: {}
      } as any, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'PLATFORM_GRANT_LOOKUP_FAILED' })
      }));
    });

    it('rejects self-approval and self-revocation before any entitlement write', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
        throw new Error('database must not be called');
      });

      await expect(PlatformEntitlementService.issue(holder, 'platform.providers.manage', reason))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_SELF_APPROVAL_DENIED', status: 403 });
      await expect(PlatformEntitlementService.suspend(holder, 'platform.providers.manage', reason))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_SELF_APPROVAL_DENIED', status: 403 });
      await expect(PlatformEntitlementService.revoke(holder, 'platform.providers.manage', reason))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_SELF_APPROVAL_DENIED', status: 403 });
    });

    it('rejects a missing audit reason on the issuance endpoint', async () => {
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      (supabaseAdmin.from as jest.Mock).mockImplementation(() => {
        throw new Error('database must not be called');
      });

      await HealthPlatformController.issueEntitlement({
        user: { id: issuer },
        headers: {},
        body: { permission: 'platform.providers.manage' },
        params: {}
      } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({ code: 'PLATFORM_REASON_REQUIRED' })
      }));
    });

    it('issues only the designated account and writes an audit event', async () => {
      const insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'entitlement-1',
              user_id: holder,
              permission: 'platform.providers.manage',
              granted_by: issuer,
              granted_at: '2026-10-26T12:00:00.000Z'
            },
            error: null
          })
        })
      });
      const auditInsert = jest.fn().mockResolvedValue({ error: null });
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') return chain({ data: { id: issuer, role: 'super_admin', is_active: true }, error: null });
        if (table === 'hw_platform_entitlements') {
          const query = chain({ data: null, error: null });
          query.insert = insert;
          return query;
        }
        if (table === 'hw_audit_events') return { insert: auditInsert };
        throw new Error(`unexpected table ${table}`);
      });

      const created = await PlatformEntitlementService.issue(issuer, 'platform.providers.manage', reason, holder);
      expect(created.user_id).toBe(holder);
      expect(insert.mock.calls[0][0]).toEqual(expect.objectContaining({
        user_id: holder,
        granted_by: issuer,
        permission: 'platform.providers.manage'
      }));
      expect(insert.mock.calls[0][0].expires_at).toBeUndefined();
      expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
        action: 'platform.entitlement.created',
        resource_type: 'hw_platform_entitlements'
      }));

      await expect(PlatformEntitlementService.issue(issuer, 'platform.providers.manage', reason, otherUser))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_HOLDER_MISMATCH' });
    });

    it('does not introduce a payout, settlement, or withdrawal permission', async () => {
      const joined = PLATFORM_ENTITLEMENT_PERMISSIONS.join(' ');
      expect(joined).not.toMatch(/payout|settlement|withdrawal/i);
      expect(PLATFORM_ENTITLEMENT_PERMISSIONS).toEqual([
        'platform.providers.manage',
        'platform.plans.manage',
        'platform.tenants.onboard',
        'platform.integration.health',
        'platform.tenant_access'
      ]);
      await expect(PlatformEntitlementService.issue(issuer, 'payout.execute', reason))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_PERMISSION_REJECTED' });
      await expect(PlatformEntitlementService.issue(issuer, 'settlement.approve', reason))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_PERMISSION_REJECTED' });
      await expect(PlatformEntitlementService.issue(issuer, 'withdrawal.approve', reason))
        .rejects.toMatchObject({ code: 'ENTITLEMENT_PERMISSION_REJECTED' });
    });

    it('keeps tenant and guardian checks independent of the entitlement', async () => {
      const next = jest.fn();
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return chain({
            data: { id: holder, role: 'super_admin', tenant_id: 'school-a', is_active: true },
            error: null
          });
        }
        if (table === 'hw_permission_grants') {
          const query: any = {};
          const step = () => query;
          query.select = jest.fn(step);
          query.eq = jest.fn(step);
          query.is = jest.fn().mockResolvedValue({ data: [], error: null });
          return query;
        }
        if (table === 'hw_platform_entitlements') return chain({ data: activeEntitlement('platform.tenant_access'), error: null });
        if (table === 'hw_guardian_links') return chain({ data: null, error: null });
        throw new Error(`unexpected table ${table}`);
      });

      await requireHealthPermission('health.hr_admin')({
        user: { id: holder },
        headers: { 'x-platform-reason': reason },
        query: {}
      } as any, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);

      next.mockClear();
      res.status.mockClear();
      await requireGuardianLink('can_view_coverage')({
        user: { id: holder },
        params: { studentId: 'student-123' }
      } as any, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('classifies suspended and revoked entitlements as non-authorizing diagnostics', () => {
      expect(classifyDurableEntitlementRows([
        { permission: 'platform.providers.manage', suspended_at: null, revoked_at: null },
        { permission: 'platform.plans.manage', suspended_at: '2026-10-26T12:00:00.000Z', revoked_at: null },
        { permission: 'platform.integration.health', suspended_at: null, revoked_at: '2026-10-26T12:00:00.000Z' }
      ])).toEqual([
        { permission: 'platform.providers.manage', status: 'active' },
        { permission: 'platform.plans.manage', status: 'suspended' },
        { permission: 'platform.integration.health', status: 'revoked' }
      ]);
    });

    it('creates the entitlement table without inserting a row or a financial permission', () => {
      const sql = fs.readFileSync(
        path.join(__dirname, '../supabase/migrations/20261026120000_hw_platform_entitlements.sql'),
        'utf8'
      );
      expect(sql).toContain(holder);
      expect(sql.toLowerCase()).not.toContain('insert into');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql.toLowerCase()).not.toMatch(/payout|settlement|withdrawal/);
      expect(sql).toContain('hw_platform_entitlements_holder_cannot_revoke');
      expect(sql).toContain('PROPOSED — NOT APPLIED');
    });
  });
});

