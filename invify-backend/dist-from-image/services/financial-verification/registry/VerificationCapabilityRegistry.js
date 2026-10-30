"use strict";
// src/services/financial-verification/registry/VerificationCapabilityRegistry.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationCapabilityRegistry = void 0;
const VerificationModuleRegistry_1 = require("./VerificationModuleRegistry");
class VerificationCapabilityRegistry {
    static instance;
    constructor() { }
    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationCapabilityRegistry();
        }
        return this.instance;
    }
    /**
     * Resolves all active modules providing the requested capability.
     */
    resolveModulesForCapability(capability) {
        const modules = VerificationModuleRegistry_1.VerificationModuleRegistry.getInstance().getModules();
        return modules.filter(mod => mod.capabilities.includes(capability));
    }
    /**
     * Resolves the primary active module providing the requested capability.
     */
    resolveModuleForCapability(capability) {
        const matching = this.resolveModulesForCapability(capability);
        // Return highest priority module if multiple exist
        if (matching.length > 0) {
            return matching.sort((a, b) => b.priority - a.priority)[0];
        }
        return undefined;
    }
}
exports.VerificationCapabilityRegistry = VerificationCapabilityRegistry;
//# sourceMappingURL=VerificationCapabilityRegistry.js.map