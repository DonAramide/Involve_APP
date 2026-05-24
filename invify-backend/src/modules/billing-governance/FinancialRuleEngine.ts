// invify-backend/src/modules/billing-governance/FinancialRuleEngine.ts

import { FeeConfiguration, FeeType, FeeOverride } from '../../contracts/billing/FeeStructures';

export interface FeeCalculationContext {
  tenantId: string;
  region?: string;
  transactionAmount: number;
}

export interface CalculatedFeeResult {
  baseAmount: number;
  calculatedFee: number;
  netAmount: number;
  currency: string;
  feeConfigId: string;
  versionUsed: number;
  isOverrideApplied: boolean;
}

export class FinancialRuleEngine {
  
  /**
   * Calculates the exact transaction fee deterministically based on the provided configuration.
   * Resolves flat rates, percentage bounds, min/max caps, and tenant/regional overrides.
   */
  public static calculateFee(config: FeeConfiguration, context: FeeCalculationContext): CalculatedFeeResult {
    // 1. Resolve Overrides (Tenant > Region)
    const activeRules = this.resolveActiveRules(config, context);

    // 2. Base Calculation
    let calculatedFee = 0;
    
    switch (config.type) {
      case FeeType.FLAT:
        calculatedFee = activeRules.flatAmount;
        break;
      case FeeType.PERCENTAGE:
        calculatedFee = this.calculatePercentage(context.transactionAmount, activeRules.percentageAmount);
        break;
      case FeeType.HYBRID:
        const percentCut = this.calculatePercentage(context.transactionAmount, activeRules.percentageAmount);
        calculatedFee = activeRules.flatAmount + percentCut;
        break;
    }

    // 3. Enforce Caps and Floors
    if (activeRules.minFee !== undefined && calculatedFee < activeRules.minFee) {
      calculatedFee = activeRules.minFee;
    }
    if (activeRules.maxFee !== undefined && calculatedFee > activeRules.maxFee) {
      calculatedFee = activeRules.maxFee;
    }

    // 4. Safe Bankers Rounding (2 decimal places)
    calculatedFee = this.bankersRound(calculatedFee);
    const netAmount = this.bankersRound(context.transactionAmount - calculatedFee);

    return {
      baseAmount: context.transactionAmount,
      calculatedFee,
      netAmount,
      currency: config.currency,
      feeConfigId: config.id,
      versionUsed: config.version,
      isOverrideApplied: activeRules.isOverride
    };
  }

  /**
   * Applies Tenant or Regional Overrides if they exist in the FeeConfiguration.
   */
  private static resolveActiveRules(config: FeeConfiguration, context: FeeCalculationContext) {
    const defaultRules = {
      flatAmount: config.flatAmount,
      percentageAmount: config.percentageAmount,
      minFee: config.minFee,
      maxFee: config.maxFee,
      isOverride: false
    };

    if (!config.overrides || config.overrides.length === 0) {
      return defaultRules;
    }

    // Look for exact tenant override
    const tenantOverride = config.overrides.find(o => o.overrideType === 'TENANT' && o.targetId === context.tenantId);
    if (tenantOverride) {
      return this.mergeOverride(defaultRules, tenantOverride);
    }

    // Look for regional override if context has region
    if (context.region) {
      const regionOverride = config.overrides.find(o => o.overrideType === 'REGION' && o.targetId === context.region);
      if (regionOverride) {
        return this.mergeOverride(defaultRules, regionOverride);
      }
    }

    return defaultRules;
  }

  private static mergeOverride(defaultRules: any, override: FeeOverride) {
    return {
      flatAmount: override.flatAmount !== undefined ? override.flatAmount : defaultRules.flatAmount,
      percentageAmount: override.percentageAmount !== undefined ? override.percentageAmount : defaultRules.percentageAmount,
      minFee: override.minFee !== undefined ? override.minFee : defaultRules.minFee,
      maxFee: override.maxFee !== undefined ? override.maxFee : defaultRules.maxFee,
      isOverride: true
    };
  }

  private static calculatePercentage(amount: number, percentage: number): number {
    return (amount * percentage) / 100;
  }

  /**
   * Deterministic half-even rounding (Bankers Rounding) to avoid precision drift.
   */
  public static bankersRound(num: number): number {
    const m = Math.pow(10, 2);
    const d = num * m;
    const r = Math.round(d);
    
    // If it's a true half (e.g. 2.5), round to the nearest even number
    if (Math.abs(d % 1) === 0.5) {
      return (r % 2 === 0 ? r : r - 1) / m;
    }
    
    return r / m;
  }
}
