import { Request, Response } from 'express';
import { PosService } from '../services/pos.service';
import { supabase } from '../db/supabase';

export class PosController {
  static async processTransaction(req: Request, res: Response) {
    try {
      const { terminalId, amount, emvData, staffName, items, isDeviceProcessed, deviceStatus, transactionResponse, tenantProfile, deviceInfo } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

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
          deviceInfo
        });
        return res.status(200).json(response);
      }

      const response = await PosService.processTransaction({
        tenantId,
        terminalId,
        amount,
        emvData,
        staffName,
        items
      });

      res.status(200).json(response);
    } catch (error: any) {
      console.error('[POS Controller] Error:', error);
      res.status(500).json({ error: error.message || 'POS Transaction failed' });
    }
  }

  static async getTransactionHistory(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const history = await PosService.getTransactionHistory(tenantId);
      res.status(200).json(history);
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
      const { amount, tenantCategory, transactionType, cardScheme, hostHealthOverrides } = req.body;
      const route = PosService.determineRoute(
        Number(amount),
        tenantCategory || 'Retail',
        transactionType || 'PURCHASE',
        cardScheme || 'VISA',
        hostHealthOverrides
      );
      res.status(200).json({
        routeName: route.name,
        config: route.config
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

      let affectedDevices: any[] = [];

      if (scopeType === 'Tenant') {
        const { data: assignments, error: err } = await supabase
          .from('terminal_inventory')
          .select('terminal_id, mpos_terminal_id, terminal_type, assigned_device_id')
          .eq('assigned_tenant_id', targetValue)
          .eq('assignment_status', 'assigned');

        if (err) throw err;

        if (assignments && assignments.length > 0) {
          const deviceIds = assignments.map(a => a.assigned_device_id).filter(Boolean);
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
            const device = devices.find(d => d.device_id === a.assigned_device_id);
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
      process.env.OFFLINE_MOCK_AUTH === 'true'
    );
  }
}

