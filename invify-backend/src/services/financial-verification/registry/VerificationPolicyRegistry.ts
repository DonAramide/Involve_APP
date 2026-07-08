// src/services/financial-verification/registry/VerificationPolicyRegistry.ts

import { VerificationDomainType, VerificationPolicyType } from "../shared/interfaces";

export interface PolicyConfig {
  policyName: VerificationPolicyType | string;
  domain: VerificationDomainType;
  requiredCapabilities: string[];
  failFast: boolean;
  optionalCapabilities?: string[];
}

export class VerificationPolicyRegistry {
  private static instance: VerificationPolicyRegistry;
  private policies = new Map<string, Map<string, PolicyConfig>>(); // domain -> policyName -> PolicyConfig

  private constructor() {
    // Register standard policies
    this.registerPolicy({
      policyName: 'WITHDRAWAL',
      domain: 'Banking',
      requiredCapabilities: [
        'treasury.exists',
        'treasury.active',
        'wallet.exists',
        'wallet.active',
        'liquidity.limits',
        'risk.aml',
        'settlement.eligibility',
        'registry.nonce'
      ],
      failFast: true
    });

    this.registerPolicy({
      policyName: 'PAYOUT',
      domain: 'Banking',
      requiredCapabilities: [
        'treasury.exists',
        'liquidity.limits',
        'risk.aml',
        'settlement.eligibility'
      ],
      failFast: true
    });

    this.registerPolicy({
      policyName: 'INBOUND',
      domain: 'Banking',
      requiredCapabilities: [
        'provider.response',
        'provider.signature',
        'event.exists',
        'treasury.exists',
        'settlement.eligibility',
        'reconciliation.amount'
      ],
      failFast: true
    });
  }

  public static getInstance(): VerificationPolicyRegistry {
    if (!this.instance) {
      this.instance = new VerificationPolicyRegistry();
    }
    return this.instance;
  }

  public registerPolicy(config: PolicyConfig): void {
    if (!this.policies.has(config.domain)) {
      this.policies.set(config.domain, new Map());
    }
    this.policies.get(config.domain)!.set(config.policyName, config);
  }

  public getPolicy(domain: VerificationDomainType, policyName: string): PolicyConfig | undefined {
    return this.policies.get(domain)?.get(policyName);
  }

  public clear(): void {
    this.policies.clear();
    // Restore default policies
    this.registerPolicy({
      policyName: 'WITHDRAWAL',
      domain: 'Banking',
      requiredCapabilities: [
        'treasury.exists',
        'treasury.active',
        'wallet.exists',
        'wallet.active',
        'liquidity.limits',
        'risk.aml',
        'settlement.eligibility',
        'registry.nonce'
      ],
      failFast: true
    });

    this.registerPolicy({
      policyName: 'PAYOUT',
      domain: 'Banking',
      requiredCapabilities: [
        'treasury.exists',
        'liquidity.limits',
        'risk.aml',
        'settlement.eligibility'
      ],
      failFast: true
    });

    this.registerPolicy({
      policyName: 'INBOUND',
      domain: 'Banking',
      requiredCapabilities: [
        'provider.response',
        'provider.signature',
        'event.exists',
        'treasury.exists',
        'settlement.eligibility',
        'reconciliation.amount'
      ],
      failFast: true
    });
  }
}
