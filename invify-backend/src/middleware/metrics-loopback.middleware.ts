import { Request, Response, NextFunction } from 'express';
import { isLoopbackAddress } from '../utils/socket-tenant-rooms';

/** G17: Prometheus text is loopback-only. Not a public scrape surface. */
export function requireMetricsLoopback(req: Request, res: Response, next: NextFunction) {
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  if (!isLoopbackAddress(ip)) {
    return res.status(403).json({ error: 'Metrics are only available from loopback' });
  }
  return next();
}
