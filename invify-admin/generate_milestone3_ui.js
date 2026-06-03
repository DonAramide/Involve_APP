const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const dirs = [
  'components/admin/finance',
  'components/agent-portal/wallet',
  'pages/admin/finance',
  'pages/agent-portal/wallet',
  'components/shared/finance'
];

dirs.forEach(d => {
  const p = path.join(srcDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = {
  // Shared Finance Components
  'components/shared/finance/WalletBalanceCard.vue': `<template><div>Balance Card</div></template>`,
  'components/shared/finance/WalletBreakdownCard.vue': `<template><div>Mathematical Breakdown</div></template>`,
  'components/shared/finance/LedgerTable.vue': `<template><div>Ledger Table (Filtered)</div></template>`,
  'components/shared/finance/WithdrawalTimeline.vue': `<template><div>4-Step State Machine</div></template>`,
  
  // Admin App
  'pages/admin/finance/AdminFinanceDashboardPage.vue': `<template><div>Admin KPIs</div></template>`,
  'components/admin/finance/FinanceReviewPanel.vue': `<template><div>Withdrawal Processor (Risk Indicators)</div></template>`,

  // Agent App
  'pages/agent-portal/wallet/AgentWalletDashboardPage.vue': `<template><div>Agent Dashboard</div></template>`,
  'components/agent-portal/wallet/WithdrawalDialog.vue': `<template><div>Request Withdrawal Modal</div></template>`,
  'components/agent-portal/wallet/CommissionTimeline.vue': `<template><div>30-Day Escrow Tracker (Countdown)</div></template>`,
  'components/agent-portal/wallet/CommissionDetailDrawer.vue': `<template><div>Details Slide-out</div></template>`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(srcDir, filepath), content);
}
console.log('Milestone 3 UI scaffolded successfully.');
