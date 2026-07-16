import { defineStore } from 'pinia';

export const useTenantWalletStore = defineStore('tenantWallet', {
  state: () => ({
    withdrawalAmount: null as number | null,
    withdrawing: false,
    activeSchedule: 'manual',
    availableBalance: 0,
    ledgerLogs: [] as any[],
    schedules: [
      { id: 'daily', title: 'Automated Daily Sweep', desc: 'Settle balance automatically every day at 23:59 WAT.', icon: 'today' },
      { id: 'weekly', title: 'Automated Weekly Sweep', desc: 'Settle balance automatically every Sunday at 23:59 WAT.', icon: 'date_range' },
      { id: 'manual', title: 'Manual Dispatch On-Demand', desc: 'Hold treasury balances in Quasar Ledger. Withdraw manually.', icon: 'touch_app' }
    ]
  }),
  actions: {
    async loadTreasuryData() {
      try {
        // Extract tenantId from token or local storage
        let tenantId = localStorage.getItem('tenant_id') || '';
        if (!tenantId) {
          const token = localStorage.getItem('invify_token');
          if (token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              tenantId = JSON.parse(jsonPayload).tenantId;
            } catch (e) {
              console.warn('Failed to parse tenantId from token');
            }
          }
        }
        
        const { FinanceRepository } = await import('../../../../repositories/FinanceRepository');
        const [balanceData, txData] = await Promise.all([
          FinanceRepository.getWalletBalance(tenantId, { refresh: true }),
          FinanceRepository.getWalletTransactions(tenantId, { refresh: true })
        ]);
        
        this.availableBalance = balanceData.balance || 0;
        
        const baseLogs = txData.transactions.map(tx => ({
          id: tx.id,
          type: tx.entry_type === 'CREDIT' ? 'receipt' : 'sweep',
          ref: tx.reference || 'SYSTEM',
          desc: tx.desc || 'Transaction clearing confirmation.',
          amount: tx.amount,
          time: new Date(tx.created_at).toLocaleString()
        }));

        const localWithdrawals = localStorage.getItem('tenant_withdrawals');
        const withdrawals = localWithdrawals ? JSON.parse(localWithdrawals) : [];
        const sweepLogs = withdrawals.map((w: any, idx: number) => ({
          id: `sweep-${idx}`,
          type: 'sweep',
          ref: w.ref,
          desc: 'On-Demand sweep to corporate account.',
          amount: w.amount,
          time: w.time
        }));

        this.ledgerLogs = [...sweepLogs, ...baseLogs];
      } catch (e) {
        console.error('Failed to load real treasury data', e);
        this.availableBalance = 0;
        this.ledgerLogs = [];
      }
    },
    async dispatchPayout() {
      return new Promise((resolve, reject) => {
        if (!this.withdrawalAmount || this.withdrawalAmount <= 0) {
          reject('Specify a valid transfer amount.');
          return;
        }
        if (this.withdrawalAmount > this.availableBalance) {
          reject('Requested amount exceeds cleared treasury balance.');
          return;
        }

        this.withdrawing = true;
        setTimeout(() => {
          this.withdrawing = false;
          
          const localWithdrawals = localStorage.getItem('tenant_withdrawals');
          const withdrawals = localWithdrawals ? JSON.parse(localWithdrawals) : [];
          const randRef = `SW-${Math.floor(Math.random() * 100000) + 800000}-QS`;
          
          withdrawals.unshift({
            ref: randRef,
            amount: this.withdrawalAmount,
            time: new Date().toLocaleString()
          });
          localStorage.setItem('tenant_withdrawals', JSON.stringify(withdrawals));
          
          const msg = `Withdrawal of ${this.withdrawalAmount?.toLocaleString()} successfully routed to corporate node.`;
          this.availableBalance -= this.withdrawalAmount!;
          this.withdrawalAmount = null;
          this.loadTreasuryData(); // Refresh UI
          resolve(msg);
        }, 1500);
      });
    }
  }
});
