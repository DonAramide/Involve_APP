/**
 * AUTHORITATIVE PLATFORM TAX RESOLUTION ENGINE
 * Resolves sovereign regional taxes: VAT, GST, withholding tax, and local service levies.
 * Guarantees zero arithmetic leakage and returns detailed tax metadata objects.
 */

export const RegionalTaxPolicies = {
  NG: {
    regionName: "Nigeria",
    vatRate: 7.5,
    withholdingRate: 5.0,
    serviceTaxRate: 0.0,
    currency: "NGN",
    taxCode: "FIRS-VAT-NG"
  },
  US: {
    regionName: "United States",
    vatRate: 0.0, // Sales tax instead
    withholdingRate: 10.0,
    serviceTaxRate: 8.25,
    currency: "USD",
    taxCode: "IRS-WHT-US"
  },
  GB: {
    regionName: "United Kingdom",
    vatRate: 20.0,
    withholdingRate: 0.0,
    serviceTaxRate: 2.5,
    currency: "GBP",
    taxCode: "HMRC-VAT-GB"
  },
  DE: {
    regionName: "Germany",
    vatRate: 19.0,
    withholdingRate: 0.0,
    serviceTaxRate: 0.0,
    currency: "EUR",
    taxCode: "UST-DE"
  }
};

export class TaxResolutionEngine {
  /**
   * Bounded decimal rounding tool to completely eliminate floating-point discrepancies.
   */
  static safeRound(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Resolves regional tax policies. Falls back to Nigerian (NG) default if unspecified.
   */
  static getTaxPolicy(regionCode) {
    const code = regionCode ? regionCode.toUpperCase() : "NG";
    return RegionalTaxPolicies[code] || RegionalTaxPolicies.NG;
  }

  /**
   * Calculates comprehensive sovereign tax breakdowns.
   */
  static calculateTax(amount, regionCode, deductWithholding = false) {
    if (amount <= 0) {
      return {
        baseAmount: amount,
        vatCalculated: 0,
        serviceTaxCalculated: 0,
        withholdingCalculated: 0,
        totalTaxLevied: 0,
        finalTotalWithTax: amount,
        taxCodeApplied: "ZERO_BYPASS"
      };
    }

    const policy = this.getTaxPolicy(regionCode);
    
    // 1. Calculate VAT
    const vatCalculated = this.safeRound(amount * (policy.vatRate / 100), 2);

    // 2. Calculate local service levies
    const serviceTaxCalculated = this.safeRound(amount * (policy.serviceTaxRate / 100), 2);

    // 3. Calculate withholding deductions (applied against net payout for transfers/payouts)
    let withholdingCalculated = 0;
    if (deductWithholding) {
      withholdingCalculated = this.safeRound(amount * (policy.withholdingRate / 100), 2);
    }

    const totalTaxLevied = this.safeRound(vatCalculated + serviceTaxCalculated, 2);
    const finalTotalWithTax = this.safeRound(amount + totalTaxLevied - withholdingCalculated, 2);

    return {
      baseAmount: amount,
      vatCalculated,
      serviceTaxCalculated,
      withholdingCalculated,
      totalTaxLevied,
      finalTotalWithTax,
      regionName: policy.regionName,
      taxCodeApplied: policy.taxCode,
      currency: policy.currency
    };
  }
}
