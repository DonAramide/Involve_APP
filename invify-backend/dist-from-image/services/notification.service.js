"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
// src/services/notification.service.ts
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const supabase_1 = require("../db/supabase");
const build_variant_1 = require("../config/build-variant");
function resolveFcmServiceAccountJson() {
    const inline = (process.env.FCM_SERVICE_ACCOUNT_JSON || '').trim();
    if (inline)
        return inline;
    const variant = build_variant_1.BuildVariantService.getInstance();
    const pathCandidates = [];
    const explicitPath = (process.env.FCM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
    if (explicitPath)
        pathCandidates.push(explicitPath);
    // Laptop staging: Windows cannot reliably store multiline JSON in .env files.
    if (variant.isStaging()) {
        pathCandidates.push(path.resolve(process.cwd(), 'firebase-staging-service-account.json'), path.resolve(process.cwd(), '..', 'firebase-staging-service-account.json'));
    }
    for (const candidate of pathCandidates) {
        const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
        if (!fs.existsSync(resolved))
            continue;
        console.log(`[NotificationService] Loaded FCM service account from ${resolved}`);
        return fs.readFileSync(resolved, 'utf8');
    }
    return '';
}
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        const serviceAccountStr = resolveFcmServiceAccountJson();
        let serviceAccount = {};
        if (serviceAccountStr) {
            serviceAccount = JSON.parse(serviceAccountStr);
        }
        if (Object.keys(serviceAccount).length === 0) {
            const variant = build_variant_1.BuildVariantService.getInstance();
            if (variant.isProd() || variant.isStaging()) {
                throw new Error('[NotificationService] Refusing to start: FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH is required in staging/production');
            }
            console.warn('[NotificationService] FCM_SERVICE_ACCOUNT_JSON is missing or empty.');
        }
        else {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('[NotificationService] Firebase Admin initialized.');
        }
    }
    catch (error) {
        console.error('[NotificationService] Failed to initialize Firebase Admin:', error);
        const variant = build_variant_1.BuildVariantService.getInstance();
        if (variant.isProd() || variant.isStaging()) {
            throw error; // Fail closed in prod/staging
        }
    }
}
const FCM_MULTICAST_LIMIT = 500;
class NotificationService {
    static isConfigured() {
        return admin.apps.length > 0;
    }
    /**
     * Sends an FCM multicast to registered device tokens.
     * Optional tenantId scopes tokens via users.tenant_id.
     */
    static async sendToFleet(options) {
        const title = options.title || 'Invify Broadcast';
        const body = options.body || '';
        if (!this.isConfigured()) {
            console.warn('[NotificationService] sendToFleet skipped: FCM is not configured.');
            return { configured: false, tokenCount: 0, successCount: 0, failureCount: 0 };
        }
        let tokens = [];
        try {
            if (options.tenantId) {
                const { data: users, error: userErr } = await supabase_1.supabase
                    .from('users')
                    .select('id')
                    .eq('tenant_id', options.tenantId);
                if (userErr)
                    throw userErr;
                const userIds = (users || []).map((u) => u.id).filter(Boolean);
                if (userIds.length === 0) {
                    return { configured: true, tokenCount: 0, successCount: 0, failureCount: 0 };
                }
                const { data: rows, error } = await supabase_1.supabase
                    .from('device_tokens')
                    .select('token')
                    .in('user_id', userIds);
                if (error)
                    throw error;
                tokens = (rows || []).map((r) => r.token).filter(Boolean);
            }
            else {
                const { data: rows, error } = await supabase_1.supabase.from('device_tokens').select('token');
                if (error)
                    throw error;
                tokens = (rows || []).map((r) => r.token).filter(Boolean);
            }
        }
        catch (error) {
            console.error('[NotificationService] sendToFleet token lookup failed:', error?.message || error);
            return { configured: true, tokenCount: 0, successCount: 0, failureCount: 0, error: error?.message };
        }
        if (tokens.length === 0) {
            console.log('[NotificationService] sendToFleet: no device tokens registered.');
            return { configured: true, tokenCount: 0, successCount: 0, failureCount: 0 };
        }
        let successCount = 0;
        let failureCount = 0;
        const data = options.data || {};
        const priority = options.priority || 'high';
        try {
            for (let i = 0; i < tokens.length; i += FCM_MULTICAST_LIMIT) {
                const chunk = tokens.slice(i, i + FCM_MULTICAST_LIMIT);
                const message = {
                    tokens: chunk,
                    notification: { title, body },
                    data,
                    android: {
                        priority,
                        notification: { channelId: 'broadcasts' },
                    },
                };
                const response = await admin.messaging().sendEachForMulticast(message);
                successCount += response.successCount;
                failureCount += response.failureCount;
                if (response.failureCount > 0) {
                    await this._cleanupFailedTokens(chunk, response.responses);
                }
            }
        }
        catch (error) {
            console.error('[NotificationService] sendToFleet FCM error:', error?.message || error);
            return {
                configured: true,
                tokenCount: tokens.length,
                successCount,
                failureCount,
                error: error?.message,
            };
        }
        console.log(`[NotificationService] sendToFleet done: ${successCount} sent, ${failureCount} failed, ${tokens.length} tokens.`);
        return { configured: true, tokenCount: tokens.length, successCount, failureCount };
    }
    /**
     * Sends a push notification to a specific user and persists it in DB.
     */
    static async sendToUser(userId, title, body, data) {
        try {
            // 1. Persist in Database for In-App Notification Center
            await supabase_1.supabase.from('notifications').insert({
                user_id: userId,
                type: data?.type || 'general',
                message: body,
                metadata: data || {}
            });
            // 2. Fetch user's device tokens from DB
            const { data: tokens, error } = await supabase_1.supabase
                .from('device_tokens')
                .select('token')
                .eq('user_id', userId);
            if (error || !tokens || tokens.length === 0) {
                console.log(`[NotificationService] No device tokens found for user: ${userId}`);
                return;
            }
            // ...
            const fcmTokens = tokens.map(t => t.token);
            // 2. Prepare message
            const message = {
                tokens: fcmTokens,
                notification: { title, body },
                data: data || {},
                android: {
                    priority: 'high',
                    notification: { channelId: 'payments' },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };
            // 3. Send via FCM
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`[NotificationService] Sent ${response.successCount} messages, ${response.failureCount} failed.`);
            // Optional: Cleanup expired tokens
            if (response.failureCount > 0) {
                await this._cleanupFailedTokens(fcmTokens, response.responses);
            }
        }
        catch (error) {
            console.error('[NotificationService] FCM Error:', error);
        }
    }
    /**
     * Finds the school principal(s) and notifies them of a payment.
     */
    static async notifySchoolAdminOfPayment(schoolId, amount, studentName) {
        try {
            // 1. Find school admin (Principal role)
            const { data: admins, error } = await supabase_1.supabase
                .from('school_admins')
                .select('user_id')
                .eq('school_id', schoolId)
                .eq('role', 'principal');
            if (error || !admins || admins.length === 0) {
                console.log(`[NotificationService] No principals found for school: ${schoolId}`);
                return;
            }
            const formattedAmount = new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
            }).format(amount);
            const title = 'New Payment Received';
            const body = `${formattedAmount} from ${studentName}`;
            // 2. Send to each principal
            for (const admin of admins) {
                await this.sendToUser(admin.user_id, title, body, {
                    type: 'payment_received',
                    schoolId,
                });
            }
        }
        catch (error) {
            console.error('[NotificationService] Bulk notify error:', error);
        }
    }
    /**
     * Notifies school admin of a successful payout.
     */
    static async notifySchoolAdminOfPayoutSuccess(schoolId, amount) {
        const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
        const admins = await this._getPrincipals(schoolId);
        for (const admin of admins) {
            await this.sendToUser(admin.user_id, 'Payout Successful', `Your withdrawal of ${formattedAmount} has been processed.`, {
                type: 'payout.success',
                schoolId
            });
        }
    }
    /**
     * Notifies school admin of a failed payout.
     */
    static async notifySchoolAdminOfPayoutFailure(schoolId, amount) {
        const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
        const admins = await this._getPrincipals(schoolId);
        for (const admin of admins) {
            await this.sendToUser(admin.user_id, 'Payout Failed', `Withdrawal of ${formattedAmount} failed. Please check your settings.`, {
                type: 'payout.failed',
                schoolId
            });
        }
    }
    static async _getPrincipals(schoolId) {
        const { data: admins } = await supabase_1.supabase
            .from('school_admins')
            .select('user_id')
            .eq('school_id', schoolId)
            .eq('role', 'principal');
        return admins || [];
    }
    static async _cleanupFailedTokens(tokens, responses) {
        const tokensToRemove = [];
        responses.forEach((res, idx) => {
            if (!res.success && (res.error?.code === 'messaging/registration-token-not-registered' || res.error?.code === 'messaging/invalid-registration-token')) {
                tokensToRemove.push(tokens[idx]);
            }
        });
        if (tokensToRemove.length > 0) {
            await supabase_1.supabase
                .from('device_tokens')
                .delete()
                .in('token', tokensToRemove);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map