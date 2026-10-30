"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireGuardianLink = requireGuardianLink;
const supabase_1 = require("../../../db/supabase");
/**
 * Object-level guard for parents/guardians accessing linked child health records.
 */
function requireGuardianLink(capability) {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user || !user.id) {
                return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } });
            }
            const studentId = req.params.studentId || req.body.studentId || req.query.studentId;
            if (!studentId) {
                return res.status(400).json({ error: { code: 'STUDENT_ID_REQUIRED', message: 'Student ID is required' } });
            }
            // Query verified link
            let query = supabase_1.supabaseAdmin
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
        }
        catch (err) {
            console.error('[GuardianAccessGuard] Exception:', err?.message || err);
            return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to verify guardian link' } });
        }
    };
}
//# sourceMappingURL=guardian-access.guard.js.map