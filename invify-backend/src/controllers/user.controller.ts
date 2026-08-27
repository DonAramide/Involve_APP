// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { UserDeviceService } from '../services/user-device.service';
import { AuditArchiveService } from '../services/audit-archive.service';



export class UserController {
  /**
   * GET /admin/users
   * Scoped listing of users.
   */
  static async listUsers(req: Request, res: Response) {
    try {
      const { role, tenantId } = (req as any).user;
      const roleNorm = String(role || '').toLowerCase();
      const isPlatform =
        roleNorm === 'super_admin' ||
        roleNorm === 'internal_staff' ||
        roleNorm.startsWith('admin_');

      let query = supabaseAdmin.from('users').select('*');

      // Isolation: platform operators see everyone (optional tenant filter).
      // Tenant admins only see their own tenant.
      if (!isPlatform) {
        if (!tenantId) {
          return res.status(403).json({ error: 'Tenant context required' });
        }
        query = query.eq('tenant_id', tenantId);
      } else if (req.query.tenantId) {
        query = query.eq('tenant_id', req.query.tenantId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(2000);

      if (error) throw error;
      return res.status(200).json(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('[UserController] listUsers Error:', error.message);
      return res.status(503).json({ error: 'Database unavailable', message: error.message, retryable: true, retryAfterMs: 2000 });
    }
  }

  /**
   * POST /admin/users
   * Create a platform user. Note: Actual Auth Record must be in Supabase.
   */
  static async createUser(req: Request, res: Response) {
    const { id, name, email, role, tenantId } = req.body;
    const currentUser = (req as any).user;

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
      // 1. Check or Provision in Supabase Auth
      const tempPassword = require('crypto').randomBytes(16).toString('hex');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role, tenantId: isPlatform ? null : tenantId }
      });

      if (authError) {
        if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
          // Find the existing auth user ID
          const { data: listedUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listedUsers?.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
          if (existingUser) {
            authId = existingUser.id;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      } else if (authData.user) {
        authId = authData.user.id;
      }

      // 2. Insert profile in public.users table
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: authId,
          name,
          email: email.trim().toLowerCase(),
          role,
          tenant_id: isPlatform ? null : tenantId,
          is_active: true,
          require_password_reset: true
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Send welcome email and activation code (OTP) via EMAIL with purpose PASSWORD_RESET
      try {
        const { emailService } = require('../services/email.service');
        const { verificationService } = require('../services/verification.service');

        await emailService.sendWelcomeEmail(email.trim().toLowerCase());
        await verificationService.sendOTP(email.trim().toLowerCase(), 'EMAIL', 'PASSWORD_RESET');
        console.log(`[UserController] Sent welcome email and activation OTP to: ${email}`);
      } catch (emailErr: any) {
        console.warn('[UserController] Failed to send welcome/activation emails:', emailErr.message);
      }

      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[UserController] createUser Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /admin/users/:id
   * Update role or status.
   */
  static async updateUser(req: Request, res: Response) {
    const { id } = req.params;
    const updates = req.body;
    const currentUser = (req as any).user;

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
      const { data: target, error: targetErr } = await supabaseAdmin
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
    } else {
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
      let query = supabaseAdmin.from('users').update(updates).eq('id', id);
      if (currentUser.role !== 'super_admin') {
        query = query.eq('tenant_id', currentUser.tenantId);
      }
      const { data, error } = await query.select().single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      console.error('[UserController] updateUser Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  static async listDevices(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        page: req.query.page ? String(req.query.page) : undefined,
        limit: req.query.limit ? String(req.query.limit) : undefined
      };
      const result = await UserDeviceService.getDevices(filters);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async approveDevice(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const approvedBy = (req as any).user?.email || 'admin';
      if (!id) return res.status(400).json({ error: 'Device ID/Record ID is required' });
      await UserDeviceService.approveDevice(id, approvedBy);
      return res.status(200).json({ message: 'Device access approved successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async blockDevice(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const blockedBy = (req as any).user?.email || 'admin';
      if (!id) return res.status(400).json({ error: 'Device ID/Record ID is required' });
      await UserDeviceService.blockDevice(id, blockedBy);
      return res.status(200).json({ message: 'Device access blocked.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async triggerArchiving(req: Request, res: Response) {
    try {
      const result = await AuditArchiveService.runArchiving();
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
