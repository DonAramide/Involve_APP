// src/services/terminal-inventory.service.ts
import { supabase, supabaseAdmin } from '../db/supabase';

export class TerminalInventoryService {

  static async getTablets() {
    const { data, error } = await supabase.from('devices').select('*');
    if (error) throw error;
    return { data: data || [] };
  }

  static async getMposDevices() {
    const { data, error } = await supabase.from('devices').select('*');
    if (error) throw error;
    return { data: data || [] };
  }

  static async getPrinters() {
    // Return empty array since printers are consolidated into terminal_inventory
    return { data: [] };
  }

  static async getTerminalIds() {
    const { data, error } = await supabase.from('terminal_inventory').select('*');
    if (error) throw error;
    return { data: data || [] };
  }

  static async getAssignments() {
    const { data, error } = await supabase.from('terminal_inventory').select('*').eq('assignment_status', 'assigned');
    if (error) throw error;
    return { data: data || [] };
  }

  static async getAssignmentByDeviceId(deviceId: string) {
    const { data, error } = await supabase
      .from('terminal_inventory')
      .select('*')
      .eq('assigned_device_id', deviceId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      terminal_id: { tid: data.terminal_id },
      // Return null for missing assignments rather than empty objects
      mpos: data.mpos_terminal_id 
        ? { id: data.mpos_terminal_id, serial_number: data.pos_serial_number || data.mpos_terminal_id, hardware_type: data.terminal_type || 'MPOS' } 
        : null,
      printer: data.printer_mac_address 
        ? { mac_address: data.printer_mac_address, model: data.printer_model || 'XP-58' } 
        : null
    };
  }

  static async assignHardware(data: any) {
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

  static async unassignHardware(assignmentId: string) {
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

  static async getStats() {
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

  static async bulkImportDecoupled(rows: any[], batchId: string, adminId: string, importType: string = 'tablets', tenantId?: string) {
    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    // Use supabaseAdmin to bypass RLS — bulk import is a SUPER_ADMIN operation
    const db = supabaseAdmin;

    for (const row of rows) {
      try {
        if (importType === 'tablets') {
          if (!row.device_id) throw new Error('Missing device_id');
          const { data: existing } = await db.from('devices').select('id').eq('device_id', row.device_id).maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await db.from('devices').insert({
            tenant_id: tenantId || null,
            device_id: row.device_id,
            device_name: row.model || 'Imported Tablet',
            device_info: { model: row.model },
            status: 'active'
          });
          if (error) throw error;
        } else if (importType === 'mpos') {
          if (!row.serial_number) throw new Error('Missing serial_number');
          const { data: existing } = await db.from('terminal_inventory').select('id').eq('mpos_terminal_id', row.serial_number).maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await db.from('terminal_inventory').insert({
            tenant_id: tenantId || null,
            terminal_id: row.serial_number,
            mpos_terminal_id: row.serial_number,
            pos_serial_number: row.serial_number,
            terminal_type: row.hardware_type || 'MPOS',
            assignment_status: 'unassigned'
          });
          if (error) throw error;
        } else if (importType === 'printers') {
          if (!row.mac_address) throw new Error('Missing mac_address');
          const { data: existing } = await db.from('terminal_inventory').select('id').eq('printer_mac_address', row.mac_address).maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await db.from('terminal_inventory').insert({
            tenant_id: tenantId || null,
            terminal_id: row.mac_address,
            printer_mac_address: row.mac_address,
            printer_model: row.model || 'XP-58',
            assignment_status: 'unassigned'
          });
          if (error) throw error;
        } else if (importType === 'tids') {
          if (!row.tid) throw new Error('Missing tid');
          const { data: existing } = await db.from('terminal_inventory').select('id').eq('terminal_id', row.tid).maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await db.from('terminal_inventory').insert({
            terminal_id: row.tid,
            merchant_id: row.mid || null,
            bank_name: row.bank_name || null,
            assignment_status: 'unassigned'
          });
          if (error) throw error;
        } else if (importType === 'bundles') {
          if (!row.tenant_id) throw new Error('Missing tenant_id');
          const { data: existing } = await db.from('terminal_inventory').select('id').eq('terminal_id', row.tid).maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await db.from('terminal_inventory').insert({
            terminal_id: row.tid,
            merchant_id: row.mid || null,
            bank_name: row.bank || null,
            assigned_tenant_id: row.tenant_id,
            assigned_device_id: row.tablet_device_id || null,
            pos_serial_number: row.tablet_device_id || null,
            mpos_terminal_id: row.mpos_serial || null,
            printer_mac_address: row.printer_mac || null,
            printer_model: row.printer_model || null,
            assignment_status: 'assigned',
            assigned_at: new Date().toISOString()
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

  static async updateTablet(id: string, updates: any) {
    const { data, error } = await supabase.from('devices').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  static async updateMpos(id: string, updates: any) {
    const { data, error } = await supabase
      .from('terminal_inventory')
      .update({
        mpos_terminal_id: updates.serial_number,
        terminal_type: updates.hardware_type || updates.device_model || 'MPOS'
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updatePrinter(id: string, updates: any) {
    const { data, error } = await supabase
      .from('terminal_inventory')
      .update({
        printer_mac_address: updates.mac_address,
        printer_model: updates.model
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateTid(id: string, updates: any) {
    const { data, error } = await supabase.from('terminal_inventory').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
