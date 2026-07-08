<!-- invify-admin/src/pages/LedgerPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <div class="row items-center">
          <h1 class="text-h4 text-weight-bold q-ma-none text-white">Ledger Explorer</h1>
          <enterprise-context-hint registry-key="treasury-ledger" class="q-ml-sm" />
        </div>
        <div class="text-grey-6">Immutable source of truth for all platform financial movements.</div>
      </div>
      <div class="col-auto">
        <q-btn 
          outline 
          color="indigo-4" 
          icon="download" 
          label="Export Audit Log" 
          class="q-px-md"
        />
      </div>
    </div>

    <!-- Filters Panel -->
    <q-card class="bg-blue-grey-10 q-mb-lg shadow-2 border-indigo">
      <q-card-section class="row q-col-gutter-md items-center">
        <!-- Tenant Search -->
        <div class="col-12 col-md-3">
          <q-select
            v-model="filters.tenantId"
            :options="tenantOptions"
            label="Filter by Tenant"
            dark filled dense emit-value map-options
            @update:model-value="fetchLedger"
          >
            <template v-slot:no-option>
              <q-item><q-item-section class="text-grey">No tenants found</q-item-section></q-item>
            </template>
          </q-select>
        </div>

        <!-- Reference Search -->
        <div class="col-12 col-md-3">
          <q-input v-model="filters.reference" label="Search Reference" dark filled dense @update:model-value="fetchLedger">
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
        </div>

        <!-- Date Range -->
        <div class="col-12 col-md-4">
          <q-input v-model="dateRangeLabel" label="Date Range" dark filled dense readonly>
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-menu cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="filters.range" range dark color="indigo-7" @update:model-value="onDateChange">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-menu>
              </q-icon>
            </template>
          </q-input>
        </div>

        <div class="col-12 col-md-2">
          <q-btn flat color="grey-6" label="Reset" icon="restart_alt" @click="resetFilters" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Ledger Table -->
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat bordered dark
      class="bg-blue-grey-10 shadow-2"
      :pagination="pagination"
    >
      <!-- Reference Column -->
      <template v-slot:body-cell-reference="props">
        <q-td :props="props">
          <span class="text-indigo-3 text-weight-medium font-mono text-caption">{{ props.value }}</span>
        </q-td>
      </template>

      <!-- Amount Column -->
      <template v-slot:body-cell-amount="props">
        <q-td :props="props">
          <div :class="props.value > 0 ? 'text-green-4' : 'text-red-4'" class="text-weight-bold">
            {{ props.value > 0 ? '+' : '' }}{{ Number(props.value).toLocaleString() }} NGN
          </div>
        </q-td>
      </template>

      <!-- Status Column -->
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

      <!-- Metadata / Provider -->
      <template v-slot:body-cell-provider="props">
        <q-td :props="props">
          <q-chip outline color="grey-6" size="xs" text-color="grey-4">
            {{ props.value.toUpperCase() }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:loading>
        <q-inner-loading showing color="indigo-4" />
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../api'
import EnterpriseContextHint from '../components/contextual/EnterpriseContextHint.vue'

const loading = ref(false)
const rows = ref([])
const tenants = ref([])
const pagination = ref({ rowsPerPage: 15, sortBy: 'created_at', descending: true })

const filters = ref({
  tenantId: null,
  reference: '',
  range: null // { from: 'YYYY/MM/DD', to: 'YYYY/MM/DD' }
})

const columns = [
  { name: 'created_at', label: 'DATE', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString(), sortable: true },
  { name: 'reference', label: 'REFERENCE', field: 'reference', align: 'left', sortable: true },
  { name: 'tenant', label: 'TENANT', field: row => row.tenants?.name || 'Unknown', align: 'left' },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right', sortable: true },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left', sortable: true },
  { name: 'provider', label: 'PROVIDER', field: 'provider', align: 'center' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center', sortable: true }
]

const statusColors = {
  'completed': 'green-10',
  'success': 'green-10',
  'pending': 'orange-10',
  'failed': 'red-10'
}

const tenantOptions = computed(() => [
  { label: 'All Tenants', value: null },
  ...tenants.value.map(t => ({ label: t.name, value: t.id }))
])

const dateRangeLabel = computed(() => {
  if (!filters.value.range) return 'All Time'
  if (typeof filters.value.range === 'string') return filters.value.range
  return `${filters.value.range.from} - ${filters.value.range.to}`
})

const fetchLedger = async () => {
  loading.value = true
  try {
    const params = {
      tenantId: filters.value.tenantId,
      reference: filters.value.reference,
      startDate: filters.value.range?.from || (typeof filters.value.range === 'string' ? filters.value.range : undefined),
      endDate: filters.value.range?.to || (typeof filters.value.range === 'string' ? filters.value.range : undefined)
    }
    const { data } = await adminApi.getLedger(params)
    rows.value = data
  } finally {
    loading.value = false
  }
}

const fetchTenants = async () => {
  const { data } = await adminApi.getTenants()
  tenants.value = data
}

const onDateChange = () => {
  fetchLedger()
}

const resetFilters = () => {
  filters.value = { tenantId: null, reference: '', range: null }
  fetchLedger()
}

onMounted(() => {
  fetchTenants()
  fetchLedger()
})
</script>

<style scoped>
.font-mono { font-family: 'Courier New', Courier, monospace; }
.border-indigo { border-left: 5px solid #3f51b5; }
</style>
