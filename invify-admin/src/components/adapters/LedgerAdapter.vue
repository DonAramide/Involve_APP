
<template>
  <div>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Global Ledger</h1>
        <div class="text-caption text-grey-5 q-mt-xs">Immutable chronological record of all financial mutations.</div>
      </div>
      <q-btn outline color="indigo-4" icon="refresh" label="Sync Ledger" @click="fetchData(true)" :loading="financeStore.isLoading" />
    </div>

    <q-table
      :rows="financeStore.transactions"
      :columns="columns"
      row-key="id"
      :loading="financeStore.isLoading"
      flat bordered dark
      class="bg-card-dark shadow-2 border-grey-9"
      :pagination="{ rowsPerPage: 20 }"
    >
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          <q-chip size="sm" :color="props.row.type === 'credit' ? 'green-10' : 'red-10'" :text-color="props.row.type === 'credit' ? 'green-3' : 'red-3'" class="text-weight-bold font-mono">
            {{ props.row.type.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();

const columns = [
  { name: 'date', label: 'Timestamp', field: 'date', align: 'left', sortable: true },
  { name: 'id', label: 'Event Hash', field: 'id', align: 'left' },
  { name: 'type', label: 'Mutation', field: 'type', align: 'left' },
  { name: 'description', label: 'Context', field: 'description', align: 'left' },
  { name: 'amountFormatted', label: 'Delta', field: 'amountFormatted', align: 'right', sortable: true }
];

const fetchData = async (force = false) => {
  await financeStore.fetchTransactions(force);
};

onMounted(() => {
  if (financeStore.transactions.length === 0) fetchData();
});
</script>
