<!-- invify-admin/src/pages/WalletPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Balance Hero Section -->
    <div class="row q-col-gutter-lg q-mb-xl">
      <div class="col-12">
        <q-card class="bg-indigo-10 text-white shadow-2 q-pa-xl rounded-borders overflow-hidden relative-position glossy">
          <div class="absolute-right q-pa-lg opacity-20">
            <q-icon name="account_balance_wallet" size="200px" />
          </div>
          <div class="column items-center">
            <div class="row items-center">
              <div class="text-overline text-indigo-3 letter-spacing-1">TOTAL AVAILABLE BALANCE</div>
              <enterprise-context-hint registry-key="virtual-account" class="q-ml-xs" />
            </div>
            <div class="text-h1 text-weight-bolder text-cyan-4 q-my-md animate-pop">
              {{ currentCurrency.symbol }}{{ balance.toLocaleString() }}
            </div>
            <q-btn 
              outline 
              color="cyan-4" 
              icon="refresh" 
              label="Sync Balance" 
              :loading="loadingBalance"
              @click="fetchBalance"
              class="q-px-md"
            />
          </div>
        </q-card>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="row q-col-gutter-md items-center q-mb-lg">
      <div class="col-12 col-md-4">
        <q-input v-model="dateRangeLabel" label="Filter by Date" dark filled dense readonly>
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-menu cover transition-show="scale" transition-hide="scale">
                <q-date v-model="filters.range" range dark color="indigo-7" @update:model-value="fetchTransactions" />
              </q-menu>
            </q-icon>
          </template>
        </q-input>
      </div>
      <div class="col-12 col-md-3">
        <q-select
          v-model="filters.status"
          :options="statusOptions"
          label="Transaction Status"
          dark filled dense emit-value map-options
          @update:model-value="fetchTransactions"
        />
      </div>
      <q-space />
      <q-btn flat class="col-auto text-grey-6" icon="restart_alt" label="Reset Filters" @click="resetFilters" />
    </div>

    <!-- Transactions Table -->
    <q-table
      title="Transaction History"
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loadingRows"
      flat bordered dark
      class="bg-blue-grey-10 shadow-2"
      :pagination="pagination"
      title-class="text-indigo-3 text-weight-bold"
    >
      <template v-slot:body-cell-amount="props">
        <q-td :props="props">
          <span :class="props.row.amount > 0 ? 'text-green-4' : 'text-red-4'" class="text-weight-bold">
            {{ props.row.amount > 0 ? '+' : '' }}{{ (props.row.amount).toLocaleString() }} NGN
          </span>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip 
            :color="props.value === 'completed' ? 'green-10' : 'orange-10'" 
            text-color="white" 
            size="sm" dense
          >
            {{ props.value.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="cyan-4" />
      </template>

      <template v-slot:no-data>
        <div class="full-width row flex-center q-pa-xl text-grey-6">
          <q-icon size="2em" name="history" />
          <span class="q-ml-sm">No transaction history found for your filters.</span>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency';
const { currentCurrency } = useCurrency();
import EnterpriseContextHint from '../components/contextual/EnterpriseContextHint.vue';

import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../api'

const loadingBalance = ref(false)
const loadingRows = ref(false)
const balance = ref(0)
const rows = ref([])
const pagination = ref({ rowsPerPage: 15 })

const filters = ref({
  range: null,
  status: 'all'
})

const columns = [
  { name: 'created_at', label: 'DATE', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString(), sortable: true },
  { name: 'reference', label: 'REFERENCE', field: 'reference', align: 'left' },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left', sortable: true },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right', sortable: true },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center', sortable: true }
]

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' }
]

const dateRangeLabel = computed(() => {
  if (!filters.value.range) return 'All Time'
  if (typeof filters.value.range === 'string') return filters.value.range
  return `${filters.value.range.from} - ${filters.value.range.to}`
})

const fetchBalance = async () => {
  loadingBalance.value = true
  try {
    // In a real app, we'd get the tenantId from auth context
    // For this admin view mockup, we'll fetch a summary
    const { data } = await adminApi.getLedger()
    balance.value = data.reduce((sum, entry) => 
      entry.status === 'completed' ? sum + Number(entry.amount) : sum, 0)
  } finally {
    loadingBalance.value = false
  }
}

const fetchTransactions = async () => {
  loadingRows.value = true
  try {
    const params = {
      status: filters.value.status !== 'all' ? filters.value.status : undefined,
      startDate: filters.value.range?.from || (typeof filters.value.range === 'string' ? filters.value.range : undefined),
      endDate: filters.value.range?.to || (typeof filters.value.range === 'string' ? filters.value.range : undefined)
    }
    const { data } = await adminApi.getLedger(params)
    rows.value = data
  } finally {
    loadingRows.value = false
  }
}

const resetFilters = () => {
  filters.value = { range: null, status: 'all' }
  fetchTransactions()
}

onMounted(() => {
  fetchBalance()
  fetchTransactions()
})
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
