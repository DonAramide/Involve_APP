// src/services/financial-verification/policies/withdrawal.policy.ts
import { PolicyConfig } from "../registry/VerificationPolicyRegistry";

export const WithdrawalPolicy: PolicyConfig = {
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
};
