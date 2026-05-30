// src/services/terminal-assignment.service.ts
import { supabase } from '../db/supabase';
import * as fs from 'fs';
import * as path from 'path';
import { TerminalInventoryService } from './terminal-inventory.service';
import { TerminalAuditService } from './terminal-audit.service';

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

export class TerminalAssignmentService {

  static async assign(params: {
    terminalId: string;
    hardwareId?: string;
    deviceId: string;
    tenantId?: string;
    adminId: string;
    reason?: string;
    ipAddress?: string;
  }) {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const terminal = db.terminals.find(
        (t: any) => t.id === params.terminalId || t.terminal_id === params.terminalId
      );

      if (!terminal) throw new Error('Terminal not found');
      if (terminal.assignment_status === 'assigned') {
        throw new Error(
          `Terminal ${terminal.terminal_id} is already assigned to device ${terminal.assigned_device_id}`
        );
      }
      if (terminal.assignment_status === 'suspended') {
        throw new Error('Terminal is suspended and cannot be assigned');
      }

      // Check if device already has a terminal assigned
      if (params.deviceId) {
        const existingForDevice = db.terminals.find(
          (t: any) =>
            t.assigned_device_id === params.deviceId && t.assignment_status === 'assigned'
        );
        if (existingForDevice) {
          throw new Error(
            `Device ${params.deviceId} already has terminal ${existingForDevice.terminal_id} assigned. Unassign first.`
          );
        }
      }

      // Hardware Binding
      let mposId = terminal.mpos_terminal_id;
      let posSn = terminal.pos_serial_number;
      if (params.hardwareId) {
        const hardware = db.terminals.find((t: any) => t.id === params.hardwareId);
        if (hardware) {
          mposId = hardware.mpos_terminal_id;
          posSn = hardware.pos_serial_number;
          // Remove the unbound hardware record now that it's bound to a logical TID
          db.terminals = db.terminals.filter((t: any) => t.id !== params.hardwareId);
        }
      }

      Object.assign(terminal, {
        mpos_terminal_id: mposId,
        pos_serial_number: posSn,
        assigned_device_id: params.deviceId || null,
        assigned_tenant_id: params.tenantId || null,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString(),
        config_version: (terminal.config_version || 1) + 1,
        updated_at: new Date().toISOString(),
      });

      saveLocalDB(db);

      await TerminalAuditService.log({
        actionType: 'ASSIGNED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId: null,
        newDeviceId: params.deviceId || null,
        adminId: params.adminId,
        reason: params.reason || 'Terminal and Hardware bound and assigned',
        ipAddress: params.ipAddress,
      });

      return terminal;
    }

    // Online Supabase path
    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('terminal_id', params.terminalId) // Look up by terminal_id instead of id in case we pass the string
        .single();

      // If looking up by string failed, try looking up by ID
      let actualTerminal = terminal;
      if (!actualTerminal) {
        const { data: byId } = await supabase.from('terminal_inventory').select('*').eq('id', params.terminalId).single();
        actualTerminal = byId;
      }

      if (!actualTerminal) throw new Error('Bank Terminal ID not found');
      if (actualTerminal.assignment_status === 'assigned') {
        throw new Error(`Terminal already assigned to device ${actualTerminal.assigned_device_id}`);
      }
      if (actualTerminal.assignment_status === 'suspended') {
        throw new Error('Terminal is suspended and cannot be assigned');
      }

      // Check if target device already has an assigned terminal
      if (params.deviceId) {
        const { data: existingAssignment } = await supabase
          .from('terminal_inventory')
          .select('terminal_id')
          .eq('assigned_device_id', params.deviceId)
          .eq('assignment_status', 'assigned')
          .single();

        if (existingAssignment) {
          throw new Error(
            `Device already has terminal ${existingAssignment.terminal_id} assigned. Unassign first.`
          );
        }
      }

      // Hardware Binding logic
      let mposId = actualTerminal.mpos_terminal_id;
      let posSn = actualTerminal.pos_serial_number;
      if (params.hardwareId) {
        const { data: hardware } = await supabase
          .from('terminal_inventory')
          .select('*')
          .eq('id', params.hardwareId)
          .single();
        
        if (hardware) {
          mposId = hardware.mpos_terminal_id;
          posSn = hardware.pos_serial_number;
          // Delete the hardware record since its properties are migrating to the logical TID
          await supabase.from('terminal_inventory').delete().eq('id', params.hardwareId);
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from('terminal_inventory')
        .update({
          mpos_terminal_id: mposId,
          pos_serial_number: posSn,
          assigned_device_id: params.deviceId || null,
          assigned_tenant_id: params.tenantId || null,
          assignment_status: 'assigned',
          assigned_at: new Date().toISOString(),
          config_version: (actualTerminal.config_version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualTerminal.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await TerminalAuditService.log({
        actionType: 'ASSIGNED',
        terminalId: updated.terminal_id,
        mposTerminalId: updated.mpos_terminal_id,
        oldDeviceId: null,
        newDeviceId: params.deviceId || null,
        adminId: params.adminId,
        reason: params.reason || 'Terminal assigned to device',
        ipAddress: params.ipAddress,
      });

      return updated;
    } catch (error: any) {
      throw error;
    }
  }

  static async unassign(params: {
    terminalId: string;
    adminId: string;
    reason: string;
    ipAddress?: string;
  }) {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const terminal = db.terminals.find(
        (t: any) => t.id === params.terminalId || t.terminal_id === params.terminalId
      );
      if (!terminal) throw new Error('Terminal not found');

      const oldDeviceId = terminal.assigned_device_id;

      Object.assign(terminal, {
        assigned_device_id: null,
        assigned_tenant_id: null,
        assignment_status: 'unassigned',
        unassigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      saveLocalDB(db);

      await TerminalAuditService.log({
        actionType: 'UNASSIGNED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId,
        newDeviceId: null,
        adminId: params.adminId,
        reason: params.reason,
        ipAddress: params.ipAddress,
      });

      return terminal;
    }

    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', params.terminalId)
        .single();

      if (termErr || !terminal) throw new Error('Terminal not found');

      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_device_id: null,
          assigned_tenant_id: null,
          assignment_status: 'unassigned',
          unassigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.terminalId)
        .select()
        .single();

      if (error) throw error;

      await TerminalAuditService.log({
        actionType: 'UNASSIGNED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId: terminal.assigned_device_id,
        newDeviceId: null,
        adminId: params.adminId,
        reason: params.reason,
        ipAddress: params.ipAddress,
      });

      return updated;
    } catch (error: any) {
      throw error;
    }
  }

  static async transfer(params: {
    terminalId: string;
    newDeviceId: string;
    newTenantId?: string;
    adminId: string;
    reason: string;
    ipAddress?: string;
  }) {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const terminal = db.terminals.find(
        (t: any) => t.id === params.terminalId || t.terminal_id === params.terminalId
      );
      if (!terminal) throw new Error('Terminal not found');

      // Check target device doesn't already have a terminal
      const existingForTarget = db.terminals.find(
        (t: any) =>
          t.assigned_device_id === params.newDeviceId &&
          t.assignment_status === 'assigned' &&
          t.id !== terminal.id
      );
      if (existingForTarget) {
        throw new Error(
          `Target device ${params.newDeviceId} already has terminal ${existingForTarget.terminal_id} assigned`
        );
      }

      const oldDeviceId = terminal.assigned_device_id;

      Object.assign(terminal, {
        assigned_device_id: params.newDeviceId,
        assigned_tenant_id: params.newTenantId || terminal.assigned_tenant_id,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString(),
        config_version: (terminal.config_version || 1) + 1,
        updated_at: new Date().toISOString(),
      });

      saveLocalDB(db);

      await TerminalAuditService.log({
        actionType: 'TRANSFERRED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId,
        newDeviceId: params.newDeviceId,
        adminId: params.adminId,
        reason: params.reason,
        ipAddress: params.ipAddress,
      });

      return terminal;
    }

    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', params.terminalId)
        .single();

      if (termErr || !terminal) throw new Error('Terminal not found');

      // Check target device doesn't already have a terminal
      const { data: existingForTarget } = await supabase
        .from('terminal_inventory')
        .select('terminal_id')
        .eq('assigned_device_id', params.newDeviceId)
        .eq('assignment_status', 'assigned')
        .neq('id', params.terminalId)
        .single();

      if (existingForTarget) {
        throw new Error(
          `Target device already has terminal ${existingForTarget.terminal_id} assigned`
        );
      }

      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_device_id: params.newDeviceId,
          assigned_tenant_id: params.newTenantId || terminal.assigned_tenant_id,
          assignment_status: 'assigned',
          assigned_at: new Date().toISOString(),
          config_version: (terminal.config_version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.terminalId)
        .select()
        .single();

      if (error) throw error;

      await TerminalAuditService.log({
        actionType: 'TRANSFERRED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId: terminal.assigned_device_id,
        newDeviceId: params.newDeviceId,
        adminId: params.adminId,
        reason: params.reason,
        ipAddress: params.ipAddress,
      });

      return updated;
    } catch (error: any) {
      throw error;
    }
  }

  static async suspend(params: {
    terminalId: string;
    adminId: string;
    reason: string;
    ipAddress?: string;
  }) {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const terminal = db.terminals.find(
        (t: any) => t.id === params.terminalId || t.terminal_id === params.terminalId
      );
      if (!terminal) throw new Error('Terminal not found');

      const oldDeviceId = terminal.assigned_device_id;

      Object.assign(terminal, {
        assignment_status: 'suspended',
        assigned_device_id: null,
        assigned_tenant_id: null,
        unassigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      saveLocalDB(db);

      await TerminalAuditService.log({
        actionType: 'SUSPENDED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId,
        newDeviceId: null,
        adminId: params.adminId,
        reason: params.reason,
        ipAddress: params.ipAddress,
      });

      return terminal;
    }

    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', params.terminalId)
        .single();

      if (termErr || !terminal) throw new Error('Terminal not found');

      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assignment_status: 'suspended',
          assigned_device_id: null,
          assigned_tenant_id: null,
          unassigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.terminalId)
        .select()
        .single();

      if (error) throw error;

      await TerminalAuditService.log({
        actionType: 'SUSPENDED',
        terminalId: terminal.terminal_id,
        mposTerminalId: terminal.mpos_terminal_id,
        oldDeviceId: terminal.assigned_device_id,
        newDeviceId: null,
        adminId: params.adminId,
        reason: params.reason,
        ipAddress: params.ipAddress,
      });

      return updated;
    } catch (error: any) {
      throw error;
    }
  }
}
