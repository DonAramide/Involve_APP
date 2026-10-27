<template>
  <q-card class="bg-indigo-10 text-white shadow-2 q-pa-md rounded-borders overflow-hidden relative-position glossy column h-full" style="min-height: 140px;">
    <div class="absolute-right q-pa-md opacity-20" style="top: -20px; right: -20px;">
      <q-icon name="account_balance_wallet" size="160px" />
    </div>
    <div class="column justify-between h-full z-index-1">
      <div class="row items-center justify-between q-mb-xs">
        <span class="text-overline text-indigo-3 letter-spacing-1" style="font-size: 8.5px; letter-spacing: 1.5px;">AVAILABLE TO WITHDRAW</span>
        <q-btn flat round dense size="xs" color="indigo-3" icon="refresh" :loading="financeStore.isLoading" @click="fetchData(true)" />
      </div>
      
      <div class="text-h4 text-weight-bolder text-cyan-4 q-my-xs animate-pop">
        {{ financeStore.summary?.balanceFormatted || '---' }}
      </div>

      <div class="row items-center justify-between q-mt-xs">
        <span class="text-indigo-2 text-caption text-weight-bold">Tenant wallet ready for payout</span>
        <router-link to="/tenant/wallet" class="text-cyan-3 text-caption text-weight-bold" style="text-decoration: none;">
          Withdraw
        </router-link>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();

const fetchData = async (force = false) => {
  await financeStore.fetchSummary(force);
};

onMounted(() => {
  if (!financeStore.summary) {
    fetchData();
  }
});
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1.5px; }
.opacity-20 { opacity: 0.15; }
.animate-pop { animation: pop 0.5s ease-out; }
.z-index-1 { z-index: 1; }
.h-full { height: 100%; }

@keyframes pop {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
