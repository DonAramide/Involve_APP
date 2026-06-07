// src/services/terminal-inventory.service.ts
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_DB_PATH = path.join(process.cwd(), 'terminal_inventory_db.json');

function getLocalDB() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initial = { 
        tablets: [
          { id: 'tab-101', device_id: 'DEV-TEST-002', model: 'Tab-A7', serial_number: 'SN-TAB-002', created_at: new Date().toISOString() },
          { id: 'tab-102', device_id: 'DEV-TEST-003', model: 'Tab-A7', serial_number: 'SN-TAB-003', created_at: new Date().toISOString() }
        ], 
        mpos_devices: [
          { id: 'mpos-201', serial_number: 'DSPREAD-001', device_model: 'DSPREAD-X1', hardware_type: 'MPOS', created_at: new Date().toISOString() }
        ], 
        printers: [
          { id: 'prn-301', mac_address: '00:11:22:33:44:55', model: 'XP-58', printer_type: 'Bluetooth', created_at: new Date().toISOString() }
        ], 
        terminal_ids: [
          { id: 'tid-401', tid: '20330001', mid: 'M-9001', bank_name: 'Access', created_at: new Date().toISOString() }
        ], 
        assignments: [], 
        audit_log: [] 
      };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
  } catch (_) {
    return { tablets: [], mpos_devices: [], printers: [], terminal_ids: [], assignments: [], audit_log: [] };
  }
}

function saveLocalDB(data: any) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

function isOfflineMode(): boolean {
  return process.env.OFFLINE_MOCK_AUTH === 'true';
}

export class TerminalInventoryService {

  static async getTablets() {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('devices').select('*');
      if (error) throw error;
      return { data: data || [] };
    }
    return { data: getLocalDB().tablets };
  }

  static async getMposDevices() {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('devices').select('*');
      if (error) throw error;
      return { data: data || [] };
    }
    return { data: getLocalDB().mpos_devices };
  }

  static async getPrinters() {
    if (!isOfflineMode()) {
      return { data: [] };
    }
    return { data: getLocalDB().printers };
  }

  static async getTerminalIds() {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('terminal_inventory').select('*');
      if (error) throw error;
      return { data: data || [] };
    }
    return { data: getLocalDB().terminal_ids };
  }

  static async getAssignments() {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('terminal_inventory').select('*').eq('assignment_status', 'assigned');
      if (error) throw error;
      return { data: data || [] };
    }
    return { data: getLocalDB().assignments };
  }

  static async getAssignmentByDeviceId(deviceId: string) {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('terminal_inventory').select('*').eq('assigned_device_id', deviceId).maybeSingle();
      if (error) throw error;
      return data;
    }
    const db = getLocalDB();
    const tablet = db.tablets.find((t: any) => t.device_id === deviceId);
    if (!tablet) return null;
    
    const assignment = db.assignments.find((a: any) => a.tablet_id === tablet.id && a.status === 'ACTIVE');
    if (!assignment) return null;

    return {
      assignment,
      tablet,
      mpos: db.mpos_devices.find((m: any) => m.id === assignment.mpos_id),
      printer: db.printers.find((p: any) => p.id === assignment.printer_id),
      terminal_id: db.terminal_ids.find((t: any) => t.id === assignment.terminal_id_id)
    };
  }

  static async assignHardware(data: any) {
    if (!isOfflineMode()) {
      const tenantId = data.tenant_id || data.tenantId;
      const tabletId = data.tablet_id || data.serialNumber;
      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_tenant_id: tenantId,
          assignment_status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .or(`pos_serial_number.eq.${tabletId},terminal_id.eq.${tabletId}`)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    const db = getLocalDB();
    const newAssignment = {
      id: `asg-${Date.now()}`,
      tenant_id: data.tenant_id,
      tablet_id: data.tablet_id,
      mpos_id: data.mpos_id,
      printer_id: data.printer_id,
      terminal_id_id: data.terminal_id_id,
      status: 'ACTIVE',
      assigned_at: new Date().toISOString()
    };
    db.assignments.push(newAssignment);
    saveLocalDB(db);
    return newAssignment;
  }

  static async unassignHardware(assignmentId: string) {
    if (!isOfflineMode()) {
      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_tenant_id: null,
          assignment_status: 'unassigned',
          unassigned_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }
    const db = getLocalDB();
    const index = db.assignments.findIndex((a: any) => a.id === assignmentId);
    if (index === -1) throw new Error('Assignment not found');
    
    db.assignments[index].status = 'UNASSIGNED';
    db.assignments[index].unassigned_at = new Date().toISOString();
    
    saveLocalDB(db);
    return db.assignments[index];
  }

  static async getStats() {
    if (!isOfflineMode()) {
      const { count: devicesCount } = await supabase.from('devices').select('*', { count: 'exact', head: true });
      const { count: terminalCount } = await supabase.from('terminal_inventory').select('*', { count: 'exact', head: true });
      const { count: assignedCount } = await supabase.from('terminal_inventory').select('*', { count: 'exact', head: true }).eq('assignment_status', 'assigned');
      return {
        tablets: devicesCount || 0,
        mpos: 0,
        printers: 0,
        tids: terminalCount || 0,
        activeAssignments: assignedCount || 0
      };
    }
    const db = getLocalDB();
    return {
      tablets: (db.tablets || []).length,
      mpos: (db.mpos_devices || []).length,
      printers: (db.printers || []).length,
      tids: (db.terminal_ids || []).length,
      activeAssignments: (db.assignments || []).filter((a: any) => a.status === 'ACTIVE').length
    };
  }

  static async bulkImportDecoupled(rows: any[], batchId: string, adminId: string, importType: string = 'tablets') {
    if (!isOfflineMode()) {
      let successful = 0;
      let failed = 0;
      let duplicates = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          if (importType === 'tablets') {
            if (!row.device_id) throw new Error('Missing device_id');
            const { data: existing } = await supabase.from('devices').select('id').eq('device_id', row.device_id).maybeSingle();
            if (existing) {
              duplicates++;
              continue;
            }
            const { error } = await supabase.from('devices').insert({
              device_id: row.device_id,
              model: row.model,
              status: 'active'
            });
            if (error) throw error;
          } else if (importType === 'tids') {
            if (!row.tid) throw new Error('Missing tid');
            const { data: existing } = await supabase.from('terminal_inventory').select('id').eq('terminal_id', row.tid).maybeSingle();
            if (existing) {
              duplicates++;
              continue;
            }
            const { error } = await supabase.from('terminal_inventory').insert({
              terminal_id: row.tid,
              pos_serial_number: row.posSerialNumber || row.tid,
              terminal_type: row.terminalType || 'N3',
              assignment_status: 'unassigned'
            });
            if (error) throw error;
          }
          successful++;
        } catch (e: any) {
          failed++;
          errors.push(`Row error: ${e.message}`);
        }
      }
      return { total: rows.length, successful, failed, duplicates, errors };
    }

    const db = getLocalDB();
    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (importType === 'tablets') {
          if (!row.device_id) throw new Error('Missing device_id');
          if (db.tablets.some((t: any) => t.serial_number === row.serial_number || t.device_id === row.device_id)) {
            duplicates++;
            continue;
          }
          db.tablets.push({ id: `tab-${Date.now()}-${Math.random()}`, device_id: row.device_id, model: row.model, serial_number: row.serial_number, created_at: new Date().toISOString() });
        } else if (importType === 'mpos') {
          if (!row.serial_number) throw new Error('Missing serial_number');
          if (db.mpos_devices.some((t: any) => t.serial_number === row.serial_number)) {
            duplicates++;
            continue;
          }
          db.mpos_devices.push({ id: `mpos-${Date.now()}-${Math.random()}`, serial_number: row.serial_number, device_model: row.device_model || '', hardware_type: row.hardware_type, created_at: new Date().toISOString() });
        } else if (importType === 'printers') {
          if (!row.mac_address) throw new Error('Missing mac_address');
          if (db.printers.some((t: any) => t.mac_address === row.mac_address)) {
            duplicates++;
            continue;
          }
          db.printers.push({ id: `prn-${Date.now()}-${Math.random()}`, mac_address: row.mac_address, model: row.model, printer_type: row.printer_type, created_at: new Date().toISOString() });
        } else if (importType === 'tids') {
          if (!row.tid) throw new Error('Missing tid');
          if (db.terminal_ids.some((t: any) => t.tid === row.tid)) {
            duplicates++;
            continue;
          }
          db.terminal_ids.push({ id: `tid-${Date.now()}-${Math.random()}`, tid: row.tid, mid: row.mid, bank_name: row.bank_name, created_at: new Date().toISOString() });
        } else if (importType === 'bundles') {
          if (!row.tenant_id) throw new Error('Missing tenant_id');
          
          let tabletId = row.tablet_device_id;
          if (row.tablet_device_id && !db.tablets.some((t: any) => t.device_id === row.tablet_device_id || t.serial_number === row.tablet_device_id)) {
            tabletId = `tab-${Date.now()}-${Math.random()}`;
            db.tablets.push({ id: tabletId, device_id: row.tablet_device_id, model: row.tablet_model, serial_number: row.tablet_device_id, created_at: new Date().toISOString() });
          }

          let mposId = row.mpos_serial;
          if (row.mpos_serial && !db.mpos_devices.some((t: any) => t.serial_number === row.mpos_serial)) {
            mposId = `mpos-${Date.now()}-${Math.random()}`;
            db.mpos_devices.push({ id: mposId, serial_number: row.mpos_serial, hardware_type: row.mpos_model || 'MPOS', created_at: new Date().toISOString() });
          }

          let printerId = row.printer_mac;
          if (row.printer_mac && !db.printers.some((t: any) => t.mac_address === row.printer_mac)) {
            printerId = `prn-${Date.now()}-${Math.random()}`;
            db.printers.push({ id: printerId, mac_address: row.printer_mac, model: row.printer_model, printer_type: 'Bluetooth', created_at: new Date().toISOString() });
          }

          let tidId = row.tid;
          if (row.tid && !db.terminal_ids.some((t: any) => t.tid === row.tid)) {
            tidId = `tid-${Date.now()}-${Math.random()}`;
            db.terminal_ids.push({ id: tidId, tid: row.tid, mid: row.mid, bank_name: row.bank, email: row.email, phone: row.phone, created_at: new Date().toISOString() });
          }

          db.assignments.push({
            id: `asg-${Date.now()}-${Math.random()}`,
            tenant_id: row.tenant_id,
            tablet_id: tabletId,
            mpos_id: mposId,
            printer_id: printerId,
            terminal_id_id: tidId,
            status: 'ACTIVE',
            assigned_at: new Date().toISOString()
          });
        }
        successful++;
      } catch (e: any) {
        failed++;
        errors.push(`Row error: ${e.message}`);
      }
    }

    saveLocalDB(db);
    return { total: rows.length, successful, failed, duplicates, errors };
  }

  static async updateTablet(id: string, updates: any) {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('devices').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const db = getLocalDB();
    const index = db.tablets.findIndex((t: any) => t.id === id);
    if (index === -1) throw new Error('Tablet not found');
    
    if (updates.serial_number && db.tablets.some((t: any) => t.id !== id && t.serial_number === updates.serial_number)) {
      throw new Error('Duplicate serial number');
    }
    if (updates.device_id && db.tablets.some((t: any) => t.id !== id && t.device_id === updates.device_id)) {
      throw new Error('Duplicate device ID');
    }

    db.tablets[index] = { ...db.tablets[index], ...updates };
    saveLocalDB(db);
    return db.tablets[index];
  }

  static async updateMpos(id: string, updates: any) {
    if (!isOfflineMode()) {
      return { id, ...updates };
    }
    const db = getLocalDB();
    const index = db.mpos_devices.findIndex((t: any) => t.id === id);
    if (index === -1) throw new Error('MPOS not found');
    
    if (updates.serial_number && db.mpos_devices.some((t: any) => t.id !== id && t.serial_number === updates.serial_number)) {
      throw new Error('Duplicate serial number');
    }

    db.mpos_devices[index] = { ...db.mpos_devices[index], ...updates };
    saveLocalDB(db);
    return db.mpos_devices[index];
  }

  static async updatePrinter(id: string, updates: any) {
    if (!isOfflineMode()) {
      return { id, ...updates };
    }
    const db = getLocalDB();
    const index = db.printers.findIndex((t: any) => t.id === id);
    if (index === -1) throw new Error('Printer not found');
    
    if (updates.mac_address && db.printers.some((t: any) => t.id !== id && t.mac_address === updates.mac_address)) {
      throw new Error('Duplicate MAC address');
    }

    db.printers[index] = { ...db.printers[index], ...updates };
    saveLocalDB(db);
    return db.printers[index];
  }

  static async updateTid(id: string, updates: any) {
    if (!isOfflineMode()) {
      const { data, error } = await supabase.from('terminal_inventory').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const db = getLocalDB();
    const index = db.terminal_ids.findIndex((t: any) => t.id === id);
    if (index === -1) throw new Error('Bank TID not found');
    
    if (updates.tid && db.terminal_ids.some((t: any) => t.id !== id && t.tid === updates.tid)) {
      throw new Error('Duplicate Bank TID');
    }

    db.terminal_ids[index] = { ...db.terminal_ids[index], ...updates };
    saveLocalDB(db);
    return db.terminal_ids[index];
  }
}

