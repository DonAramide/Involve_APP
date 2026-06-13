<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="account_balance" color="cyan-3" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Settlements</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          View and manage merchant bank settlements.
        </div>
      </div>
    </div>
    
    <div class="q-pa-md bg-card-dark rounded-borders border-grey-9">
      <q-table
        dark
        :rows="settlements"
        :columns="columns"
        row-key="id"
        flat
        class="bg-transparent"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.row.status === 'CLEARED' ? 'green-8' : 'amber-8'">
              {{ props.row.status }}
            </q-badge>
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTenantSettlementStore } from '../stores/tenantSettlementStore';

const store = useTenantSettlementStore();
const { settlements } = storeToRefs(store);

const columns = [
  { name: 'id', label: 'Settlement ID', field: 'id', align: 'left' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
  { name: 'amount', label: 'Amount (₦)', field: 'amount', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
];

onMounted(() => {
  store.loadSettlements();
});
</script>

<style scoped>
.bg-card-dark { background: #0b0f19; }
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.letter-spacing-1 { letter-spacing: 1px; }
</style>
