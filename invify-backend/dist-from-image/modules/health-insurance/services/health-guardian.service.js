"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthGuardianService = void 0;
// invify-backend/src/modules/health-insurance/services/health-guardian.service.ts
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../../../db/supabase");
const health_audit_service_1 = require("./health-audit.service");
class HealthGuardianService {
    /**
     * Issue an invitation to link a parent or guardian to a student.
     */
    static async inviteGuardian(ctx, params) {
        // 1. Verify student exists and belongs to tenant
        const { data: student, error: stuErr } = await supabase_1.supabaseAdmin
            .from('students')
            .select('id, tenant_id, school_id, first_name, last_name')
            .eq('id', params.studentId)
            .maybeSingle();
        if (stuErr || !student)
            throw new Error('Student not found');
        const stuTenant = student.tenant_id || student.school_id;
        if (stuTenant !== ctx.tenantId)
            throw new Error('Cross-tenant link rejected');
        // 2. Create link record with status 'invited'
        const { data: link, error: linkErr } = await supabase_1.supabaseAdmin
            .from('hw_guardian_links')
            .insert({
            tenant_id: ctx.tenantId,
            student_id: params.studentId,
            relationship: params.relationship,
            status: 'invited',
            is_primary: !!params.isPrimary,
            can_view_coverage: false,
            can_view_premiums: false,
            can_pay_premiums: false,
            can_manage_enrolment: false,
            created_by: ctx.userId
        })
            .select()
            .single();
        if (linkErr)
            throw new Error(`Failed to create guardian link: ${linkErr.message}`);
        // 3. Generate secure 32-byte token and hash
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiration
        const { data: invitation, error: invErr } = await supabase_1.supabaseAdmin
            .from('hw_guardian_invitations')
            .insert({
            tenant_id: ctx.tenantId,
            link_id: link.id,
            token_hash: tokenHash,
            channel: params.channel,
            contact_value: params.contactValue,
            status: 'sent',
            expires_at: expiresAt.toISOString(),
            created_by: ctx.userId
        })
            .select()
            .single();
        if (invErr)
            throw new Error(`Failed to create invitation: ${invErr.message}`);
        await health_audit_service_1.HealthAuditService.log({
            tenantId: ctx.tenantId,
            actorUserId: ctx.userId,
            action: 'guardian.invited',
            resourceType: 'hw_guardian_links',
            resourceId: link.id,
            changes: { studentId: params.studentId, relationship: params.relationship, channel: params.channel }
        });
        return {
            linkId: link.id,
            invitationId: invitation.id,
            rawToken, // Sent to user via communication rail
            expiresAt: expiresAt.toISOString()
        };
    }
    /**
     * Accept an invitation using the authenticated user identity.
     * State transitions to 'pending_verification'. Access to health records remains BLOCKED.
     */
    static async acceptInvitation(userId, rawToken) {
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        // 1. Fetch valid invitation
        const { data: inv, error: invErr } = await supabase_1.supabaseAdmin
            .from('hw_guardian_invitations')
            .select('id, tenant_id, link_id, status, expires_at')
            .eq('token_hash', tokenHash)
            .eq('status', 'sent')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
        if (invErr || !inv) {
            throw new Error('Invalid or expired invitation token');
        }
        // 2. Update guardian link with user ID and transition to pending_verification
        const { data: link, error: linkErr } = await supabase_1.supabaseAdmin
            .from('hw_guardian_links')
            .update({
            guardian_user_id: userId,
            status: 'pending_verification',
            updated_at: new Date().toISOString()
        })
            .eq('id', inv.link_id)
            .select('*, students(first_name, last_name, admission_number)')
            .single();
        if (linkErr)
            throw new Error(`Failed to bind guardian identity: ${linkErr.message}`);
        // 3. Mark invitation as accepted and purge raw contact value
        await supabase_1.supabaseAdmin
            .from('hw_guardian_invitations')
            .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by_user: userId,
            contact_value: null // Privacy: purge plain contact value on accept
        })
            .eq('id', inv.id);
        await health_audit_service_1.HealthAuditService.log({
            tenantId: inv.tenant_id,
            actorUserId: userId,
            action: 'guardian.invitation_accepted',
            resourceType: 'hw_guardian_links',
            resourceId: link.id,
            changes: { newStatus: 'pending_verification' }
        });
        return {
            linkId: link.id,
            status: link.status,
            studentName: `${link.students?.first_name} ${link.students?.last_name}`
        };
    }
    /**
     * Verify relationship by an authorized school administrator.
     * Transitions status to 'verified' and assigns explicit capability flags.
     */
    static async verifyRelationship(ctx, linkId, params) {
        if (params.decision === 'reject') {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('hw_guardian_links')
                .update({
                status: 'rejected',
                status_reason: params.reason || 'Verification rejected by administrator',
                updated_at: new Date().toISOString()
            })
                .eq('id', linkId)
                .eq('tenant_id', ctx.tenantId)
                .select()
                .single();
            if (error)
                throw new Error(`Failed to reject link: ${error.message}`);
            return data;
        }
        if (!params.verificationMethod) {
            throw new Error('Verification method is required when approving a guardian link');
        }
        const { data: updated, error: updErr } = await supabase_1.supabaseAdmin
            .from('hw_guardian_links')
            .update({
            status: 'verified',
            verification_method: params.verificationMethod,
            verified_by: ctx.userId,
            verified_at: new Date().toISOString(),
            status_reason: params.reason || null,
            can_view_coverage: params.capabilities?.canViewCoverage ?? true,
            can_view_premiums: params.capabilities?.canViewPremiums ?? true,
            can_pay_premiums: params.capabilities?.canPayPremiums ?? true,
            can_manage_enrolment: params.capabilities?.canManageEnrolment ?? false,
            updated_at: new Date().toISOString()
        })
            .eq('id', linkId)
            .eq('tenant_id', ctx.tenantId)
            .select()
            .single();
        if (updErr)
            throw new Error(`Failed to verify guardian link: ${updErr.message}`);
        await health_audit_service_1.HealthAuditService.log({
            tenantId: ctx.tenantId,
            actorUserId: ctx.userId,
            action: 'guardian.verified',
            resourceType: 'hw_guardian_links',
            resourceId: linkId,
            changes: {
                verificationMethod: params.verificationMethod,
                capabilities: params.capabilities
            }
        });
        return updated;
    }
    /**
     * List children linked to the authenticated guardian.
     */
    static async listGuardianChildren(userId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('hw_guardian_links')
            .select(`
        id,
        relationship,
        status,
        can_view_coverage,
        can_view_premiums,
        can_pay_premiums,
        can_manage_enrolment,
        students (
          id,
          first_name,
          last_name,
          admission_number,
          current_class,
          tenants (id, name)
        )
      `)
            .eq('guardian_user_id', userId)
            .eq('status', 'verified');
        if (error)
            throw new Error(`Failed to list linked children: ${error.message}`);
        return data || [];
    }
}
exports.HealthGuardianService = HealthGuardianService;
//# sourceMappingURL=health-guardian.service.js.map