// src/controllers/referral.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { ReferralService, ReferralNotificationService } from '../services/referral.service';

export class ReferralController {
  /**
   * GET /referrals/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      const { tenantId } = (req as any).user;

      const [referralsRaw, tenant] = await Promise.all([
        supabase.from('referrals').select('*').eq('referrer_tenant_id', tenantId),
        supabase.from('tenants').select('bonus_quota, referral_code').eq('id', tenantId).single()
      ]);

      const referrals = referralsRaw.data || [];
      
      return res.status(200).json({
        code: tenant.data?.referral_code,
        bonusQuota: tenant.data?.bonus_quota || 0,
        totalInvited: referrals.length,
        totalJoined: referrals.filter(r => r.status === 'joined').length,
        totalRewarded: referrals.filter(r => r.reward_applied).length,
        history: referrals
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /referrals/send
   */
  static async sendInvite(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const { tenantId } = (req as any).user;

      // 1. Create Referral Entry
      const { error } = await supabase
        .from('referrals')
        .insert({
          referrer_tenant_id: tenantId,
          invited_email: email,
          status: 'pending'
        });

      if (error && error.code !== '23505') throw error; // Ignore duplicates

      // 2. Fetch Data for Email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, referral_code')
        .eq('id', tenantId)
        .single();

      // 3. Send Notification
      const appUrl = process.env.APP_URL || 'https://invify.app';
      const referralLink = `${appUrl}/#/onboarding?ref=${tenant?.referral_code}`;

      await ReferralNotificationService.sendInvite(tenant?.name || 'A School', email, referralLink);

      return res.status(200).json({ 
        message: 'Invitation sent successfully',
        referralLink: process.env.NODE_ENV === 'development' ? referralLink : undefined
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
