"use strict";
// src/services/financial-verification/registry/VerificationDomainRegistry.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationDomainRegistry = void 0;
const VerificationPolicyRegistry_1 = require("./VerificationPolicyRegistry");
const VerificationCapabilityRegistry_1 = require("./VerificationCapabilityRegistry");
class VerificationDomainRegistry {
    static instance;
    domains = new Map();
    constructor() {
        this.registerDomain('Banking');
        this.registerDomain('Treasury');
        this.registerDomain('Settlement');
        this.registerDomain('Wallet');
        this.registerDomain('Risk');
        this.registerDomain('Reconciliation');
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationDomainRegistry();
        }
        return this.instance;
    }
    registerDomain(domain) {
        if (!this.domains.has(domain)) {
            this.domains.set(domain, { enabled: true });
        }
    }
    setDomainStatus(domain, enabled) {
        const d = this.domains.get(domain);
        if (d) {
            d.enabled = enabled;
        }
    }
    isDomainEnabled(domain) {
        return this.domains.get(domain)?.enabled || false;
    }
    getModulesForPolicy(domain, policyName) {
        if (!this.isDomainEnabled(domain)) {
            return [];
        }
        const policyConfig = VerificationPolicyRegistry_1.VerificationPolicyRegistry.getInstance().getPolicy(domain, policyName);
        if (!policyConfig) {
            return [];
        }
        const capabilityRegistry = VerificationCapabilityRegistry_1.VerificationCapabilityRegistry.getInstance();
        const modules = [];
        for (const cap of policyConfig.requiredCapabilities) {
            const mod = capabilityRegistry.resolveModuleForCapability(cap);
            if (mod && this.isDomainEnabled(mod.domain)) {
                if (!modules.some(m => m.moduleId === mod.moduleId)) {
                    modules.push(mod);
                }
            }
        }
        return modules.sort((a, b) => b.priority - a.priority);
    }
    clear() {
        this.domains.clear();
        this.registerDomain('Banking');
        this.registerDomain('Treasury');
        this.registerDomain('Settlement');
        this.registerDomain('Wallet');
        this.registerDomain('Risk');
        this.registerDomain('Reconciliation');
    }
}
exports.VerificationDomainRegistry = VerificationDomainRegistry;
//# sourceMappingURL=VerificationDomainRegistry.js.map