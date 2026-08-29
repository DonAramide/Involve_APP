// src/services/notification.service.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../db/supabase';

import { BuildVariantService } from '../config/build-variant';

function resolveFcmServiceAccountJson(): string {
  const inline = (process.env.FCM_SERVICE_ACCOUNT_JSON || '').trim();
  if (inline) return inline;

  const variant = BuildVariantService.getInstance();
  const pathCandidates: string[] = [];
  const explicitPath = (process.env.FCM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (explicitPath) pathCandidates.push(explicitPath);

  // Laptop staging: Windows cannot reliably store multiline JSON in .env files.
  if (variant.isStaging()) {
    pathCandidates.push(
      path.resolve(process.cwd(), 'firebase-staging-service-account.json'),
      path.resolve(process.cwd(), '..', 'firebase-staging-service-account.json'),
    );
  }

  for (const candidate of pathCandidates) {
    const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
    if (!fs.existsSync(resolved)) continue;
    console.log(`[NotificationService] Loaded FCM service account from ${resolved}`);
    return fs.readFileSync(resolved, 'utf8');
  }

  return '';
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountStr = resolveFcmServiceAccountJson();
    let serviceAccount: any = {};
    if (serviceAccountStr) {
      serviceAccount = JSON.parse(serviceAccountStr);
    }
    if (Object.keys(serviceAccount).length === 0) {
      const variant = BuildVariantService.getInstance();
      if (variant.isProd() || variant.isStaging()) {
        throw new Error(
          '[NotificationService] Refusing to start: FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH is required in staging/production',
        );
      }
      console.warn('[NotificationService] FCM_SERVICE_ACCOUNT_JSON is missing or empty.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[NotificationService] Firebase Admin initialized.');
    }
  } catch (error) {
    console.error('[NotificationService] Failed to initialize Firebase Admin:', error);
    const variant = BuildVariantService.getInstance();
    if (variant.isProd() || variant.isStaging()) {
      throw error; // Fail closed in prod/staging
    }
  }
}

export class NotificationService {
  /**
   * Sends a push notification to a specific user and persists it in DB.
   */
  static async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    try {
      // 1. Persist in Database for In-App Notification Center
      await supabase.from('notifications').insert({
        user_id: userId,
        type: data?.type || 'general',
        message: body,
        metadata: data || {}
      });

      // 2. Fetch user's device tokens from DB
      const { data: tokens, error } = await supabase
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
      const message: admin.messaging.MulticastMessage = {
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

    } catch (error) {
      console.error('[NotificationService] FCM Error:', error);
    }
  }

  /**
   * Finds the school principal(s) and notifies them of a payment.
   */
  static async notifySchoolAdminOfPayment(schoolId: string, amount: number, studentName: string) {
    try {
      // 1. Find school admin (Principal role)
      const { data: admins, error } = await supabase
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
    } catch (error) {
      console.error('[NotificationService] Bulk notify error:', error);
    }
  }

  /**
   * Notifies school admin of a successful payout.
   */
  static async notifySchoolAdminOfPayoutSuccess(schoolId: string, amount: number) {
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
  static async notifySchoolAdminOfPayoutFailure(schoolId: string, amount: number) {
    const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    const admins = await this._getPrincipals(schoolId);
    for (const admin of admins) {
      await this.sendToUser(admin.user_id, 'Payout Failed', `Withdrawal of ${formattedAmount} failed. Please check your settings.`, {
        type: 'payout.failed',
        schoolId
      });
    }
  }

  private static async _getPrincipals(schoolId: string) {
    const { data: admins } = await supabase
      .from('school_admins')
      .select('user_id')
      .eq('school_id', schoolId)
      .eq('role', 'principal');
    return admins || [];
  }

  private static async _cleanupFailedTokens(tokens: string[], responses: admin.messaging.SendResponse[]) {
    const tokensToRemove: string[] = [];
    responses.forEach((res, idx) => {
      if (!res.success && (res.error?.code === 'messaging/registration-token-not-registered' || res.error?.code === 'messaging/invalid-registration-token')) {
        tokensToRemove.push(tokens[idx]);
      }
    });

    if (tokensToRemove.length > 0) {
      await supabase
        .from('device_tokens')
        .delete()
        .in('token', tokensToRemove);
    }
  }
}
