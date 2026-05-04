// backend/src/api/controllers/cash.controller.js
const { supabase } = require('../../config/supabase');

class CashController {
    /**
     * Open a new cash session
     */
    static async openSession(req, res) {
        const { expected_amount, metadata } = req.body;
        const tenant_id = req.user.tenantId;
        const user_id = req.user.userId;

        try {
            // Check for existing open session for this user
            const { data: open } = await supabase
                .from('cash_sessions')
                .select('id')
                .eq('tenant_id', tenant_id)
                .eq('opened_by', user_id)
                .eq('status', 'open')
                .maybeSingle();

            if (open) return res.status(400).json({ error: 'You already have an open session' });

            const { data, error } = await supabase
                .from('cash_sessions')
                .insert([{
                    tenant_id,
                    opened_by: user_id,
                    expected_amount,
                    metadata,
                    status: 'open'
                }])
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * Close an active cash session
     */
    static async closeSession(req, res) {
        const { id } = req.params;
        const { actual_amount, metadata } = req.body;
        const user_id = req.user.userId;

        try {
            const { data: session, error: fetchErr } = await supabase
                .from('cash_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchErr || !session) return res.status(404).json({ error: 'Session not found' });
            if (session.status === 'closed') return res.status(400).json({ error: 'Session already closed' });
            if (session.opened_by !== user_id) return res.status(403).json({ error: 'You can only close your own session' });

            const { data, error } = await supabase
                .from('cash_sessions')
                .update({
                    status: 'closed',
                    actual_amount,
                    closed_by: user_id,
                    closed_at: new Date(),
                    metadata: { ...session.metadata, ...metadata }
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = CashController;
