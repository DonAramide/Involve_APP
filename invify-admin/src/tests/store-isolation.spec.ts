import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTenantWalletStore } from '../domains/tenant/wallets/stores/tenantWalletStore';
import { useTenantTransactionStore } from '../domains/tenant/transactions/stores/tenantTransactionStore';

describe('Store Isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('ensures wallet store mutation does not affect transaction store', () => {
    const walletStore = useTenantWalletStore();
    const transactionStore = useTenantTransactionStore();

    walletStore.balance = 5000;
    expect(walletStore.balance).toBe(5000);
    
    // Transaction store should be entirely isolated from Wallet state
    expect((transactionStore as any).balance).toBeUndefined();
  });

  it('verifies independent state initialization', () => {
    const walletStore = useTenantWalletStore();
    walletStore.loadWallet();
    expect(walletStore.balance).toBeGreaterThan(0);
    
    const transactionStore = useTenantTransactionStore();
    expect(transactionStore.transactions.length).toBe(0);
    transactionStore.loadTransactions();
    expect(transactionStore.transactions.length).toBeGreaterThan(0);
  });
});
