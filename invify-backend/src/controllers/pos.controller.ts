import { Request, Response } from 'express';
import { PosService } from '../services/pos.service';

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

      const fs = require('fs');
      const path = require('path');
      const LOCAL_DB_PATH = path.join(process.cwd(), 'terminal_inventory_db.json');
      
      let affectedDevices: any[] = [];

      if (fs.existsSync(LOCAL_DB_PATH)) {
        const db = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
        
        let assignments: any[] = [];
        if (scopeType === 'Tenant') {
          assignments = db.assignments.filter((a: any) => a.tenant_id === targetValue && a.status === 'ACTIVE');
        } else {
          // Future expansion for Agent, Group, Category
        }

        affectedDevices = assignments.map((a: any) => {
          const tablet = db.tablets?.find((t: any) => t.id === a.tablet_id);
          const mpos = db.mpos_devices?.find((m: any) => m.id === a.mpos_id);
          const tid = db.terminal_ids?.find((t: any) => t.id === a.terminal_id_id);
          return {
            tabletModel: tablet?.model || tablet?.device_id || 'Unknown',
            tabletSerial: tablet?.serial_number || 'Unknown',
            mposModel: mpos?.device_model || mpos?.hardware_type || 'Unknown',
            mposSerial: mpos?.serial_number || 'Unknown',
            terminalId: tid?.tid || 'Unknown',
          };
        });
      }

      res.status(200).json(affectedDevices);
    } catch (error: any) {
      console.error('[POS Controller] getAffectedDevices failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

