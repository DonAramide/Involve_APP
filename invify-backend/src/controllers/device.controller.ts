// src/controllers/device.controller.ts
import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';
import { LicenseGenerator } from '../utils/license.util';
import { GovAuditService } from '../services/gov-audit.service';
import { authenticator } from 'otplib';

function isNetworkTimeout(error: any): boolean {
  return (
    error.message?.includes('fetch failed') ||
    error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    error.message?.includes('timeout') ||
    error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
  );
}

export class DeviceController {


  /**
   * GET /devices
   * Retrieves all hardware devices
   */
  static async getDevices(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const role = String(user?.role || '').toLowerCase();
      const isPlatform =
        role === 'super_admin' ||
        role === 'internal_staff' ||
        role.startsWith('admin_');

      // 1. Fetch devices raw data (tenant-scoped for non-platform operators)
      const buildDeviceQuery = () => {
        let q = supabaseAdmin.from('devices').select('*');
        if (!isPlatform) {
          q = q.eq('tenant_id', user.tenantId);
        }
        return q;
      };
      if (!isPlatform && !user?.tenantId) {
        return res.status(403).json({ error: 'Tenant context required' });
      }
      let { data: devices, error: devError } = await buildDeviceQuery().order('last_seen', { ascending: false });
      if (devError) {
        const retry = await buildDeviceQuery();
        devices = retry.data;
        devError = retry.error;
      }
      if (devError) throw devError;

      let registrationQuery = supabaseAdmin.from('device_registrations').select('*');
      if (!isPlatform) {
        registrationQuery = registrationQuery.eq('tenant_id', user.tenantId);
      }
      const { data: registrations } = await registrationQuery;

      const byId = new Map<string, any>();
      (devices || []).forEach((d: any) => {
        const key = String(d.device_id || d.id || '');
        if (key) byId.set(key, d);
      });
      (registrations || []).forEach((r: any) => {
        const key = String(r.device_id || '');
        if (!key || byId.has(key)) return;
        byId.set(key, {
          device_id: r.device_id,
          tenant_id: r.tenant_id,
          status: String(r.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : r.status,
          last_seen: r.updated_at || r.created_at || null,
          device_info: { agent_code: r.agent_code, location: r.location },
          device_name: r.owner_name || r.device_id,
        });
      });
      const mergedDevices = Array.from(byId.values());

      const tenantIds = Array.from(new Set(mergedDevices.map(d => d.tenant_id).filter(Boolean)));
      const tenantsMap = new Map<string, { name: string; plan: string }>();

      if (tenantIds.length > 0) {
        const { data: tenants, error: tenError } = await supabaseAdmin
          .from('tenants')
          .select('id, name, plan')
          .in('id', tenantIds);

        if (!tenError && tenants) {
          tenants.forEach(t => {
            tenantsMap.set(t.id, { name: t.name, plan: t.plan });
          });
        }
      }

      const enrichedDevices = mergedDevices.map(device => ({
        ...device,
        tenants: tenantsMap.get(device.tenant_id) || null,
      }));

      return res.status(200).json(enrichedDevices);
    } catch (error: any) {
      if (isNetworkTimeout(error)) {
        return res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000 });
      }
      console.error('[DeviceController] getDevices Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/devices/connected
   * Live Socket.io sessions on this Node process (not the registered-fleet table).
   */
  static async getConnectedPresence(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const role = String(user?.role || '').toLowerCase();
      const isPlatform =
        role === 'super_admin' ||
        role === 'internal_staff' ||
        role.startsWith('admin_');
      if (!isPlatform && !user?.tenantId) {
        return res.status(403).json({ error: 'Tenant context required' });
      }

      const { io } = require('../app');
      const sockets = await io.fetchSockets();
      const byDevice = new Map<string, { deviceId: string; tenantId: string | null; socketId: string; ip: string }>();

      for (const sock of sockets) {
        const tenantId = sock.data?.tenantId || sock.handshake?.auth?.tenantId || null;
        if (!isPlatform && tenantId !== user.tenantId) continue;

        const deviceId = String(
          sock.data?.deviceId ||
            sock.handshake?.auth?.deviceId ||
            '',
        ).trim();
        if (!deviceId) continue;
        if (!byDevice.has(deviceId)) {
          const hdr = sock.handshake?.headers?.['x-forwarded-for'];
          const forwarded = (typeof hdr === 'string' ? hdr : Array.isArray(hdr) ? hdr[0] : '')
            ?.split(',')[0]
            ?.trim();
          const real = String(sock.handshake?.headers?.['x-real-ip'] || '').trim();
          let ip = String(sock.data?.ip || forwarded || real || sock.handshake?.address || 'unknown');
          ip = ip.replace(/^::ffff:/, '');
          if (ip === '::1') ip = '127.0.0.1';
          byDevice.set(deviceId, {
            deviceId,
            tenantId,
            socketId: sock.id,
            ip,
          });
        }
      }

      const devices = Array.from(byDevice.values());
      return res.status(200).json({
        connectedDevices: devices.length,
        sockets: sockets.length,
        devices,
      });
    } catch (error: any) {
      console.error('[DeviceController] getConnectedPresence Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /devices/activations
   * Retrieves all generated activation codes
   */
  static async getActivations(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const role = String(user?.role || '').toLowerCase();
      const isPlatform =
        role === 'super_admin' ||
        role === 'internal_staff' ||
        role.startsWith('admin_');

      // 1. Fetch activations raw data (tenant-scoped for non-platform operators)
      let actQuery = supabase.from('device_activations').select('*');
      if (!isPlatform) {
        if (!user?.tenantId) {
          return res.status(403).json({ error: 'Tenant context required' });
        }
        actQuery = actQuery.eq('tenant_id', user.tenantId);
      }
      const { data: activations, error: actError } = await actQuery.order('created_at', { ascending: false });

      if (actError) throw actError;

      // 2. Fetch related tenants in-memory to bypass database foreign key relationship caching issues
      const tenantIds = Array.from(new Set((activations || []).map(a => a.tenant_id).filter(Boolean)));
      const tenantsMap = new Map<string, { name: string; plan: string }>();

      if (tenantIds.length > 0) {
        const { data: tenants, error: tenError } = await supabase
          .from('tenants')
          .select('id, name, plan')
          .in('id', tenantIds);

        if (!tenError && tenants) {
          tenants.forEach(t => {
            tenantsMap.set(t.id, { name: t.name, plan: t.plan });
          });
        }
      }

      // 3. Map tenant details back to activations matching the shape expected by the frontend
      const enrichedActivations = (activations || []).map(activation => ({
        ...activation,
        tenants: tenantsMap.get(activation.tenant_id) || null,
      }));

      return res.status(200).json(enrichedActivations);
    } catch (error: any) {
      if (isNetworkTimeout(error)) {
        return res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000 });
      }
      console.error('[DeviceController] getActivations Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /devices/activations
   * Generates a new activation key
   */
  static async createActivation(req: Request, res: Response) {
    const user = (req as any).user;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    let tenantId = user?.tenantId;
    const operatorEmail = user?.email || 'unknown';
    const operatorName = user?.name || operatorEmail.split('@')[0]?.toUpperCase() || 'Unknown';

    const logGenerateAudit = async (
      status: 'success' | 'failed',
      details: { code?: string; error?: string; durationDays?: number; planIndex?: number; deviceSuffix?: string } = {},
    ) => {
      try {
        await GovAuditService.logAction({
          id: `gov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          module: 'DEVICE',
          action: 'GENERATE_ACTIVATION_CODE',
          user_email: operatorEmail,
          user_name: operatorName,
          ip_address: ip,
          target: details.code || details.deviceSuffix || '-',
          status,
          tenant_id: tenantId || null,
          metadata: {
            tenant_id: tenantId || null,
            created_by: operatorEmail,
            duration_days: details.durationDays,
            plan_index: details.planIndex,
            device_suffix: details.deviceSuffix,
            error: details.error,
          },
        });
      } catch (err: any) {
        console.error('[DeviceController] Failed to write generate-activation audit log:', err.message);
      }
    };

    try {
      const role = String(user?.role || '').toLowerCase();
      const isPlatform =
        role === 'super_admin' ||
        role === 'internal_staff' ||
        role.startsWith('admin_');

      if (isPlatform) {
        tenantId = req.body.tenantId || tenantId;
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const { durationDays, planIndex, deviceSuffix } = req.body;

      // Fetch tenant name for cryptographic signature
      let businessName = 'Invify Retail Business';
      try {
        const { data, error } = await supabaseAdmin.from('tenants').select('name').eq('id', tenantId).single();
        if (error) throw error;
        if (data && data.name) {
          businessName = data.name;
        }
      } catch (err: any) {
        if (isNetworkTimeout(err)) {
          return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
          });
        }
        console.warn('[DeviceController] Failed to fetch tenant name:', err.message);
      }

      // Generate a cryptographically valid Base32 HMAC-SHA256 signature code
      const code = LicenseGenerator.generate(
        businessName, 
        Number(durationDays) || 30, 
        Number(planIndex) || 0, 
        deviceSuffix || '0'
      );

      const durationDaysNum = Number(durationDays) || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDaysNum);
      const expiresAtIso = expiresAt.toISOString();
      const creatorEmail = user?.email || 'superadmin@invify.app';

      try {
        const { data, error } = await supabaseAdmin
          .from('device_activations')
          .insert({
            tenant_id: tenantId,
            activation_code: code,
            duration_days: durationDaysNum,
            plan_index: planIndex || 0,
            device_suffix: deviceSuffix || '0',
            device_id: null, // No generated device identifier at creation time
            is_used: false,
            status: 'pending',
            created_by: creatorEmail,
            expires_at: expiresAtIso
          })
          .select()
          .single();

        if (error) throw error;
        await logGenerateAudit('success', {
          code: data.activation_code,
          durationDays: durationDaysNum,
          planIndex: Number(planIndex) || 0,
          deviceSuffix: deviceSuffix || '0',
        });
        return res.status(201).json({ 
          activation_code: data.activation_code,
          expires_at: data.expires_at
        });
      } catch (dbErr: any) {
        if (isNetworkTimeout(dbErr)) {
          await logGenerateAudit('failed', {
            durationDays: durationDaysNum,
            planIndex: Number(planIndex) || 0,
            deviceSuffix: deviceSuffix || '0',
            error: 'Database unavailable',
          });
          return res.status(503).json({ 
            error: 'Database unavailable', 
            retryable: true,
            retryAfterMs: 2000 
          });
        }
        throw dbErr;
      }
    } catch (error: any) {
      console.error('[DeviceController] createActivation Error:', error.message);
      await logGenerateAudit('failed', { error: error.message });
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /devices/validate
   * Validates and redeems a device activation key
   */
  static async validateCode(req: Request, res: Response) {
    try {
      const { code, deviceId, deviceInfo, themeColor } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'code is required' });
      }
      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }

      let activation: any = null;
      try {
        const { data, error } = await supabaseAdmin
          .from('device_activations')
          .select('*')
          .eq('activation_code', code)
          .maybeSingle();

        if (error) throw error;
        activation = data;
      } catch (selectErr: any) {
        if (isNetworkTimeout(selectErr)) {
          return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
          });
        }
        throw selectErr;
      }

      if (!activation) {
        return res.status(400).json({ error: 'Invalid activation code' });
      }

      let updatedActivation: any = null;
      const alreadyRedeemedHere =
        (activation.is_used || activation.status === 'used') &&
        activation.device_id &&
        activation.device_id === deviceId;

      if (activation.is_used || activation.status === 'used') {
        if (!alreadyRedeemedHere) {
          return res.status(400).json({ error: 'Activation code has already been used' });
        }
        updatedActivation = activation;
      }

      if (!updatedActivation) {
        if (new Date(activation.expires_at) <= new Date() || activation.status === 'expired') {
          return res.status(400).json({ error: 'Activation code has expired' });
        }

        // Enforce ownership integrity: user must belong to the same tenant as the activation (except super_admin)
        const user = (req as any).user;
        if (user && user.role !== 'super_admin' && activation.tenant_id !== user.tenantId) {
          return res.status(403).json({ error: 'Forbidden: Activation code belongs to a different tenant' });
        }

        try {
          const { data, error } = await supabaseAdmin
            .from('device_activations')
            .update({
              is_used: true,
              status: 'used',
              device_id: deviceId,
              used_at: new Date().toISOString()
            })
            .eq('activation_code', code)
            .eq('is_used', false)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .select()
            .maybeSingle();

          if (error) throw error;
          updatedActivation = data;
        } catch (updateErr: any) {
          if (isNetworkTimeout(updateErr)) {
            return res.status(503).json({
              error: 'Database unavailable',
              retryable: true,
              retryAfterMs: 2000
            });
          }
          throw updateErr;
        }

        if (!updatedActivation) {
          return res.status(400).json({ error: 'Activation code is invalid, expired, or has already been used' });
        }
      }

      // 3. Resolve device role dynamically
      let deviceRole = 'TABLET'; // Default fallback for company devices, never PHONE
      let inventoryRecordId: string | null = null;

      try {
        const { data: inventoryRecord } = await supabaseAdmin
          .from('terminal_inventory')
          .select('id, terminal_type')
          .eq('assigned_device_id', deviceId)
          .maybeSingle();

        if (inventoryRecord) {
          inventoryRecordId = inventoryRecord.id;
          const typeMap: Record<string, string> = {
            'tablet': 'TABLET', 'android': 'TABLET',
            'mpos': 'MPOS', 'dspread': 'MPOS',
            'printer': 'PRINTER', 'bluetooth': 'PRINTER'
          };
          const rawType = (inventoryRecord.terminal_type || '').toLowerCase();
          deviceRole = typeMap[rawType] || 'TABLET';
        } else {
          // Parse suffix: '0' -> TABLET, '1' -> MPOS, '2' -> PRINTER
          const suffix = updatedActivation.device_suffix || '0';
          if (suffix === '0') deviceRole = 'TABLET';
          else if (suffix === '1') deviceRole = 'MPOS';
          else if (suffix === '2') deviceRole = 'PRINTER';
        }
      } catch (invErr: any) {
        if (isNetworkTimeout(invErr)) {
          return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
          });
        }
        console.warn('[DeviceController] terminal_inventory lookup failed during validation:', invErr.message);
        // Fallback to suffix metadata
        const suffix = updatedActivation.device_suffix || '0';
        if (suffix === '0') deviceRole = 'TABLET';
        else if (suffix === '1') deviceRole = 'MPOS';
        else if (suffix === '2') deviceRole = 'PRINTER';
      }

      // 4. Provision the device as COMPANY_DEVICE
      const deviceRecord = {
        device_id: deviceId,
        tenant_id: updatedActivation.tenant_id,
        device_category: 'COMPANY_DEVICE',
        device_role: deviceRole,
        status: 'active',
        device_suffix: updatedActivation.device_suffix || null,
        device_info: deviceInfo || null,
        theme_color: themeColor || null,
        inventory_record_id: inventoryRecordId,
        device_name: deviceInfo?.model || deviceInfo?.deviceName || deviceId,
        platform: deviceInfo?.platform || 'android',
        is_active: true,
        last_seen: new Date().toISOString(),
      };

      try {
        const { data: upsertedDevice, error: upsertError } = await supabaseAdmin
          .from('devices')
          .upsert(deviceRecord, { onConflict: 'device_id' })
          .select()
          .single();

        if (upsertError) throw upsertError;

        try {
          await supabaseAdmin
            .from('device_registrations')
            .update({ tenant_id: updatedActivation.tenant_id, status: 'active' })
            .eq('device_id', deviceId);
        } catch (regErr: any) {
          console.warn('[DeviceController] device_registrations rebind failed (non-fatal):', regErr?.message || regErr);
        }

        let tenantData = null;
        try {
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('id', updatedActivation.tenant_id)
            .single();
          tenantData = tenant;
        } catch (e) {
          console.warn('[DeviceController] Failed to fetch tenant data during validateCode:', e);
        }

        const planIndex = Number(updatedActivation.plan_index || 0);
        const planName = ['basic', 'standard', 'premium', 'enterprise'][planIndex] || 'basic';
        return res.status(200).json({
          valid: true,
          activation_code: updatedActivation.activation_code,
          duration_days: updatedActivation.duration_days,
          plan_index: planIndex,
          plan: planName,
          tenant_id: updatedActivation.tenant_id,
          tenant: tenantData,
          device_id: deviceId,
          device_role: deviceRole,
          device_category: 'COMPANY_DEVICE',
          device: upsertedDevice
        });
      } catch (upsertErr: any) {
        if (isNetworkTimeout(upsertErr)) {
          return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
          });
        }
        throw upsertErr;
      }
    } catch (error: any) {
      console.error('[DeviceController] validateCode Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /devices/:id
   * Updates an existing active device
   */
  static async updateDevice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      try {
        const { data, error } = await supabase
          .from('devices')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json(data);
      } catch (dbErr: any) {
        if (isNetworkTimeout(dbErr)) {
          return res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000 });
        }
        throw dbErr;
      }
    } catch (error: any) {
      console.error('[DeviceController] updateDevice Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * PATCH /devices/activations/:code/reset
   * Resets a used activation key back to pending/unused state, keeping its expiration date.
   */
  static async resetActivation(req: Request, res: Response) {
    let activation: any = null;
    let dbUser: any = null;
    let dbUserName = 'Unknown';
    const user = (req as any).user;
    const { code } = req.params;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    const logAudit = async (status: 'success' | 'failed', errorMsg?: string) => {
      try {
        await GovAuditService.logAction({
          id: `gov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          module: 'DEVICE',
          action: 'RESET_ACTIVATION_KEY',
          user_email: user?.email || 'unknown',
          user_name: dbUserName || user?.email?.split('@')[0]?.toUpperCase() || 'Unknown',
          ip_address: ip,
          target: code || '-',
          status: status,
          metadata: {
            tenant_id: activation?.tenant_id,
            error: errorMsg,
            mfa_verified: dbUser?.mfa_enabled ? 'true' : 'false'
          }
        });
      } catch (err: any) {
        console.error('[DeviceController] Failed to write audit log:', err.message);
      }
    };

    try {
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden: Only super admins can reset activation codes' });
      }

      if (!code) {
        return res.status(400).json({ error: 'code is required' });
      }

      // Check if activation key exists
      const { data: actData, error: findError } = await supabaseAdmin
        .from('device_activations')
        .select('*')
        .eq('activation_code', code)
        .maybeSingle();

      if (findError) throw findError;
      if (!actData) {
        return res.status(404).json({ error: 'Activation code not found' });
      }
      activation = actData;

      // 1. Fetch user data to verify status, name, and if MFA is enabled
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('mfa_enabled, mfa_secret, name')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        await logAudit('failed', 'Operator user profile not found');
        return res.status(401).json({ error: 'Failed to retrieve operator profile' });
      }
      dbUser = userData;
      dbUserName = dbUser.name || 'Admin';

      // 2. Validate Password
      const { password, mfaToken } = req.body;
      if (!password) {
        await logAudit('failed', 'Password missing from request');
        return res.status(400).json({ error: 'Password is required' });
      }

      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
        if (password === 'wrongpassword') {
          await logAudit('failed', 'Invalid local bypass password entered');
          return res.status(401).json({ error: 'Invalid password' });
        }
      } else {
        const { error: authVerifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password
        });
        if (authVerifyError) {
          await logAudit('failed', 'Invalid admin password entered');
          return res.status(401).json({ error: 'Invalid admin password' });
        }
      }

      // 3. Validate MFA if enabled
      if (dbUser.mfa_enabled) {
        if (!mfaToken) {
          await logAudit('failed', 'MFA token missing from request');
          return res.status(400).json({ error: 'MFA token is required' });
        }
        const isValidMfa = authenticator.verify({ token: mfaToken, secret: dbUser.mfa_secret });
        if (!isValidMfa) {
          await logAudit('failed', 'Invalid MFA token entered');
          return res.status(400).json({ error: 'Invalid MFA token' });
        }
      }

      // 4. Update it: set is_used = false, status = 'pending', device_id = null, used_at = null
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('device_activations')
        .update({
          is_used: false,
          status: 'pending',
          device_id: null,
          used_at: null
        })
        .eq('activation_code', code)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log success audit
      await logAudit('success');

      return res.status(200).json({
        message: 'Activation code reset successfully',
        activation: updated
      });
    } catch (error: any) {
      console.error('[DeviceController] resetActivation Error:', error.message);
      await logAudit('failed', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /devices/onboard
   * Register device from mobile client. Uses JWT tenant_id for identity.
   * Classifies device as USER_DEVICE or COMPANY_DEVICE based on terminal_inventory lookup.
   */
  static async onboardDevice(req: Request, res: Response) {
    try {
      const { deviceId, deviceInfo, themeColor } = req.body;
      const tenantId = (req as any).user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required. tenant_id missing from JWT.' });
      }
      if (!deviceId && !deviceInfo?.deviceId) {
        return res.status(400).json({ error: 'deviceId is required.' });
      }

      const resolvedDeviceId = deviceId || deviceInfo?.deviceId;
      console.log('[DeviceController] Device Onboarding:', { resolvedDeviceId, tenantId, themeColor });

      // Step 1: Check terminal_inventory to classify device
      let deviceCategory = 'USER_DEVICE';
      let deviceRole = 'PHONE';
      let inventoryRecordId: string | null = null;
      let isCompanyDeviceHardware = false;

      try {
        const { data: inventoryRecord } = await supabase
          .from('terminal_inventory')
          .select('id, terminal_type, assignment_status')
          .eq('assigned_device_id', resolvedDeviceId)
          .maybeSingle();

        if (inventoryRecord) {
          isCompanyDeviceHardware = true;
          deviceCategory = 'COMPANY_DEVICE';
          inventoryRecordId = inventoryRecord.id;
          // Map terminal_type to device_role
          const typeMap: Record<string, string> = {
            'tablet': 'TABLET', 'android': 'TABLET',
            'mpos': 'MPOS', 'dspread': 'MPOS',
            'printer': 'PRINTER', 'bluetooth': 'PRINTER'
          };
          const rawType = (inventoryRecord.terminal_type || '').toLowerCase();
          deviceRole = typeMap[rawType] || 'TABLET';
          console.log(`[DeviceController] Device found in terminal_inventory → COMPANY_DEVICE (role: ${deviceRole})`);
        } else {
          // Determine USER_DEVICE role from deviceInfo
          const platform = (deviceInfo?.platform || deviceInfo?.manufacturer || '').toLowerCase();
          deviceRole = platform.includes('tablet') ? 'BYOD' : 'PHONE';
          console.log(`[DeviceController] Device NOT in terminal_inventory → USER_DEVICE (role: ${deviceRole})`);
        }
      } catch (invErr: any) {
        if (isNetworkTimeout(invErr)) {
          return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
          });
        }
        console.warn('[DeviceController] terminal_inventory lookup failed (non-fatal):', invErr.message);
      }

      // Step 1.5: If it is a COMPANY_DEVICE, check if it's already activated in the devices table
      if (isCompanyDeviceHardware) {
        try {
          const { data: existingDevice } = await supabase
            .from('devices')
            .select('id, is_active')
            .eq('device_id', resolvedDeviceId)
            .maybeSingle();

          if (!existingDevice) {
            console.log(`[DeviceController] COMPANY_DEVICE ${resolvedDeviceId} is NOT activated yet. Rejecting onboarding.`);
            return res.status(400).json({
              error: 'Activation code required for company devices. Please redeem an activation code.'
            });
          }
          console.log(`[DeviceController] COMPANY_DEVICE ${resolvedDeviceId} is already activated. Permitting re-onboarding.`);
        } catch (dbErr: any) {
          if (isNetworkTimeout(dbErr)) {
            return res.status(503).json({
              error: 'Database unavailable',
              retryable: true,
              retryAfterMs: 2000
            });
          }
          throw dbErr;
        }
      }

      // Step 2: Upsert device record in Supabase
      const deviceRecord = {
        device_id: resolvedDeviceId,
        tenant_id: tenantId,
        device_category: deviceCategory,
        device_role: deviceRole,
        status: 'active',
        device_suffix: deviceInfo?.deviceSuffix || null,
        device_info: deviceInfo || null,
        theme_color: themeColor || null,
        inventory_record_id: inventoryRecordId,
        device_name: deviceInfo?.model || deviceInfo?.deviceName || resolvedDeviceId,
        platform: deviceInfo?.platform || 'android',
        is_active: true,
        last_seen: new Date().toISOString(),
      };

      const { data: upsertedDevice, error: upsertError } = await supabase
        .from('devices')
        .upsert(deviceRecord, { onConflict: 'device_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[DeviceController] Supabase upsert failed:', upsertError.message);
        if (isNetworkTimeout(upsertError)) {
          return res.status(503).json({
            error: 'Database unavailable',
            retryable: true,
            retryAfterMs: 2000
          });
        }
        return res.status(500).json({ error: upsertError.message });
      }

      // Step 3: Compute capability profile
      const isCompany = deviceCategory === 'COMPANY_DEVICE';
      const hasMpos = isCompany && inventoryRecordId !== null;
      const hasPrinter = isCompany && deviceRole === 'PRINTER';

      const features = {
        invoicing: true,
        inventory: true,
        customerManagement: true,
        reporting: true,
        printing: isCompany && (hasPrinter || deviceRole === 'TABLET'),
        emvPayments: isCompany && (hasMpos || deviceRole === 'MPOS'),
        cardSettlement: isCompany && (hasMpos || deviceRole === 'MPOS'),
      };

      console.log(`[DeviceController] Onboarding complete: ${resolvedDeviceId} → ${deviceCategory}/${deviceRole}`);

      return res.status(200).json({
        success: true,
        message: 'Device onboarded successfully',
        device: upsertedDevice,
        deviceCategory,
        deviceRole,
        features,
      });
    } catch (error: any) {
      console.error('[DeviceController] onboardDevice error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/devices/:deviceId/status
   */
  static async getDeviceStatus(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const user = (req as any).user;
      const role = String(user?.role || '').toLowerCase();
      const isPlatform =
        role === 'super_admin' ||
        role === 'internal_staff' ||
        role.startsWith('admin_');

      if (!isPlatform) {
        if (!user?.tenantId) {
          return res.status(403).json({ error: 'Tenant context required' });
        }
        const { data: owned, error: ownErr } = await supabase
          .from('devices')
          .select('device_id')
          .eq('device_id', deviceId)
          .eq('tenant_id', user.tenantId)
          .maybeSingle();
        if (ownErr) throw ownErr;
        if (!owned) {
          return res.status(404).json({ error: 'Device not found' });
        }
      }

      const { data, error } = await supabase.from('device_status').select('*').eq('device_id', deviceId).single();
      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/devices/:deviceId/telemetry
   */
  static async getDeviceTelemetry(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const { data, error } = await supabase.from('device_telemetry').select('*').eq('device_id', deviceId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/devices/:deviceId/alerts
   */
  static async getDeviceAlerts(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const { data, error } = await supabase.from('device_alerts').select('*').eq('device_id', deviceId).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /admin/devices/:deviceId/upgrade-to-company
   * Upgrades a USER_DEVICE to a COMPANY_DEVICE, linking it to a terminal inventory record.
   */
  static async upgradeToCompany(req: Request, res: Response) {
    try {
      const { deviceId } = req.params;
      const { inventoryRecordId } = req.body;

      if (!inventoryRecordId) {
        return res.status(400).json({ error: 'inventoryRecordId is required' });
      }

      // 1. Fetch terminal inventory record
      const { data: inventoryRecord, error: invError } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', inventoryRecordId)
        .single();

      if (invError || !inventoryRecord) {
        return res.status(404).json({ error: 'Terminal inventory record not found' });
      }

      // Map terminal type to device role
      const typeMap: Record<string, string> = {
        'tablet': 'TABLET', 'mpos': 'MPOS', 'dspread': 'MPOS',
        'printer': 'PRINTER', 'bluetooth': 'PRINTER'
      };
      const rawType = (inventoryRecord.terminal_type || '').toLowerCase();
      const deviceRole = typeMap[rawType] || 'TABLET';

      // 2. Update device in Supabase
      const { data: updatedDevice, error: updateError } = await supabase
        .from('devices')
        .update({
          device_category: 'COMPANY_DEVICE',
          device_role: deviceRole,
          inventory_record_id: inventoryRecordId
        })
        .eq('device_id', deviceId)
        .select()
        .single();

      if (updateError) {
        console.error('[DeviceController] Upgrade device failed:', updateError.message);
        return res.status(500).json({ error: 'Failed to update device record' });
      }

      // 3. Link device in terminal_inventory as well
      const { error: invUpdateError } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_device_id: deviceId,
          assignment_status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', inventoryRecordId);

      if (invUpdateError) {
        console.warn('[DeviceController] Failed to update terminal_inventory assignment:', invUpdateError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Device upgraded to company successfully',
        device: updatedDevice
      });
    } catch (error: any) {
      console.error('[DeviceController] upgradeToCompany error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}

