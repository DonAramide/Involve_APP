import { Request, Response } from 'express';
export declare class ProductCatalogController {
    /**
     * GET /api/agent/catalog/products
     */
    getMasterProducts(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/agent/catalog/offers
     */
    getHmoOffers(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/agent/catalog/offers
     */
    configureOfferPrice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * GET /api/agent/catalog/assignments
     */
    listAssignments(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/agent/catalog/assignments
     */
    assignProduct(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * DELETE /api/agent/catalog/assignments/:id
     */
    revokeAssignment(req: Request, res: Response): Promise<void>;
}
export declare const productCatalogController: ProductCatalogController;
