import { Request, Response } from 'express';
export declare class ProfileController {
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static uploadPhoto(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static uploadKyc(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getKycDocuments(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getIdCard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getQrCode(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
