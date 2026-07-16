import { Request, Response } from 'express';
export declare class PaymentController {
    /**
     * POST /payments/create
     * Initiates the payment workflow by persisting a record and creating a Quaser intent.
     */
    static createPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /payments/initialize
     * Direct multi-processor checkout gateway initialisation layer (Stripe/Paystack/Flutterwave).
     */
    static initializeGatewayCheckout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
