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
}
