<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <div class="text-caption text-grey-5 font-mono q-mb-xs">ADMIN · READ ONLY</div>
          <h1 class="text-h4 text-weight-bolder text-white q-my-none">Fee Assessments</h1>
          <div class="text-caption text-grey-5 q-mt-sm">
            Shadow/live assessment ledger. This screen cannot save, edit, publish, delete, reverse, or retry.
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn flat color="grey-4" label="Fee Profiles" to="/admin/platform-fees" />
          <q-btn flat color="grey-4" label="Distribution" to="/admin/platform-fees/distribution" />
          <q-btn outline color="indigo-4" icon="refresh" label="Refresh" :loading="loading" @click="load" />
        </div>
      </div>

      <q-card class="bg-card-dark q-pa-md q-mb-lg">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-2">
            <q-select id="filter-transaction-type" dark filled v-model="filters.transaction_type" :options="typeOptions" label="Transaction type" clearable emit-value map-options />
          </div>
          <div class="col-12 col-md-2">
            <q-select id="filter-mode" dark filled v-model="filters.mode" :options="['SHADOW', 'LIVE']" label="Mode" clearable />
          </div>
          <div class="col-12 col-md-2">
            <q-select id="filter-kind" dark filled v-model="filters.kind" :options="['ASSESSMENT', 'REVERSAL']" label="Kind" clearable />
          </div>
          <div class="col-12 col-md-2">
            <q-input id="filter-agent" dark filled v-model="filters.agent_id" label="Agent ID" />
          </div>
          <div class="col-12 col-md-2">
            <q-input id="filter-tenant" dark filled v-model="filters.tenant_id" label="Tenant ID" />
          </div>
          <div class="col-12 col-md-3">
            <q-input id="filter-source" dark filled v-model="filters.source_system" label="Source system" />
          </div>
          <div class="col-12 col-md-3">
            <q-input id="filter-idempotency" dark filled v-model="filters.idempotency_key" label="Idempotency key / reference" />
          </div>
          <div class="col-12 col-md-3">
            <q-input id="filter-from" dark filled v-model="filters.from" type="datetime-local" label="From" />
          </div>
          <div class="col-12 col-md-3">
            <q-input id="filter-to" dark filled v-model="filters.to" type="datetime-local" label="To" />
          </div>
        </div>
      </q-card>

      <div id="assessment-reconciliation" class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md-3" v-for="card in summaryCards" :key="card.label">
          <q-card class="bg-card-dark q-pa-md">
            <div class="text-caption text-grey-5">{{ card.label }}</div>
            <div class="text-h6 text-white font-mono">{{ card.value }}</div>
          </q-card>
        </div>
      </div>
      <div class="text-caption text-grey-5 q-mb-md" id="legacy-comparison-note">
        Legacy comparison is read-only. tenant_fee_profiles and fee_transactions are not modified here.
      </div>

      <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>

      <q-table
        id="fee-assessment-table"
        class="bg-card-dark text-white"
        dark
        flat
        row-key="id"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        :rows-per-page-options="[25, 50]"
        @row-click="openRow"
      >
        <template #no-data>
          <div id="assessment-empty-state" class="q-pa-lg text-grey-5">
            No fee assessments. Shadow assessments appear here after approved POS/VA test events. This empty state does not insert rows.
          </div>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api'
import { koboToNairaLabel } from '../../utils/platformFeePreview'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const rows = ref([])
const summary = ref(null)

const typeOptions = [
  { label: 'POS_WITHDRAWAL', value: 'POS_WITHDRAWAL' },
  { label: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER', value: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER' },
  { label: 'TREASURY_WITHDRAWAL', value: 'TREASURY_WITHDRAWAL' },
  { label: 'TREASURY_TRANSFER', value: 'TREASURY_TRANSFER' },
  { label: 'SMS', value: 'SMS' },
  { label: 'AI_TASK', value: 'AI_TASK' },
]

const filters = reactive({
  transaction_type: null,
  mode: null,
  kind: null,
  agent_id: '',
  tenant_id: '',
  source_system: '',
  idempotency_key: '',
  from: '',
  to: '',
})

const columns = [
  { name: 'id', label: 'Assessment ID', field: 'id', align: 'left' },
  { name: 'agent_id', label: 'Institute', field: 'agent_id', align: 'left' },
  { name: 'tenant_id', label: 'Tenant', field: 'tenant_id', align: 'left' },
  { name: 'transaction_type', label: 'Type', field: 'transaction_type', align: 'left' },
  { name: 'mode', label: 'Mode', field: 'mode', align: 'left' },
  { name: 'kind', label: 'Kind', field: 'kind', align: 'left' },
  { name: 'profile_version_id', label: 'Version', field: 'profile_version_id', align: 'left' },
  { name: 'final_fee_kobo', label: 'Fee', field: (row) => koboToNairaLabel(row.final_fee_kobo), align: 'left' },
  { name: 'agent_share', label: 'Institute Share', field: (row) => koboToNairaLabel(row.distribution_totals?.AGENT_FEE), align: 'left' },
  { name: 'source_system', label: 'Source', field: 'source_system', align: 'left' },
  { name: 'event_time', label: 'Event time', field: (row) => formatTs(row.event_time), align: 'left' },
]

const summaryCards = computed(() => {
  const s = summary.value || {}
  return [
    { label: 'Assessments', value: String(s.assessment_count ?? 0) },
    { label: 'Txn amount', value: koboToNairaLabel(s.total_transaction_amount_kobo) },
    { label: 'Calculated fee', value: koboToNairaLabel(s.total_calculated_fee_kobo) },
    { label: 'Final fee', value: koboToNairaLabel(s.total_final_fee_kobo) },
    { label: 'Platform', value: koboToNairaLabel(s.component_totals?.PLATFORM_FEE) },
    { label: 'Processor', value: koboToNairaLabel(s.component_totals?.PROCESSOR_FEE) },
    { label: 'Service', value: koboToNairaLabel(s.component_totals?.SERVICE_FEE) },
    { label: 'Institute', value: koboToNairaLabel(s.component_totals?.AGENT_FEE) },
    { label: 'Invalid splits', value: String(s.errors?.invalid_distribution_count ?? 0) },
    { label: 'Missing lines', value: String(s.errors?.missing_line_count ?? 0) },
  ]
})

function formatTs(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function query() {
  const params = {}
  if (filters.transaction_type) params.transaction_type = filters.transaction_type
  if (filters.mode) params.mode = filters.mode
  if (filters.kind) params.kind = filters.kind
  if (filters.agent_id) params.agentId = filters.agent_id
  if (filters.tenant_id) params.tenantId = filters.tenant_id
  if (filters.source_system) params.source_system = filters.source_system
  if (filters.idempotency_key) params.idempotency_key = filters.idempotency_key
  if (filters.from) params.from = new Date(filters.from).toISOString()
  if (filters.to) params.to = new Date(filters.to).toISOString()
  return params
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const params = query()
    const [{ data: listRes }, { data: reconRes }] = await Promise.all([
      adminApi.listPlatformFeeAssessments(params),
      adminApi.getPlatformFeeReconciliation(params),
    ])
    rows.value = listRes?.data || []
    summary.value = reconRes?.data || null
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load assessments'
  } finally {
    loading.value = false
  }
}

function openRow(_evt, row) {
  router.push(`/admin/platform-fees/assessments/${row.id}`)
}

watch(filters, () => { load() }, { deep: true })
onMounted(load)
</script>
