// src/services/financial-verification/policies/payout.policy.ts
import { PolicyConfig } from "../registry/VerificationPolicyRegistry";

export const PayoutPolicy: PolicyConfig = {
  policyName: 'PAYOUT',
  domain: 'Banking',
  requiredCapabilities: [
    'treasury.exists',
    'liquidity.limits',
    'risk.aml',
    'settlement.eligibility'
  ],
  failFast: true
};
