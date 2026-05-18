/**
 * AUTHORITATIVE PLATFORM MULTI-CURRENCY FX ENGINE
 * Governs cross-border sovereign conversion rates, transaction currency locks, and historical fx replay-safety.
 */

export class FxResolutionEngine {
  constructor() {
    // Current master exchange rates (base currency is USD)
    this.rates = {
      USD: 1.0,
      NGN: 1550.0,
      EUR: 0.92,
      GBP: 0.79
    };

    // Historical rates registry to guarantee perfect historical replays
    this.historicalRatesRegistry = new Map();

    // Locked rate register per transaction reference
    this.lockedRatesRegistry = new Map();
  }

  /**
   * Updates exchange rates globally, saving a snapshot to history before mutating.
   */
  updateRates(newRates) {
    const timestamp = Date.now();
    
    // Save current to history
    this.historicalRatesRegistry.set(timestamp, {
      rates: { ...this.rates },
      effectiveUntil: timestamp
    });

    // Update active rates
    this.rates = { ...this.rates, ...newRates };

    return {
      success: true,
      timestamp,
      activeRates: this.rates
    };
  }

  /**
   * Retrieves active exchange rate between two currencies.
   */
  getRate(from, to) {
    const rateFrom = this.rates[from];
    const rateTo = this.rates[to];

    if (!rateFrom || !rateTo) {
      throw new Error(`Unsupported currency conversion query: ${from} to ${to}`);
    }

    // Return relative rate
    return rateTo / rateFrom;
  }

  /**
   * Locks the exchange rate for a specific transaction ID to shield against settlement cycles volatility.
   */
  lockRate(transactionId, from, to) {
    const lockedRate = this.getRate(from, to);
    
    const record = {
      transactionId,
      from,
      to,
      lockedRate,
      lockedAt: Date.now()
    };

    this.lockedRatesRegistry.set(transactionId, record);
    return record;
  }

  /**
   * Resolves conversion between currencies. Uses locked rate if present, else active rate.
   */
  convert(amount, from, to, transactionId = null) {
    if (from === to) return amount;

    let conversionRate = 0;

    // Check if there's a locked rate for the transaction
    if (transactionId && this.lockedRatesRegistry.has(transactionId)) {
      const lock = this.lockedRatesRegistry.get(transactionId);
      if (lock.from === from && lock.to === to) {
        conversionRate = lock.lockedRate;
      }
    }

    // Fall back to active rate if no lock is present
    if (conversionRate === 0) {
      conversionRate = this.getRate(from, to);
    }

    const convertedAmount = amount * conversionRate;

    // Precision Rounding to 4 decimal places internally
    return Math.round((convertedAmount + Number.EPSILON) * 10000) / 10000;
  }

  /**
   * Retrieves a locked rate record.
   */
  getLockedRate(transactionId) {
    return this.lockedRatesRegistry.get(transactionId) || null;
  }
}

// Global Singleton Instance
export const globalFxEngine = new FxResolutionEngine();
