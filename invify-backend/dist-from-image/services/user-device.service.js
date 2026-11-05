"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDeviceService = void 0;
// src/services/user-device.service.ts
const supabase_1 = require("../db/supabase");
class UserDeviceService {
    static async getDevices(filters = {}) {
        try {
            let query = supabase_1.supabase.from('user_devices').select('*', { count: 'exact' });
            if (filters.status)
                query = query.eq('status', filters.status);
            if (filters.search) {
                query = query.or(`email.ilike.%${filters.search}%,device_id.ilike.%${filters.search}%,device_name.ilike.%${filters.search}%`);
            }
            const page = parseInt(filters.page || '1');
            const limit = parseInt(filters.limit || '50');
            const start = (page - 1) * limit;
            query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
            const { data, error, count } = await query;
            if (error)
                throw error;
            return { data: data || [], total: count || 0 };
        }
        catch (err) {
            throw err;
        }
    }
    static async registerDevice(params) {
        // Check if user already has devices
        let hasExisting = false;
        let isAlreadyRegistered = false;
        let existingRecord = null;
        try {
            const { data: userRecords } = await supabase_1.supabase.from('user_devices').select('id').eq('user_id', params.userId).limit(1);
            hasExisting = !!(userRecords && userRecords.length > 0);
            const { data: matched } = await supabase_1.supabase.from('user_devices').select('*').eq('user_id', params.userId).eq('device_id', params.deviceId).maybeSingle();
            existingRecord = matched;
            isAlreadyRegistered = !!existingRecord;
        }
        catch (err) {
            throw err;
        }
        if (isAlreadyRegistered) {
            return existingRecord;
        }
        // Auto-approve rule: if it's the very first device for this user ID, set status as approved.
        const initialStatus = hasExisting ? 'pending' : 'approved';
        const approvedAt = !hasExisting ? new Date().toISOString() : null;
        const approvedBy = !hasExisting ? 'system_auto' : null;
        const newRecord = {
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
            const { data, error } = await supabase_1.supabase.from('user_devices').insert({
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
            if (error)
                throw error;
            return data;
        }
        catch (err) {
            throw err;
        }
    }
    static async verifyDevice(userId, deviceId, email, context = {}) {
        let record = null;
        try {
            const { data, error } = await supabase_1.supabase.from('user_devices').select('*').eq('user_id', userId).eq('device_id', deviceId).maybeSingle();
            if (error)
                throw error;
            record = data;
        }
        catch (err) {
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
    static async approveDevice(id, approvedBy) {
        try {
            const { error } = await supabase_1.supabase.from('user_devices').update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: approvedBy,
                updated_at: new Date().toISOString()
            }).or(`id.eq.${id},device_id.eq.${id}`);
            if (error)
                throw error;
            return true;
        }
        catch (err) {
            throw err;
        }
    }
    static async blockDevice(id, blockedBy) {
        try {
            const { error } = await supabase_1.supabase.from('user_devices').update({
                status: 'blocked',
                updated_at: new Date().toISOString()
            }).or(`id.eq.${id},device_id.eq.${id}`);
            if (error)
                throw error;
            return true;
        }
        catch (err) {
            throw err;
        }
    }
}
exports.UserDeviceService = UserDeviceService;
//# sourceMappingURL=user-device.service.js.map