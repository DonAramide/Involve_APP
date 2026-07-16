"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingGatewayService = void 0;
const providus_adapter_1 = require("../integrations/banking/providus.adapter");
const wema_adapter_1 = require("../integrations/banking/wema.adapter");
const paystack_adapter_1 = require("../integrations/banking/paystack.adapter");
const flutterwave_adapter_1 = require("../integrations/banking/flutterwave.adapter");
const routing_engine_service_1 = require("./routing-engine.service");
const sandbox_simulation_service_1 = require("./sandbox-simulation.service");
class BankingGatewayService {
    static getAdapter(provider) {
        if (sandbox_simulation_service_1.SandboxBankingSimulationService.isCircuitTripped(provider)) {
            throw new Error(`Circuit Breaker Tripped for ${provider}`);
        }
        const { ProviderCertificationService } = require('./production-readiness/ProviderCertificationService');
        if (!ProviderCertificationService.verifyAndCanExecute(provider)) {
            throw new Error(`Provider execution blocked: ${provider} has not passed all certification stages`);
        }
        switch (provider) {
            case 'PROVIDUS':
                return new providus_adapter_1.ProvidusBankAdapter();
            case 'WEMA':
                return new wema_adapter_1.WemaBankAdapter();
            case 'PAYSTACK':
                return new paystack_adapter_1.PaystackAdapter();
            case 'FLUTTERWAVE':
                return new flutterwave_adapter_1.FlutterwaveAdapter();
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    static async provisionVirtualAccount(params) {
        const provider = await routing_engine_service_1.RoutingEngineService.selectOptimalProvider({
            requiredCapability: 'supports_virtual_accounts',
            amount: 0
        });
        const adapter = this.getAdapter(provider);
        const result = await adapter.provisionVirtualAccount(params);
        return { ...result, provider };
    }
    static async nameEnquiry(params) {
        const provider = await routing_engine_service_1.RoutingEngineService.selectOptimalProvider({
            requiredCapability: 'supports_name_enquiry',
            amount: 0
        });
        const adapter = this.getAdapter(provider);
        return adapter.nameEnquiry(params);
    }
    static async executeTransfer(provider, params) {
        const adapter = this.getAdapter(provider);
        return adapter.executeTransfer(params);
    }
    static async checkTransferStatus(provider, reference) {
        const adapter = this.getAdapter(provider);
        return adapter.checkTransferStatus(reference);
    }
}
exports.BankingGatewayService = BankingGatewayService;
//# sourceMappingURL=banking-gateway.service.js.map