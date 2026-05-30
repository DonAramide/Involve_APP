// src/services/terminal-audit.service.ts
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'terminal_inventory_db.json');

function getLocalDB() {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  } catch (_) {
    return { terminals: [], audit_log: [], import_batches: [] };
  }
}

function saveLocalDB(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

function isOfflineMode(): boolean {
  return process.env.OFFLINE_MOCK_AUTH === 'true';
}

export class TerminalAuditService {

  static async log(entry: {
    actionType: string;
    terminalId?: string;
    mposTerminalId?: string;
    oldDeviceId?: string | null;
    newDeviceId?: string | null;
    adminId: string;
    reason?: string;
    ipAddress?: string;
    metadata?: any;
  }) {
    const record = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action_type: entry.actionType,
      terminal_id: entry.terminalId || null,
      mpos_terminal_id: entry.mposTerminalId || null,
      old_device_id: entry.oldDeviceId || null,
      new_device_id: entry.newDeviceId || null,
      admin_id: entry.adminId,
      reason: entry.reason || null,
      ip_address: entry.ipAddress || null,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    };

    if (isOfflineMode()) {
      const db = getLocalDB();
      db.audit_log = db.audit_log || [];
      db.audit_log.unshift(record);
      saveLocalDB(db);
      return record;
    }

    try {
      const { data, error } = await supabase
        .from('terminal_audit_log')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error: any) {
      // Fallback: always persist the audit record locally rather than losing it
      console.warn('[TerminalAudit] Supabase failed, logging locally:', error.message);
      const db = getLocalDB();
      db.audit_log = db.audit_log || [];
      db.audit_log.unshift(record);
      saveLocalDB(db);
      return record;
    }
  }

  static async getAuditLog(filters: any = {}) {
    if (isOfflineMode()) {
      const db = getLocalDB();
      let logs = db.audit_log || [];
      if (filters.terminalId) {
        logs = logs.filter((l: any) => l.terminal_id === filters.terminalId);
      }
      if (filters.actionType) {
        logs = logs.filter((l: any) => l.action_type === filters.actionType);
      }
      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '50');
      const start = (page - 1) * limit;
      return { data: logs.slice(start, start + limit), total: logs.length };
    }
    try {
      let query = supabase.from('terminal_audit_log').select('*', { count: 'exact' });
      if (filters.terminalId) query = query.eq('terminal_id', filters.terminalId);
      if (filters.actionType) query = query.eq('action_type', filters.actionType);
      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '50');
      const start = (page - 1) * limit;
      query = query.range(start, start + limit - 1).order('created_at', { ascending: false });
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    } catch (error: any) {
      console.warn('[TerminalAudit] fallback getAuditLog:', error.message);
      // Fallback to local
      const db = getLocalDB();
      let logs = db.audit_log || [];
      if (filters.terminalId) {
        logs = logs.filter((l: any) => l.terminal_id === filters.terminalId);
      }
      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || '50');
      const start = (page - 1) * limit;
      return { data: logs.slice(start, start + limit), total: logs.length };
    }
  }
}
