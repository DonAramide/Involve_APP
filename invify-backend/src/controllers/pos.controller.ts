import { Request, Response } from 'express';
import { PosService } from '../services/pos.service';
import { supabase } from '../db/supabase';

export class PosController {
  static async processTransaction(req: Request, res: Response) {
    try {
      const { terminalId, amount, emvData, staffName, items, isDeviceProcessed, deviceStatus, transactionResponse, tenantProfile, deviceInfo, latitude, longitude, field120, geofencing } = req.body;
      const { resolveTenantScope } = require('../utils/resolve-tenant-scope');
      const tenantId =
        resolveTenantScope(req) ||
        (req.headers['x-tenant-id'] as string) ||
        (req as any).user?.tenantId ||
        '';

      if (!tenantId || tenantId === 'default') {
        return res.status(400).json({ error: 'Tenant context required to report POS transaction' });
      }

      if (isDeviceProcessed) {
        const response = await PosService.recordDeviceTransaction({
          tenantId,
          terminalId,
          amount,
          emvData,
          isDeviceProcessed: true,
          staffName,
          items,
          deviceStatus,
          transactionResponse,
          tenantProfile,
          deviceInfo,
          latitude,
          longitude,
          field120,
          geofencing,
        });
        return res.status(200).json(response);
      }

      const response = await PosService.processTransaction({
        tenantId,
        terminalId,
        amount,
        emvData,
        staffName,
        items,
        latitude,
        longitude,
        field120,
        geofencing,
      });

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[POS Controller] Error:', error);
      const technical = error.message || 'POS Transaction failed';
      const friendly =
        /encryption key|QUASAR_|posEncryption|pos-encryption|sk_live|sk_test|POS_SETUP/i.test(
          String(technical),
        )
          ? 'Card payments are not fully set up for this business yet. Please contact Invify support.'
          : 'Card payment could not be completed. Please try again.';
      res.status(500).json({
        paymentSuccess: false,
        statusCode: '96',
        message: friendly,
        error: friendly,
      });
    }
  }

  static async getTransactionHistory(req: Request, res: Response) {
    try {
      const { resolveTenantScope } = require('../utils/resolve-tenant-scope');
      const role = String((req as any).user?.role || '').toLowerCase();
      const isPlatform = ['super_admin', 'admin', 'agent', 'support', 'platform_admin'].includes(role);
      // Super-admin switchboard sees all tenants; tenant operators see their own.
      const tenantId = isPlatform ? '' : (resolveTenantScope(req) || '');
      const history = await PosService.getTransactionHistory(tenantId);
      res.status(200).json(Array.isArray(history) ? history : []);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch POS history' });
    }
  }

  static async getRoutingConfig(req: Request, res: Response) {
    try {
      const config = await PosService.getRoutingConfig();
      res.status(200).json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateRoutingConfig(req: Request, res: Response) {
    try {
      const { config, adminId, reason } = req.body;
      const actualConfig = config || req.body;
      const actualAdminId = adminId || req.headers['x-admin-id'] as string || 'Admin';
      const actualReason = reason || req.headers['x-audit-reason'] as string || 'Updated POS routing configuration';
      const updatedConfig = await PosService.updateRoutingConfig(actualConfig, actualAdminId, actualReason);
      res.status(200).json(updatedConfig);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getObservabilityMetrics(req: Request, res: Response) {
    try {
      const metrics = await PosService.getObservabilityMetrics();
      res.status(200).json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async simulateRoute(req: Request, res: Response) {
    try {
      const {
        amount,
        tenantCategory,
        tenantId,
        agentCode,
        terminalGroup,
        transactionType,
        cardScheme,
        hostHealthOverrides
      } = req.body;
      const route = PosService.determineRoute(
        Number(amount),
        tenantId || tenantCategory || 'Retail',
        transactionType || 'PURCHASE',
        cardScheme || 'VISA',
        hostHealthOverrides,
        {
          category: tenantCategory || null,
          agentCode: agentCode || null,
          terminalGroup: terminalGroup || PosService.resolveTerminalGroup(),
        }
      );
      const matchedProfile = PosService.resolveTenantRoutingProfile({
        tenantId: tenantId || null,
        agentCode: agentCode || null,
        terminalGroup: terminalGroup || PosService.resolveTerminalGroup(),
        category: tenantCategory || 'Retail',
      });
      res.status(200).json({
        routeName: route.name,
        config: route.config,
        matchedProfile: matchedProfile
          ? {
              scopeType: matchedProfile.scopeType || 'Category',
              targetValue: matchedProfile.targetValue || matchedProfile.category,
              preferredHosts: matchedProfile.preferredHosts || [],
              fallbackHosts: matchedProfile.fallbackHosts || [],
            }
          : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Force-refresh the Kimono terminal params cache for a specific terminal.
   * Useful after key rotation at Cpoint.
   * POST /admin/pos/kimono-params/refresh  { terminalId }
   */
  static async refreshKimonoParams(req: Request, res: Response) {
    try {
      const { terminalId } = req.body;
      if (!terminalId) {
        return res.status(400).json({ error: 'terminalId is required' });
      }
      PosService.clearKimonoParamsCache(terminalId);
      const freshParams = await PosService.fetchKimonoParams(terminalId);
      res.status(200).json({
        message: `Terminal params refreshed for ${terminalId}`,
        code: freshParams.code,
        terminalId: freshParams.terminalId
      });
    } catch (error: any) {
      console.error('[POS Controller] Kimono params refresh failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Debug endpoint — parses a raw hex ISO8583 message and returns decoded fields.
   * POST /api/pos/test-iso  { hexMessage: "0210..." }
   * Protected by authenticate middleware in app.ts.
   */
  static async testIso(req: Request, res: Response) {
    try {
      const { hexMessage } = req.body;
      if (!hexMessage || typeof hexMessage !== 'string') {
        return res.status(400).json({ error: 'hexMessage (string) is required' });
      }

      const buf = Buffer.from(hexMessage, 'hex');
      const result = PosService.parseIsoMessage(buf, 'TEST-ISO');

      res.status(200).json({
        inputLength: buf.length,
        responseCode: result.responseCode,
        approved: result.responseCode === '00',
        fields: result.isoFields,
      });
    } catch (error: any) {
      console.error('[POS Controller] testIso failed:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getAffectedDevices(req: Request, res: Response) {
    try {
      const { scopeType, targetValue } = req.query;
      if (!scopeType || !targetValue) {
        return res.status(400).json({ error: 'scopeType and targetValue are required' });
      }

      let tenantIds: string[] = [];

      if (scopeType === 'Tenant') {
        tenantIds = [String(targetValue)];
      } else if (scopeType === 'Agent') {
        const { data: agentTenants, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('agent_code', targetValue);
        if (error) throw error;
        tenantIds = (agentTenants || []).map((t: any) => t.id);
      } else if (scopeType === 'Category') {
        const { data: catTenants, error } = await supabase
          .from('tenants')
          .select('id, type')
          .ilike('type', String(targetValue));
        if (error) throw error;
        tenantIds = (catTenants || []).map((t: any) => t.id);
      } else if (scopeType === 'Group') {
        // Group profiles match host terminalGroup. If target is Default (or matches
        // resolved group), return all assigned company devices.
        const hostGroup = PosService.resolveTerminalGroup();
        const target = String(targetValue).toLowerCase();
        const matches =
          (hostGroup && String(hostGroup).toLowerCase() === target) ||
          target === 'default';
        if (matches) {
          const { data: allAssigned, error } = await supabase
            .from('terminal_inventory')
            .select('terminal_id, mpos_terminal_id, terminal_type, assigned_device_id, assigned_tenant_id')
            .eq('assignment_status', 'assigned');
          if (error) throw error;
          const assignments = allAssigned || [];
          const deviceIds = assignments.map((a: any) => a.assigned_device_id).filter(Boolean);
          let devices: any[] = [];
          if (deviceIds.length > 0) {
            const { data, error: devErr } = await supabase
              .from('devices')
              .select('device_id, device_name, device_info')
              .in('device_id', deviceIds);
            if (devErr) throw devErr;
            devices = data || [];
          }
          const affectedDevices = assignments.map((a: any) => {
            const device = devices.find((d: any) => d.device_id === a.assigned_device_id);
            return {
              tabletModel: device?.device_info?.model || device?.device_name || 'Unknown',
              tabletSerial: device?.device_id || 'Unknown',
              mposModel: a.terminal_type || 'Unknown',
              mposSerial: a.mpos_terminal_id || 'Unknown',
              terminalId: a.terminal_id || 'Unknown',
            };
          });
          return res.status(200).json(affectedDevices);
        }
        return res.status(200).json([]);
      }

      let affectedDevices: any[] = [];

      if (tenantIds.length > 0) {
        const { data: assignments, error: err } = await supabase
          .from('terminal_inventory')
          .select('terminal_id, mpos_terminal_id, terminal_type, assigned_device_id')
          .in('assigned_tenant_id', tenantIds)
          .eq('assignment_status', 'assigned');

        if (err) throw err;

        if (assignments && assignments.length > 0) {
          const deviceIds = assignments.map((a: any) => a.assigned_device_id).filter(Boolean);
          let devices: any[] = [];
          if (deviceIds.length > 0) {
            const { data, error: devErr } = await supabase
              .from('devices')
              .select('device_id, device_name, device_info')
              .in('device_id', deviceIds);
            if (devErr) throw devErr;
            devices = data || [];
          }

          affectedDevices = assignments.map((a: any) => {
            const device = devices.find((d: any) => d.device_id === a.assigned_device_id);
            return {
              tabletModel: device?.device_info?.model || device?.device_name || 'Unknown',
              tabletSerial: device?.device_id || 'Unknown',
              mposModel: a.terminal_type || 'Unknown',
              mposSerial: a.mpos_terminal_id || 'Unknown',
              terminalId: a.terminal_id || 'Unknown',
            };
          });
        }
      }

      res.status(200).json(affectedDevices);
    } catch (error: any) {
      console.error('[POS Controller] getAffectedDevices failed:', error);
      if (PosController.isNetworkTimeout(error)) {
        return res.status(503).json({
          error: 'Database unavailable',
          retryable: true,
          retryAfterMs: 2000
        });
      }
      res.status(500).json({ error: error.message });
    }
  }

  private static isNetworkTimeout(error: any): boolean {
    return (
      error.message?.includes('fetch failed') ||
      error.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error.message?.includes('timeout') ||
      error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      process.env.OFFLINE_LOCAL_AUTH === 'true'
    );
  }
}

