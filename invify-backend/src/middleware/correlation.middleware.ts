import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
};
