<template>
  <q-card class="bg-card-dark text-white shadow-2 q-pa-md rounded-borders overflow-hidden relative-position column h-full border-amber-left" style="min-height: 140px;">
    <div class="absolute-right q-pa-md opacity-20" style="top: -20px; right: -20px;">
      <q-icon name="account_balance" size="160px" />
    </div>
    <div class="column justify-between h-full z-index-1">
      <div class="row items-center justify-between q-mb-xs">
        <span class="text-overline text-amber-5 letter-spacing-1" style="font-size: 8.5px; letter-spacing: 1.5px;">HELD WITH INVIFY / QUASAR</span>
        <q-btn flat round dense size="xs" color="amber-5" icon="refresh" :loading="financeStore.isLoading" @click="fetchData(true)" />
      </div>

      <div class="text-h4 text-weight-bolder text-amber-4 q-my-xs">
        {{ financeStore.summary?.platformHeldFormatted || '---' }}
      </div>

      <div class="text-caption text-grey-5">
        This is live Quasar VA money, not sales-period invoices. When card is ₦0.00, Held must equal Unswept VA. Unswept VA = customer VA + staff VA + any unmapped remainder.
      </div>
      <div class="row items-center justify-between q-mt-xs text-caption">
        <span class="text-grey-5">In: {{ financeStore.summary?.platformCollectedFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Out: {{ financeStore.summary?.platformRemittedFormatted || '₦0.00' }}</span>
      </div>
      <div class="column q-mt-xs text-caption op-gap-4">
        <span class="text-amber-5">Unswept VA total: {{ financeStore.summary?.unsweptVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Customer VA wallets: {{ financeStore.summary?.unsweptCustomerVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Staff VA wallets: {{ financeStore.summary?.unsweptStaffVaFormatted || '₦0.00' }}</span>
        <span class="text-grey-5">Unmapped VA: {{ financeStore.summary?.unsweptUnmappedVaFormatted || '₦0.00' }}</span>
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
  fetchData(true);
});
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1.5px; }
.opacity-20 { opacity: 0.12; }
.z-index-1 { z-index: 1; }
.h-full { height: 100%; }
.op-gap-4 { gap: 4px; }
.bg-card-dark { background-color: #12191c; }
.border-amber-left { border-left: 3px solid #f59e0b; }
</style>
