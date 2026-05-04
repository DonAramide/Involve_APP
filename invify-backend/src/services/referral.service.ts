// src/services/referral.service.ts
import { supabase } from '../db/supabase';

export class ReferralService {
  /**
   * Links a new tenant to their referrer via a referral code.
   * Self-referral block: Prevent same email or same tenant cross-linking.
   */
  static async trackSignup(newTenantId: string, adminEmail: string, referralCode: string) {
    try {
      // 1. Fetch Referrer
      const { data: referrer } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('referral_code', referralCode)
        .single();

      if (!referrer) return; // Invalid code, ignore

      // 2. Self-Referral Protection
      // Check if referrer's owner has the same email
      const { data: referrerAdmin } = await supabase
        .from('users')
        .select('email')
        .eq('tenant_id', referrer.id)
        .eq('role', 'owner')
        .single();

      if (referrerAdmin?.email === adminEmail) {
        console.warn(`[Referral] Blocked self-referral for ${adminEmail}`);
        return;
      }

      // 3. Update New Tenant with Attribution
      await supabase
        .from('tenants')
        .update({ referred_by_id: referrer.id })
        .eq('id', newTenantId);

      // 4. Update Referral Record Status
      await supabase
        .from('referrals')
        .update({ status: 'joined' })
        .match({ referrer_tenant_id: referrer.id, invited_email: adminEmail });

      console.log(`[Referral] Successfully attributed School to ${referrer.name}`);
    } catch (error: any) {
      console.error('[ReferralService] trackSignup Error:', error.message);
    }
  }

  /**
   * Applies the growth bonus to the referrer.
   * Triggered after the referred school's Activation Milestone.
   */
  static async applyReward(newTenantId: string) {
    try {
      // 1. Find Referrer
      const { data: tenant } = await supabase
        .from('tenants')
        .select('referred_by_id, name')
        .eq('id', newTenantId)
        .single();

      if (!tenant?.referred_by_id) return;

      // 2. Check if reward already applied
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, reward_applied')
        .eq('referrer_tenant_id', tenant.referred_by_id)
        .eq('status', 'joined')
        .eq('reward_applied', false)
        .limit(1)
        .maybeSingle();

      if (!referral) return;

      // 3. Atomically Increment Bonus Quota
      // We use RPC or raw SQL for atomic increment
      await supabase.rpc('increment_bonus_quota', { 
        t_id: tenant.referred_by_id, 
        amount: 50 
      });

      // 4. Mark Referral as Rewarded
      await supabase
        .from('referrals')
        .update({ reward_applied: true })
        .eq('id', referral.id);

      console.log(`[Referral] 🎁 Reward Applied! +50 AI Credits to Referrer of ${tenant.name}`);
    } catch (error: any) {
      console.error('[ReferralService] applyReward Error:', error.message);
    }
  }
}

/**
 * Mock Notification for referral invites.
 */
export class ReferralNotificationService {
  static async sendInvite(fromSchool: string, toEmail: string, referralLink: string) {
    console.log(`
      --------------------------------------------------
      🚀 [DEEP GROWTH] Invite From: ${fromSchool}
      To: ${toEmail}
      
      Hi! ${fromSchool} thinks you'll love Invify.
      Join the digital education revolution in Nigeria!
      
      Signup here to get started:
      ${referralLink}
      --------------------------------------------------
    `);
  }
}
