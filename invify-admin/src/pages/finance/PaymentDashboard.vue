<template>
  <div class="payment-dashboard">
    <SubscriptionUpgradeBanner v-if="!isEligible" @upgrade="handleUpgrade" />
    
    <div v-else class="dashboard-content">
      <header class="dashboard-header">
        <h1>Payment Orchestration</h1>
        <button class="btn-export">Export CSV</button>
      </header>
      
      <div class="kpi-grid">
        <FinancialKPICard 
          title="Total Revenue" 
          :value="metrics.revenue" 
          isCurrency 
          currency="USD"
          icon="fas fa-chart-line"
          :trend="{ direction: 'up', value: 12, label: 'vs last month' }"
        />
        <FinancialKPICard 
          title="Pending Settlement" 
          :value="metrics.pending" 
          isCurrency 
          currency="USD"
          icon="fas fa-clock"
        />
        <FinancialKPICard 
          title="Total Refunds" 
          :value="metrics.refunds" 
          isCurrency 
          currency="USD"
          icon="fas fa-undo"
          :trend="{ direction: 'down', value: 2, label: 'vs last month' }"
        />
      </div>

      <div class="history-section">
        <h2>Recent Payments</h2>
        <FinancialTable 
          :columns="historyColumns" 
          :data="recentPayments" 
          selectable
          @row-click="openDrawer"
        >
          <template #empty>
            <div class="empty-state">
              <i class="fas fa-receipt empty-icon"></i>
              <h3>No payments yet</h3>
              <p>You haven't received any payments yet. Generate your first invoice to get started.</p>
              <button class="btn-primary">Create Invoice</button>
            </div>
          </template>
          
          <template #cell-status="{ row }">
            <FinancialStatusBadge :status="row.status" />
          </template>
          <template #cell-amount="{ row }">
            <MoneyDisplay :amount="row.amount" :currency="row.currency" />
          </template>
        </FinancialTable>
      </div>
    </div>
    
    <PaymentDetailsDrawer 
      v-if="selectedIntent" 
      :intent="selectedIntent" 
      @close="selectedIntent = null" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { paymentApi } from '@/api/paymentApi';
import SubscriptionUpgradeBanner from '@/components/finance/SubscriptionUpgradeBanner.vue';
import FinancialKPICard from '@/components/finance/FinancialKPICard.vue';
import FinancialTable from '@/components/finance/FinancialTable.vue';
import FinancialStatusBadge from '@/components/finance/FinancialStatusBadge.vue';
import MoneyDisplay from '@/components/finance/MoneyDisplay.vue';
import PaymentDetailsDrawer from '@/components/finance/PaymentDetailsDrawer.vue';

// Mock state for RC1 Architecture demo
const isEligible = ref(true); 
const selectedIntent = ref(null);

const metrics = ref({
  revenue: 1250000, // $12,500.00
  pending: 345000,
  refunds: 15000
});

const recentPayments = ref([]);

const historyColumns = [
  { key: 'createdAt', label: 'Date' },
  { key: 'invoiceNumber', label: 'Invoice' },
  { key: 'customerName', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount', align: 'right' }
];

const loadHistory = async () => {
  try {
    const response = await paymentApi.getHistory('current-tenant');
    recentPayments.value = response.data || [];
  } catch (error) {
    console.error(error);
  }
};

const handleUpgrade = () => {
  console.log('Navigate to billing');
};

const openDrawer = (row) => {
  selectedIntent.value = row;
};

onMounted(() => {
  if (isEligible.value) {
    loadHistory();
  }
});
</script>

<style scoped>
.payment-dashboard {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.btn-export {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.history-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.empty-state {
  text-align: center;
  padding: 32px 0;
}

.empty-icon {
  font-size: 40px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.btn-primary {
  margin-top: 16px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
