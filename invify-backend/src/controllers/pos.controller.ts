import { Request, Response } from 'express';
import { PosService } from '../services/pos.service';

export class PosController {
  static async processTransaction(req: Request, res: Response) {
    try {
      const { terminalId, amount, emvData } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      const response = await PosService.processTransaction({
        tenantId,
        terminalId,
        amount,
        emvData
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
      const config = req.body;
      const updatedConfig = await PosService.updateRoutingConfig(config);
      res.status(200).json(updatedConfig);
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
}

