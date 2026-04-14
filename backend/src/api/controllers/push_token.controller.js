// backend/src/api/controllers/push_token.controller.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Registers or updates a device token for a user.
 */
async function registerPushToken(req, res) {
    const { userId, token, platform } = req.body;

    if (!userId || !token) {
        return res.status(400).json({ error: 'userId and token are required' });
    }

    try {
        const { error } = await supabase
            .from('push_tokens')
            .upsert(
                { 
                    user_id: userId, 
                    token: token, 
                    platform: platform,
                    last_updated_at: new Date()
                },
                { onConflict: 'token' }
            );

        if (error) throw error;

        return res.status(200).json({ message: 'Token registered successfully' });
    } catch (err) {
        console.error('Push Token Registration Error:', err);
        return res.status(500).json({ error: 'Failed to register token' });
    }
}

module.exports = { registerPushToken };
