import { Request, Response } from 'express';
import { OperationsFacade } from '../../services/operations.facade';
import { createResponse, createErrorResponse } from '../../utils/response.util';

export class SettingsController {
  static async updateSettings(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { group } = req.params;
      
      if (!tenantId) return res.status(401).json(createErrorResponse(req, 'Unauthorized', 'UNAUTHORIZED'));
      if (!group) return res.status(400).json(createErrorResponse(req, 'Group is required', 'BAD_REQUEST'));

      const settings = await OperationsFacade.updateSettingsGroup(tenantId, group, req.body);
      
      return res.status(200).json(createResponse(req, settings));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse(req, error.message, 'UPDATE_SETTINGS_ERROR'));
    }
  }
}
