"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralController = void 0;
const supabase_1 = require("../db/supabase");
const referral_service_1 = require("../services/referral.service");
class ReferralController {
    /**
     * GET /referrals/stats
     */
    static async getStats(req, res) {
        try {
            const { tenantId } = req.user;
            const [referralsRaw, tenant] = await Promise.all([
                supabase_1.supabase.from('referrals').select('*').eq('referrer_tenant_id', tenantId),
                supabase_1.supabase.from('tenants').select('bonus_quota, referral_code').eq('id', tenantId).single()
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
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /referrals/send
     */
    static async sendInvite(req, res) {
        try {
            const { email } = req.body;
            const { tenantId } = req.user;
            // 1. Create Referral Entry
            const { error } = await supabase_1.supabase
                .from('referrals')
                .insert({
                referrer_tenant_id: tenantId,
                invited_email: email,
                status: 'pending'
            });
            if (error && error.code !== '23505')
                throw error; // Ignore duplicates
            // 2. Fetch Data for Email
            const { data: tenant } = await supabase_1.supabase
                .from('tenants')
                .select('name, referral_code')
                .eq('id', tenantId)
                .single();
            // 3. Send Notification
            const appUrl = process.env.APP_URL || 'https://IIPS.app';
            const referralLink = `${appUrl}/#/onboarding?ref=${tenant?.referral_code}`;
            await referral_service_1.ReferralNotificationService.sendInvite(tenant?.name || 'A School', email, referralLink);
            const variantService = require('../config/build-variant').BuildVariantService.getInstance();
            return res.status(200).json({
                message: 'Invitation sent successfully',
                referralLink: variantService.isLocal() ? referralLink : undefined
            });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.ReferralController = ReferralController;
//# sourceMappingURL=referral.controller.js.map