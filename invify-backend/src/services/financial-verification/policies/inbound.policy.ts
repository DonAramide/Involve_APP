// src/services/financial-verification/policies/inbound.policy.ts
import { PolicyConfig } from "../registry/VerificationPolicyRegistry";

export const InboundPolicy: PolicyConfig = {
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
};
