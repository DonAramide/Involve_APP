"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WemaBankAdapter = void 0;
const credential_resolver_service_1 = require("../../services/credential-resolver.service");
const sandbox_simulation_service_1 = require("../../services/sandbox-simulation.service");
const supabase_1 = require("../../db/supabase");
const crypto = __importStar(require("crypto"));
class WemaBankAdapter {
    provider = 'WEMA';
    async audit(requestType, capability, requestPayload, responsePayload, statusCode, financialEventId) {
        const reqStr = JSON.stringify(requestPayload);
        const resStr = JSON.stringify(responsePayload);
        const reqHash = crypto.createHash('sha256').update(reqStr).digest('hex');
        const resHash = crypto.createHash('sha256').update(resStr).digest('hex');
        const latency = sandbox_simulation_service_1.SandboxBankingSimulationService.getLatency(this.provider);
        await supabase_1.supabaseAdmin.from('provider_api_audit_logs').insert({
            provider: this.provider,
            capability: capability,
            financial_event_id: financialEventId || null,
            request_hash: reqHash,
            response_hash: resHash,
            status_code: statusCode,
            latency_ms: latency,
            request_type: requestType
        });
    }
    async provisionVirtualAccount(params) {
        await credential_resolver_service_1.CredentialResolverService.resolve(this.provider);
        const forced = sandbox_simulation_service_1.SandboxBankingSimulationService.getForcedStatus(this.provider);
        if (forced === 'TIMEOUT')
            throw new Error('Gateway Timeout');
        if (forced === 'FAILED')
            throw new Error('Provisioning failed');
        const accountNumber = '20' + Math.floor(10000000 + Math.random() * 90000000).toString();
        const result = {
            accountNumber,
            bankName: 'Wema Bank',
            expiresAt: params.accountType === 'DYNAMIC' ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : undefined
        };
        await this.audit('VA_CREATION', 'supports_virtual_accounts', params, result, 200);
        return result;
    }
    async nameEnquiry(params) {
        await credential_resolver_service_1.CredentialResolverService.resolve(this.provider);
        const forced = sandbox_simulation_service_1.SandboxBankingSimulationService.getForcedStatus(this.provider);
        if (forced === 'TIMEOUT')
            throw new Error('Gateway Timeout');
        if (forced === 'FAILED')
            throw new Error('Name enquiry failed');
        const result = {
            accountName: 'WEMA MOCK RECIPIENT',
            isVerified: true
        };
        await this.audit('NAME_ENQUIRY', 'supports_name_enquiry', params, result, 200);
        return result;
    }
    async executeTransfer(params) {
        await credential_resolver_service_1.CredentialResolverService.resolve(this.provider);
        const forced = sandbox_simulation_service_1.SandboxBankingSimulationService.getForcedStatus(this.provider);
        if (forced === 'TIMEOUT') {
            await this.audit('TRANSFER', 'supports_nip_transfer', params, { error: 'Timeout' }, 504, params.financialEventId);
            return { providerReference: `ref_wema_err_${Date.now()}`, status: 'TIMEOUT' };
        }
        if (forced === 'FAILED') {
            await this.audit('TRANSFER', 'supports_nip_transfer', params, { error: 'Failed' }, 400, params.financialEventId);
            return { providerReference: `ref_wema_err_${Date.now()}`, status: 'FAILED' };
        }
        const ref = `ref_wema_${Date.now()}`;
        const result = {
            providerReference: ref,
            status: forced || 'SUCCESS'
        };
        await this.audit('TRANSFER', 'supports_nip_transfer', params, result, 200, params.financialEventId);
        return result;
    }
    async checkTransferStatus(reference) {
        await credential_resolver_service_1.CredentialResolverService.resolve(this.provider);
        const result = { status: 'SUCCESS' };
        await this.audit('TRANSFER_STATUS', 'supports_nip_transfer', { reference }, result, 200);
        return result;
    }
    async validateWebhook(payload, signature) {
        if (!signature)
            return false;
        return signature === 'wema_signature_token';
    }
    async getHealthMetrics() {
        const latency = sandbox_simulation_service_1.SandboxBankingSimulationService.getLatency(this.provider);
        const failed = sandbox_simulation_service_1.SandboxBankingSimulationService.getForcedStatus(this.provider) === 'FAILED';
        return {
            latencyMs: latency,
            errorRate: failed ? 1.00 : 0.00
        };
    }
}
exports.WemaBankAdapter = WemaBankAdapter;
//# sourceMappingURL=wema.adapter.js.map