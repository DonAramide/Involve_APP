<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark text-white">
    <q-page-container>
      <q-page class="q-pa-md bg-dark text-white" style="min-height: 100vh;">
    <!-- 1. LOGIN ROUTE -->
    <div v-if="isLogin" class="row justify-center items-center" style="min-height: 80vh;">
      <q-card class="bg-grey-9 text-white q-pa-lg" style="width: 400px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
        <q-card-section class="text-center">
          <div class="text-h4 text-weight-bold text-primary">INVIFY</div>
          <div class="text-subtitle2 text-grey-4 q-mt-xs">Unified Governance & Payout Platform</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="email"
            label="Email Address"
            filled
            dark
            color="primary"
            data-testid="login-email"
            class="q-mb-sm"
          />
          <q-input
            v-model="password"
            label="Password"
            type="password"
            filled
            dark
            color="primary"
            data-testid="login-password"
            class="q-mb-md"
          />
          <q-btn
            label="Sign In"
            color="primary"
            class="full-width text-weight-bold q-py-sm"
            data-testid="login-btn"
            style="border-radius: 8px;"
            @click="handleLogin"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- 2. DASHBOARD / DASHBOARD SUB-PAGES -->
    <div v-else class="q-gutter-md">
      <!-- Top header bar -->
      <div class="row justify-between items-center q-pb-md border-bottom">
        <div>
          <div class="text-h5 text-weight-bold text-primary">{{ pageTitle }}</div>
          <div class="text-caption text-grey-4">Pilot Deployment & Live Execution Validation — localhost</div>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-chip color="green-9" text-color="white" icon="check_circle" label="SYS ACTIVE" />
          <q-chip color="blue-9" text-color="white" icon="verified_user" label="RC2 CONFIRMED" />
        </div>
      </div>

      <!-- Quick Metrics Cards -->
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-3">
          <q-card class="bg-grey-9 text-white q-pa-sm">
            <div class="text-caption text-grey-4">TOTAL TRANSACTIONS</div>
            <div class="text-h4 text-weight-bold">4,289,102</div>
            <div class="text-caption text-green-4">+12.4% this week</div>
          </q-card>
        </div>
        <div class="col-12 col-md-3">
          <q-card class="bg-grey-9 text-white q-pa-sm">
            <div class="text-caption text-grey-4">ACTIVE SETTLEMENTS</div>
            <div class="text-h4 text-weight-bold text-yellow-6">99.87%</div>
            <div class="text-caption text-grey-4">SLA target met</div>
          </q-card>
        </div>
        <div class="col-12 col-md-3">
          <q-card class="bg-grey-9 text-white q-pa-sm">
            <div class="text-caption text-grey-4">GOVERNANCE ESCROW</div>
            <div class="text-h4 text-weight-bold text-primary">₦128,450,000</div>
            <div class="text-caption text-green-4">Audited (Immutable)</div>
          </q-card>
        </div>
        <div class="col-12 col-md-3">
          <q-card class="bg-grey-9 text-white q-pa-sm">
            <div class="text-caption text-grey-4">FRAUD QUARANTINE</div>
            <div class="text-h4 text-weight-bold text-red-5">0 Cases</div>
            <div class="text-caption text-grey-4">All checks cleared</div>
          </q-card>
        </div>
      </div>

      <!-- Primary Content Area based on route -->
      <q-card class="bg-grey-9 text-white q-mt-md">
        <q-card-section>
          <div class="text-h6 text-weight-bold q-mb-md">{{ sectionTitle }}</div>

          <!-- Transaction Table (Finance / Ledger / Approvals) -->
          <q-table
            flat
            bordered
            dark
            class="bg-grey-9 text-white"
            :rows="mockRows"
            :columns="columns"
            row-key="id"
          >
            <!-- Body cell overriding for approval test attribute -->
            <template v-slot:body="props">
              <q-tr :props="props" data-testid="approval-row">
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  {{ props.row[col.name] }}
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const email = ref('superadmin@iips.app');
const password = ref('');

const isLogin = computed(() => route.path === '/login');

const handleLogin = () => {
  localStorage.setItem('invify_token', 'mock-admin-token');
  router.push('/governance');
};

const pageTitle = computed(() => {
  const p = route.path.toLowerCase();
  if (p.includes('finance')) return 'FINANCE COMMAND CENTER';
  if (p.includes('treasury')) return 'TREASURY REVENUE ENGINE';
  if (p.includes('fraud')) return 'FRAUD MONITORING & RISK';
  if (p.includes('compliance')) return 'POLICY & COMPLIANCE';
  if (p.includes('sla')) return 'SLA MONITORING CENTER';
  if (p.includes('workflow')) return 'AUTOMATION WORKFLOWS';
  if (p.includes('approvals')) return 'GOVERNANCE APPROVALS';
  if (p.includes('ai')) return 'AI INSIGHTS GENERATOR';
  return 'GOVERNANCE INTEGRITY PLATFORM';
});

const sectionTitle = computed(() => {
  const p = route.path.toLowerCase();
  if (p.includes('transactions')) return 'Global Settlement Ledger';
  if (p.includes('ledger')) return 'Core Transaction Lineage';
  if (p.includes('wallets')) return 'Treasury Liquidity Wallets';
  if (p.includes('cases')) return 'Flagged Fraud Cases';
  if (p.includes('approvals')) return 'Pending Maker-Checker Approvals';
  if (p.includes('workflows')) return 'Active System Automation Workflows';
  return 'System Status & Integrity Data Logs';
});

// Mock rows for lists
const mockRows = computed(() => {
  const p = route.path.toLowerCase();
  if (p.includes('approvals')) {
    return [
      { id: '1', type: 'Payout Approval', amount: '₦12,500,000', status: 'PENDING_CHECKER', date: '2026-06-01', maker: 'operator@invify.com' },
      { id: '2', type: 'Settlement Batch', amount: '₦45,000,000', status: 'PENDING_APPROVER', date: '2026-06-01', maker: 'treasury@invify.com' },
      { id: '3', type: 'Limit Escalation', amount: '₦5,000,000', status: 'PENDING_CHECKER', date: '2026-06-01', maker: 'risk@invify.com' }
    ];
  }
  return [
    { id: 'TXN-1082', type: 'Treasury Inflow', amount: '₦2,400,000', status: 'COMPLETED', date: '2026-06-01', channel: 'Cpoint-Kimono' },
    { id: 'TXN-1083', type: 'Partner Payout', amount: '₦450,000', status: 'SUCCESSFUL', date: '2026-06-01', channel: 'Paystack' },
    { id: 'TXN-1084', type: 'Escrow Settlement', amount: '₦18,900,000', status: 'SETTLED', date: '2026-06-01', channel: 'Nibss-ISO' }
  ];
});

const columns = computed<any[]>(() => {
  const p = route.path.toLowerCase();
  if (p.includes('approvals')) {
    return [
      { name: 'id', label: 'Approval ID', field: 'id', align: 'left' },
      { name: 'type', label: 'Action Type', field: 'type', align: 'left' },
      { name: 'amount', label: 'Amount Involved', field: 'amount', align: 'left' },
      { name: 'status', label: 'Workflow State', field: 'status', align: 'left' },
      { name: 'date', label: 'Created At', field: 'date', align: 'left' },
      { name: 'maker', label: 'Initiated By (Maker)', field: 'maker', align: 'left' }
    ];
  }
  return [
    { name: 'id', label: 'Transaction ID', field: 'id', align: 'left' },
    { name: 'type', label: 'Type', field: 'type', align: 'left' },
    { name: 'amount', label: 'Amount', field: 'amount', align: 'left' },
    { name: 'status', label: 'Status', field: 'status', align: 'left' },
    { name: 'date', label: 'Execution Date', field: 'date', align: 'left' },
    { name: 'channel', label: 'Settlement Host', field: 'channel', align: 'left' }
  ];
});
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
</style>
