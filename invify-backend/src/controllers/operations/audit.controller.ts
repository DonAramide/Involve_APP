import { Request, Response } from 'express';
import { OperationsFacade } from '../../services/operations.facade';
import { createResponse, createErrorResponse } from '../../utils/response.util';

export class AuditController {
  static async listLogs(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json(createErrorResponse(req, 'Unauthorized', 'UNAUTHORIZED'));

      const logs = await OperationsFacade.listAuditLogs(tenantId);
      
      return res.status(200).json(createResponse(req, logs, { total: logs.length, page: 1, pageSize: 50 }));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse(req, error.message, 'LIST_AUDIT_ERROR'));
    }
  }
}
