import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface LiquidityPolicyData {
  minimumLiquidityNGN: number;
  reserveRatio: number;        // 0.0–1.0
  coverageRatioTarget: number; // 0.0–1.0
  lowLiquidityAlertThresholdNGN: number;
}
const DEFAULTS: LiquidityPolicyData = {
  minimumLiquidityNGN: 2_000_000,
  reserveRatio: 0.15,
  coverageRatioTarget: 1.5,
  lowLiquidityAlertThresholdNGN: 3_000_000,
};
export class LiquidityPolicyService {
  static defaultData(): LiquidityPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<LiquidityPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'LIQUIDITY', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('LIQUIDITY'); }
  static resolve(key: keyof LiquidityPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
