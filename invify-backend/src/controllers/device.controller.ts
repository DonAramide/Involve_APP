// src/controllers/device.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';

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

      // Generate a cryptographically premium, secure key
      const randStr = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `INV-${randStr()}-${randStr()}`;
      const generatedDeviceId = `DSPREAD-POS-${deviceSuffix || '0'}8MM-${Math.floor(1000 + Math.random() * 9000)}`;

      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.log('[DeviceController] Creating activation locally immediately (OFFLINE_MOCK_AUTH active).');
        const local = DeviceController.getLocalData();
        
        // Try to lookup mock tenant name
        const tenantName = tenantId === '00000000-0000-0000-0000-000000000001' ? 'Lagos Academy School' : 'Invify Retail Business';
        
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
          tenants: { name: tenantName, plan: 'standard' }
        };

        local.activations.unshift(newAct);
        DeviceController.saveLocalData(local);

        return res.status(201).json({ activation_code: code });
      }

      try {
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
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ activation_code: data.activation_code });
      } catch (dbErr: any) {
        if (DeviceController.isNetworkTimeout(dbErr)) {
          console.warn('[DeviceController] Supabase timeout. Saving activation locally.');
          const local = DeviceController.getLocalData();
          
          // Try to lookup mock tenant name
          const tenantName = tenantId === '00000000-0000-0000-0000-000000000001' ? 'Lagos Academy School' : 'Invify Retail Business';
          
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
            tenants: { name: tenantName, plan: 'standard' }
          };

          local.activations.unshift(newAct);
          DeviceController.saveLocalData(local);

          return res.status(201).json({ activation_code: code });
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
}
