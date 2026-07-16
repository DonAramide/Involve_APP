import { Request, Response } from 'express';
import { SyncService } from '../services/sync.service';
import { DeviceTrustService } from '../services/device-trust.service';

export class SyncController {
  static async handleSync(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
      const deviceId = req.headers['x-device-id'] as string;
      const correlationId = (req as any).correlationId || req.headers['x-correlation-id'] as string;
      
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Tenant ID required for sync' });
      }

      try {
        await DeviceTrustService.verifyDeviceOrThrow(deviceId, tenantId);
      } catch (trustError: any) {
        return res.status(403).json({ success: false, message: `Device Trust Failed: ${trustError.message}` });
      }

      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ success: false, message: 'Invalid payload: events array missing' });
      }

      const result = await SyncService.processBatch(events, { tenantId, deviceId, correlationId });

      // If everything failed, we could return 207 or 500 depending on the design.
      // Returning 207 Multi-Status provides granular details back to the worker.
      return res.status(207).json(result);
      
    } catch (err: any) {
      console.error(`[SyncController] Fatal sync error: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
