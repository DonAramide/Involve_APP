"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxProviderAdapter = void 0;
class SandboxProviderAdapter {
    provider;
    static forcedStatus = {};
    static latencyOverrides = {};
    constructor(provider) {
        this.provider = provider;
    }
    static setForcedStatus(provider, status) {
        this.forcedStatus[provider] = status;
    }
    static setLatencyOverride(provider, latencyMs) {
        this.latencyOverrides[provider] = latencyMs;
    }
    static clear() {
        this.forcedStatus = {};
        this.latencyOverrides = {};
    }
    async provisionVirtualAccount(params) {
        const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        return {
            accountNumber: randomSuffix,
            bankName: `${this.provider} Bank Simulator`,
            expiresAt: params.accountType === 'DYNAMIC' ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : undefined
        };
    }
    async nameEnquiry(params) {
        return {
            accountName: 'SIMULATED ACCOUNT NAME',
            isVerified: true
        };
    }
    async executeTransfer(params) {
        const forced = SandboxProviderAdapter.forcedStatus[this.provider] || 'SUCCESS';
        if (forced === 'TIMEOUT') {
            throw new Error('Simulated gateway connect timeout');
        }
        if (forced === 'FAILED') {
            return { providerReference: `ref_${this.provider}_${Date.now()}`, status: 'FAILED' };
        }
        return {
            providerReference: `ref_${this.provider}_${Date.now()}`,
            status: forced
        };
    }
    async checkTransferStatus(reference) {
        return { status: 'SUCCESS' };
    }
    async validateWebhook(payload, signature) {
        return signature === 'hmac_sha512_hash_value';
    }
    async getHealthMetrics() {
        const latency = SandboxProviderAdapter.latencyOverrides[this.provider] ?? 200;
        const errorRate = SandboxProviderAdapter.forcedStatus[this.provider] === 'FAILED' ? 1.00 : 0.00;
        return { latencyMs: latency, errorRate };
    }
}
exports.SandboxProviderAdapter = SandboxProviderAdapter;
//# sourceMappingURL=sandbox-simulator.js.map