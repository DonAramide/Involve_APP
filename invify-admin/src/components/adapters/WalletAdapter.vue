
<template>
  <div class="row q-col-gutter-lg q-mb-xl">
    <div class="col-12">
      <q-card class="bg-indigo-10 text-white shadow-2 q-pa-xl rounded-borders overflow-hidden relative-position glossy">
        <div class="absolute-right q-pa-lg opacity-20">
          <q-icon name="account_balance_wallet" size="200px" />
        </div>
        <div class="column items-center">
          <div class="row items-center">
            <div class="text-overline text-indigo-3 letter-spacing-1">TOTAL AVAILABLE BALANCE</div>
          </div>
          <div class="text-h1 text-weight-bolder text-cyan-4 q-my-md animate-pop">
            {{ financeStore.summary?.balanceFormatted || '---' }}
          </div>
          <q-btn 
            outline 
            color="cyan-4" 
            icon="refresh" 
            label="Sync Balance" 
            :loading="financeStore.isLoading"
            @click="fetchData(true)"
            class="q-px-md"
          />
        </div>
      </q-card>
    </div>
  </div>

  <q-table
    title="Transaction History"
    :rows="financeStore.transactions"
    :columns="columns"
    row-key="id"
    :loading="financeStore.isLoading"
    flat bordered dark
    class="bg-blue-grey-10 shadow-2"
    :pagination="{ rowsPerPage: 15 }"
    title-class="text-indigo-3 text-weight-bold"
  >
    <template v-slot:no-data>
      <div class="full-width row flex-center q-pa-xl text-grey-6">
        <q-icon size="2em" name="history" />
        <span class="q-ml-sm">No transaction history found.</span>
      </div>
    </template>
  </q-table>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFinanceStore } from '../../stores/finance.store';

const financeStore = useFinanceStore();

const columns = [
  { name: 'date', label: 'DATE', field: 'date', align: 'left', sortable: true },
  { name: 'description', label: 'DESCRIPTION', field: 'description', align: 'left' },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left', sortable: true },
  { name: 'amountFormatted', label: 'AMOUNT', field: 'amountFormatted', align: 'right', sortable: true }
];

const fetchData = async (force = false) => {
  await Promise.all([
    financeStore.fetchSummary(force),
    financeStore.fetchTransactions(force)
  ]);
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.opacity-20 { opacity: 0.2; }
.animate-pop { animation: pop 0.5s ease-out; }
@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
