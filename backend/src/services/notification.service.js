// backend/src/services/notification.service.js
const admin = require('firebase-admin');
const { supabase } = require('../config/supabase');

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error.message);
    }
}

/**
 * Sends a push notification to all devices registered to a specific user.
 */
async function sendPushToUser(userId, { title, body, data = {} }) {
    try {
        // 1. Fetch tokens for user
        const { data: tokens, error } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', userId);

        if (error || !tokens || tokens.length === 0) {
            console.log(`No push tokens found for user ${userId}`);
            return;
        }

        const registrationTokens = tokens.map(t => t.token);

        // 2. Build Message
        const message = {
            notification: { title, body },
            data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            tokens: registrationTokens,
        };

        // 3. Send via FCM
        const response = await admin.messaging().sendMulticast(message);
        console.log(`Successfully sent ${response.successCount} notifications for user ${userId}`);

        // 4. Cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        failedTokens.push(registrationTokens[idx]);
                    }
                }
            });

            if (failedTokens.length > 0) {
                await supabase
                    .from('push_tokens')
                    .delete()
                    .in('token', failedTokens);
                console.log(`Cleaned up ${failedTokens.length} invalid tokens`);
            }
        }

        return response;
    } catch (error) {
        console.error('Error in sendPushToUser:', error);
    }
}

module.exports = { sendPushToUser };
