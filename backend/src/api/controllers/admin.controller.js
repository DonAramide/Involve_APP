// backend/src/api/controllers/admin.controller.js
const AuthService = require('../../services/auth.service');
const QuaserService = require('../../services/quaser.service');
const { supabase } = require('../../config/supabase');

class AdminController {
    /**
     * Fetch all Tenants
     */
    static async getTenants(req, res) {
        try {
            const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Create new Tenant
     */
    static async createTenant(req, res) {
        try {
            const { name, type, plan } = req.body;
            const { data, error } = await supabase.from('tenants').insert([
                { name, type, plan: plan || 'free' }
            ]).select();
            if (error) throw error;
            res.json(data[0]);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Fetch all Users (Staff) mapped with Tenants
     */
    static async getUsers(req, res) {
        try {
            let query = supabase.from('users').select('*, tenants(name)');
            if (req.query.tenantId && req.query.tenantId !== 'null') {
                query = query.eq('tenant_id', req.query.tenantId);
            }
            const { data, error } = await query;
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Fetch Ledger Entries
     */
    static async getLedger(req, res) {
        try {
            let query = supabase.from('ledger_entries').select('*, tenants(name)').order('created_at', { ascending: false });
            if (req.query.tenantId && req.query.tenantId !== 'null') {
                query = query.eq('tenant_id', req.query.tenantId);
            }
            if (req.query.reference && req.query.reference !== '') {
                query = query.ilike('reference', `%${req.query.reference}%`);
            }
            const { data, error } = await query.limit(50);
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Fetch Dashboard Stats for Analytics
     */
    static async getDashboardStats(req, res) {
        try {
            // Simulated aggregated metrics for UI rendering
            const metrics = {
                active_teachers_7d: 12,
                total_teachers: 35,
                total_notes: 124
            };
            
            const billing = {
                percentage: 65,
                plan: "basic"
            };

            const timeseries = [
                { display_date: '2026-04-16T00:00:00Z', notes_count: 5 },
                { display_date: '2026-04-17T00:00:00Z', notes_count: 12 },
                { display_date: '2026-04-18T00:00:00Z', notes_count: 8 },
                { display_date: '2026-04-19T00:00:00Z', notes_count: 15 },
                { display_date: '2026-04-20T00:00:00Z', notes_count: 22 },
                { display_date: '2026-04-21T00:00:00Z', notes_count: 18 },
                { display_date: '2026-04-22T00:00:00Z', notes_count: 30 }
            ];

            const subjects = [
                { subject: "Mathematics", note_count: 45 },
                { subject: "English", note_count: 38 },
                { subject: "Basic Science", note_count: 24 },
                { subject: "Civic Ed.", note_count: 17 }
            ];

            res.json({ metrics, billing, timeseries, subjects });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Enter Master Mode (Verify PWD/OTP -> Return Elevated Token)
     */
    static async enterMasterMode(req, res) {
        const { password, otp } = req.body;
        const userId = req.user.userId;

        try {
            const elevatedToken = await AuthService.enterMasterMode(userId, password, otp);
            
            // Record Audit Log
            await supabase.from('audit_logs').insert([{
                user_id: userId,
                action: 'MASTER_MODE_ENTER',
                resource_type: 'AUTH',
                resource_id: userId,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                is_master_mode: true
            }]);

            res.json({ token: elevatedToken });
        } catch (err) {
            res.status(401).json({ message: err.message });
        }
    }

    /**
     * API Key Management (Requires Master Mode token)
     */
    static async getApiKeys(req, res) {
        try {
            const quaserId = await QuaserService.getQuaserId(req.user.tenantId);
            const keys = await QuaserService.getTransactions(quaserId); // Simulated key list
            res.json({ keys });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    static async createApiKey(req, res) {
        if (!req.user.isMasterMode) {
            return res.status(403).json({ message: 'Master Mode required for this action' });
        }

        const { label } = req.body;
        try {
            const quaserId = await QuaserService.getQuaserId(req.user.tenantId);
            const key = await QuaserService.createApiKey(quaserId, label);

            await supabase.from('audit_logs').insert([{
                user_id: req.user.userId,
                action: 'API_KEY_CREATE',
                resource_type: 'SECURITY',
                resource_id: req.user.tenantId,
                ip_address: req.ip,
                is_master_mode: true,
                metadata: { label }
            }]);

            res.json(key);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    static async revokeApiKey(req, res) {
        if (!req.user.isMasterMode) {
            return res.status(403).json({ message: 'Master Mode required for this action' });
        }

        const { id } = req.params;
        try {
            const quaserId = await QuaserService.getQuaserId(req.user.tenantId);
            await QuaserService.revokeApiKey(quaserId, id);

            await supabase.from('audit_logs').insert([{
                user_id: req.user.userId,
                action: 'API_KEY_REVOKE',
                resource_type: 'SECURITY',
                resource_id: req.user.tenantId,
                ip_address: req.ip,
                is_master_mode: true,
                metadata: { keyId: id }
            }]);

            res.json({ message: 'API key revoked' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    /**
     * Audit Log Retrieval
     */
    static async getAuditLogs(req, res) {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('school_id', req.user.tenantId) // Basic filtering
                .order('timestamp', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = AdminController;
