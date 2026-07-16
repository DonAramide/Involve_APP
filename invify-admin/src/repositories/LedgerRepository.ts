// src/repositories/LedgerRepository.ts
export class LedgerRepository {
  static cache = new Map();

  static async getRecent(tenantId, options = { refresh: false }) {
    const cacheKey = `ledger_${tenantId}`;
    if (!options.refresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Stub
    const data = [
      { id: 1, type: 'credit', amount: 50000, desc: 'Fee Deposit' },
      { id: 2, type: 'debit', amount: 15000, desc: 'Vendor Payout' }
    ];
    this.cache.set(cacheKey, data);
    return data;
  }
}
