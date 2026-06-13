import { defineStore } from 'pinia';

export const useTenantWalletStore = defineStore('tenantWallet', {
  state: () => ({
    withdrawalAmount: null as number | null,
    withdrawing: false,
    activeSchedule: 'manual',
    schedules: [
      { id: 'daily', title: 'Automated Daily Sweep', desc: 'Settle balance automatically every day at 23:59 WAT.', icon: 'today' },
      { id: 'weekly', title: 'Automated Weekly Sweep', desc: 'Settle balance automatically every Sunday at 23:59 WAT.', icon: 'date_range' },
      { id: 'manual', title: 'Manual Dispatch On-Demand', desc: 'Hold treasury balances in Quasar Ledger. Withdraw manually.', icon: 'touch_app' }
    ]
  }),
  getters: {
    loadTreasuryData(state) {
      const localList = localStorage.getItem('tenant_transactions');
      const transactions = localList ? JSON.parse(localList) : [];
      let baseVal = 1245600;
      const salesSum = transactions.filter((t: any) => t.type === 'sale' && t.status === 'CLEARED').reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const localWithdrawals = localStorage.getItem('tenant_withdrawals');
      const withdrawals = localWithdrawals ? JSON.parse(localWithdrawals) : [];
      const withdrawalSum = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
      
      return {
        available: Math.max(0, baseVal + salesSum - withdrawalSum),
        withdrawalsList: withdrawals
      };
    },
    availableBalance(state): number {
      return this.loadTreasuryData.available;
    },
    ledgerLogs(state) {
      const baseLogs = [
        { id: 2, type: 'receipt', ref: 'RC-829104-QS', desc: 'POS batch aggregation clearing confirmation.', amount: 1245600, time: '2d ago' },
        { id: 3, type: 'receipt', ref: 'RC-829092-QS', desc: 'POS batch aggregation clearing confirmation.', amount: 620000, time: '3d ago' }
      ];
      const withdrawals = this.loadTreasuryData.withdrawalsList;
      const sweepLogs = withdrawals.map((w: any, idx: number) => ({
        id: `sweep-${idx}`,
        type: 'sweep',
        ref: w.ref,
        desc: 'On-Demand sweep to Access Bank primary account.',
        amount: w.amount,
        time: w.time
      }));
      return [...sweepLogs, ...baseLogs];
    }
  },
  actions: {
    dispatchPayout() {
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
            time: 'Just now'
          });
          localStorage.setItem('tenant_withdrawals', JSON.stringify(withdrawals));
          
          const localList = localStorage.getItem('tenant_transactions');
          const transactions = localList ? JSON.parse(localList) : [];
          transactions.unshift({
            id: Date.now(),
            date: '2026-05-17 05:19',
            ref: randRef,
            type: 'Treasury Payout',
            amount: this.withdrawalAmount,
            status: 'SETTLED'
          });
          localStorage.setItem('tenant_transactions', JSON.stringify(transactions));
          
          const msg = `Withdrawal of ${this.withdrawalAmount?.toLocaleString()} successfully routed to corporate node.`;
          this.withdrawalAmount = null;
          resolve(msg);
        }, 1500);
      });
    }
  }
});
