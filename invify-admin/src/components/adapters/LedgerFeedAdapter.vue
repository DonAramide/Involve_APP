<template>
  <q-card class="bg-card-dark border-grey-9 relative-position column h-full" style="min-height: 200px;">
    <!-- Loading State -->
    <q-inner-loading :showing="financeStore.isLoading && financeStore.transactions.length === 0" class="bg-black-transparent">
      <q-spinner-dots size="40px" color="indigo-4" />
    </q-inner-loading>

    <!-- Error State -->
    <div v-if="financeStore.error && financeStore.transactions.length === 0" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="error_outline" color="red-4" size="md" />
        <div class="text-caption text-red-4 q-mt-xs">{{ financeStore.error }}</div>
        <q-btn flat dense size="sm" color="grey-5" label="Retry" class="q-mt-sm" @click="fetchData(true)" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!financeStore.isLoading && financeStore.transactions.length === 0" class="flex flex-center h-full q-pa-md text-center">
      <div>
        <q-icon name="hourglass_empty" color="grey-6" size="md" />
        <div class="text-caption text-grey-5 q-mt-xs">No recent ledger activity</div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="financeStore.transactions.length > 0" class="q-pa-md column h-full">
      <div class="row items-center justify-between q-mb-sm">
        <span class="text-operator-title text-grey-5 text-uppercase" style="font-size: 9.5px; letter-spacing: 1.5px;">Recent Ledger Feed</span>
        <div class="row items-center op-gap-4">
          <span v-if="isRealtime" class="live-indicator-dot pulse-healthy"></span>
          <q-btn flat round dense size="xs" color="grey-6" icon="refresh" @click="fetchData(true)" />
        </div>
      </div>
      
      <q-list separator class="col-grow overflow-auto">
        <q-item v-for="item in financeStore.transactions" :key="item.id" class="q-px-none">
          <q-item-section avatar>
            <q-icon :name="item.type === 'credit' ? 'arrow_downward' : 'arrow_upward'" :color="item.type === 'credit' ? 'green-4' : 'red-4'" size="sm" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white text-caption text-weight-bold">{{ item.description }}</q-item-label>
            <q-item-label caption class="text-grey-6" style="font-size: 10px;">{{ item.date }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <span class="text-metric-mono font-mono text-white text-caption">
              {{ item.type === 'credit' ? '+' : '-' }}{{ item.amountFormatted }}
            </span>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();
const isRealtime = ref(true); // Placeholder for RC2.5

const fetchData = async (forceRefresh = false) => {
  await financeStore.fetchTransactions(forceRefresh);
};

onMounted(() => {
  if (financeStore.transactions.length === 0) {
    fetchData();
  }
});
</script>

<style scoped>
.h-full { height: 100%; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.7); }
</style>
