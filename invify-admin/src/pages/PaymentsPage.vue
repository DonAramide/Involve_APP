<!-- invify-admin/src/pages/PaymentsPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white">Payment Explorer</h1>
        <div class="text-grey-6">Audit and monitor all platform transaction intents.</div>
      </div>
      <div class="col-auto">
        <q-btn outline color="indigo-4" icon="download" label="Export CSV" class="q-px-md glossy" />
      </div>
    </div>

    <!-- Filters Header -->
    <q-card class="bg-blue-grey-10 q-mb-lg shadow-2 border-indigo">
      <q-card-section class="row q-col-gutter-md items-center">
        <!-- Reference Search -->
        <div class="col-12 col-md-3">
          <q-input 
            v-model="filters.reference" 
            label="Search Reference" 
            dark filled dense 
            @update:model-value="fetchPayments"
            @keyup.enter="fetchPayments"
          >
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
        </div>

        <!-- Tenant Dropdown -->
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.tenantId"
            :options="tenantOptions"
            label="Filter by Tenant"
            dark filled dense emit-value map-options
            @update:model-value="fetchPayments"
          >
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">No tenants found</q-item-section></q-item>
            </template>
          </q-select>
        </div>

        <!-- Status Filter -->
        <div class="col-12 col-md-2">
          <q-select
            v-model="filters.status"
            :options="statusOptions"
            label="Status"
            dark filled dense emit-value map-options
            @update:model-value="fetchPayments"
          />
        </div>

        <!-- Date Range -->
        <div class="col-12 col-md-3">
          <q-input v-model="dateRangeLabel" label="Date Range" dark filled dense readonly>
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-menu cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filters.range" range dark color="indigo-7" @update:model-value="fetchPayments">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Apply" color="primary" flat />
                    </div>
                  </q-date>
                </q-menu>
              </q-icon>
            </template>
          </q-input>
        </div>

        <div class="col-12 col-md-1 flex flex-center">
          <q-btn flat color="grey-6" icon="restart_alt" @click="resetFilters" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Payments Table -->
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat bordered dark
      class="bg-blue-grey-10 shadow-2 rounded-borders"
      :pagination="{ rowsPerPage: 15 }"
    >
      <template v-slot:body-cell-reference="props">
        <q-td :props="props">
          <span class="text-mono text-indigo-3 text-weight-medium">{{ props.value }}</span>
        </q-td>
      </template>

      <template v-slot:body-cell-amount="props">
        <q-td :props="props">
          <div class="text-weight-bold text-subtitle2">{{ currentCurrency.symbol }}{{ Number(props.value).toLocaleString() }}</div>
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip 
            :color="statusColors[props.value] || 'grey-8'" 
            text-color="white" 
            size="sm" dense
          >
            {{ props.value.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn 
            flat round dense 
            color="indigo-3" 
            icon="visibility" 
            @click="openDetails(props.row)"
          />
        </q-td>
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="indigo-4" />
      </template>
    </q-table>

    <!-- Transaction Details Modal -->
    <q-dialog v-model="detailsModal" backdrop-filter="blur(10px)">
      <q-card style="width: 700px; max-width: 90vw;" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Transaction Forensic Detail</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-md-6">
              <div class="text-overline text-grey-6">Reference</div>
              <div class="text-h6 text-indigo-3 text-mono">{{ selectedItem?.reference }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-overline text-grey-6">Tenant</div>
              <div class="text-h6">{{ selectedItem?.tenants?.name }}</div>
            </div>
          </div>

          <!-- Metadata Section -->
          <div class="q-mb-md">
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-bold section-title">Transaction Metadata</div>
              <q-space />
              <q-toggle
                v-model="viewRawJson"
                label="View Raw JSON"
                color="indigo-5"
                size="sm"
                dark
              />
            </div>

            <q-card flat bordered dark class="bg-blue-grey-9 q-pa-md">
              <div v-if="!viewRawJson" class="row q-col-gutter-sm">
                <template v-if="selectedItem?.metadata && Object.keys(selectedItem.metadata).length">
                  <div v-for="(val, key) in selectedItem.metadata" :key="key" class="col-12 col-sm-6">
                    <span class="text-grey-6 text-caption text-uppercase">{{ key }}:</span>
                    <div class="text-weight-medium">{{ val }}</div>
                  </div>
                </template>
                <div v-else class="text-grey-6 italic">No metadata available</div>
              </div>
              <div v-else>
                <pre class="text-caption text-cyan-2 q-ma-none overflow-auto" style="max-height: 200px;">{{ JSON.stringify(selectedItem?.metadata, null, 2) }}</pre>
              </div>
            </q-card>
          </div>

          <!-- Audit Timeline -->
          <div>
            <div class="text-subtitle1 text-weight-bold q-mb-sm section-title">Audit Timeline (Ledger)</div>
            <q-card flat bordered dark class="bg-blue-grey-9 q-pa-md">
              <div v-if="loadingHistory" class="flex flex-center q-pa-lg">
                <q-spinner-dots color="indigo-4" size="2em" />
              </div>
              <div v-else-if="statusHistory.length">
                 <q-timeline color="indigo-4" darkLayout side="right" dense>
                    <q-timeline-entry
                      v-for="entry in statusHistory"
                      :key="entry.id"
                      :title="entry.type.toUpperCase()"
                      :subtitle="new Date(entry.created_at).toLocaleString()"
                      :color="statusColors[entry.status]"
                      icon="done"
                    >
                      <div class="text-caption">Status: {{ entry.status }} | Provider: {{ entry.provider }}</div>
                    </q-timeline-entry>
                 </q-timeline>
              </div>
              <div v-else class="text-grey-6 text-center italic">No ledger trail found for this reference.</div>
            </q-card>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../api'

const loading = ref(false)
const loadingHistory = ref(false)
const rows = ref([])
const tenants = ref([])
const detailsModal = ref(false)
const selectedItem = ref(null)
const statusHistory = ref([])
const viewRawJson = ref(false)

const filters = ref({
  reference: '',
  tenantId: null,
  status: 'all',
  range: null
})

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Successful', value: 'successful' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' }
]

const statusColors = {
  'successful': 'green-9',
  'completed': 'green-9',
  'pending': 'orange-10',
  'failed': 'red-9'
}

const columns = [
  { name: 'date', label: 'DATE', field: 'created_at', format: val => new Date(val).toLocaleString(), sortable: true, align: 'left' },
  { name: 'reference', label: 'REFERENCE', field: 'reference', align: 'left' },
  { name: 'tenant', label: 'TENANT', field: row => row.tenants?.name || 'Unknown', align: 'left' },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right', sortable: true },
  { name: 'provider', label: 'PROVIDER', field: 'provider', align: 'center' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'actions', label: 'ACTIONS', field: 'id', align: 'center' }
]

const tenantOptions = computed(() => [
  { label: 'All Tenants', value: null },
  ...tenants.value.map(t => ({ label: t.name, value: t.id }))
])

const dateRangeLabel = computed(() => {
  if (!filters.value.range) return 'All Time'
  if (typeof filters.value.range === 'string') return filters.value.range
  return `${filters.value.range.from} - ${filters.value.range.to}`
})

const fetchPayments = async () => {
  loading.value = true
  try {
    const params = {
      tenantId: filters.value.tenantId,
      status: filters.value.status !== 'all' ? filters.value.status : undefined,
      reference: filters.value.reference || undefined,
      startDate: filters.value.range?.from || (typeof filters.value.range === 'string' ? filters.value.range : undefined),
      endDate: filters.value.range?.to || (typeof filters.value.range === 'string' ? filters.value.range : undefined)
    }
    const { data } = await adminApi.getPayments(params)
    rows.value = data
  } finally {
    loading.value = false
  }
}

const openDetails = async (payment) => {
  selectedItem.value = payment
  detailsModal.value = true
  viewRawJson.value = false
  loadingHistory.value = true
  statusHistory.value = []
  
  try {
    // Audit timeline comes from searching the ledger for this reference
    const { data } = await adminApi.getLedger({ reference: payment.reference })
    statusHistory.value = data
  } finally {
    loadingHistory.value = false
  }
}

const resetFilters = () => {
  filters.value = { reference: '', tenantId: null, status: 'all', range: null }
  fetchPayments()
}

onMounted(async () => {
  const tRes = await adminApi.getTenants()
  tenants.value = tRes.data
  fetchPayments()
})
</script>

<style scoped>
.text-mono { font-family: 'Courier New', Courier, monospace; }
.border-indigo { border-left: 5px solid #3f51b5; }
.section-title { border-left: 3px solid #3f51b5; padding-left: 10px; margin-left: -5px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-blue-grey-9 { background: #263238; }
</style>
