<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <div class="text-caption text-grey-5 font-mono q-mb-xs">ADMIN · CONTROL PLANE ONLY</div>
          <h1 class="text-h4 text-weight-bolder text-white q-my-none">Platform Fee Distribution</h1>
          <div class="text-caption text-grey-5 q-mt-sm">
            FEE MODE: {{ data?.fee_mode || 'SHADOW' }} · Assessed shares, not collected cash. Processor is a payable/cost, not platform revenue.
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn flat color="grey-4" label="Profiles" to="/admin/platform-fees" />
          <q-btn flat color="grey-4" label="Assessments" to="/admin/platform-fees/assessments" />
          <q-btn flat color="grey-4" label="Stakeholders" to="/admin/platform-fees/stakeholders" />
          <q-btn flat color="grey-4" label="Withdrawals" to="/admin/platform-fees/withdrawals" />
          <q-btn outline color="indigo-4" icon="refresh" label="Refresh" :loading="loading" @click="load" />
        </div>
      </div>

      <q-card class="bg-card-dark q-pa-md q-mb-lg">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-3">
            <q-select id="filter-range" dark filled v-model="range" :options="rangeOptions" label="Date range" emit-value map-options />
          </div>
          <div class="col-12 col-md-3" v-if="range === 'custom'">
            <q-input dark filled v-model="customFrom" type="datetime-local" label="From" />
          </div>
          <div class="col-12 col-md-3" v-if="range === 'custom'">
            <q-input dark filled v-model="customTo" type="datetime-local" label="To" />
          </div>
          <div class="col-12 col-md-3">
            <q-select id="filter-transaction-type" dark filled v-model="transactionType" :options="typeOptions" label="Transaction type" emit-value map-options />
          </div>
          <div class="col-12 col-md-3">
            <q-input id="filter-agent" dark filled v-model="agentId" label="Agent ID" />
          </div>
        </div>
      </q-card>

      <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ loadError }}</q-banner>

      <div id="distribution-summary" class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md-2" v-for="card in summaryCards" :key="card.label">
          <q-card class="bg-card-dark q-pa-md">
            <div class="text-caption text-grey-5">{{ card.label }}</div>
            <div class="text-h6 text-white font-mono">{{ card.value }}</div>
          </q-card>
        </div>
      </div>

      <q-card class="bg-card-dark q-pa-md q-mb-lg">
        <div class="text-subtitle1 text-white q-mb-md">Distribution Breakdown</div>
        <q-table
          id="stakeholder-distribution-table"
          class="bg-card-dark text-white"
          dark
          flat
          hide-pagination
          row-key="stakeholder_type"
          :rows="stakeholders"
          :columns="columns"
          :loading="loading"
          @row-click="openStakeholder"
        >
          <template #no-data>
            <div id="distribution-empty-state" class="q-pa-lg text-grey-5">
              No assessed fees in this range. Viewing this page does not create assessments or move money.
            </div>
          </template>
        </q-table>
      </q-card>

      <q-card class="bg-card-dark q-pa-md">
        <div class="text-subtitle1 text-white q-mb-md">Recent Distribution Activity</div>
        <q-table
          dark
          flat
          hide-pagination
          row-key="id"
          :rows="recent"
          :columns="activityColumns"
        >
          <template #no-data>
            <div class="q-pa-md text-grey-5">No payable activity yet.</div>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../../api'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const data = ref(null)
const range = ref('30d')
const customFrom = ref('')
const customTo = ref('')
const transactionType = ref('ALL')
const agentId = ref('')

const rangeOptions = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'Custom', value: 'custom' },
]

const allTypes = [
  { label: 'All', value: 'ALL' },
  { label: 'POS_WITHDRAWAL', value: 'POS_WITHDRAWAL' },
  { label: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER', value: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER' },
  { label: 'TREASURY_WITHDRAWAL', value: 'TREASURY_WITHDRAWAL' },
  { label: 'TREASURY_TRANSFER', value: 'TREASURY_TRANSFER' },
  { label: 'SMS', value: 'SMS' },
  { label: 'AI_TASK', value: 'AI_TASK' },
]

const typeOptions = computed(() => {
  const active = new Set((data.value?.transaction_types_with_activity || []).map((row) => row.transaction_type))
  return allTypes.filter((opt) => opt.value === 'ALL' || active.has(opt.value) || transactionType.value === opt.value)
})

const stakeholders = computed(() => data.value?.stakeholders || [])
const recent = computed(() => data.value?.recent_activity || [])

const summaryCards = computed(() => {
  const d = data.value
  if (!d) {
    return [
      { label: 'TOTAL ASSESSED', value: '0' },
      { label: 'FINAL ASSESSED FEES', value: '₦0.00' },
      { label: 'PLATFORM ASSESSED SHARE', value: '₦0.00' },
      { label: 'PROCESSOR ASSESSED PAYABLE', value: '₦0.00' },
      { label: 'SERVICE ASSESSED SHARE', value: '₦0.00' },
      { label: 'AGENT ASSESSED SHARE', value: '₦0.00' },
    ]
  }
  return [
    { label: 'TOTAL ASSESSED', value: String(d.total_assessments || 0) },
    { label: 'FINAL ASSESSED FEES', value: d.total_final_customer_fee?.display || '₦0.00' },
    { label: 'PLATFORM ASSESSED SHARE', value: d.components?.PLATFORM?.display || '₦0.00' },
    { label: 'PROCESSOR ASSESSED PAYABLE', value: d.components?.PROCESSOR?.display || '₦0.00' },
    { label: 'SERVICE ASSESSED SHARE', value: d.components?.SERVICE?.display || '₦0.00' },
    { label: 'AGENT ASSESSED SHARE', value: d.components?.AGENT?.display || '₦0.00' },
  ]
})

const columns = [
  { name: 'display_name', label: 'Stakeholder', field: 'display_name', align: 'left' },
  { name: 'label', label: 'Nature', field: 'label', align: 'left' },
  { name: 'assessment_count', label: 'Transactions', field: 'assessment_count', align: 'left' },
  { name: 'earned', label: 'Earned (assessed)', field: (row) => row.earned?.display, align: 'left' },
  { name: 'pending', label: 'Pending', field: (row) => row.pending?.display, align: 'left' },
  { name: 'available', label: 'Available', field: (row) => row.available?.display, align: 'left' },
  { name: 'settled', label: 'Settled', field: (row) => row.settled?.display, align: 'left' },
]

const activityColumns = [
  { name: 'created_at', label: 'Date', field: 'created_at', align: 'left' },
  { name: 'assessment_id', label: 'Assessment', field: 'assessment_id', align: 'left' },
  { name: 'component', label: 'Component', field: 'component', align: 'left' },
  { name: 'amount', label: 'Amount', field: (row) => row.amount?.display, align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
]

function rangeBounds() {
  const now = new Date()
  if (range.value === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { from: start.toISOString(), to: now.toISOString() }
  }
  if (range.value === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { from: start.toISOString(), to: now.toISOString() }
  }
  if (range.value === '30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { from: start.toISOString(), to: now.toISOString() }
  }
  return {
    from: customFrom.value ? new Date(customFrom.value).toISOString() : undefined,
    to: customTo.value ? new Date(customTo.value).toISOString() : undefined,
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const bounds = rangeBounds()
    const params = {}
    if (bounds.from) params.from = bounds.from
    if (bounds.to) params.to = bounds.to
    if (transactionType.value && transactionType.value !== 'ALL') params.transaction_type = transactionType.value
    if (agentId.value) params.agentId = agentId.value
    const { data: res } = await adminApi.getPlatformFeeDistribution(params)
    data.value = res?.data || null
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load distribution'
  } finally {
    loading.value = false
  }
}

function openStakeholder(_evt, row) {
  if (row.stakeholder_id) router.push(`/admin/platform-fees/stakeholders/${row.stakeholder_id}`)
}

watch([range, transactionType, customFrom, customTo, agentId], load)
onMounted(load)
</script>
