<template>
  <q-card class="bg-card-dark border-grey-9 relative-position column h-full" style="min-height: 140px;">
    <!-- Loading State -->
    <q-inner-loading :showing="financeStore.isLoading && !financeStore.summary" class="bg-black-transparent">
      <q-spinner-dots size="40px" color="indigo-4" />
    </q-inner-loading>

    <!-- Error State -->
    <div v-if="financeStore.error && !financeStore.summary" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="error_outline" color="red-4" size="md" />
        <div class="text-caption text-red-4 q-mt-xs">{{ financeStore.error }}</div>
        <q-btn flat dense size="sm" color="grey-5" label="Retry" class="q-mt-sm" @click="fetchData(true)" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!financeStore.isLoading && !financeStore.summary" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="hourglass_empty" color="grey-6" size="md" />
        <div class="text-caption text-grey-5 q-mt-xs">No revenue data available</div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="financeStore.summary" class="q-pa-md column justify-between h-full">
      <div class="row items-center justify-between q-mb-sm">
        <span class="text-operator-title text-grey-5 text-uppercase" style="font-size: 9.5px; letter-spacing: 1.5px;">Operations Revenue</span>
        <div class="row items-center op-gap-4">
          <span v-if="isRealtime" class="live-indicator-dot pulse-healthy"></span>
          <q-btn flat round dense size="xs" color="grey-6" icon="refresh" @click="fetchData(true)" />
        </div>
      </div>
      
      <div class="text-h4 text-weight-bold text-white text-metric-mono q-my-sm">
        {{ financeStore.summary.collectedFormatted }}
      </div>

      <div class="row items-center justify-between">
        <div class="row items-center op-gap-4">
          <q-icon name="account_balance_wallet" color="indigo-4" size="xs" />
          <span class="text-indigo-4 text-caption text-weight-bold">Wallet: {{ financeStore.summary.balanceFormatted }}</span>
        </div>
        <div class="row items-center op-gap-4">
          <q-icon name="trending_up" color="green-4" size="xs" />
          <span class="text-green-4 text-caption text-weight-bold">{{ financeStore.summary.revenueTrend }}</span>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();
const isRealtime = ref(true); // Placeholder until RC2.5

const fetchData = async (forceRefresh = false) => {
  await financeStore.fetchSummary(forceRefresh);
};

onMounted(() => {
  if (!financeStore.summary) {
    fetchData();
  }
});
</script>

<style scoped>
.h-full { height: 100%; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.7); }
</style>
