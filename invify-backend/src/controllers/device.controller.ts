// src/controllers/device.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';
import { LicenseGenerator } from '../utils/license.util';

// Local offline DB path
const LOCAL_DB_PATH = path.join(process.cwd(), 'devices_db.json');

// Interface definition matching database rows
interface MockDevice {
  id: string;
  device_id: string;
  tenant_id: string;
  status: string;
  last_seen: string;
  created_at: string;
  tenants?: { name: string; plan: string };
}

interface MockActivation {
  id: string;
  activation_code: string;
  tenant_id: string;
  duration_days: number;
  plan_index: number;
  device_suffix: string;
  device_id?: string;
  status: string;
  is_used: boolean;
  created_at: string;
  created_by?: string;
  tenants?: { name: string; plan: string };
}

export class DeviceController {
  
  // Seed initial local fallback data safely if not exists
  private static initLocalDB() {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initialData = {
        devices: [
          {
            id: 'mock-device-1',
            device_id: 'DSPREAD-POS-80MM-0091',
            tenant_id: '00000000-0000-0000-0000-000000000001',
            status: 'active',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
            tenants: { name: 'Lagos Academy School', plan: 'standard' }
          }
        ],
        activations: [
          {
            id: 'mock-activation-1',
            activation_code: 'INV-7X9B-K4M2',
            tenant_id: '00000000-0000-0000-0000-000000000001',
            duration_days: 90,
            plan_index: 1,
            device_suffix: '0',
            status: 'pending',
            is_used: false,
            created_at: new Date().toISOString(),
            tenants: { name: 'Lagos Academy School', plan: 'standard' }
          }
        ]
      };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2));
    }
  }

  private static getLocalData() {
    this.initLocalDB();
    try {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    } catch (_) {
      return { devices: [], activations: [] };
    }
  }

  private static saveLocalData(data: any) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  }

  private static isNetworkTimeout(error: any): boolean {
    return (
      error.message?.includes('fetch failed') ||
      error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error.message?.includes('timeout') ||
      error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      process.env.OFFLINE_MOCK_AUTH === 'true'
    );
  }

  private static getTenantName(tenantId: string): { name: string; plan: string } {
    try {
      const tenantsDbPath = path.join(process.cwd(), 'tenants_db.json');
      if (fs.existsSync(tenantsDbPath)) {
        const tenants = JSON.parse(fs.readFileSync(tenantsDbPath, 'utf-8'));
        const found = tenants.find((t: any) => t.id === tenantId);
        if (found) {
          return { name: found.name, plan: found.plan || 'standard' };
        }
      }
    } catch (_) {}
    return { 
      name: tenantId === '00000000-0000-0000-0000-000000000001' ? 'Lagos Academy School' : 'Invify Retail Business',
      plan: 'standard'
    };
  }

  /**
   * GET /devices
   * Retrieves all hardware devices
   */
  static async getDevices(req: Request, res: Response) {
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      console.log('[DeviceController] Serving local mock devices immediately (OFFLINE_MOCK_AUTH active).');
      const local = DeviceController.getLocalData();
      return res.status(200).json(local.devices);
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, tenants(name, plan)')
        .order('last_seen', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      if (DeviceController.isNetworkTimeout(error)) {
        console.warn('[DeviceController] Supabase connection timed out. Serving local mock devices.');
        const local = DeviceController.getLocalData();
        return res.status(200).json(local.devices);
      }
      console.error('[DeviceController] getDevices Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /devices/activations
   * Retrieves all generated activation codes
   */
  static async getActivations(req: Request, res: Response) {
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      console.log('[DeviceController] Serving local mock activations immediately (OFFLINE_MOCK_AUTH active).');
      const local = DeviceController.getLocalData();
      return res.status(200).json(local.activations);
    }

    try {
      const { data, error } = await supabase
        .from('device_activations')
        .select('*, tenants(name, plan)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      if (DeviceController.isNetworkTimeout(error)) {
        console.warn('[DeviceController] Supabase connection timed out. Serving local mock activations.');
        const local = DeviceController.getLocalData();
        return res.status(200).json(local.activations);
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
    try {
      const { tenantId, durationDays, planIndex, deviceSuffix } = req.body;
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      // Fetch tenant name for cryptographic signature
      let businessName = 'Invify Retail Business';
      try {
        if (process.env.OFFLINE_MOCK_AUTH !== 'true') {
          const { data } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
          if (data && data.name) businessName = data.name;
        } else {
          businessName = DeviceController.getTenantName(tenantId).name;
        }
      } catch (err) {
        businessName = DeviceController.getTenantName(tenantId).name;
      }

      // Generate a cryptographically valid Base32 HMAC-SHA256 signature code
      const code = LicenseGenerator.generate(
        businessName, 
        Number(durationDays) || 30, 
        Number(planIndex) || 0, 
        deviceSuffix || '0'
      );
      
      const generatedDeviceId = `DSPREAD-POS-${deviceSuffix || '0'}8MM-${Math.floor(1000 + Math.random() * 9000)}`;

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.log('[DeviceController] Creating activation locally immediately (OFFLINE_MOCK_AUTH active).');
        const local = DeviceController.getLocalData();
        
        // Try to lookup mock tenant name
        const tenantInfo = DeviceController.getTenantName(tenantId);
        const creatorEmail = (req as any).user?.email || 'superadmin@invify.app';
        
        const newAct: MockActivation = {
          id: `act-${Date.now()}`,
          activation_code: code,
          tenant_id: tenantId,
          duration_days: Number(durationDays) || 30,
          plan_index: Number(planIndex) || 0,
          device_suffix: deviceSuffix || '0',
          device_id: generatedDeviceId,
          status: 'pending',
          is_used: false,
          created_at: new Date().toISOString(),
          created_by: creatorEmail,
          tenants: tenantInfo
        };

        local.activations.unshift(newAct);
        DeviceController.saveLocalData(local);

        return res.status(201).json({ 
          activation_code: code,
          device_id: generatedDeviceId
        });
      }

      try {
        const creatorEmail = (req as any).user?.email || 'superadmin@invify.app';
        const { data, error } = await supabase
          .from('device_activations')
          .insert({
            tenant_id: tenantId,
            activation_code: code,
            duration_days: durationDays || 30,
            plan_index: planIndex || 0,
            device_suffix: deviceSuffix || '0',
            device_id: generatedDeviceId,
            is_used: false,
            status: 'pending',
            created_by: creatorEmail
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ 
          activation_code: data.activation_code,
          device_id: data.device_id
        });
      } catch (dbErr: any) {
        if (DeviceController.isNetworkTimeout(dbErr)) {
          console.warn('[DeviceController] Supabase timeout. Saving activation locally.');
          const local = DeviceController.getLocalData();
          
          // Try to lookup mock tenant name
          const tenantInfo = DeviceController.getTenantName(tenantId);
          const creatorEmail = (req as any).user?.email || 'superadmin@invify.app';
          
          const newAct: MockActivation = {
            id: `act-${Date.now()}`,
            activation_code: code,
            tenant_id: tenantId,
            duration_days: Number(durationDays) || 30,
            plan_index: Number(planIndex) || 0,
            device_suffix: deviceSuffix || '0',
            device_id: generatedDeviceId,
            status: 'pending',
            is_used: false,
            created_at: new Date().toISOString(),
            created_by: creatorEmail,
            tenants: tenantInfo
          };

          local.activations.unshift(newAct);
          DeviceController.saveLocalData(local);

          return res.status(201).json({ 
            activation_code: code,
            device_id: generatedDeviceId
          });
        }
        throw dbErr;
      }
    } catch (error: any) {
      console.error('[DeviceController] createActivation Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /devices/validate
   * Validates a device activation key
   */
  static async validateCode(req: Request, res: Response) {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'code is required' });
      }

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.log('[DeviceController] Validating code locally immediately (OFFLINE_MOCK_AUTH active).');
        const local = DeviceController.getLocalData();
        const match = local.activations.find((a: any) => a.activation_code === code);

        if (!match) {
          return res.status(400).json({ error: 'Invalid activation code' });
        }

        if (match.is_used) {
          return res.status(400).json({ error: 'Activation code has already been used' });
        }

        // Mark it used locally
        match.is_used = true;
        match.status = 'used';
        
        // Provision a mock device for this code
        const newDev: MockDevice = {
          id: `dev-${Date.now()}`,
          device_id: match.device_id || `DSPREAD-POS-${match.device_suffix || '0'}8MM-${Math.floor(1000 + Math.random() * 9000)}`,
          tenant_id: match.tenant_id,
          status: 'active',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          tenants: match.tenants
        };
        local.devices.unshift(newDev);
        
        DeviceController.saveLocalData(local);

        return res.status(200).json({
          valid: true,
          activation_code: match.activation_code,
          duration_days: match.duration_days,
          tenant_id: match.tenant_id,
          device_id: newDev.device_id
        });
      }

      try {
        const { data, error } = await supabase
          .from('device_activations')
          .select('*')
          .eq('activation_code', code)
          .single();

        if (error || !data) {
          return res.status(400).json({ error: 'Invalid activation code' });
        }

        if (data.is_used) {
          return res.status(400).json({ error: 'Activation code has already been used' });
        }

        return res.status(200).json({
          valid: true,
          activation_code: data.activation_code,
          duration_days: data.duration_days,
          tenant_id: data.tenant_id
        });
      } catch (dbErr: any) {
        if (DeviceController.isNetworkTimeout(dbErr)) {
          console.warn('[DeviceController] Supabase timeout. Validating locally.');
          const local = DeviceController.getLocalData();
          const match = local.activations.find((a: any) => a.activation_code === code);

          if (!match) {
            return res.status(400).json({ error: 'Invalid activation code' });
          }

          if (match.is_used) {
            return res.status(400).json({ error: 'Activation code has already been used' });
          }

          // Mark it used locally
          match.is_used = true;
          match.status = 'used';
          
          // Provision a mock device for this code
          const newDev: MockDevice = {
            id: `dev-${Date.now()}`,
            device_id: match.device_id || `DSPREAD-POS-${match.device_suffix || '0'}8MM-${Math.floor(1000 + Math.random() * 9000)}`,
            tenant_id: match.tenant_id,
            status: 'active',
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
            tenants: match.tenants
          };
          local.devices.unshift(newDev);
          
          DeviceController.saveLocalData(local);

          return res.status(200).json({
            valid: true,
            activation_code: match.activation_code,
            duration_days: match.duration_days,
            tenant_id: match.tenant_id
          });
        }
        throw dbErr;
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
        if (DeviceController.isNetworkTimeout(dbErr)) {
          console.warn('[DeviceController] Supabase timeout. Updating device locally.');
          const local = DeviceController.getLocalData();
          const match = local.devices.find((d: any) => d.id === id);

          if (!match) {
            return res.status(404).json({ error: 'Device not found' });
          }

          Object.assign(match, updates);
          DeviceController.saveLocalData(local);
          return res.status(200).json(match);
        }
        throw dbErr;
      }
    } catch (error: any) {
      console.error('[DeviceController] updateDevice Error:', error.message);
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

      try {
        const { data: inventoryRecord } = await supabase
          .from('terminal_inventory')
          .select('id, terminal_type, assignment_status')
          .eq('assigned_device_id', resolvedDeviceId)
          .maybeSingle();

        if (inventoryRecord) {
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
        console.warn('[DeviceController] terminal_inventory lookup failed (non-fatal):', invErr.message);
        // Default to USER_DEVICE on lookup failure — never block onboarding
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
        return res.status(503).json({ error: 'Database unavailable', retryable: true, retryAfterMs: 2000 });
      }

      // Step 3: Compute capability profile
      const isCompany = deviceCategory === 'COMPANY_DEVICE';
      const hasMpos = isCompany && inventoryRecordId !== null; // MPOS detection refined during terminal sync
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

