// src/services/terminal-sync.service.ts
import { TerminalInventoryService } from './terminal-inventory.service';
import { TerminalAuditService } from './terminal-audit.service';
import { supabase } from '../db/supabase';
import { PosService } from './pos.service';
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
      try {
        const { data, error } = await supabase.from('system_configurations')
          .select('config_key, config_value')
          .in('config_key', ['support_phone', 'support_email', 'support_whatsapp', 'broadcast_message']);
        
        if (!error && data && data.length > 0) {
          for (const row of data) {
            if (row.config_key === 'support_phone') supportPhone = row.config_value;
            if (row.config_key === 'support_email') supportEmail = row.config_value;
            if (row.config_key === 'support_whatsapp') supportWhatsapp = row.config_value;
            if (row.config_key === 'broadcast_message') broadcastMessage = row.config_value;
          }
        } else {
          throw error || new Error('No DB data');
        }
      } catch (dbErr) {
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

    const routingConfig = await PosService.getRoutingConfig();

    const activeHosts = routingConfig.hosts
      .filter((h: any) => h.isActive)
      .sort((a: any, b: any) => a.priority - b.priority);

    const expressPay = activeHosts.find((h: any) => h.hostCode === 'express_pay');
    const kimono = activeHosts.find((h: any) => h.hostCode === 'kimono');

    const primaryHost = activeHosts[0] || null;
    const secondaryHost = activeHosts[1] || null;
    const tertiaryHost = activeHosts[2] || null;

    const tenantCategory = tenantDetails?.type || 'retail';
    const tenantId = tenantDetails?.id;
    
    // In the future, we can extract agentCode or terminalGroup from the bundle/tenant for full matching.
    const agentCode = null; 
    const terminalGroup = null;

    let tenantPolicy = null;
    if (routingConfig.tenantRoutingProfiles) {
      // 1. Tenant match (Highest Priority)
      if (tenantId) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => p.scopeType === 'Tenant' && p.targetValue === tenantId);
      }
      
      // 2. Agent match
      if (!tenantPolicy && agentCode) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => p.scopeType === 'Agent' && p.targetValue === agentCode);
      }
      
      // 3. Group match
      if (!tenantPolicy && terminalGroup) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => p.scopeType === 'Group' && p.targetValue === terminalGroup);
      }
      
      // 4. Category / Default match (Lowest Priority)
      if (!tenantPolicy) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => {
          if (p.scopeType === 'Category' && p.targetValue) {
            return p.targetValue.toLowerCase() === tenantCategory.toLowerCase();
          }
          // Backward compatibility
          if (!p.scopeType && p.category) {
            return p.category.toLowerCase() === tenantCategory.toLowerCase();
          }
          return false;
        });
      }
    }

    return {
      assigned: true,
      terminalId: bundle.terminal_id?.tid,
      mposTerminalId: bundle.mpos?.id,
      posSerialNumber: bundle.mpos?.serial_number,
      businessName: tenantDetails?.name || 'Business mapped via Tenant DB',
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
      activeHost: routingConfig.activeHost.toUpperCase(),
      expressPayHost: expressPay?.ip || null,
      expressPayPort: expressPay?.port || null,

      primaryHost,
      secondaryHost,
      tertiaryHost,

      routingRules: {
        activeHost: routingConfig.activeHost,
        failoverOrder: routingConfig.failoverOrder,
        splitThresholdNaira: routingConfig.splitThresholdNaira,
        processOnDevice: tenantPolicy?.processOnDevice ?? false,
        webhookUrl: tenantPolicy?.webhookUrl ?? null,
      },
      thresholdRules: routingConfig.thresholdRulesMatrix,
      tenantPolicy,

      expressPayBaseUrl: expressPay?.baseUrl || null,
      expressPayAuthToken: expressPay?.authToken || null,
      merchantCode: expressPay?.merchantCode || null,
      terminalGroup: expressPay?.terminalGroup || null,
      sslProfile: expressPay?.sslProfile || null,

      kimonoIp: kimono?.kimonoIp || kimono?.ip || null,
      kimonoPort: kimono?.kimonoPort || kimono?.port || null,
      kimonoSSL: kimono?.kimonoSSL || kimono?.sslEnabled || false,
      kimonoKeys: kimono?.kimonoKeys || null,
      kimonoFallbackParameters: kimono?.kimonoFallbackParameters || null
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
    const routingConfig = await PosService.getRoutingConfig();

    const activeHosts = routingConfig.hosts
      .filter((h: any) => h.isActive)
      .sort((a: any, b: any) => a.priority - b.priority);

    const expressPay = activeHosts.find((h: any) => h.hostCode === 'express_pay');
    const kimono = activeHosts.find((h: any) => h.hostCode === 'kimono');

    const primaryHost = activeHosts[0] || null;
    const secondaryHost = activeHosts[1] || null;
    const tertiaryHost = activeHosts[2] || null;

    return {
      assigned: true,
      terminalId: bundle.terminal_id?.tid,
      mposTerminalId: bundle.mpos?.id,
      posSerialNumber: bundle.mpos?.serial_number,
      terminalType: bundle.mpos?.hardware_type,
      configVersion: 1,
      activeHost: routingConfig.activeHost.toUpperCase(),
      expressPayHost: expressPay?.ip || null,
      expressPayPort: expressPay?.port || null,

      primaryHost,
      secondaryHost,
      tertiaryHost,
      expressPayBaseUrl: expressPay?.baseUrl || null,
      expressPayAuthToken: expressPay?.authToken || null,
      kimonoIp: kimono?.kimonoIp || kimono?.ip || null,
      kimonoPort: kimono?.kimonoPort || kimono?.port || null,
      kimonoSSL: kimono?.kimonoSSL || kimono?.sslEnabled || false
    };
  }

  static async recordKeyExchangeSuccess(deviceId: string) {
    if (isOfflineMode()) {
      const db = getLocalDB();
      const index = db.tablets.findIndex((t: any) => t.device_id === deviceId);
      if (index !== -1) {
        db.tablets[index].last_key_exchange_at = new Date().toISOString();
        saveLocalDB(db);
        return { success: true };
      }
      return { success: false, message: 'Device not found' };
    } else {
      const { data, error } = await supabase.from('devices').update({
        last_key_exchange_at: new Date().toISOString()
      }).eq('device_id', deviceId);

      if (error) throw error;
      return { success: true };
    }
  }
}
