// src/services/financial-verification/registry/VerificationModuleRegistry.ts

import { FinancialVerificationModule } from "../shared/interfaces";
import { VerificationDomainRegistry } from "./VerificationDomainRegistry";

export class VerificationModuleRegistry {
  private static instance: VerificationModuleRegistry;
  private modules = new Map<string, FinancialVerificationModule>();

  private constructor() {}

  public static getInstance(): VerificationModuleRegistry {
    if (!this.instance) {
      this.instance = new VerificationModuleRegistry();
    }
    return this.instance;
  }

  public registerModule(module: FinancialVerificationModule): void {
    this.modules.set(module.moduleId, module);
  }

  public getModule(moduleId: string): FinancialVerificationModule | undefined {
    const mod = this.modules.get(moduleId);
    if (mod) {
      const domainRegistry = VerificationDomainRegistry.getInstance();
      if (domainRegistry.isDomainEnabled(mod.domain)) {
        return mod;
      }
    }
    return undefined;
  }

  public getModules(): FinancialVerificationModule[] {
    const domainRegistry = VerificationDomainRegistry.getInstance();
    return Array.from(this.modules.values()).filter(mod => 
      domainRegistry.isDomainEnabled(mod.domain)
    );
  }

  public clear(): void {
    this.modules.clear();
  }
}
