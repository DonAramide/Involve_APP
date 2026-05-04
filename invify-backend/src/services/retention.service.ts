// src/services/retention.service.ts
import { supabase } from '../db/supabase';

export class RetentionService {
  /**
   * Main scan to identify inactive teachers and schools.
   * Thresholds: 2d (gentle), 5d (warning), 10d (re-engagement).
   */
  static async scanAndNudge() {
    console.log('[Retention] Starting inactivity scan...');
    const now = new Date();
    
    // 1. Identify Inactive Users (Teachers/Admins)
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, tenant_id, last_active_at, role, tenants(name)')
      .lt('last_active_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()); // At least 2 days old

    if (!users) return;

    for (const user of users) {
      const daysInactive = Math.floor((now.getTime() - new Date(user.last_active_at).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysInactive >= 10) {
        await this.triggerMilestone(user, '10_day_reengagement');
      } else if (daysInactive >= 5) {
        await this.triggerMilestone(user, '5_day_warning');
      } else if (daysInactive >= 2) {
        await this.triggerMilestone(user, '2_day_nudge');
      }
    }
  }

  private static async triggerMilestone(user: any, milestone: string) {
    // 1. Check if already notified for this milestone
    const { data: existing } = await supabase
      .from('retention_checkpoints')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone', milestone)
      .maybeSingle();

    if (existing) return; // Already nudged

    // 2. Log conversion signal/Nudge
    console.log(`[Retention] 🚀 Nudging ${user.name} (${user.role}) @ ${user.tenants.name} - Milestone: ${milestone}`);
    
    // 3. Mock Email dispatch
    await this.sendEmail(user, milestone);

    // 4. Record Checkpoint
    await supabase.from('retention_checkpoints').insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      milestone: milestone
    });
  }

  private static async sendEmail(user: any, milestone: string) {
    const schoolName = user.tenants.name;
    const nextAction = await this.getSmartSuggestion(user.tenant_id);

    let subject = "";
    let body = "";

    if (milestone === '2_day_nudge') {
      subject = "Continue your progress on Invify";
      body = `Hi ${user.name}, your lesson notes for ${schoolName} are waiting! Why not ${nextAction.toLowerCase()} today?`;
    } else if (milestone === '5_day_warning') {
      subject = "Your teachers haven't generated notes this week";
      body = `Hello ${user.name}, we noticed a drop in activity at ${schoolName}. Keep the momentum going! Recommended next action: ${nextAction}.`;
    } else {
      subject = "We miss you at ${schoolName}";
      body = `It's been 10 days since your last activity. Invify works best when used consistently. Come back and ${nextAction.toLowerCase()} to stay on track.`;
    }

    console.log(`
      ╔════════════════════════════════════════════════════════════════════╗
      ║  [RETENTION EMAIL: ${milestone.toUpperCase()}]                      ║
      ╚════════════════════════════════════════════════════════════════════╝
      To: ${user.email}
      Subject: ${subject}
      
      ${body}
      
      Link: ${process.env.APP_URL || 'http://localhost:9000'}/#/admin/dashboard
      ----------------------------------------------------------------------
    `);
  }

  /**
   * Generates a "Next Action" suggestion based on curriculum timing.
   */
  static async getSmartSuggestion(tenantId: string): Promise<string> {
    // Logic: Look at last note generated, suggest the code for NEXT week
    const { data: lastNote } = await supabase
      .from('lesson_notes')
      .select('subject, class_level, term, week')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastNote) return "Generate your first lesson note";

    const nextWeek = lastNote.week + 1;
    return `Generate ${lastNote.subject} note for ${lastNote.class_level} (Week ${nextWeek})`;
  }
}
