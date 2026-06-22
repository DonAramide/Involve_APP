// src/services/terminal-assignment.service.ts
import { supabase } from '../db/supabase';
import { TerminalAuditService } from './terminal-audit.service';

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
    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('terminal_id', params.terminalId)
        .maybeSingle();

      let actualTerminal = terminal;
      if (termErr || !actualTerminal) {
        const { data: byId } = await supabase.from('terminal_inventory').select('*').eq('id', params.terminalId).maybeSingle();
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
          .maybeSingle();

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
          .maybeSingle();
        
        if (hardware) {
          mposId = hardware.mpos_terminal_id;
          posSn = hardware.pos_serial_number;
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
    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', params.terminalId)
        .maybeSingle();

      let actualTerminal = terminal;
      if (termErr || !actualTerminal) {
        const { data: byTid } = await supabase.from('terminal_inventory').select('*').eq('terminal_id', params.terminalId).maybeSingle();
        actualTerminal = byTid;
      }

      if (!actualTerminal) throw new Error('Terminal not found');

      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_device_id: null,
          assigned_tenant_id: null,
          assignment_status: 'unassigned',
          unassigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualTerminal.id)
        .select()
        .single();

      if (error) throw error;

      await TerminalAuditService.log({
        actionType: 'UNASSIGNED',
        terminalId: actualTerminal.terminal_id,
        mposTerminalId: actualTerminal.mpos_terminal_id,
        oldDeviceId: actualTerminal.assigned_device_id,
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
    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', params.terminalId)
        .maybeSingle();

      let actualTerminal = terminal;
      if (termErr || !actualTerminal) {
        const { data: byTid } = await supabase.from('terminal_inventory').select('*').eq('terminal_id', params.terminalId).maybeSingle();
        actualTerminal = byTid;
      }

      if (!actualTerminal) throw new Error('Terminal not found');

      // Check target device doesn't already have a terminal
      const { data: existingForTarget } = await supabase
        .from('terminal_inventory')
        .select('terminal_id')
        .eq('assigned_device_id', params.newDeviceId)
        .eq('assignment_status', 'assigned')
        .neq('id', actualTerminal.id)
        .maybeSingle();

      if (existingForTarget) {
        throw new Error(
          `Target device already has terminal ${existingForTarget.terminal_id} assigned`
        );
      }

      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assigned_device_id: params.newDeviceId,
          assigned_tenant_id: params.newTenantId || actualTerminal.assigned_tenant_id,
          assignment_status: 'assigned',
          assigned_at: new Date().toISOString(),
          config_version: (actualTerminal.config_version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualTerminal.id)
        .select()
        .single();

      if (error) throw error;

      await TerminalAuditService.log({
        actionType: 'TRANSFERRED',
        terminalId: actualTerminal.terminal_id,
        mposTerminalId: actualTerminal.mpos_terminal_id,
        oldDeviceId: actualTerminal.assigned_device_id,
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
    try {
      const { data: terminal, error: termErr } = await supabase
        .from('terminal_inventory')
        .select('*')
        .eq('id', params.terminalId)
        .maybeSingle();

      let actualTerminal = terminal;
      if (termErr || !actualTerminal) {
        const { data: byTid } = await supabase.from('terminal_inventory').select('*').eq('terminal_id', params.terminalId).maybeSingle();
        actualTerminal = byTid;
      }

      if (!actualTerminal) throw new Error('Terminal not found');

      const { data: updated, error } = await supabase
        .from('terminal_inventory')
        .update({
          assignment_status: 'suspended',
          assigned_device_id: null,
          assigned_tenant_id: null,
          unassigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualTerminal.id)
        .select()
        .single();

      if (error) throw error;

      await TerminalAuditService.log({
        actionType: 'SUSPENDED',
        terminalId: actualTerminal.terminal_id,
        mposTerminalId: actualTerminal.mpos_terminal_id,
        oldDeviceId: actualTerminal.assigned_device_id,
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
