import { Request, Response } from 'express';
export declare const apkUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare class ApkController {
    static getVault(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uploadApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static removeApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateApkUrl(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deployApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static uninstallApk(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
