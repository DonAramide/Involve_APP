"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportController = void 0;
const supabase_1 = require("../db/supabase");
const constants_1 = require("../config/constants");
function isOfflineMode() {
    return (0, constants_1.isMockAuthAllowed)();
}
class SupportController {
    /**
     * POST /api/mobile/complaints
     * Submit a new complaint from mobile app
     */
    static async createComplaint(req, res) {
        try {
            const { title, description, category, urgency, tenant_id, tenant_name, device_id, incident_date, attachment_url } = req.body;
            const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
            let resolvedTenantId = null;
            let resolvedTenantCode = null;
            // tenant_code Consistency Rule:
            // If tenant_id is present, resolve tenant_code from tenants table database record.
            // Do not accept client-provided tenant_code values.
            if (tenant_id && tenant_id !== 'unknown' && tenant_id.trim() !== '') {
                const { data: tenantData } = await supabase_1.supabaseAdmin
                    .from('tenants')
                    .select('tenant_code')
                    .eq('id', tenant_id)
                    .maybeSingle();
                if (tenantData) {
                    resolvedTenantId = tenant_id;
                    resolvedTenantCode = tenantData.tenant_code;
                }
            }
            const cleanDeviceId = (device_id && device_id !== 'unknown' && device_id.trim() !== '') ? device_id : null;
            const newComplaint = {
                id: ticketId,
                title,
                description,
                category: category || 'general',
                urgency: urgency || 'normal',
                status: 'pending',
                tenant_id: resolvedTenantId,
                tenant_code: resolvedTenantCode,
                tenant_name: tenant_name || null,
                device_id: cleanDeviceId,
                incident_date: incident_date || null,
                attachment_url: attachment_url || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (isOfflineMode()) {
                return res.status(201).json({ success: true, data: newComplaint });
            }
            // Insert directly into complaints database table
            const { data, error } = await supabase_1.supabaseAdmin
                .from('complaints')
                .insert([newComplaint])
                .select()
                .single();
            if (error) {
                throw error;
            }
            return res.status(201).json({ success: true, data });
        }
        catch (err) {
            console.error('[createComplaint] error:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * GET /api/admin/complaints
     * List all complaints for Web Admin
     */
    static async listComplaints(req, res) {
        if (isOfflineMode()) {
            return res.json({ success: true, data: [] });
        }
        try {
            const { tenant_code } = req.query;
            let query = supabase_1.supabaseAdmin.from('complaints').select('*');
            if (tenant_code && typeof tenant_code === 'string') {
                query = query.eq('tenant_code', tenant_code);
            }
            const { data: complaintsData, error: cError } = await query;
            if (cError)
                throw cError;
            // Fetch Agent support tickets
            const { data: supportTicketsData } = await supabase_1.supabaseAdmin.from('support_tickets').select('*');
            // Adapt support_tickets to match complaints structure for merging:
            const adaptedSupportTickets = (supportTicketsData || []).map((t) => ({
                id: t.id,
                title: t.subject,
                description: t.description,
                category: 'Agent Support',
                urgency: t.priority,
                status: t.status?.toLowerCase() || 'pending',
                tenant_id: t.tenant_id || t.agent_id,
                tenant_name: `Agent Ticket (Agent: ${t.agent_id})`,
                device_id: null,
                incident_date: null,
                attachment_url: null,
                created_at: t.created_at
            }));
            const merged = [...(complaintsData || []), ...adaptedSupportTickets];
            // In-memory filter for Agent tickets if search by tenant_code was requested
            let filtered = merged;
            if (tenant_code && typeof tenant_code === 'string') {
                // Agent tickets do not store tenant_code yet, so if tenant_code is filtered, 
                // we can only match complaintsData (already filtered in DB) plus any agent ticket 
                // that belongs to the resolved tenant.
                // We will resolve the tenant_id for the tenant_code first.
                const { data: tenantData } = await supabase_1.supabaseAdmin
                    .from('tenants')
                    .select('id')
                    .eq('tenant_code', tenant_code)
                    .maybeSingle();
                const tenantId = tenantData?.id;
                filtered = merged.filter(item => {
                    if (item.category === 'Agent Support') {
                        return tenantId && item.tenant_id === tenantId;
                    }
                    return true; // Already filtered in SQL query
                });
            }
            const unique = Array.from(new Map(filtered.map(item => [item.id, item])).values());
            unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return res.json({ success: true, data: unique });
        }
        catch (err) {
            console.error('[listComplaints] error:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * GET /api/mobile/complaints
     * Get complaints for the specific tenant/device
     */
    static async getMobileComplaints(req, res) {
        const tenantId = req.query.tenant_id;
        const deviceId = req.query.device_id;
        if (isOfflineMode()) {
            return res.json({ success: true, data: [] });
        }
        try {
            let query = supabase_1.supabaseAdmin.from('complaints').select('*').order('created_at', { ascending: false });
            if (tenantId && deviceId) {
                query = query.or(`tenant_id.eq.${tenantId},device_id.eq.${deviceId}`);
            }
            else if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }
            else if (deviceId) {
                query = query.eq('device_id', deviceId);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return res.json({ success: true, data });
        }
        catch (err) {
            console.error('[getMobileComplaints] error:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * PATCH /api/admin/complaints/:id/status
     */
    static async updateComplaintStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        if (isOfflineMode()) {
            return res.json({ success: true, data: { id, status } });
        }
        try {
            // 1. Try updating complaints table
            const { data: cData } = await supabase_1.supabaseAdmin
                .from('complaints')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .maybeSingle();
            if (cData) {
                return res.json({ success: true, data: cData });
            }
            // 2. Try updating support_tickets table (Agent tickets)
            const mappedStatus = status.toUpperCase();
            const { data: sData } = await supabase_1.supabaseAdmin
                .from('support_tickets')
                .update({ status: mappedStatus, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .maybeSingle();
            if (sData) {
                const adapted = {
                    id: sData.id,
                    title: sData.subject,
                    description: sData.description,
                    category: 'Agent Support',
                    urgency: sData.priority,
                    status: sData.status?.toLowerCase() || 'pending',
                    tenant_id: sData.tenant_id || sData.agent_id,
                    tenant_name: `Agent Ticket (Agent: ${sData.agent_id})`,
                    device_id: null,
                    incident_date: null,
                    attachment_url: null,
                    created_at: sData.created_at
                };
                return res.json({ success: true, data: adapted });
            }
            throw new Error('Complaint or Ticket not found');
        }
        catch (err) {
            console.error('[updateComplaintStatus] error:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.SupportController = SupportController;
//# sourceMappingURL=support.controller.js.map