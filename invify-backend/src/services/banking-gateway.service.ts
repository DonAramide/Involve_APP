import { ProvidusBankAdapter } from '../integrations/banking/providus.adapter';
import { WemaBankAdapter } from '../integrations/banking/wema.adapter';
import { PaystackAdapter } from '../integrations/banking/paystack.adapter';
import { FlutterwaveAdapter } from '../integrations/banking/flutterwave.adapter';
import { RoutingEngineService } from './routing-engine.service';
import { SandboxBankingSimulationService } from './sandbox-simulation.service';

export class BankingGatewayService {
  static getAdapter(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA') {
    if (SandboxBankingSimulationService.isCircuitTripped(provider)) {
      throw new Error(`Circuit Breaker Tripped for ${provider}`);
    }

    const { ProviderCertificationService } = require('./production-readiness/ProviderCertificationService');
    if (!ProviderCertificationService.verifyAndCanExecute(provider)) {
      throw new Error(`Provider execution blocked: ${provider} has not passed all certification stages`);
    }

    switch (provider) {
      case 'PROVIDUS':
        return new ProvidusBankAdapter();
      case 'WEMA':
        return new WemaBankAdapter();
      case 'PAYSTACK':
        return new PaystackAdapter();
      case 'FLUTTERWAVE':
        return new FlutterwaveAdapter();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  static async provisionVirtualAccount(params: {
    tenantId: string;
    accountType: 'STATIC' | 'DYNAMIC';
    accountName: string;
  }) {
    const provider = await RoutingEngineService.selectOptimalProvider({
      requiredCapability: 'supports_virtual_accounts',
      amount: 0
    });
    
    const adapter = this.getAdapter(provider as any);
    return adapter.provisionVirtualAccount(params);
  }

  static async nameEnquiry(params: {
    bankCode: string;
    accountNumber: string;
  }) {
    const provider = await RoutingEngineService.selectOptimalProvider({
      requiredCapability: 'supports_name_enquiry',
      amount: 0
    });

    const adapter = this.getAdapter(provider as any);
    return adapter.nameEnquiry(params);
  }

  static async executeTransfer(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    params: {
      transferLogId: string;
      amount: number;
      fee: number;
      beneficiaryBankCode: string;
      beneficiaryAccountNumber: string;
      financialEventId?: string;
    }
  ) {
    const adapter = this.getAdapter(provider);
    return adapter.executeTransfer(params);
  }

  static async checkTransferStatus(
    provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA',
    reference: string
  ) {
    const adapter = this.getAdapter(provider);
    return adapter.checkTransferStatus(reference);
  }
}
