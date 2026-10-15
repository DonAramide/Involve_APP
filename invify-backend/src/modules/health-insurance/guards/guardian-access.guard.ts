// invify-backend/src/modules/health-insurance/guards/guardian-access.guard.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../../db/supabase';

export type GuardianCapability = 
  | 'can_view_coverage' 
  | 'can_view_premiums' 
  | 'can_pay_premiums' 
  | 'can_manage_enrolment';

/**
 * Object-level guard for parents/guardians accessing linked child health records.
 */
export function requireGuardianLink(capability?: GuardianCapability) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } });
      }

      const studentId = req.params.studentId || req.body.studentId || (req.query.studentId as string);
      if (!studentId) {
        return res.status(400).json({ error: { code: 'STUDENT_ID_REQUIRED', message: 'Student ID is required' } });
      }

      // Query verified link
      let query = supabaseAdmin
        .from('hw_guardian_links')
        .select('*')
        .eq('student_id', studentId)
        .eq('guardian_user_id', user.id)
        .eq('status', 'verified');

      if (capability) {
        query = query.eq(capability, true);
      }

      const { data: link, error } = await query.maybeSingle();

      if (error || !link) {
        // Return 404 to avoid leaking existence of student records
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Student record not found or access not permitted'
          }
        });
      }

      // Attach tenant from verified link
      req.healthContext = {
        tenantId: link.tenant_id,
        userId: user.id,
        permissions: ['guardian.access'],
        isPlatformOperator: false,
        isGuardian: true,
        guardianStudentIds: [studentId]
      };

      next();
    } catch (err: any) {
      console.error('[GuardianAccessGuard] Exception:', err?.message || err);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to verify guardian link' } });
    }
  };
}
