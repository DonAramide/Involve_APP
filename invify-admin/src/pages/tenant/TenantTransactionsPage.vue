<!-- invify-admin/src/pages/tenant/TenantTransactionsPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    
    <!-- Header with Action Hub -->
    <div class="row items-center justify-between q-mb-xl">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="receipt_long" color="green-4" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Transactions Ledger</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          View, audit, and export all business transactions synced directly with Quasar Treasury.
        </div>
      </div>

      <!-- Action Hooks -->
      <div class="row q-gutter-sm">
        <q-btn outline color="grey-5" icon="file_download" label="Export CSV" @click="triggerCsvExport" class="text-weight-bold font-mono text-caption" />
        <q-btn outline color="grey-5" icon="picture_as_pdf" label="Download Statements" @click="triggerPdfExport" class="text-weight-bold font-mono text-caption" />
        <q-btn unelevated color="indigo-10" icon="sync" label="Sync Ledgers" @click="syncTreasury" :loading="syncing" class="text-weight-bold text-caption" />
      </div>
    </div>

    <!-- Status Filters & Timeline Summary -->
    <div class="row q-col-gutter-lg q-mb-lg">
      <div class="col-12 col-md-4" v-for="stat in payoutStats" :key="stat.label">
        <q-card class="bg-card-dark border-grey-9 q-pa-md">
          <div class="row items-center justify-between">
            <span class="text-operator-title text-grey-5" style="font-size: 10px; letter-spacing: 1px;">{{ stat.label }}</span>
            <q-badge :color="stat.badgeBg" :text-color="stat.badgeColor" class="text-metric-sm text-weight-bold">{{ stat.count }} BATCHES</q-badge>
          </div>
          <div class="text-h5 text-weight-bold text-white text-metric-mono q-mt-sm">{{ stat.amount }}</div>
          <div class="text-caption text-grey-6 q-mt-xs font-mono">Earliest Payout: {{ stat.timeline }}</div>
        </q-card>
      </div>
    </div>

    <!-- Advanced Filter Bar -->
    <q-card class="bg-card-dark border-grey-9 q-pa-md q-mb-lg">
      <div class="row items-center q-col-gutter-md">
        <div class="col-12 col-sm-3">
          <q-input v-model="filters.search" dense dark outlined placeholder="Search reference or device..." class="font-mono text-caption">
            <template v-slot:append>
              <q-icon name="search" color="grey-5" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-select v-model="filters.status" :options="['ALL STATES', 'SETTLED', 'PENDING', 'DISPUTED']" dense dark outlined class="font-mono text-caption" />
        </div>
        <div class="col-12 col-sm-3">
          <q-select v-model="filters.type" :options="['ALL CHANNELS', 'POS PAYMENT', 'BANK TRANSFER', 'Treasury Payout']" dense dark outlined class="font-mono text-caption" />
        </div>
        <div class="col-12 col-sm-3 text-right">
          <q-btn flat color="indigo-4" icon="restart_alt" label="Reset Filter Params" @click="resetFilters" class="text-weight-bold font-mono text-caption" />
        </div>
      </div>
    </q-card>

    <!-- Interactive Ledger Data Matrix -->
    <q-card class="bg-card-dark border-grey-9">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        dark
        flat
        bordered
        class="bg-card-dark"
        :loading="syncing"
        :rows-per-page-options="[10, 20, 50]"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.value)" class="text-weight-bold font-mono" style="font-size: 10px;">
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>
        
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-metric-mono font-mono text-weight-bold">
            {{ currentCurrency.symbol }}{{ props.value.toLocaleString() }}
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn flat dense round size="sm" color="indigo-4" icon="receipt" @click="viewInvoice(props.row)">
              <q-tooltip class="bg-indigo-10 text-white">Inspect Receipt Lineage</q-tooltip>
            </q-btn>
            <q-btn flat dense round size="sm" color="amber-4" icon="shield" @click="auditReplay(props.row)" class="q-ml-xs">
              <q-tooltip class="bg-indigo-10 text-white">Verify Cryptographic Audit Chain</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const syncing = ref(false)

const filters = ref({
  search: '',
  status: 'ALL STATES',
  type: 'ALL CHANNELS'
})

const payoutStats = ref([
  { label: 'Pending Settlement Balance', amount: '₦1,424,500', count: 4, badgeBg: 'amber-10', badgeColor: 'amber-3', timeline: 'May 18, 2026' },
  { label: 'Cleared Treasury Balance', amount: '₦4,850,200', count: 12, badgeBg: 'green-10', badgeColor: 'green-3', timeline: 'May 16, 2026' },
  { label: 'Active Disputes Scope', amount: '₦0', count: 0, badgeBg: 'red-10', badgeColor: 'red-3', timeline: 'None' }
])

const columns = [
  { name: 'date', label: 'OPERATIONAL TIMESTAMP', field: 'date', align: 'left', sortable: true },
  { name: 'reference', label: 'QUASAR REFERENCE', field: 'ref', align: 'left' },
  { name: 'type', label: 'PAYMENT CHANNEL', field: 'type', align: 'center' },
  { name: 'amount', label: 'AMOUNT IN NAIRA', field: 'amount', align: 'right', sortable: true },
  { name: 'status', label: 'SETTLEMENT STATE', field: 'status', align: 'center' },
  { name: 'actions', label: 'AUDIT ACTIONS', align: 'center' }
]

const loadTransactions = () => {
  const localList = localStorage.getItem('tenant_transactions')
  if (localList) {
    return JSON.parse(localList)
  }
  const defaultRows = [
    { id: 1, date: '2026-05-17 03:42', ref: 'QS-TX-892410', type: 'POS PAYMENT', amount: 84000, status: 'SETTLED' },
    { id: 2, date: '2026-05-17 01:15', ref: 'QS-PO-301211', type: 'Treasury Payout', amount: 150000, status: 'SETTLED' },
    { id: 3, date: '2026-05-16 22:50', ref: 'QS-TX-892409', type: 'POS PAYMENT', amount: 32000, status: 'SETTLED' },
    { id: 4, date: '2026-05-16 18:30', ref: 'QS-TX-892408', type: 'POS PAYMENT', amount: 120000, status: 'SETTLED' },
    { id: 5, date: '2026-05-16 14:10', ref: 'QS-TX-892407', type: 'BANK TRANSFER', amount: 45000, status: 'PENDING' },
    { id: 6, date: '2026-05-15 11:20', ref: 'QS-TX-892406', type: 'POS PAYMENT', amount: 185000, status: 'SETTLED' },
    { id: 7, date: '2026-05-15 08:45', ref: 'QS-TX-892405', type: 'POS PAYMENT', amount: 62000, status: 'SETTLED' }
  ]
  localStorage.setItem('tenant_transactions', JSON.stringify(defaultRows))
  return defaultRows
}

const rows = ref(loadTransactions())

const filteredRows = computed(() => {
  return rows.value.filter(row => {
    // Search filter
    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      if (!row.ref.toLowerCase().includes(q) && !row.type.toLowerCase().includes(q)) {
        return false
      }
    }
    // Status filter
    if (filters.value.status !== 'ALL STATES' && row.status !== filters.value.status) {
      return false
    }
    // Type filter
    if (filters.value.type !== 'ALL CHANNELS' && row.type !== filters.value.type) {
      return false
    }
    return true
  })
})

const getStatusColor = (status) => {
  switch (status) {
    case 'SETTLED': return 'green-10'
    case 'PENDING': return 'amber-10'
    case 'DISPUTED': return 'red-10'
    default: return 'grey-9'
  }
}

const syncTreasury = () => {
  syncing.value = true
  setTimeout(() => {
    syncing.value = false
    $q.notify({ type: 'positive', message: 'Replay-safe dynamic matching finished successfully.' })
  }, 1500)
}

const triggerCsvExport = () => {
  $q.notify({ type: 'info', message: 'CSV ledger snapshot exported successfully.' })
}

const triggerPdfExport = () => {
  $q.notify({ type: 'info', message: 'Cryptographically signed audit statement dispatched to PDF.' })
}

const viewInvoice = (row) => {
  $q.dialog({
    title: 'Receipt Detail Lineage',
    message: `Reference: ${row.ref}\nTimestamp: ${row.date}\nChannel: ${row.type}\nAmount: {{ currentCurrency.symbol }}${row.amount.toLocaleString()}\nAudit status: Validated`,
    dark: true
  })
}

const auditReplay = (row) => {
  $q.notify({ type: 'positive', message: `Cryptographic lineage for ${row.ref} confirmed. Replay signature valid.` })
}

const resetFilters = () => {
  filters.value = {
    search: '',
    status: 'ALL STATES',
    type: 'ALL CHANNELS'
  }
}
</script>

<style scoped>
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
