"use strict";
// src/services/financial-verification/registry/VerificationModuleRegistry.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationModuleRegistry = void 0;
const VerificationDomainRegistry_1 = require("./VerificationDomainRegistry");
class VerificationModuleRegistry {
    static instance;
    modules = new Map();
    constructor() { }
    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationModuleRegistry();
        }
        return this.instance;
    }
    registerModule(module) {
        this.modules.set(module.moduleId, module);
    }
    getModule(moduleId) {
        const mod = this.modules.get(moduleId);
        if (mod) {
            const domainRegistry = VerificationDomainRegistry_1.VerificationDomainRegistry.getInstance();
            if (domainRegistry.isDomainEnabled(mod.domain)) {
                return mod;
            }
        }
        return undefined;
    }
    getModules() {
        const domainRegistry = VerificationDomainRegistry_1.VerificationDomainRegistry.getInstance();
        return Array.from(this.modules.values()).filter(mod => domainRegistry.isDomainEnabled(mod.domain));
    }
    clear() {
        this.modules.clear();
    }
}
exports.VerificationModuleRegistry = VerificationModuleRegistry;
//# sourceMappingURL=VerificationModuleRegistry.js.map