import { Request, Response } from 'express';
export declare class PaymentController {
    /**
     * POST /payments/create | POST /payments/intents
     * Initiates the payment workflow by persisting a record and creating a Quaser intent.
     */
    static createPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /payments/initialize
     * Direct multi-processor checkout gateway initialisation layer (Stripe/Paystack/Flutterwave).
     */
    static initializeGatewayCheckout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPaymentIntent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static cancelPaymentIntent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPaymentHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static refundPaymentIntent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
