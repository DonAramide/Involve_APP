export declare class ReferralService {
    /**
     * Links a new tenant to their referrer via a referral code.
     * Self-referral block: Prevent same email or same tenant cross-linking.
     */
    static trackSignup(newTenantId: string, adminEmail: string, referralCode: string): Promise<void>;
    /**
     * Applies the growth bonus to the referrer.
     * Triggered after the referred school's Activation Milestone.
     */
    static applyReward(newTenantId: string): Promise<void>;
}
/**
 * Simulated Notification for referral invites.
 */
export declare class ReferralNotificationService {
    static sendInvite(fromSchool: string, toEmail: string, referralLink: string): Promise<void>;
}
