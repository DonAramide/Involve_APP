import { Request } from 'express';
import { ResponseEnvelope } from '../types/operations.dto';
export declare function createResponse<T>(req: Request, data: T | null, meta?: any, links?: any): ResponseEnvelope<T>;
export declare function createErrorResponse(req: Request, message: string, code?: string, details?: any): ResponseEnvelope<null>;
