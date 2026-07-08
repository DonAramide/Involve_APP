// src/services/financial-verification/registry/VerificationCapabilityRegistry.ts

import { FinancialVerificationModule } from "../shared/interfaces";
import { VerificationModuleRegistry } from "./VerificationModuleRegistry";

export class VerificationCapabilityRegistry {
  private static instance: VerificationCapabilityRegistry;

  private constructor() {}

  public static getInstance(): VerificationCapabilityRegistry {
    if (!this.instance) {
      this.instance = new VerificationCapabilityRegistry();
    }
    return this.instance;
  }

  /**
   * Resolves all active modules providing the requested capability.
   */
  public resolveModulesForCapability(capability: string): FinancialVerificationModule[] {
    const modules = VerificationModuleRegistry.getInstance().getModules();
    return modules.filter(mod => mod.capabilities.includes(capability));
  }

  /**
   * Resolves the primary active module providing the requested capability.
   */
  public resolveModuleForCapability(capability: string): FinancialVerificationModule | undefined {
    const matching = this.resolveModulesForCapability(capability);
    // Return highest priority module if multiple exist
    if (matching.length > 0) {
      return matching.sort((a, b) => b.priority - a.priority)[0];
    }
    return undefined;
  }
}
