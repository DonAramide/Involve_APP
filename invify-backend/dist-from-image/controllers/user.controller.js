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
exports.UserController = void 0;
const supabase_1 = require("../db/supabase");
const user_device_service_1 = require("../services/user-device.service");
const audit_archive_service_1 = require("../services/audit-archive.service");
const build_variant_1 = require("../config/build-variant");
const maker_checker_service_1 = require("../services/maker-checker.service");
class UserController {
    /**
     * GET /admin/users
     * Scoped listing of users.
     */
    static async listUsers(req, res) {
        try {
            const { role, tenantId } = req.user;
            const roleNorm = String(role || '').toLowerCase();
            const isPlatform = roleNorm === 'super_admin' ||
                roleNorm === 'internal_staff' ||
                roleNorm.startsWith('admin_');
            const applyScope = (query) => {
                if (!isPlatform) {
                    return query.eq('tenant_id', tenantId);
                }
                const requested = String(req.query.tenantId ?? '').trim().toLowerCase();
                const skipFilter = !requested || ['all', 'null', 'undefined', 'global'].includes(requested);
                if (skipFilter)
                    return query;
                if (requested === 'platform' || requested === 'none') {
                    return query.is('tenant_id', null);
                }
                return query.eq('tenant_id', String(req.query.tenantId).trim());
            };
            if (!isPlatform && !tenantId) {
                return res.status(403).json({ error: 'Tenant context required' });
            }
            let result = await applyScope(supabase_1.supabaseAdmin.from('users').select('*, tenants(id, name)'))
                .order('created_at', { ascending: false })
                .limit(2000);
            if (result.error) {
                console.warn('[UserController] users/tenants embed failed, retrying without join:', result.error.message);
                result = await applyScope(supabase_1.supabaseAdmin.from('users').select('*'))
                    .order('created_at', { ascending: false })
                    .limit(2000);
            }
            if (result.error)
                throw result.error;
            return res.status(200).json(Array.isArray(result.data) ? result.data : []);
        }
        catch (error) {
            console.error('[UserController] listUsers Error:', error.message);
            return res.status(503).json({ error: 'Database unavailable', message: error.message, retryable: true, retryAfterMs: 2000 });
        }
    }
    /**
     * POST /admin/users
     * Create a platform user. Note: Actual Auth Record must be in Supabase.
     */
    static async createUser(req, res) {
        const held = await (0, maker_checker_service_1.holdForSupportApproval)(req, res, {
            domain: 'staff_management',
            action: 'user_create',
            target: String(req.body?.email || '').trim().toLowerCase(),
            summary: `Add staff ${String(req.body?.name || req.body?.email || '').trim() || 'user'}`,
            body: req.body || {},
        });
        if (held)
            return;
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
        let authId = id;
        try {
            // 1. Check or Provision in Supabase Auth with default temporary password
            const defaultPassword = req.body.password || `Invify@${Math.floor(100000 + Math.random() * 900000)}`;
            const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
                email: email.trim().toLowerCase(),
                password: defaultPassword,
                email_confirm: true,
                user_metadata: { role, tenantId: isPlatform ? null : tenantId }
            });
            if (authError) {
                const errorMsg = (authError.message || '').toLowerCase();
                if (errorMsg.includes('already exists') ||
                    errorMsg.includes('already registered') ||
                    errorMsg.includes('already been registered') ||
                    errorMsg.includes('already_registered')) {
                    // Find the existing auth user ID
                    const { data: listedUsers } = await supabase_1.supabaseAdmin.auth.admin.listUsers();
                    const existingUser = listedUsers?.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
                    if (existingUser) {
                        authId = existingUser.id;
                        // Update auth password to the default password
                        await supabase_1.supabaseAdmin.auth.admin.updateUserById(authId, { password: defaultPassword });
                    }
                    else {
                        throw authError;
                    }
                }
                else {
                    throw authError;
                }
            }
            else if (authData.user) {
                authId = authData.user.id;
            }
            // 2. Insert or update profile in public.users table
            const { data, error } = await supabase_1.supabaseAdmin
                .from('users')
                .upsert({
                id: authId,
                name: name || email.split('@')[0],
                email: email.trim().toLowerCase(),
                role,
                tenant_id: isPlatform ? null : tenantId,
                is_active: true,
                require_password_reset: true
            }, { onConflict: 'id' })
                .select()
                .single();
            if (error)
                throw error;
            // 3. Send welcome email with credentials & attached manual + activation OTP in background (non-blocking)
            try {
                const { emailService } = require('../services/email.service');
                const { verificationService } = require('../services/verification.service');
                const loginUrl = build_variant_1.BuildVariantService.getInstance().getLoginUrl(isPlatform ? 'admin' : 'tenant');
                let businessMode;
                if (!isPlatform && tenantId) {
                    const { data: tenantRow } = await supabase_1.supabaseAdmin
                        .from('tenants')
                        .select('type')
                        .eq('id', tenantId)
                        .maybeSingle();
                    businessMode = tenantRow?.type;
                }
                Promise.allSettled([
                    emailService.sendWelcomeEmail(email.trim().toLowerCase(), {
                        name: name || email.split('@')[0],
                        role,
                        defaultPassword,
                        loginUrl,
                        businessMode,
                    }),
                    verificationService.sendOTP(email.trim().toLowerCase(), 'EMAIL', 'PASSWORD_RESET')
                ]).then(() => {
                    console.log(`[UserController] Sent welcome credentials email and activation OTP to: ${email}`);
                }).catch((emailErr) => {
                    console.warn('[UserController] Failed to send welcome/activation emails:', emailErr.message);
                });
            }
            catch (emailErr) {
                console.warn('[UserController] Failed to trigger welcome/activation emails:', emailErr.message);
            }
            // 4. Record Governance Audit Log
            try {
                const { GovAuditService } = require('../services/gov-audit.service');
                const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                GovAuditService.logAction({
                    id: require('crypto').randomUUID(),
                    timestamp: new Date().toISOString(),
                    module: 'USER_MGMT',
                    action: 'USER_ACCESS_CREATED',
                    user_email: currentUser?.email || 'system',
                    user_name: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin Operator',
                    ip_address: String(ip),
                    target: email,
                    status: 'success',
                    tenant_id: isPlatform ? null : tenantId,
                    metadata: {
                        created_user_id: authId,
                        assigned_role: role,
                        tenant_id: isPlatform ? null : tenantId
                    }
                }).catch((auditErr) => console.warn('[UserController] createUser audit log error:', auditErr.message));
            }
            catch (auditErr) {
                console.warn('[UserController] createUser audit log failed:', auditErr.message);
            }
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
        const held = await (0, maker_checker_service_1.holdForSupportApproval)(req, res, {
            domain: 'staff_management',
            action: 'user_update',
            target: String(req.params?.id || ''),
            summary: `Update staff ${String(req.body?.name || req.body?.email || req.params?.id || '').trim()}`,
            body: req.body || {},
            params: { id: req.params?.id },
        });
        if (held)
            return;
        const { id } = req.params;
        const updates = { ...(req.body || {}) };
        const currentUser = req.user;
        const resetMfa = updates.reset_mfa === true || updates.resetMfa === true;
        delete updates.reset_mfa;
        delete updates.resetMfa;
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
            // Isolation: never mutate users outside the authenticated tenant
            if (!currentUser.tenantId) {
                return res.status(403).json({ error: 'Tenant context required' });
            }
            const { data: target, error: targetErr } = await supabase_1.supabaseAdmin
                .from('users')
                .select('id, tenant_id')
                .eq('id', id)
                .maybeSingle();
            if (targetErr) {
                return res.status(500).json({ error: targetErr.message });
            }
            if (!target || String(target.tenant_id) !== String(currentUser.tenantId)) {
                return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
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
            let query = supabase_1.supabaseAdmin.from('users').update(updates).eq('id', id);
            if (currentUser.role !== 'super_admin') {
                query = query.eq('tenant_id', currentUser.tenantId);
            }
            const { data, error } = await query.select().single();
            if (error)
                throw error;
            if (resetMfa) {
                const { error: mfaErr } = await supabase_1.supabaseAdmin
                    .from('users')
                    .update({ mfa_enabled: false, mfa_secret: null })
                    .eq('id', id);
                if (mfaErr)
                    throw mfaErr;
            }
            // Generate default temporary password for updated user access
            const defaultPassword = req.body.password || `Invify@${Math.floor(100000 + Math.random() * 900000)}`;
            // Sync password & user metadata with Supabase Auth and enforce first-login password reset
            try {
                await supabase_1.supabaseAdmin.auth.admin.updateUserById(id, {
                    password: defaultPassword,
                    user_metadata: {
                        name: data.name,
                        role: data.role,
                        tenantId: data.tenant_id
                    }
                });
                await supabase_1.supabaseAdmin.from('users').update({ require_password_reset: true }).eq('id', id);
            }
            catch (authSyncErr) {
                console.warn('[UserController] Failed to sync auth user_metadata / password:', authSyncErr.message);
            }
            // Send Profile / Identity update confirmation email with default password in background
            if (data?.email) {
                try {
                    const { emailService } = require('../services/email.service');
                    const { verificationService } = require('../services/verification.service');
                    const isPlatformRole = [
                        'super_admin',
                        'admin_finance',
                        'admin_treasury',
                        'admin_risk',
                        'admin_ops',
                        'admin_executive',
                        'admin_deploy',
                        'internal_staff'
                    ].includes(data.role);
                    const loginUrl = build_variant_1.BuildVariantService.getInstance().getLoginUrl(isPlatformRole ? 'admin' : 'tenant');
                    Promise.allSettled([
                        emailService.sendProfileUpdateEmail(data.email, {
                            name: data.name || data.email.split('@')[0],
                            role: data.role,
                            defaultPassword,
                            isActive: data.is_active !== false,
                            loginUrl
                        }),
                        verificationService.sendOTP(data.email.trim().toLowerCase(), 'EMAIL', 'PASSWORD_RESET')
                    ]).then(() => {
                        console.log(`[UserController] Sent profile update notification email with default password to: ${data.email}`);
                    }).catch((emailErr) => {
                        console.warn('[UserController] Failed to send profile update email:', emailErr.message);
                    });
                }
                catch (emailErr) {
                    console.warn('[UserController] Failed to trigger profile update email:', emailErr.message);
                }
            }
            // Record Governance Audit Log
            try {
                const { GovAuditService } = require('../services/gov-audit.service');
                const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                GovAuditService.logAction({
                    id: require('crypto').randomUUID(),
                    timestamp: new Date().toISOString(),
                    module: 'USER_MGMT',
                    action: 'USER_IDENTITY_UPDATED',
                    user_email: currentUser?.email || 'system',
                    user_name: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin Operator',
                    ip_address: String(ip),
                    target: data.email || id,
                    status: 'success',
                    tenant_id: data.tenant_id,
                    metadata: {
                        updated_user_id: id,
                        updated_fields: updates,
                        new_role: data.role,
                        is_active: data.is_active,
                        reset_mfa: resetMfa,
                    }
                }).catch((auditErr) => console.warn('[UserController] updateUser audit log error:', auditErr.message));
            }
            catch (auditErr) {
                console.warn('[UserController] updateUser audit log failed:', auditErr.message);
            }
            return res.status(200).json({ ...data, mfa_reset: resetMfa });
        }
        catch (error) {
            console.error('[UserController] updateUser Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /admin/users/:id/reset-mfa
     * Clears TOTP enrollment so the user must re-enroll 2FA on next login.
     */
    static async resetUserMfa(req, res) {
        const held = await (0, maker_checker_service_1.holdForSupportApproval)(req, res, {
            domain: 'staff_management',
            action: 'user_reset_mfa',
            target: String(req.params?.id || ''),
            summary: `Reset 2FA for staff ${String(req.params?.id || '')}`,
            params: { id: req.params?.id },
        });
        if (held)
            return;
        const { id } = req.params;
        const currentUser = req.user;
        try {
            if (!id) {
                return res.status(400).json({ error: 'User id is required' });
            }
            let targetQuery = supabase_1.supabaseAdmin
                .from('users')
                .select('id, email, name, tenant_id, mfa_enabled, role')
                .eq('id', id);
            if (currentUser.role !== 'super_admin') {
                if (!currentUser.tenantId) {
                    return res.status(403).json({ error: 'Tenant context required' });
                }
                targetQuery = targetQuery.eq('tenant_id', currentUser.tenantId);
            }
            const { data: target, error: targetErr } = await targetQuery.maybeSingle();
            if (targetErr) {
                return res.status(500).json({ error: targetErr.message });
            }
            if (!target) {
                return res.status(404).json({ error: 'User not found' });
            }
            const { error: mfaErr } = await supabase_1.supabaseAdmin
                .from('users')
                .update({ mfa_enabled: false, mfa_secret: null })
                .eq('id', id);
            if (mfaErr)
                throw mfaErr;
            try {
                const { GovAuditService } = require('../services/gov-audit.service');
                const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                GovAuditService.logAction({
                    id: require('crypto').randomUUID(),
                    timestamp: new Date().toISOString(),
                    module: 'USER_MGMT',
                    action: 'USER_MFA_RESET',
                    user_email: currentUser?.email || 'system',
                    user_name: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin Operator',
                    ip_address: String(ip),
                    target: target.email || id,
                    status: 'success',
                    tenant_id: target.tenant_id,
                    metadata: {
                        updated_user_id: id,
                        previous_mfa_enabled: !!target.mfa_enabled,
                        target_role: target.role,
                    },
                }).catch((auditErr) => console.warn('[UserController] resetUserMfa audit log error:', auditErr.message));
            }
            catch (auditErr) {
                console.warn('[UserController] resetUserMfa audit log failed:', auditErr.message);
            }
            return res.status(200).json({
                success: true,
                message: '2FA has been reset. User must re-enroll on next login.',
                userId: id,
            });
        }
        catch (error) {
            console.error('[UserController] resetUserMfa Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async resetStaffPassword(req, res) {
        const userId = String(req.params?.id || '').trim();
        const newPassword = String(req.body?.newPassword || '');
        if (!userId)
            return res.status(400).json({ error: 'User id is required' });
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        const held = await (0, maker_checker_service_1.holdForSupportApproval)(req, res, {
            domain: 'staff_management',
            action: 'user_reset_password',
            target: userId,
            summary: `Reset password for staff ${userId}`,
            body: { newPassword },
            params: { id: userId },
        });
        if (held)
            return;
        const { AuthController } = await Promise.resolve().then(() => __importStar(require('./auth.controller')));
        req.body = { userId, newPassword };
        return AuthController.resetPassword(req, res);
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