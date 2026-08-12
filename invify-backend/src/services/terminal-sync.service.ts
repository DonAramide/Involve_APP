import { QuasarPlatformService } from './quasar-platform.service';
// src/services/terminal-sync.service.ts
import { TerminalInventoryService } from './terminal-inventory.service';
import { TerminalAuditService } from './terminal-audit.service';
import { supabaseAdmin } from '../db/supabase';
import { PosService } from './pos.service';

export class TerminalSyncService {

  private static resolveNibssEndpoint(
    activeHosts: any[],
    primaryHost: any | null,
  ): { nibssIp: string | null; nibssPort: number | null; nibssSsl: boolean } {
    const nibssHost =
      activeHosts.find((h: any) => String(h.hostCode || '').toLowerCase() === 'nibss') ||
      (String(primaryHost?.hostCode || '').toLowerCase() === 'nibss' ? primaryHost : null) ||
      null;
    return {
      nibssIp: nibssHost?.ip || null,
      nibssPort: nibssHost?.port != null ? Number(nibssHost.port) : null,
      nibssSsl: !!(nibssHost?.sslEnabled ?? (nibssHost ? true : false)),
    };
  }

  /**
   * Prefer one row when duplicates exist (maybeSingle fails on >1 with PGRST116).
   * When preferredTenantId is set, prefer that tenant's row over an arbitrary first row
   * (avoids false ACCESS_DENIED_OWNERSHIP_MISMATCH for reassigned tablets).
   */
  private static async fetchOneByDeviceId(
    table: 'device_registrations' | 'devices',
    deviceId: string,
    select: string,
    preferredTenantId?: string | null,
  ): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .eq('device_id', deviceId)
      .limit(10);

    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) return null;

    if (rows.length > 1) {
      console.warn(
        `[TerminalSync] ${table} has ${rows.length}+ rows for ${deviceId}; dedupe recommended`,
      );
    }

    if (preferredTenantId) {
      const matched = rows.find((r: any) => r.tenant_id === preferredTenantId);
      if (matched) {
        if (rows.length > 1) {
          console.log(
            `[TerminalSync] ${table}: using row for tenant ${preferredTenantId} among ${rows.length} duplicates`,
          );
        }
        return matched;
      }
    }

    return rows[0];
  }

  /**
   * Called by mobile device on startup / periodic sync.
   * Returns terminal config provisioned for the given deviceId.
   */
  static async syncTerminalForDevice(
    deviceId: string,
    enrollmentKey?: string,
    serialNumber?: string,
    androidId?: string,
    tenantId?: string
  ) {
    // Step 1: Look up device record (prefer caller's tenant when duplicates exist)
    let deviceRecord: any = null;
    try {
      deviceRecord = await this.fetchOneByDeviceId(
        'device_registrations',
        deviceId,
        '*, tenants(id, name, plan, type, support_phone, support_email, support_whatsapp, agent_code)',
        tenantId,
      );
    } catch (err) {
      console.warn(`[TerminalSync] device_registrations lookup failed for ${deviceId}:`, err);
    }

    // Fleet tablets often live in `devices` instead of device_registrations.
    if (!deviceRecord) {
      try {
        const data = await this.fetchOneByDeviceId('devices', deviceId, '*', tenantId);
        if (data) {
          deviceRecord = {
            ...data,
            device_category: data.device_category || 'USER_DEVICE',
            device_role: data.device_role || 'TABLET',
            tenant_id: data.tenant_id || tenantId || null,
          };
        }
      } catch (e) {
        console.warn('[TerminalSync] devices fallback failed (non-fatal)');
      }
    }

    // Inventory assignment is source of truth for company tablets — resolve before ownership gate.
    let inventoryAssignment: any = null;
    try {
      inventoryAssignment = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);
    } catch (e: any) {
      console.warn('[TerminalSync] inventory assignment lookup failed (non-fatal):', e?.message || e);
    }

    const inventoryTenantId = inventoryAssignment?.assigned_tenant_id || null;

    // If duplicates pointed at a stale tenant but inventory (or JWT) says current tenant, rebind.
    if (
      deviceRecord &&
      tenantId &&
      deviceRecord.tenant_id &&
      deviceRecord.tenant_id !== tenantId
    ) {
      const staleTenantId = deviceRecord.tenant_id;
      const inventoryAgrees =
        !inventoryTenantId || inventoryTenantId === tenantId;
      if (inventoryAgrees) {
        console.warn(
          `[TerminalSync] Rebinding device ${deviceId} tenant ${staleTenantId} → ${tenantId} ` +
            `(JWT tenant; inventory=${inventoryTenantId || 'n/a'})`,
        );
        deviceRecord = { ...deviceRecord, tenant_id: tenantId };
        // Point all registration/device rows for this hardware at the active tenant
        try {
          await supabaseAdmin
            .from('device_registrations')
            .update({ tenant_id: tenantId })
            .eq('device_id', deviceId);
        } catch (_) {}
        try {
          await supabaseAdmin
            .from('devices')
            .update({ tenant_id: tenantId })
            .eq('device_id', deviceId);
        } catch (_) {}
      } else {
        console.warn(
          `[TerminalSync] Device ownership spoofing detected! Device ${deviceId} belongs to tenant ${staleTenantId}, but request user is from tenant ${tenantId} (inventory=${inventoryTenantId}).`,
        );
        throw new Error('ACCESS_DENIED_OWNERSHIP_MISMATCH');
      }
    }

    const resolvedTenantId = deviceRecord?.tenant_id || tenantId || inventoryTenantId || null;

    let deviceCategory = deviceRecord?.device_category || 'USER_DEVICE';
    let deviceRole = deviceRecord?.device_role || 'PHONE';

    // Admin Assignments write to terminal_inventory — honor that even if category is stale.
    if (inventoryAssignment) {
      deviceCategory = 'COMPANY_DEVICE';
      if (!deviceRole || deviceRole === 'PHONE') deviceRole = 'TABLET';
      console.log(
        `[TerminalSync] Found terminal_inventory assignment for ${deviceId} → COMPANY_DEVICE`,
      );
      const patch = {
        device_category: 'COMPANY_DEVICE',
        device_role: deviceRole,
        tenant_id: resolvedTenantId || deviceRecord?.tenant_id || null,
      };
      try {
        await supabaseAdmin.from('device_registrations').update(patch).eq('device_id', deviceId);
      } catch (_) {}
      try {
        await supabaseAdmin.from('devices').update({
          device_category: 'COMPANY_DEVICE',
          tenant_id: patch.tenant_id,
        }).eq('device_id', deviceId);
      } catch (_) {}
    }

    // Step 2: support config
    let supportPhone = '+234 800 INVIFY';
    let supportEmail = 'support@iips.app';
    let supportWhatsapp = '+2348023552282';
    let broadcastMessage = '';

    try {
      const { data, error } = await supabaseAdmin
        .from('system_configurations')
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

    let tenantDetails = deviceRecord?.tenants || null;
    if (!tenantDetails && resolvedTenantId) {
      try {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select(
            'id, name, plan, type, support_phone, support_email, support_whatsapp, agent_code, is_emergency_locked, emergency_lock_code, status',
          )
          .eq('id', resolvedTenantId)
          .maybeSingle();
        tenantDetails = tenant;
      } catch (_) {}
    }
    if (tenantDetails) {
      if (tenantDetails.support_phone) supportPhone = tenantDetails.support_phone;
      if (tenantDetails.support_email) supportEmail = tenantDetails.support_email;
      if (tenantDetails.support_whatsapp) supportWhatsapp = tenantDetails.support_whatsapp;
    }

    const emergencyLock = {
      isEmergencyLocked: !!tenantDetails?.is_emergency_locked,
      emergencyLockCode: tenantDetails?.emergency_lock_code || null,
      tenantStatus: tenantDetails?.status || null,
    };

    // Step 3: USER_DEVICE — no bank TID / MPOS bundle
    if (deviceCategory !== 'COMPANY_DEVICE') {
      console.log(`[TerminalSync] Device ${deviceId} → USER_DEVICE. Returning capability profile.`);

      if (tenantDetails && tenantDetails.plan !== 'free' && tenantDetails.plan !== 'basic') {
        try {
          QuasarPlatformService.provisionTenant(tenantDetails).catch(e => console.error(e));
        } catch (_) {}
      }

      return {
        assigned: false,
        deviceCategory: 'USER_DEVICE',
        deviceRole,
        tenantId: resolvedTenantId,
        tenantName: tenantDetails?.name || null,
        plan: tenantDetails?.plan || null,
        type: tenantDetails?.type || null,
        ...emergencyLock,
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
        message: `No terminal assigned to this device. Device ID: ${deviceId}`,
        syncedAt: new Date().toISOString(),
      };
    }

    // Step 4: COMPANY_DEVICE — full terminal config
    console.log(`[TerminalSync] Device ${deviceId} → COMPANY_DEVICE. Fetching terminal bundle.`);

    const bundle =
      inventoryAssignment || (await TerminalInventoryService.getAssignmentByDeviceId(deviceId));

    if (bundle) {
      await TerminalAuditService.log({
        actionType: 'SYNC_SUCCESS',
        terminalId: bundle.terminal_id?.tid,
        mposTerminalId: bundle.mpos?.id,
        newDeviceId: deviceId,
        adminId: deviceId,
        tenantId: resolvedTenantId || bundle.assigned_tenant_id || null,
        adminName: tenantDetails?.name || undefined,
        reason: 'Mobile device sync',
        metadata: {
          serialNumber,
          androidId,
          enrollmentKey,
          tenant_id: resolvedTenantId || bundle.assigned_tenant_id || null,
          tenant_name: tenantDetails?.name || null,
        },
      });
    }

    const routingConfig = await PosService.getRoutingConfig();

    const activeHosts = routingConfig.hosts
      .filter((h: any) => h.isActive)
      .sort((a: any, b: any) => a.priority - b.priority);

    const expressPay = activeHosts.find((h: any) => h.hostCode === 'express_pay');
    const kimono = activeHosts.find((h: any) => h.hostCode === 'kimono');
    const activeCode = String(routingConfig.activeHost || '').toLowerCase();

    // Prefer the configured activeHost, not merely the lowest priority active row
    const primaryHost =
      activeHosts.find((h: any) => String(h.hostCode || '').toLowerCase() === activeCode) ||
      activeHosts[0] ||
      null;
    const secondaryHost = activeHosts.find((h: any) => h !== primaryHost) || null;
    const tertiaryHost =
      activeHosts.find((h: any) => h !== primaryHost && h !== secondaryHost) || null;

    const tenantCategory = tenantDetails?.type || 'retail';
    const agentCode = tenantDetails?.agent_code || null;
    const terminalGroup = PosService.resolveTerminalGroup();
    const nibssEndpoint = this.resolveNibssEndpoint(activeHosts, primaryHost);

    let tenantPolicy = null;
    if (routingConfig.tenantRoutingProfiles) {
      tenantPolicy = PosService.resolveTenantRoutingProfile({
        tenantId: resolvedTenantId,
        agentCode,
        terminalGroup,
        category: tenantCategory,
      });
    }

    console.log(
      `[TerminalSync] Profile resolve tenant=${resolvedTenantId || 'n/a'} category=${tenantCategory} ` +
        `group=${terminalGroup || 'n/a'} → ` +
        (tenantPolicy
          ? `${tenantPolicy.scopeType}/${tenantPolicy.targetValue || tenantPolicy.category} processOnDevice=${!!tenantPolicy.processOnDevice}`
          : 'none (processOnDevice defaults false)'),
    );

    const hasMpos = !!bundle?.mpos;
    const hasPrinter = !!bundle?.printer;
    const hasAssignment = !!(bundle?.terminal_id?.tid || bundle?.mpos || bundle?.printer);

    if (!hasAssignment) {
      console.warn(
        `[TerminalSync] Device ${deviceId} marked COMPANY_DEVICE but no inventory bundle found`,
      );
    }

    const configVersion = PosService.getConfigVersion();

    return {
      assigned: hasAssignment,
      success: hasAssignment,
      deviceCategory: 'COMPANY_DEVICE',
      deviceRole,
      tenantId: resolvedTenantId,
      tenantName: tenantDetails?.name || 'Business mapped via Tenant DB',
      businessName: tenantDetails?.name || null,
      plan: tenantDetails?.plan || null,
      type: tenantDetails?.type || null,
      ...emergencyLock,
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
      configVersion,
      syncedAt: new Date().toISOString(),
      printerMac: bundle?.printer?.mac_address || null,
      printerModel: bundle?.printer?.model || null,
      supportPhone,
      supportEmail,
      supportWhatsapp,
      broadcastMessage,
      message: hasAssignment
        ? null
        : `No terminal assigned to this device. Device ID: ${deviceId}`,
      activeHost: routingConfig.activeHost.toUpperCase(),
      expressPayHost: expressPay?.ip || null,
      expressPayPort: expressPay?.port || null,

      // Flat NIBSS fields (parity with kimonoIp/kimonoPort) — also on primaryHost
      nibssIp: nibssEndpoint.nibssIp,
      nibssPort: nibssEndpoint.nibssPort,
      nibssSsl: nibssEndpoint.nibssSsl,

      primaryHost,
      secondaryHost,
      tertiaryHost,

      routingRules: {
        activeHost: routingConfig.activeHost,
        failoverOrder: routingConfig.failoverOrder,
        splitThresholdNaira: routingConfig.splitThresholdNaira,
        processOnDevice: tenantPolicy?.processOnDevice ?? false,
        webhookUrl: tenantPolicy?.webhookUrl ?? null,
        preferredHosts: tenantPolicy?.preferredHosts || [],
        fallbackHosts: tenantPolicy?.fallbackHosts || [],
        amountThresholds: tenantPolicy?.amountThresholds || [],
        transactionTypeRules: tenantPolicy?.transactionTypeRules || [],
        scopeType: tenantPolicy?.scopeType || null,
        targetValue: tenantPolicy?.targetValue || tenantPolicy?.category || null,
      },
      thresholdRules: routingConfig.thresholdRulesMatrix,
      tenantPolicy,

      expressPayBaseUrl: expressPay?.baseUrl || null,
      expressPayAuthToken: expressPay?.authToken || null,
      merchantCode: expressPay?.merchantCode || null,
      terminalGroup,
      sslProfile: expressPay?.sslProfile || null,

      kimonoIp: kimono?.kimonoIp || kimono?.ip || null,
      kimonoPort: kimono?.kimonoPort || kimono?.port || null,
      kimonoSSL: kimono?.kimonoSSL || kimono?.sslEnabled || false,
      kimonoKeys: kimono?.kimonoKeys || null,
      kimonoFallbackParameters: kimono?.kimonoFallbackParameters || null,
    };
  }

  /**
   * Lightweight status check — no audit log entry.
   */
  static async getTerminalStatus(deviceId: string) {
    let deviceCategory = 'USER_DEVICE';
    let deviceRole = 'PHONE';
    try {
      const { data, error } = await supabaseAdmin
        .from('devices')
        .select('device_category, device_role')
        .eq('device_id', deviceId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        deviceCategory = data.device_category || 'USER_DEVICE';
        deviceRole = data.device_role || 'PHONE';
      }
    } catch (e) {
      // continue — inventory can still promote
    }

    const bundle = await TerminalInventoryService.getAssignmentByDeviceId(deviceId);
    if (bundle) {
      deviceCategory = 'COMPANY_DEVICE';
      if (!deviceRole || deviceRole === 'PHONE') deviceRole = 'TABLET';
    }

    if (deviceCategory !== 'COMPANY_DEVICE') {
      return {
        assigned: false,
        deviceCategory,
        deviceRole,
        features: {
          invoicing: true,
          inventory: true,
          customerManagement: true,
          reporting: true,
          printing: false,
          emvPayments: false,
          cardSettlement: false,
        },
      };
    }

    const routingConfig = await PosService.getRoutingConfig();

    const activeHosts = routingConfig.hosts
      .filter((h: any) => h.isActive)
      .sort((a: any, b: any) => a.priority - b.priority);

    const expressPay = activeHosts.find((h: any) => h.hostCode === 'express_pay');
    const kimono = activeHosts.find((h: any) => h.hostCode === 'kimono');
    const activeCode = String(routingConfig.activeHost || '').toLowerCase();

    // Prefer the configured activeHost, not merely the lowest priority active row
    const primaryHost =
      activeHosts.find((h: any) => String(h.hostCode || '').toLowerCase() === activeCode) ||
      activeHosts[0] ||
      null;
    const secondaryHost = activeHosts.find((h: any) => h !== primaryHost) || null;
    const tertiaryHost =
      activeHosts.find((h: any) => h !== primaryHost && h !== secondaryHost) || null;
    const nibssEndpoint = this.resolveNibssEndpoint(activeHosts, primaryHost);

    const hasMpos = !!bundle?.mpos;
    const hasPrinter = !!bundle?.printer;

    return {
      assigned: !!(bundle?.terminal_id?.tid || bundle?.mpos || bundle?.printer),
      deviceCategory,
      deviceRole,
      features: {
        invoicing: true,
        inventory: true,
        customerManagement: true,
        reporting: true,
        printing: hasPrinter || deviceRole === 'TABLET',
        emvPayments: hasMpos,
        cardSettlement: hasMpos,
      },
      terminalId: bundle?.terminal_id?.tid,
      mposTerminalId: bundle?.mpos?.id,
      posSerialNumber: bundle?.mpos?.serial_number,
      terminalType: bundle?.mpos?.hardware_type,
      configVersion: PosService.getConfigVersion(),
      activeHost: routingConfig.activeHost.toUpperCase(),
      expressPayHost: expressPay?.ip || null,
      expressPayPort: expressPay?.port || null,
      nibssIp: nibssEndpoint.nibssIp,
      nibssPort: nibssEndpoint.nibssPort,
      nibssSsl: nibssEndpoint.nibssSsl,
      primaryHost,
      secondaryHost,
      tertiaryHost,
      expressPayBaseUrl: expressPay?.baseUrl || null,
      expressPayAuthToken: expressPay?.authToken || null,
      terminalGroup: PosService.resolveTerminalGroup() || null,
      kimonoIp: kimono?.kimonoIp || kimono?.ip || null,
      kimonoPort: kimono?.kimonoPort || kimono?.port || null,
      kimonoSSL: kimono?.kimonoSSL || kimono?.sslEnabled || false,
    };
  }

  static async recordKeyExchangeSuccess(deviceId: string) {
    const { error } = await supabaseAdmin
      .from('devices')
      .update({
        last_key_exchange_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId);

    if (error) throw error;
    return { success: true };
  }
}
