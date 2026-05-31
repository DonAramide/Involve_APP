// src/services/user-device.service.ts
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'user_devices_db.json');

interface UserDeviceRecord {
  id: string;
  user_id: string;
  email: string;
  device_id: string;
  device_name: string;
  status: 'approved' | 'pending' | 'blocked';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
}

function getLocalDB() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initial = { devices: [] };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  } catch (_) {
    return { devices: [] };
  }
}

function saveLocalDB(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

function isOfflineMode(): boolean {
  return process.env.OFFLINE_MOCK_AUTH === 'true';
}

export class UserDeviceService {

  static async getDevices(filters: { status?: string; search?: string; page?: string; limit?: string } = {}): Promise<{ data: UserDeviceRecord[]; total: number }> {
    if (isOfflineMode()) {
      let devices = getLocalDB().devices || [];
      if (filters.status) {
        devices = devices.filter((d: any) => d.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        devices = devices.filter((d: any) => 
          d.email.toLowerCase().includes(q) || 
          d.device_id.toLowerCase().includes(q) ||
          (d.device_name && d.device_name.toLowerCase().includes(q))
        );
      }
      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '50');
      const start = (page - 1) * limit;
      return { data: devices.slice(start, start + limit), total: devices.length };
    }

    try {
      let query = supabase.from('user_devices').select('*', { count: 'exact' });
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,device_id.ilike.%${filters.search}%,device_name.ilike.%${filters.search}%`);
      }
      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '50');
      const start = (page - 1) * limit;
      query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    } catch (err: any) {
      console.warn('[UserDeviceService] Supabase getDevices fallback:', err.message);
      return this.getDevices({ ...filters, _offline: true } as any);
    }
  }

  static async registerDevice(params: {
    userId: string;
    email: string;
    deviceId: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserDeviceRecord> {
    const db = isOfflineMode() ? getLocalDB() : null;

    // Check if user already has devices
    let hasExisting = false;
    let isAlreadyRegistered = false;
    let existingRecord: any = null;

    if (isOfflineMode()) {
      const userRecords = db.devices.filter((d: any) => d.user_id === params.userId);
      hasExisting = userRecords.length > 0;
      existingRecord = db.devices.find((d: any) => d.user_id === params.userId && d.device_id === params.deviceId);
      isAlreadyRegistered = !!existingRecord;
    } else {
      try {
        const { data: userRecords } = await supabase.from('user_devices').select('id').eq('user_id', params.userId).limit(1);
        hasExisting = !!(userRecords && userRecords.length > 0);

        const { data: matched } = await supabase.from('user_devices').select('*').eq('user_id', params.userId).eq('device_id', params.deviceId).maybeSingle();
        existingRecord = matched;
        isAlreadyRegistered = !!existingRecord;
      } catch (err: any) {
        console.warn('[UserDeviceService] Supabase register check fallback:', err.message);
        // Fallback to local DB check
        const localDb = getLocalDB();
        const userRecords = localDb.devices.filter((d: any) => d.user_id === params.userId);
        hasExisting = userRecords.length > 0;
        existingRecord = localDb.devices.find((d: any) => d.user_id === params.userId && d.device_id === params.deviceId);
        isAlreadyRegistered = !!existingRecord;
      }
    }

    if (isAlreadyRegistered) {
      return existingRecord;
    }

    // Auto-approve rule: if it's the very first device for this user ID, set status as approved.
    const initialStatus = hasExisting ? 'pending' : 'approved';
    const approvedAt = !hasExisting ? new Date().toISOString() : null;
    const approvedBy = !hasExisting ? 'system_auto' : null;

    const newRecord: UserDeviceRecord = {
      id: `dev-rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: params.userId,
      email: params.email,
      device_id: params.deviceId,
      device_name: params.deviceName || 'Web Browser Interface',
      status: initialStatus,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_at: approvedAt || undefined,
      approved_by: approvedBy || undefined
    };

    if (isOfflineMode()) {
      db.devices.push(newRecord);
      saveLocalDB(db);
      return newRecord;
    }

    try {
      const { data, error } = await supabase.from('user_devices').insert({
        user_id: newRecord.user_id,
        email: newRecord.email,
        device_id: newRecord.device_id,
        device_name: newRecord.device_name,
        status: newRecord.status,
        ip_address: newRecord.ip_address,
        user_agent: newRecord.user_agent,
        approved_at: newRecord.approved_at,
        approved_by: newRecord.approved_by
      }).select().single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('[UserDeviceService] Supabase insert failed, saving locally:', err.message);
      const localDb = getLocalDB();
      localDb.devices.push(newRecord);
      saveLocalDB(localDb);
      return newRecord;
    }
  }

  static async verifyDevice(userId: string, deviceId: string, email: string, context: { ipAddress?: string, userAgent?: string } = {}): Promise<{ isApproved: boolean; record: UserDeviceRecord }> {
    let record: any = null;

    if (isOfflineMode()) {
      const db = getLocalDB();
      record = db.devices.find((d: any) => d.user_id === userId && d.device_id === deviceId);
    } else {
      try {
        const { data, error } = await supabase.from('user_devices').select('*').eq('user_id', userId).eq('device_id', deviceId).maybeSingle();
        if (!error) record = data;
      } catch (err) {
        // Fallback
        const db = getLocalDB();
        record = db.devices.find((d: any) => d.user_id === userId && d.device_id === deviceId);
      }
    }

    if (!record) {
      // Auto-register device
      const registered = await this.registerDevice({
        userId,
        email,
        deviceId,
        deviceName: 'Unrecognized Web Browser',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      return { isApproved: registered.status === 'approved', record: registered };
    }

    return { isApproved: record.status === 'approved', record };
  }

  static async approveDevice(id: string, approvedBy: string): Promise<boolean> {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const idx = db.devices.findIndex((d: any) => d.id === id || d.device_id === id);
      if (idx === -1) return false;
      db.devices[idx].status = 'approved';
      db.devices[idx].approved_at = new Date().toISOString();
      db.devices[idx].approved_by = approvedBy;
      db.devices[idx].updated_at = new Date().toISOString();
      saveLocalDB(db);
      return true;
    }

    try {
      const { error } = await supabase.from('user_devices').update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        updated_at: new Date().toISOString()
      }).or(`id.eq.${id},device_id.eq.${id}`);
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.warn('[UserDeviceService] Supabase approve failed, running locally:', err.message);
      const db = getLocalDB();
      const idx = db.devices.findIndex((d: any) => d.id === id || d.device_id === id);
      if (idx === -1) return false;
      db.devices[idx].status = 'approved';
      db.devices[idx].approved_at = new Date().toISOString();
      db.devices[idx].approved_by = approvedBy;
      db.devices[idx].updated_at = new Date().toISOString();
      saveLocalDB(db);
      return true;
    }
  }

  static async blockDevice(id: string, blockedBy: string): Promise<boolean> {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const idx = db.devices.findIndex((d: any) => d.id === id || d.device_id === id);
      if (idx === -1) return false;
      db.devices[idx].status = 'blocked';
      db.devices[idx].updated_at = new Date().toISOString();
      saveLocalDB(db);
      return true;
    }

    try {
      const { error } = await supabase.from('user_devices').update({
        status: 'blocked',
        updated_at: new Date().toISOString()
      }).or(`id.eq.${id},device_id.eq.${id}`);
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.warn('[UserDeviceService] Supabase block failed, running locally:', err.message);
      const db = getLocalDB();
      const idx = db.devices.findIndex((d: any) => d.id === id || d.device_id === id);
      if (idx === -1) return false;
      db.devices[idx].status = 'blocked';
      db.devices[idx].updated_at = new Date().toISOString();
      saveLocalDB(db);
      return true;
    }
  }
}
