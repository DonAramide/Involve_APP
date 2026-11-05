"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxBankingSimulationService = void 0;
class SandboxBankingSimulationService {
    static forcedStatus = {};
    static latencies = {};
    static circuitTripped = {};
    static setForcedStatus(provider, status) {
        this.forcedStatus[provider.toUpperCase()] = status;
    }
    static getForcedStatus(provider) {
        return this.forcedStatus[provider.toUpperCase()] || 'SUCCESS';
    }
    static setLatency(provider, latencyMs) {
        this.latencies[provider.toUpperCase()] = latencyMs;
    }
    static getLatency(provider) {
        return this.latencies[provider.toUpperCase()] ?? 50;
    }
    static setCircuitTripped(provider, tripped) {
        this.circuitTripped[provider.toUpperCase()] = tripped;
    }
    static isCircuitTripped(provider) {
        return !!this.circuitTripped[provider.toUpperCase()];
    }
    static clear() {
        this.forcedStatus = {};
        this.latencies = {};
        this.circuitTripped = {};
    }
}
exports.SandboxBankingSimulationService = SandboxBankingSimulationService;
//# sourceMappingURL=sandbox-simulation.service.js.map