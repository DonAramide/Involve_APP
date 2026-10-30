/**
 * HMO workflow notifications via existing NotificationService.
 * Soft-fails when FCM/tokens are unavailable — never blocks the primary mutation.
 */
import { NotificationService } from '../../../services/notification.service';
import { supabaseAdmin } from '../../../db/supabase';

export type HealthNotificationKind =
  | 'provider.registered'
  | 'provider.approved'
  | 'provider.rejected'
  | 'provider.suspended'
  | 'provider.reactivated'
  | 'affiliation.requested'
  | 'affiliation.updated'
  | 'enrolment.created'
  | 'enrolment.status_changed'
  | 'coverage.activated'
  | 'claim.submitted'
  | 'claim.approved'
  | 'claim.rejected'
  | 'claim.settled'
  | 'admin.action';

export class HealthNotificationService {
  static async notifyUser(
    userId: string | null | undefined,
    kind: HealthNotificationKind,
    title: string,
    body: string,
    metadata: Record<string, string> = {}
  ): Promise<void> {
    if (!userId) return;
    try {
      await NotificationService.sendToUser(userId, title, body, {
        type: kind,
        module: 'health-insurance',
        ...metadata
      });
    } catch (err: any) {
      console.warn(`[HealthNotificationService] ${kind} notify failed:`, err?.message || err);
    }
  }

  static async notifyTenantAdmins(
    tenantId: string,
    kind: HealthNotificationKind,
    title: string,
    body: string,
    metadata: Record<string, string> = {}
  ): Promise<void> {
    // Soft-fail only: never rethrow into claim/finance/enrolment mutations.
    // Recipient roles match public.users.role values used across Invify tenant admin flows.
    try {
      const { data: admins, error } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('role', ['owner', 'admin', 'tenant_admin', 'finance_staff', 'school_admin']);
      if (error) {
        console.warn(`[HealthNotificationService] recipient lookup failed:`, error.message);
        return;
      }
      const ids = [...new Set((admins || []).map((r: any) => r.id).filter(Boolean))];
      for (const id of ids) {
        await this.notifyUser(id, kind, title, body, { ...metadata, tenantId });
      }
      if (!ids.length) {
        try {
          await NotificationService.sendToFleet({
            title,
            body,
            tenantId,
            data: { type: kind, module: 'health-insurance', ...metadata }
          });
        } catch (fleetErr: any) {
          console.warn(`[HealthNotificationService] fleet notify failed:`, fleetErr?.message || fleetErr);
        }
      }
    } catch (err: any) {
      console.warn(`[HealthNotificationService] tenant notify failed:`, err?.message || err);
    }
  }

  static async notifyPlatformActor(
    actorUserId: string | null | undefined,
    kind: HealthNotificationKind,
    title: string,
    body: string,
    metadata: Record<string, string> = {}
  ): Promise<void> {
    return this.notifyUser(actorUserId, kind, title, body, metadata);
  }
}
