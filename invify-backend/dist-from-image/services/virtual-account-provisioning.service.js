"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualAccountProvisioningService = void 0;
const banking_gateway_service_1 = require("./banking-gateway.service");
const supabase_1 = require("../db/supabase");
class VirtualAccountProvisioningService {
    static async provision(params) {
        const result = await banking_gateway_service_1.BankingGatewayService.provisionVirtualAccount({
            tenantId: params.tenantId,
            accountType: params.accountType,
            accountName: params.accountName
        });
        // Record virtual account mapping in DB
        const { error } = await supabase_1.supabaseAdmin.from('virtual_accounts').insert({
            tenant_id: params.tenantId,
            account_number: result.accountNumber,
            bank_name: result.bankName,
            account_name: params.accountName,
            provider: result.provider,
            is_active: true,
            expires_at: result.expiresAt || null,
            financial_event_id: params.financialEventId || null
        });
        if (error) {
            throw new Error(`Failed to save virtual account: ${error.message}`);
        }
        return result;
    }
}
exports.VirtualAccountProvisioningService = VirtualAccountProvisioningService;
//# sourceMappingURL=virtual-account-provisioning.service.js.map