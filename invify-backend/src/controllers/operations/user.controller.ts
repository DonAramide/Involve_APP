import { Request, Response } from 'express';
import { OperationsFacade } from '../../services/operations.facade';
import { createResponse, createErrorResponse } from '../../utils/response.util';

export class UserController {
  static async listUsers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json(createErrorResponse(req, 'Unauthorized', 'UNAUTHORIZED'));

      const users = await OperationsFacade.listUsers(tenantId);
      
      return res.status(200).json(createResponse(req, users, { total: users.length, page: 1, pageSize: 50 }));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse(req, error.message, 'LIST_USERS_ERROR'));
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) return res.status(401).json(createErrorResponse(req, 'Unauthorized', 'UNAUTHORIZED'));

      const user = await OperationsFacade.createUser(tenantId, req.body);
      
      return res.status(201).json(createResponse(req, user));
    } catch (error: any) {
      return res.status(500).json(createErrorResponse(req, error.message, 'CREATE_USER_ERROR'));
    }
  }
}
