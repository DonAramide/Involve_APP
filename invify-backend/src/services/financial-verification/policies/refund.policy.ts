// src/services/financial-verification/policies/refund.policy.ts
import { PolicyConfig } from "../registry/VerificationPolicyRegistry";

export const RefundPolicy: PolicyConfig = {
  policyName: 'REFUND',
  domain: 'Banking',
  requiredCapabilities: [
    'event.exists',
    'settlement.eligibility',
    'wallet.exists',
    'risk.aml'
  ],
  failFast: true
};
