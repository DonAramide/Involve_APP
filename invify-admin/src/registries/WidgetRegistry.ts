
import { defineAsyncComponent } from 'vue';

export const WidgetRegistry = {
  RevenueWidget: {
    id: 'RevenueWidget',
    component: defineAsyncComponent(() => import('../components/adapters/RevenueWidgetAdapter.vue')),
    permissions: ['finance.view'],
    cacheTTL: 60
  },
  AttendanceWidget: {
    id: 'AttendanceWidget',
    component: defineAsyncComponent(() => import('../components/adapters/AttendanceWidgetAdapter.vue')),
    permissions: ['students.view'],
    cacheTTL: 300
  },
  LedgerFeed: {
    id: 'LedgerFeed',
    component: defineAsyncComponent(() => import('../components/adapters/LedgerFeedAdapter.vue')),
    permissions: ['ledger.view'],
    cacheTTL: 15
  },
  QuasarTimeline: {
    id: 'QuasarTimeline',
    component: defineAsyncComponent(() => import('../components/adapters/QuasarTimelineAdapter.vue')),
    permissions: [],
    cacheTTL: 120
  },
  WalletWidget: {
    id: 'WalletWidget',
    component: defineAsyncComponent(() => import('../components/adapters/WalletAdapter.vue')),
    permissions: [],
    cacheTTL: 60
  },
  TransactionHistoryWidget: {
    id: 'TransactionHistoryWidget',
    component: defineAsyncComponent(() => import('../components/adapters/TransactionHistoryAdapter.vue')),
    permissions: ['finance.view'],
    cacheTTL: 60
  },
  SalesSummaryWidget: {
    id: 'SalesSummaryWidget',
    component: defineAsyncComponent(() => import('../components/adapters/SalesSummaryWidgetAdapter.vue')),
    permissions: ['finance.view'],
    cacheTTL: 60
  }
};
