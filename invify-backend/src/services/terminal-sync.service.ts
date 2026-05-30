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
    androidId?: string
  ) {
    // Look up the assigned terminal bundle for this device
    const bundle = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);

    let supportPhone = '+234 800 INVIFY';
    try {
      const fs = require('fs');
      const path = require('path');
      const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'global_settings.json');
      if (fs.existsSync(GLOBAL_SETTINGS_PATH)) {
        const globalSettings = JSON.parse(fs.readFileSync(GLOBAL_SETTINGS_PATH, 'utf-8'));
        if (globalSettings.support_phone) {
          supportPhone = globalSettings.support_phone;
        }
      } else {
        const { supabase } = require('../db/supabase');
        const { data } = await supabase.from('global_settings').select('*').eq('id', 1).single();
        if (data && data.support_phone) {
          supportPhone = data.support_phone;
        }
      }
    } catch (e) {}

    if (!bundle || !bundle.assignment) {
      return {
        assigned: false,
        message: 'No terminal assigned to this device',
        supportPhone,
      };
    }

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
      businessName: 'Business mapped via Tenant DB', // Need to pull from tenants_db if required
      terminalType: bundle.mpos?.hardware_type,
      configVersion: 1,
      syncedAt: new Date().toISOString(),
      printerMac: bundle.printer?.mac_address,
      printerModel: bundle.printer?.model
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
