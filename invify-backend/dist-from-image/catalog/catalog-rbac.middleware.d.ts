import { NextFunction, Request, Response } from 'express';
import { CatalogPermission } from './catalog-permissions';
export declare function actorFromRequest(req: Request): {
    tenantId: any;
    role: any;
    permissions: any;
    deviceId: any;
    userId: any;
};
export declare function requireCatalogPermission(permission: CatalogPermission): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
