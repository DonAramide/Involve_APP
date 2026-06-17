import { QuasarPlatformService } from './quasar-platform.service';
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
   * Never returns { assigned: false } — all devices are valid.
   */
  static async syncTerminalForDevice(
    deviceId: string,
    enrollmentKey?: string,
    serialNumber?: string,
    androidId?: string,
    tenantId?: string
  ) {
    // Step 1: Look up device record from Supabase to get device_category and tenant_id
    let deviceRecord: any = null;
    try {
      const { data } = await supabase
        .from('devices')
        .select('*, tenants(id, name, plan, type, support_phone, support_email, support_whatsapp, agent_code)')
        .eq('device_id', deviceId)
        .maybeSingle();
      deviceRecord = data;
    } catch (err) {
      console.warn(`[TerminalSync] Device lookup failed for ${deviceId}:`, err);
    }

    const resolvedTenantId = deviceRecord?.tenant_id || tenantId || null;

    if (deviceRecord && tenantId && deviceRecord.tenant_id !== tenantId) {
      console.warn(`[TerminalSync] Device ownership spoofing detected! Device ${deviceId} belongs to tenant ${deviceRecord.tenant_id}, but request user is from tenant ${tenantId}.`);
      throw new Error('ACCESS_DENIED_OWNERSHIP_MISMATCH');
    }

    const deviceCategory = deviceRecord?.device_category || 'USER_DEVICE';
    const deviceRole = deviceRecord?.device_role || 'PHONE';

    // Step 2: Fetch global support config from system_configurations
    let supportPhone = '+234 800 INVIFY';
    let supportEmail = 'info.iips.ng@gmail.com';
    let supportWhatsapp = '+2348023552282';
    let broadcastMessage = '';

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
      }
    } catch (e) {
      console.warn('[TerminalSync] system_configurations lookup failed (non-fatal)');
    }

    // Override support details with tenant-specific values if available
    const tenantDetails = deviceRecord?.tenants || null;
    if (tenantDetails) {
      if (tenantDetails.support_phone) supportPhone = tenantDetails.support_phone;
      if (tenantDetails.support_email) supportEmail = tenantDetails.support_email;
      if (tenantDetails.support_whatsapp) supportWhatsapp = tenantDetails.support_whatsapp;
    }

    // Step 3: USER_DEVICE branch — return capabilities without terminal config
    if (deviceCategory !== 'COMPANY_DEVICE') {
      console.log(`[TerminalSync] Device ${deviceId} → USER_DEVICE. Returning capability profile.`);

      // Quasar provisioning for eligible tenants
      if (tenantDetails && tenantDetails.plan !== 'free' && tenantDetails.plan !== 'basic') {
        try {
          QuasarPlatformService.provisionTenant(tenantDetails).catch(e => console.error(e));
        } catch (_) {}
      }

      return {
        deviceCategory: 'USER_DEVICE',
        deviceRole,
        tenantId: resolvedTenantId,
        tenantName: tenantDetails?.name || null,
        plan: tenantDetails?.plan || null,
        type: tenantDetails?.type || null,
        features: {
          invoicing: true,
          inventory: true,
          customerManagement: true,
          reporting: true,
          printing: false,
          emvPayments: false,
          cardSettlement: false,
        },
        supportPhone,
        supportEmail,
        supportWhatsapp,
        broadcastMessage,
        syncedAt: new Date().toISOString(),
      };
    }

    // Step 4: COMPANY_DEVICE branch — full terminal config
    console.log(`[TerminalSync] Device ${deviceId} → COMPANY_DEVICE. Fetching terminal bundle.`);

    const bundle = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);

    // Record sync event in audit log
    if (bundle) {
      await TerminalAuditService.log({
        actionType: 'SYNC_SUCCESS',
        terminalId: bundle.terminal_id?.tid,
        mposTerminalId: bundle.mpos?.id,
        newDeviceId: deviceId,
        adminId: deviceId,
        reason: 'Mobile device sync',
        metadata: { serialNumber, androidId, enrollmentKey },
      });
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

    const tenantCategory = tenantDetails?.type || 'retail';
    const agentCode = tenantDetails?.agent_code || null;
    const terminalGroup = null;

    let tenantPolicy = null;
    if (routingConfig.tenantRoutingProfiles) {
      if (resolvedTenantId) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => p.scopeType === 'Tenant' && p.targetValue === resolvedTenantId);
      }
      if (!tenantPolicy && agentCode) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => p.scopeType === 'Agent' && p.targetValue === agentCode);
      }
      if (!tenantPolicy && terminalGroup) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => p.scopeType === 'Group' && p.targetValue === terminalGroup);
      }
      if (!tenantPolicy) {
        tenantPolicy = routingConfig.tenantRoutingProfiles.find((p: any) => {
          if (p.scopeType === 'Category' && p.targetValue) {
            return p.targetValue.toLowerCase() === tenantCategory.toLowerCase();
          }
          if (!p.scopeType && p.category) {
            return p.category.toLowerCase() === tenantCategory.toLowerCase();
          }
          return false;
        });
      }
    }

    // Determine COMPANY_DEVICE features based on bundle contents
    const hasMpos = !!(bundle?.mpos);
    const hasPrinter = !!(bundle?.printer);

    return {
      deviceCategory: 'COMPANY_DEVICE',
      deviceRole,
      tenantId: resolvedTenantId,
      tenantName: tenantDetails?.name || 'Business mapped via Tenant DB',
      plan: tenantDetails?.plan || null,
      type: tenantDetails?.type || null,
      features: {
        invoicing: true,
        inventory: true,
        customerManagement: true,
        reporting: true,
        printing: hasPrinter || deviceRole === 'TABLET',
        emvPayments: hasMpos,
        cardSettlement: hasMpos,
      },
      terminalId: bundle?.terminal_id?.tid || null,
      mposTerminalId: bundle?.mpos?.id || null,
      posSerialNumber: bundle?.mpos?.serial_number || null,
      terminalType: bundle?.mpos?.hardware_type || null,
      configVersion: 1,
      syncedAt: new Date().toISOString(),
      printerMac: bundle?.printer?.mac_address || null,
      printerModel: bundle?.printer?.model || null,
      supportPhone,
      supportEmail,
      supportWhatsapp,
      broadcastMessage,
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
   * Returns device_category and features for all devices.
   */
  static async getTerminalStatus(deviceId: string) {
    // Look up device record for category
    let deviceCategory = 'USER_DEVICE';
    let deviceRole = 'PHONE';
    try {
      const { data } = await supabase.from('devices')
        .select('device_category, device_role')
        .eq('device_id', deviceId)
        .maybeSingle();
      if (data) {
        deviceCategory = data.device_category || 'USER_DEVICE';
        deviceRole = data.device_role || 'PHONE';
      }
    } catch (_) {}

    // USER_DEVICE — minimal response
    if (deviceCategory !== 'COMPANY_DEVICE') {
      return {
        deviceCategory,
        deviceRole,
        features: {
          invoicing: true, inventory: true, customerManagement: true, reporting: true,
          printing: false, emvPayments: false, cardSettlement: false,
        },
      };
    }

    // COMPANY_DEVICE — include terminal config
    const bundle = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);
    const routingConfig = await PosService.getRoutingConfig();

    const activeHosts = routingConfig.hosts
      .filter((h: any) => h.isActive)
      .sort((a: any, b: any) => a.priority - b.priority);

    const expressPay = activeHosts.find((h: any) => h.hostCode === 'express_pay');
    const kimono = activeHosts.find((h: any) => h.hostCode === 'kimono');

    const primaryHost = activeHosts[0] || null;
    const secondaryHost = activeHosts[1] || null;
    const tertiaryHost = activeHosts[2] || null;

    const hasMpos = !!(bundle?.mpos);
    const hasPrinter = !!(bundle?.printer);

    return {
      deviceCategory,
      deviceRole,
      features: {
        invoicing: true, inventory: true, customerManagement: true, reporting: true,
        printing: hasPrinter || deviceRole === 'TABLET',
        emvPayments: hasMpos,
        cardSettlement: hasMpos,
      },
      terminalId: bundle?.terminal_id?.tid,
      mposTerminalId: bundle?.mpos?.id,
      posSerialNumber: bundle?.mpos?.serial_number,
      terminalType: bundle?.mpos?.hardware_type,
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
