"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const supabase_1 = require("../db/supabase");
const user_device_service_1 = require("../services/user-device.service");
const audit_archive_service_1 = require("../services/audit-archive.service");
class UserController {
    /**
     * GET /admin/users
     * Scoped listing of users.
     */
    static async listUsers(req, res) {
        try {
            const { role, tenantId } = req.user;
            let query = supabase_1.supabase.from('users').select(`*`);
            // 1. Isolation Rule
            if (role !== 'super_admin') {
                // Tenant Admins only see their users
                query = query.eq('tenant_id', tenantId);
            }
            else if (req.query.tenantId) {
                // Super Admins can filter by tenant
                query = query.eq('tenant_id', req.query.tenantId);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[UserController] listUsers Error:', error.message);
            return res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000 });
        }
    }
    /**
     * POST /admin/users
     * Create a platform user. Note: Actual Auth Record must be in Supabase.
     */
    static async createUser(req, res) {
        const { id, name, email, role, tenantId } = req.body;
        const currentUser = req.user;
        const isPlatform = [
            'super_admin',
            'admin_finance',
            'admin_treasury',
            'admin_risk',
            'admin_ops',
            'admin_executive',
            'admin_deploy',
            'internal_staff'
        ].includes(role);
        // 1. Validation
        if (currentUser.role !== 'super_admin') {
            if (tenantId !== currentUser.tenantId) {
                return res.status(403).json({ error: 'Cannot create users for other tenants' });
            }
            if (isPlatform) {
                return res.status(403).json({ error: 'Tenant admins cannot assign platform-level roles' });
            }
        }
        try {
            const { data, error } = await supabase_1.supabase
                .from('users')
                .insert({
                id,
                name,
                email,
                role,
                tenant_id: isPlatform ? null : tenantId,
                is_active: true
            })
                .select()
                .single();
            if (error)
                throw error;
            return res.status(201).json(data);
        }
        catch (error) {
            console.error('[UserController] createUser Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * PATCH /admin/users/:id
     * Update role or status.
     */
    static async updateUser(req, res) {
        const { id } = req.params;
        const updates = req.body;
        const currentUser = req.user;
        // Ensure no tenant-override if not super_admin
        if (currentUser.role !== 'super_admin') {
            delete updates.tenant_id;
            // Prevent tenant admin from elevating someone to a platform role
            if (updates.role && [
                'super_admin',
                'admin_finance',
                'admin_treasury',
                'admin_risk',
                'admin_ops',
                'admin_executive',
                'admin_deploy',
                'internal_staff'
            ].includes(updates.role)) {
                return res.status(403).json({ error: 'Tenant admins cannot assign platform-level roles' });
            }
        }
        else {
            // If super_admin, force tenant_id to null for platform roles
            if (updates.role) {
                const isPlatform = [
                    'super_admin',
                    'admin_finance',
                    'admin_treasury',
                    'admin_risk',
                    'admin_ops',
                    'admin_executive',
                    'admin_deploy',
                    'internal_staff'
                ].includes(updates.role);
                if (isPlatform) {
                    updates.tenant_id = null;
                }
            }
        }
        try {
            const { data, error } = await supabase_1.supabase
                .from('users')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            console.error('[UserController] updateUser Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async listDevices(req, res) {
        try {
            const filters = {
                status: req.query.status ? String(req.query.status) : undefined,
                search: req.query.search ? String(req.query.search) : undefined,
                page: req.query.page ? String(req.query.page) : undefined,
                limit: req.query.limit ? String(req.query.limit) : undefined
            };
            const result = await user_device_service_1.UserDeviceService.getDevices(filters);
            return res.status(200).json(result);
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    static async approveDevice(req, res) {
        try {
            const { id } = req.body;
            const approvedBy = req.user?.email || 'admin';
            if (!id)
                return res.status(400).json({ error: 'Device ID/Record ID is required' });
            await user_device_service_1.UserDeviceService.approveDevice(id, approvedBy);
            return res.status(200).json({ message: 'Device access approved successfully.' });
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    static async blockDevice(req, res) {
        try {
            const { id } = req.body;
            const blockedBy = req.user?.email || 'admin';
            if (!id)
                return res.status(400).json({ error: 'Device ID/Record ID is required' });
            await user_device_service_1.UserDeviceService.blockDevice(id, blockedBy);
            return res.status(200).json({ message: 'Device access blocked.' });
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    static async triggerArchiving(req, res) {
        try {
            const result = await audit_archive_service_1.AuditArchiveService.runArchiving();
            return res.status(200).json(result);
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map