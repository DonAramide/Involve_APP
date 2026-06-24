import { SandboxProviderAdapter } from '../integrations/banking/sandbox-simulator';
import { RoutingEngineService } from './routing-engine.service';

export class BankingGatewayService {
  static getAdapter(provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA') {
    return new SandboxProviderAdapter(provider);
  }

  static async provisionVirtualAccount(params: {
    tenantId: string;
    accountType: 'STATIC' | 'DYNAMIC';
    accountName: string;
  }) {
    // Dynamically resolve provider with virtual account capability
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
    // Resolve provider with name enquiry capability
    const provider = await RoutingEngineService.selectOptimalProvider({
      requiredCapability: 'supports_name_enquiry',
      amount: 0
    });

    const adapter = this.getAdapter(provider as any);
    return adapter.nameEnquiry(params);
  }
}
