// src/services/terminal-inventory.service.ts
import { supabaseAdmin } from '../db/supabase';

/** Admin inventory reads/writes must use service role — uploads already do. */
const db = () => supabaseAdmin;

function _mapAssignmentBundle(data: any) {
  return {
    terminal_id: { tid: data.terminal_id },
    mpos: data.mpos_terminal_id
      ? {
          id: data.mpos_terminal_id,
          serial_number: data.pos_serial_number || data.mpos_terminal_id,
          hardware_type: data.terminal_type || 'MPOS',
        }
      : null,
    printer: data.printer_mac_address
      ? { mac_address: data.printer_mac_address, model: data.printer_model || 'XP-58' }
      : null,
  };
}

export class TerminalInventoryService {

  static async getTablets() {
    const { data, error } = await db().from('devices').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((d: any) => {
      const info = typeof d.device_info === 'object' && d.device_info ? d.device_info : {};
      return {
        ...d,
        device_id: d.device_id || d.id,
        model: info.model || d.model || d.device_name || '',
        serial_number: d.serial_number || d.device_id || '',
      };
    });
    return { data: mapped };
  }

  static async getMposDevices() {
    const { data, error } = await db()
      .from('terminal_inventory')
      .select('*')
      .not('mpos_terminal_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((row: any) => ({
      ...row,
      serial_number: row.mpos_terminal_id || row.pos_serial_number || row.terminal_id || '',
      device_model: row.terminal_type || row.device_model || 'MPOS',
      hardware_type: row.terminal_type || row.hardware_type || 'MPOS',
    }));
    return { data: mapped };
  }

  static async getPrinters() {
    const { data, error } = await db()
      .from('terminal_inventory')
      .select('*')
      .not('printer_mac_address', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((row: any) => ({
      ...row,
      mac_address: row.printer_mac_address || '',
      model: row.printer_model || row.model || 'XP-58',
      printer_type: row.printer_type || 'Bluetooth',
    }));
    return { data: mapped };
  }

  static async getTerminalIds() {
    const { data, error } = await db()
      .from('terminal_inventory')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Bank TID rows: have bank/mid, or are TID-only (no MPOS/printer payload).
    const tids = (data || []).filter((row: any) => {
      if (row.bank_name || row.merchant_id) return true;
      return !row.mpos_terminal_id && !row.printer_mac_address;
    });
    const mapped = tids.map((row: any) => ({
      ...row,
      tid: row.terminal_id || row.tid || '',
      mid: row.merchant_id || row.mid || '',
      bank_name: row.bank_name || '',
    }));
    return { data: mapped };
  }

  static async getAssignments() {
    const { data, error } = await db()
      .from('terminal_inventory')
      .select('*')
      .eq('assignment_status', 'assigned');
    if (error) throw error;
    return { data: data || [] };
  }

  static async getAssignmentByDeviceId(deviceId: string) {
    const { data, error } = await db()
      .from('terminal_inventory')
      .select('*')
      .eq('assigned_device_id', deviceId)
      .eq('assignment_status', 'assigned')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      // Fallback: any row bound to this device (legacy rows without status filter).
      const fallback = await db()
        .from('terminal_inventory')
        .select('*')
        .eq('assigned_device_id', deviceId)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      if (!fallback.data) return null;
      return _mapAssignmentBundle(fallback.data);
    }

    return _mapAssignmentBundle(data);
  }

  static async assignHardware(data: any) {
    const tenantId = data.tenant_id || data.tenantId;
    const tabletRowId = data.tablet_id || data.tabletId;
    const mposRowId = data.mpos_id || data.mposId || data.hardwareId;
    const printerRowId = data.printer_id || data.printerId;
    const tidRowId = data.terminal_id_id || data.terminalId || data.tid_id || data.tidId;

    if (!tenantId) throw new Error('tenant_id is required');
    if (!tabletRowId) throw new Error('tablet_id is required');
    if (!tidRowId) throw new Error('Bank Terminal ID (TID) is required');

    // Resolve tablet from devices table (UUID id or device_id string).
    let tablet: any = null;
    {
      const byUuid = await db().from('devices').select('*').eq('id', tabletRowId).maybeSingle();
      tablet = byUuid.data;
      if (!tablet) {
        const byDeviceId = await db()
          .from('devices')
          .select('*')
          .eq('device_id', tabletRowId)
          .maybeSingle();
        tablet = byDeviceId.data;
      }
    }
    if (!tablet) throw new Error(`Tablet not found: ${tabletRowId}`);
    const tabletDeviceId = tablet.device_id || tablet.id;

    // Resolve bank TID row (primary assignment record).
    let tidRow: any = null;
    {
      const byUuid = await db().from('terminal_inventory').select('*').eq('id', tidRowId).maybeSingle();
      tidRow = byUuid.data;
      if (!tidRow) {
        const byTid = await db()
          .from('terminal_inventory')
          .select('*')
          .eq('terminal_id', tidRowId)
          .maybeSingle();
        tidRow = byTid.data;
      }
    }
    if (!tidRow) throw new Error(`Bank Terminal ID not found: ${tidRowId}`);
    if (String(tidRow.assignment_status || '').toLowerCase() === 'assigned') {
      throw new Error(
        `TID ${tidRow.terminal_id} is already assigned` +
          (tidRow.assigned_device_id ? ` to device ${tidRow.assigned_device_id}` : ''),
      );
    }

    // Ensure this tablet is not already bound to another active assignment.
    {
      const { data: existing } = await db()
        .from('terminal_inventory')
        .select('terminal_id')
        .eq('assigned_device_id', tabletDeviceId)
        .eq('assignment_status', 'assigned')
        .maybeSingle();
      if (existing) {
        throw new Error(
          `Tablet ${tabletDeviceId} already has TID ${existing.terminal_id} assigned. Unassign first.`,
        );
      }
    }

    let mposTerminalId = tidRow.mpos_terminal_id || null;
    let posSerial = tidRow.pos_serial_number || tabletDeviceId;
    let printerMac = tidRow.printer_mac_address || null;
    let printerModel = tidRow.printer_model || null;
    let terminalType = tidRow.terminal_type || null;
    let mposSourceId: string | null = null;
    let printerSourceId: string | null = null;

    if (mposRowId) {
      const { data: mpos } = await db()
        .from('terminal_inventory')
        .select('*')
        .eq('id', mposRowId)
        .maybeSingle();
      if (!mpos) throw new Error(`MPOS device not found: ${mposRowId}`);
      mposTerminalId = mpos.mpos_terminal_id || mpos.pos_serial_number || mpos.terminal_id;
      posSerial = mpos.pos_serial_number || mposTerminalId || posSerial;
      terminalType = mpos.terminal_type || terminalType || 'MPOS';
      if (mpos.id !== tidRow.id) mposSourceId = mpos.id;
    }

    if (printerRowId) {
      const { data: printer } = await db()
        .from('terminal_inventory')
        .select('*')
        .eq('id', printerRowId)
        .maybeSingle();
      if (!printer) throw new Error(`Printer not found: ${printerRowId}`);
      printerMac = printer.printer_mac_address || printer.mac_address || printer.terminal_id;
      printerModel = printer.printer_model || printer.model || printerModel || 'XP-58';
      if (printer.id !== tidRow.id) printerSourceId = printer.id;
    }

    // Unique indexes (idx_mpos_terminal_id / printer MAC) only allow one row per value.
    // Clear those keys on other rows BEFORE writing them onto the TID assignment row.
    if (mposTerminalId) {
      await db()
        .from('terminal_inventory')
        .update({
          mpos_terminal_id: null,
          pos_serial_number: null,
          updated_at: new Date().toISOString(),
        })
        .eq('mpos_terminal_id', mposTerminalId)
        .neq('id', tidRow.id);
    }
    if (printerMac) {
      await db()
        .from('terminal_inventory')
        .update({
          printer_mac_address: null,
          updated_at: new Date().toISOString(),
        })
        .eq('printer_mac_address', printerMac)
        .neq('id', tidRow.id);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await db()
      .from('terminal_inventory')
      .update({
        assigned_tenant_id: tenantId,
        assigned_device_id: tabletDeviceId,
        pos_serial_number: posSerial,
        mpos_terminal_id: mposTerminalId,
        printer_mac_address: printerMac,
        printer_model: printerModel,
        terminal_type: terminalType,
        assignment_status: 'assigned',
        assigned_at: now,
        updated_at: now,
        config_version: (tidRow.config_version || 1) + 1,
      })
      .eq('id', tidRow.id)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;
    if (!updated) throw new Error('Failed to update TID assignment row');

    // Remove emptied standalone MPOS/printer inventory shells (now merged into TID).
    for (const sourceId of [mposSourceId, printerSourceId]) {
      if (!sourceId || sourceId === tidRow.id) continue;
      await db().from('terminal_inventory').delete().eq('id', sourceId);
    }

    // Best-effort: stamp tablet + promote to COMPANY_DEVICE so mobile sync sees the bundle.
    try {
      await db()
        .from('devices')
        .update({
          tenant_id: tenantId,
          device_category: 'COMPANY_DEVICE',
          device_role: 'TABLET',
        })
        .eq('id', tablet.id);
    } catch (_) {
      try {
        await db()
          .from('devices')
          .update({ tenant_id: tenantId })
          .eq('id', tablet.id);
      } catch (_) {}
    }
    try {
      await db()
        .from('device_registrations')
        .update({
          tenant_id: tenantId,
          device_category: 'COMPANY_DEVICE',
          device_role: 'TABLET',
        })
        .eq('device_id', tabletDeviceId);
    } catch (_) {}

    return updated;
  }

  static async unassignHardware(assignmentId: string) {
    const { data: updated, error } = await db()
      .from('terminal_inventory')
      .update({
        assigned_tenant_id: null,
        assignment_status: 'unassigned',
        unassigned_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  static async getStats() {
    const { count: devicesCount } = await db().from('devices').select('*', { count: 'exact', head: true });
    const { count: mposCount } = await db()
      .from('terminal_inventory')
      .select('*', { count: 'exact', head: true })
      .not('mpos_terminal_id', 'is', null);
    const { count: printerCount } = await db()
      .from('terminal_inventory')
      .select('*', { count: 'exact', head: true })
      .not('printer_mac_address', 'is', null);
    const { count: terminalCount } = await db().from('terminal_inventory').select('*', { count: 'exact', head: true });
    const { count: assignedCount } = await db()
      .from('terminal_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_status', 'assigned');
    return {
      tablets: devicesCount || 0,
      mpos: mposCount || 0,
      printers: printerCount || 0,
      tids: terminalCount || 0,
      activeAssignments: assignedCount || 0,
    };
  }

  static async bulkImportDecoupled(
    rows: any[],
    batchId: string,
    adminId: string,
    importType: string = 'tablets',
    tenantId?: string,
  ) {
    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    const adminDb = supabaseAdmin;

    for (const row of rows) {
      try {
        if (importType === 'tablets') {
          if (!row.device_id) throw new Error('Missing device_id');
          const { data: existing } = await adminDb
            .from('devices')
            .select('id')
            .eq('device_id', row.device_id)
            .maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await adminDb.from('devices').insert({
            tenant_id: tenantId || null,
            device_id: row.device_id,
            device_name: row.model || 'Imported Tablet',
            device_info: { model: row.model },
            status: 'active',
          });
          if (error) throw error;
        } else if (importType === 'mpos') {
          if (!row.serial_number) throw new Error('Missing serial_number');
          const { data: existing } = await adminDb
            .from('terminal_inventory')
            .select('id')
            .eq('mpos_terminal_id', row.serial_number)
            .maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await adminDb.from('terminal_inventory').insert({
            terminal_id: row.serial_number,
            mpos_terminal_id: row.serial_number,
            pos_serial_number: row.serial_number,
            terminal_type: row.hardware_type || 'MPOS',
            assignment_status: 'unassigned',
          });
          if (error) throw error;
        } else if (importType === 'printers') {
          if (!row.mac_address) throw new Error('Missing mac_address');
          const { data: existing } = await adminDb
            .from('terminal_inventory')
            .select('id')
            .eq('printer_mac_address', row.mac_address)
            .maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          // terminal_inventory has no tenant_id column — use assigned_tenant_id only when assigning.
          const { error } = await adminDb.from('terminal_inventory').insert({
            terminal_id: row.mac_address,
            printer_mac_address: row.mac_address,
            printer_model: row.model || row.printer_type || 'XP-58',
            assignment_status: 'unassigned',
          });
          if (error) throw error;
        } else if (importType === 'tids') {
          if (!row.tid) throw new Error('Missing tid');
          const { data: existing } = await adminDb
            .from('terminal_inventory')
            .select('id')
            .eq('terminal_id', row.tid)
            .maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await adminDb.from('terminal_inventory').insert({
            terminal_id: row.tid,
            merchant_id: row.mid || null,
            bank_name: row.bank_name || null,
            assignment_status: 'unassigned',
          });
          if (error) throw error;
        } else if (importType === 'bundles') {
          if (!row.tenant_id) throw new Error('Missing tenant_id');
          const { data: existing } = await adminDb
            .from('terminal_inventory')
            .select('id')
            .eq('terminal_id', row.tid)
            .maybeSingle();
          if (existing) {
            duplicates++;
            continue;
          }
          const { error } = await adminDb.from('terminal_inventory').insert({
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
            assigned_at: new Date().toISOString(),
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
    const payload: any = { ...updates };
    if (updates.model != null || updates.device_name != null) {
      payload.device_name = updates.device_name || updates.model;
      payload.device_info = {
        ...(updates.device_info || {}),
        model: updates.model || updates.device_name,
      };
    }
    const { data, error } = await db().from('devices').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  static async updateMpos(id: string, updates: any) {
    const { data, error } = await db()
      .from('terminal_inventory')
      .update({
        mpos_terminal_id: updates.serial_number,
        pos_serial_number: updates.serial_number,
        terminal_type: updates.hardware_type || updates.device_model || 'MPOS',
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updatePrinter(id: string, updates: any) {
    const { data, error } = await db()
      .from('terminal_inventory')
      .update({
        printer_mac_address: updates.mac_address,
        printer_model: updates.model,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateTid(id: string, updates: any) {
    const payload: any = { ...updates };
    if (updates.tid != null) payload.terminal_id = updates.tid;
    if (updates.mid != null) payload.merchant_id = updates.mid;
    const { data, error } = await db().from('terminal_inventory').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
}
