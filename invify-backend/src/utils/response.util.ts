import { Request } from 'express';
import { ResponseEnvelope } from '../types/operations.dto';

export function createResponse<T>(
  req: Request, 
  data: T | null, 
  meta: any = {}, 
  links: any = {}
): ResponseEnvelope<T> {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  return {
    success: true,
    data,
    meta: {
      requestId: requestId as string,
      timestamp: new Date().toISOString(),
      ...meta
    },
    links: {
      self: req.originalUrl,
      ...links
    }
  };
}

export function createErrorResponse(
  req: Request,
  message: string,
  code: string = 'INTERNAL_ERROR',
  details?: any
): ResponseEnvelope<null> {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  return {
    success: false,
    data: null,
    meta: {
      requestId: requestId as string,
      timestamp: new Date().toISOString()
    },
    error: {
      code,
      message,
      details
    }
  };
}
