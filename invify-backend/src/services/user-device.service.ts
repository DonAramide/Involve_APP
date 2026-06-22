// src/services/user-device.service.ts
import { supabase } from '../db/supabase';

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



export class UserDeviceService {

  static async getDevices(filters: { status?: string; search?: string; page?: string; limit?: string } = {}): Promise<{ data: UserDeviceRecord[]; total: number }> {
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
      throw err;
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
    // Check if user already has devices
    let hasExisting = false;
    let isAlreadyRegistered = false;
    let existingRecord: any = null;

    try {
      const { data: userRecords } = await supabase.from('user_devices').select('id').eq('user_id', params.userId).limit(1);
      hasExisting = !!(userRecords && userRecords.length > 0);

      const { data: matched } = await supabase.from('user_devices').select('*').eq('user_id', params.userId).eq('device_id', params.deviceId).maybeSingle();
      existingRecord = matched;
      isAlreadyRegistered = !!existingRecord;
    } catch (err: any) {
      throw err;
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
      throw err;
    }
  }

  static async verifyDevice(userId: string, deviceId: string, email: string, context: { ipAddress?: string, userAgent?: string } = {}): Promise<{ isApproved: boolean; record: UserDeviceRecord }> {
    let record: any = null;

    try {
      const { data, error } = await supabase.from('user_devices').select('*').eq('user_id', userId).eq('device_id', deviceId).maybeSingle();
      if (error) throw error;
      record = data;
    } catch (err) {
      throw err;
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
      throw err;
    }
  }

  static async blockDevice(id: string, blockedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_devices').update({
        status: 'blocked',
        updated_at: new Date().toISOString()
      }).or(`id.eq.${id},device_id.eq.${id}`);
      if (error) throw error;
      return true;
    } catch (err: any) {
      throw err;
    }
  }
}
