// src/services/terminal-sync.service.ts
import { TerminalInventoryService } from './terminal-inventory.service';
import { TerminalAuditService } from './terminal-audit.service';
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

export class TerminalSyncService {

  /**
   * Called by mobile device on startup / periodic sync.
   * Returns terminal config provisioned for the given deviceId.
   */
  static async syncTerminalForDevice(
    deviceId: string,
    enrollmentKey?: string,
    serialNumber?: string,
    androidId?: string,
    businessName?: string
  ) {
    // Look up the assigned terminal bundle for this device
    const bundle = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);

    let supportPhone = '+234 800 INVIFY';
    let supportEmail = 'info.iips.ng@gmail.com';
    let supportWhatsapp = '+2348023552282';
    let broadcastMessage = '';
    let tenantDetails: any = null;

    try {
      const fs = require('fs');
      const path = require('path');
      const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'global_settings.json');
      if (fs.existsSync(GLOBAL_SETTINGS_PATH)) {
        const globalSettings = JSON.parse(fs.readFileSync(GLOBAL_SETTINGS_PATH, 'utf-8'));
        if (globalSettings.support_phone) supportPhone = globalSettings.support_phone;
        if (globalSettings.support_email) supportEmail = globalSettings.support_email;
        if (globalSettings.support_whatsapp) supportWhatsapp = globalSettings.support_whatsapp;
        if (globalSettings.broadcast_message) broadcastMessage = globalSettings.broadcast_message;
      }

      // Check if terminal is assigned to a Tenant or if we have a businessName from the app
      const LOCAL_TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');
      if (fs.existsSync(LOCAL_TENANTS_DB_PATH)) {
        const tenants = JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8'));
        let tenant = null;

        if (bundle && bundle.assignment && bundle.assignment.tenant_id) {
          tenant = tenants.find((t: any) => t.id === bundle.assignment.tenant_id);
        } else if (businessName) {
          tenant = tenants.find((t: any) => t.name.toLowerCase() === businessName.toLowerCase());
        }

        if (tenant) {
          tenantDetails = tenant;
          if (tenant.support_phone) supportPhone = tenant.support_phone;
          if (tenant.support_email) supportEmail = tenant.support_email;
          if (tenant.support_whatsapp) supportWhatsapp = tenant.support_whatsapp;
        }
      }
    } catch (e) {}

    if (!bundle || !bundle.assignment) {
      console.log(`[TerminalSync] Device ${deviceId} is UNASSIGNED. Fallback lookup via businessName ('${businessName}') resolved tenantId: ${tenantDetails?.id}`);
      return {
        assigned: false,
        message: 'No terminal assigned to this device',
        supportPhone,
        supportEmail,
        supportWhatsapp,
        broadcastMessage,
        tenantId: tenantDetails?.id || null,
        plan: tenantDetails?.plan || null,
        type: tenantDetails?.type || null,
      };
    }

    console.log(`[TerminalSync] Device ${deviceId} is ASSIGNED. Found tenantId: ${tenantDetails?.id}`);

    // Record sync event in audit log
    await TerminalAuditService.log({
      actionType: 'SYNC_SUCCESS',
      terminalId: bundle.terminal_id?.tid,
      mposTerminalId: bundle.mpos?.id,
      newDeviceId: deviceId,
      adminId: deviceId,
      reason: 'Mobile device sync',
      metadata: { serialNumber, androidId, enrollmentKey },
    });

    return {
      assigned: true,
      terminalId: bundle.terminal_id?.tid,
      mposTerminalId: bundle.mpos?.id,
      posSerialNumber: bundle.mpos?.serial_number,
      businessName: tenantDetails?.name || 'Business mapped via Tenant DB', // Use tenant name if available
      terminalType: bundle.mpos?.hardware_type,
      configVersion: 1,
      syncedAt: new Date().toISOString(),
      printerMac: bundle.printer?.mac_address,
      printerModel: bundle.printer?.model,
      supportPhone,
      supportEmail,
      supportWhatsapp,
      broadcastMessage,
      tenantId: tenantDetails?.id,
      plan: tenantDetails?.plan,
      type: tenantDetails?.type,
    };
  }

  /**
   * Lightweight status check — no audit log entry.
   */
  static async getTerminalStatus(deviceId: string) {
    const bundle = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);
    if (!bundle) {
      return { assigned: false };
    }
    return {
      assigned: true,
      terminalId: bundle.terminal_id?.tid,
      mposTerminalId: bundle.mpos?.id,
      posSerialNumber: bundle.mpos?.serial_number,
      terminalType: bundle.mpos?.hardware_type,
      configVersion: 1,
    };
  }
}
