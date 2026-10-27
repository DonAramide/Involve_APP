<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />
    <div class="relative-position" style="z-index: 10;">
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <div class="text-caption text-grey-5 font-mono q-mb-xs">ADMIN · PLATFORM REVENUE</div>
          <h1 class="text-h4 text-weight-bolder text-white q-my-none">Platform Fee Orchestration</h1>
          <div class="text-caption text-grey-5 q-mt-sm">
            Global and Agent-scoped transaction fee profiles. Maker proposes a publish; a different checker must approve. School billing and tenant_fee_profiles are not used here.
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn flat color="grey-4" label="Assessments (read-only)" to="/admin/platform-fees/assessments" />
          <q-btn flat color="grey-4" label="Distribution" to="/admin/platform-fees/distribution" />
          <q-btn flat color="grey-4" label="Stakeholders" to="/admin/platform-fees/stakeholders" />
          <q-btn flat color="grey-4" label="Withdrawals" to="/admin/platform-fees/withdrawals" />
          <q-btn outline color="indigo-4" icon="refresh" label="Refresh" :loading="loading" @click="loadRows" />
        </div>
      </div>

      <div class="row q-col-gutter-md q-mb-md items-center">
        <div class="col-12 col-md-4">
          <q-select
            id="agent-filter"
            dark
            filled
            v-model="selectedAgentId"
            :options="agentOptions"
            label="Institute"
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-md-8 text-caption text-grey-4">
          Leave Agent empty for global configuration. Selecting an Agent shows that Agent's published profile, or GLOBAL FALLBACK if none is published.
        </div>
      </div>

      <q-banner v-if="loadError" class="bg-red-10 text-red-2 q-mb-md" rounded>
        {{ loadError }}
      </q-banner>

      <q-table
        id="platform-fee-profile-table"
        class="bg-card-dark text-white"
        dark
        flat
        row-key="transaction_type"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        :rows-per-page-options="[12]"
        hide-pagination
        @row-click="openRow"
      >
        <template #body-cell-current_status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.current_status)" :label="props.row.current_status" />
          </q-td>
        </template>
        <template #body-cell-current_published_version="props">
          <q-td :props="props">
            {{ props.row.current_published_version == null ? 'None' : ('v' + props.row.current_published_version) }}
          </q-td>
        </template>
        <template #body-cell-fee_source_label="props">
          <q-td :props="props">
            {{ props.row.fee_source_label || 'Global configuration' }}
          </q-td>
        </template>
      </q-table>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { adminApi } from '../../api'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const loadError = ref('')
const selectedAgentId = ref(null)
const agents = ref([])

const agentOptions = ref([{ label: 'All Institutes / Global', value: null }])

const columns = [
  { name: 'transaction_type', label: 'Transaction Type', field: 'transaction_type', align: 'left' },
  { name: 'fee_source_label', label: 'Source', field: 'fee_source_label', align: 'left' },
  { name: 'fee_label', label: 'Fee', field: (row) => feeLabel(row), align: 'left' },
  { name: 'cap_label', label: 'Cap', field: (row) => capLabel(row), align: 'left' },
  { name: 'distribution_label', label: 'Distribution', field: (row) => distributionLabel(row), align: 'left' },
  { name: 'current_status', label: 'Status', field: 'current_status', align: 'left' },
  { name: 'current_published_version', label: 'Published Version', field: 'current_published_version', align: 'left' },
]

function formatTs(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function bpsPct(bps) {
  if (bps == null || bps === '') return '—'
  return (Number(bps) / 100).toFixed(2) + '%'
}

function feeLabel(row) {
  if (row.percentage_bps == null && !row.fields) return '—'
  const bps = row.percentage_bps ?? row.fields?.percentage_bps
  return bpsPct(bps)
}

function capLabel(row) {
  const kobo = row.max_fee_kobo ?? row.fields?.max_fee_kobo
  if (kobo == null) return '—'
  return '₦' + (Number(kobo) / 100).toFixed(0)
}

function distributionLabel(row) {
  const p = row.platform_share_bps ?? row.fields?.platform_share_bps
  const r = row.processor_share_bps ?? row.fields?.processor_share_bps
  const s = row.service_share_bps ?? row.fields?.service_share_bps
  const a = row.agent_share_bps ?? row.fields?.agent_share_bps
  if (p == null) return '—'
  return `P ${bpsPct(p)} · Proc ${bpsPct(r)} · S ${bpsPct(s)} · A ${bpsPct(a)}`
}

function statusColor(status) {
  if (status === 'PUBLISHED') return 'green-9'
  if (status === 'PENDING_CHECKER') return 'purple-8'
  if (status === 'DRAFT') return 'orange-9'
  return 'grey-8'
}

function openRow(_evt, row) {
  const q = selectedAgentId.value ? `?agentId=${encodeURIComponent(selectedAgentId.value)}` : ''
  router.push(`/admin/platform-fees/${row.transaction_type}${q}`)
}

async function loadAgents() {
  try {
    const { data } = await adminApi.listPlatformFeeAgents()
    agents.value = data?.data || []
    agentOptions.value = [
      { label: 'All Institutes / Global', value: null },
      ...agents.value.map((a) => ({ label: `${a.agent_code} — ${a.name || a.status}`, value: a.id })),
    ]
  } catch {
    agents.value = []
  }
}

async function loadRows() {
  loading.value = true
  loadError.value = ''
  try {
    await loadAgents()
    if (selectedAgentId.value) {
      const types = ['POS_WITHDRAWAL', 'VIRTUAL_ACCOUNT_INWARD_TRANSFER', 'TREASURY_WITHDRAWAL', 'TREASURY_TRANSFER', 'SMS', 'AI_TASK']
      const details = await Promise.all(types.map(async (transaction_type) => {
        try {
          const { data } = await adminApi.getPlatformFeeProfile(transaction_type, { agentId: selectedAgentId.value })
          const d = data?.data
          const published = d?.published
          return {
            transaction_type,
            display_name: d?.profile?.display_name || transaction_type,
            current_status: d?.draft ? 'DRAFT' : (published ? 'PUBLISHED' : d?.current_status || 'NO_VERSION'),
            current_published_version: published?.version_number ?? null,
            calculation_method: d?.fields?.method || null,
            effective_from: published?.published_at || published?.created_at || null,
            last_updated: d?.profile?.updated_at || null,
            fee_source_label: d?.fee_source_label || 'GLOBAL FALLBACK',
            percentage_bps: d?.fields?.percentage_bps,
            max_fee_kobo: d?.fields?.max_fee_kobo,
            platform_share_bps: d?.fields?.platform_share_bps,
            processor_share_bps: d?.fields?.processor_share_bps,
            service_share_bps: d?.fields?.service_share_bps,
            agent_share_bps: d?.fields?.agent_share_bps,
            fields: d?.fields,
          }
        } catch {
          return { transaction_type, display_name: transaction_type, current_status: 'NO_VERSION', fee_source_label: 'GLOBAL FALLBACK' }
        }
      }))
      rows.value = details
    } else {
      const { data } = await adminApi.listPlatformFeeProfiles()
      rows.value = (data?.data || []).map((row) => ({ ...row, fee_source_label: 'Global configuration' }))
    }
  } catch (e) {
    loadError.value = e?.response?.data?.error || 'Could not load platform fee profiles'
    Notify.create({ type: 'negative', message: loadError.value })
  } finally {
    loading.value = false
  }
}

watch(selectedAgentId, loadRows)
onMounted(loadRows)
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 420px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, rgba(5,7,13,0) 70%);
  pointer-events: none;
}
.bg-card-dark { background: #0b0f19; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
