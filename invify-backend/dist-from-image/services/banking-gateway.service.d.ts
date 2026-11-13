import { ProvidusBankAdapter } from '../integrations/banking/providus.adapter';
import { WemaBankAdapter } from '../integrations/banking/wema.adapter';
import { PaystackAdapter } from '../integrations/banking/paystack.adapter';
import { FlutterwaveAdapter } from '../integrations/banking/flutterwave.adapter';
export declare class BankingGatewayService {
    static getAdapter(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA'): FlutterwaveAdapter | PaystackAdapter | ProvidusBankAdapter | WemaBankAdapter;
    static provisionVirtualAccount(params: {
        tenantId: string;
        accountType: 'STATIC' | 'DYNAMIC';
        accountName: string;
    }): Promise<{
        provider: string;
        accountNumber: string;
        bankName: string;
        expiresAt?: string;
    }>;
    static nameEnquiry(params: {
        bankCode: string;
        accountNumber: string;
    }): Promise<{
        accountName: string;
        isVerified: boolean;
    }>;
    static executeTransfer(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', params: {
        transferLogId: string;
        amount: number;
        fee: number;
        beneficiaryBankCode: string;
        beneficiaryAccountNumber: string;
        financialEventId?: string;
    }): Promise<{
        providerReference: string;
        status: "SUCCESS" | "FAILED" | "PENDING" | "TIMEOUT";
    }>;
    static checkTransferStatus(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA', reference: string): Promise<{
        status: "SUCCESS" | "FAILED" | "PENDING";
    }>;
}
