// src/services/financial-verification/registry/VerificationDomainRegistry.ts

import { VerificationDomainType, FinancialVerificationModule } from "../shared/interfaces";
import { VerificationPolicyRegistry } from "./VerificationPolicyRegistry";
import { VerificationCapabilityRegistry } from "./VerificationCapabilityRegistry";

export class VerificationDomainRegistry {
  private static instance: VerificationDomainRegistry;
  private domains = new Map<VerificationDomainType | string, { enabled: boolean }>();

  private constructor() {
    this.registerDomain('Banking');
    this.registerDomain('Treasury');
    this.registerDomain('Settlement');
    this.registerDomain('Wallet');
    this.registerDomain('Risk');
    this.registerDomain('Reconciliation');
  }

  public static getInstance(): VerificationDomainRegistry {
    if (!this.instance) {
      this.instance = new VerificationDomainRegistry();
    }
    return this.instance;
  }

  public registerDomain(domain: VerificationDomainType | string): void {
    if (!this.domains.has(domain)) {
      this.domains.set(domain, { enabled: true });
    }
  }

  public setDomainStatus(domain: VerificationDomainType | string, enabled: boolean): void {
    const d = this.domains.get(domain);
    if (d) {
      d.enabled = enabled;
    }
  }

  public isDomainEnabled(domain: VerificationDomainType | string): boolean {
    return this.domains.get(domain)?.enabled || false;
  }

  public getModulesForPolicy(domain: VerificationDomainType | string, policyName: string): FinancialVerificationModule[] {
    if (!this.isDomainEnabled(domain)) {
      return [];
    }
    const policyConfig = VerificationPolicyRegistry.getInstance().getPolicy(domain as any, policyName);
    if (!policyConfig) {
      return [];
    }
    const capabilityRegistry = VerificationCapabilityRegistry.getInstance();
    const modules: FinancialVerificationModule[] = [];

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

  public clear(): void {
    this.domains.clear();
    this.registerDomain('Banking');
    this.registerDomain('Treasury');
    this.registerDomain('Settlement');
    this.registerDomain('Wallet');
    this.registerDomain('Risk');
    this.registerDomain('Reconciliation');
  }
}
