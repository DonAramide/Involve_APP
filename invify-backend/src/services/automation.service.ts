// src/services/automation.service.ts
import { supabase } from '../db/supabase';
import { NotificationService } from './notification.service';

export class AutomationService {
  /**
   * Identifies all students with outstanding balances across all schools
   * and sends reminders to parents/admins.
   */
  static async runWeeklyDefaulterReminders() {
    console.log('[Automation] Running weekly defaulter reminders...');
    
    try {
      // 1. Fetch all schools (tenants)
      const { data: schools } = await supabase.from('schools').select('id, name');
      
      if (!schools) return;

      for (const school of schools) {
        // 2. Fetch defaulters for this school
        const { data: defaulters } = await supabase
          .from('students')
          .select('id, first_name, last_name, running_balance, school_id')
          .eq('school_id', school.id)
          .lt('running_balance', 0);

        if (!defaulters || defaulters.length === 0) continue;

        // 3. Notify School Admins (Principal) of the weekly summary
        const totalDebt = defaulters.reduce((sum, s) => sum + Math.abs(Number(s.running_balance)), 0);
        const formattedDebt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalDebt);
        
        const admins = await (NotificationService as any)._getPrincipals(school.id);
        for (const admin of admins) {
          await NotificationService.sendToUser(
            admin.user_id, 
            'Weekly Defaulters Report', 
            `There are ${defaulters.length} students with outstanding fees totaling ${formattedDebt}.`,
            { type: 'student.owes', schoolId: school.id }
          );
        }
        
        // 4. In a real system, we'd also loop through defaulters and send SMS/Push to parents
        console.log(`[Automation] Notified school ${school.id} of ${defaulters.length} defaulters.`);
      }

    } catch (error) {
      console.error('[Automation] Error running weekly reminders:', error);
    }
  }
}
