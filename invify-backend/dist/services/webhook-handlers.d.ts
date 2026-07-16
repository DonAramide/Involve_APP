export declare class IncomingWebhookHandlers {
    private static verificationEngine;
    static handleWebhook(params: {
        provider: 'PROVIDUS' | 'WEMA' | 'PAYSTACK' | 'FLUTTERWAVE';
        payload: any;
        signature: string;
    }): Promise<{
        status: string;
    }>;
}
