import { NextFunction, Request, Response } from 'express';
export declare const apkUploadMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare class ApkController {
    static getVault(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uploadApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static downloadApk(req: Request, res: Response): Promise<void | Response<any, Record<string, any>>>;
    static removeApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateApkUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deployApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uninstallApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
