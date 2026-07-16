
<template>
  <q-card class="bg-card-dark border-grey-9 q-pa-xl text-center">
    <q-icon name="account_tree" size="xl" color="purple-4" class="q-mb-md" />
    <div class="text-h5 text-white">Reconciliation Operations</div>
    <div class="text-grey-5 q-mb-lg">Migration to Runtime Architecture Active</div>
    <q-btn unelevated color="purple-9" text-color="purple-2" label="Run Sync" @click="fetchData(true)" />
  </q-card>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();

const fetchData = async (force = false) => {
  await financeStore.fetchSummary(force);
};
</script>
