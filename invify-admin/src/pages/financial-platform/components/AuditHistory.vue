<template>
  <q-card flat bordered class="audit-history ops-card" role="region" aria-labelledby="fp-audit-title">
    <q-card-section>
      <div class="row items-center justify-between q-mb-md q-col-gutter-sm">
        <div>
          <div id="fp-audit-title" class="text-subtitle1 text-weight-bold text-white">Audit History</div>
          <div class="text-caption text-grey-5">Operational timeline for platform actions and security events</div>
        </div>
        <div class="row q-gutter-sm items-center">
          <q-btn
            flat
            dense
            color="grey-5"
            icon="download"
            label="Export"
            :disable="!filteredRows.length"
            aria-label="Export audit history as CSV"
            @click="exportCsv"
          />
          <q-btn
            flat
            dense
            color="cyan-4"
            icon="refresh"
            :loading="loading"
            aria-label="Refresh audit history"
            @click="refresh"
          />
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-md-5">
          <q-input
            v-model="search"
            dark
            dense
            outlined
            clearable
            debounce="200"
            placeholder="Search action, user, correlation…"
            aria-label="Search audit history"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="actionFilter"
            :options="actionOptions"
            dark
            dense
            outlined
            emit-value
            map-options
            label="Action type"
            aria-label="Filter by action type"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-2">
          <q-select
            v-model="statusFilter"
            :options="statusOptions"
            dark
            dense
            outlined
            emit-value
            map-options
            label="Status"
            aria-label="Filter by status"
          />
        </div>
        <div class="col-12 col-md-2 row items-center">
          <q-badge color="blue-grey-8" text-color="grey-3" class="q-pa-sm">
            {{ filteredRows.length }} events
          </q-badge>
        </div>
      </div>

      <q-table
        :rows="pagedRows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        dark
        binary-state-sort
        :pagination="tablePagination"
        @request="onTableRequest"
        class="audit-table"
      >
        <template #loading>
          <q-inner-loading showing color="cyan-4">
            <div class="column items-center q-gutter-sm">
              <q-skeleton dark type="rect" width="280px" height="18px" />
              <q-skeleton dark type="rect" width="320px" height="18px" />
              <q-skeleton dark type="rect" width="260px" height="18px" />
            </div>
          </q-inner-loading>
        </template>

        <template #body-cell-action="props">
          <q-td :props="props">
            <q-chip
              dense
              size="sm"
              :color="actionTone(props.row.action).bg"
              :text-color="actionTone(props.row.action).fg"
              class="text-weight-bold"
            >
              {{ props.row.action || 'EVENT' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-severity="props">
          <q-td :props="props">
            <PlatformStatusBadge :status="props.row.severity" :label="props.row.severity" />
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <PlatformStatusBadge
              :status="props.row.status === 'SUCCESS' ? 'HEALTHY' : 'CRITICAL'"
              :label="props.row.status"
            />
          </q-td>
        </template>

        <template #body-cell-created_at="props">
          <q-td :props="props">
            <span class="text-mono">{{ formatTime(props.row.created_at) }}</span>
          </q-td>
        </template>

        <template #body-cell-correlation_id="props">
          <q-td :props="props">
            <span class="text-mono text-grey-5">{{ props.row.correlation_id || '—' }}</span>
          </q-td>
        </template>

        <template #no-data>
          <div class="empty-state column items-center q-pa-xl text-center">
            <div class="empty-orb q-mb-md" aria-hidden="true">
              <q-icon name="history" size="32px" color="indigo-3" />
            </div>
            <div class="text-subtitle1 text-weight-bold text-white">No audit activity recorded yet</div>
            <div class="text-body2 text-grey-5 q-mt-sm" style="max-width: 420px;">
              Platform actions such as activation, credential rotation, and health checks will appear here once executed.
            </div>
          </div>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import { useQuasar } from 'quasar'
import { useRuntimeStore } from 'src/stores/runtime.store'
import PlatformStatusBadge from './PlatformStatusBadge.vue'

const $q = useQuasar()
const runtimeStore = useRuntimeStore()

const props = defineProps({
  tenantId: { type: String, default: '' }
})

const loading = ref(false)
const rows = ref([])
const search = ref('')
const actionFilter = ref('ALL')
const statusFilter = ref('ALL')
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 })

const columns = [
  { name: 'created_at', required: true, label: 'Time', align: 'left', field: 'created_at', sortable: true },
  { name: 'actor_id', align: 'left', label: 'User', field: 'actor_id', sortable: true },
  { name: 'action', align: 'left', label: 'Action', field: 'action', sortable: true },
  { name: 'severity', align: 'left', label: 'Severity', field: 'severity', sortable: true },
  { name: 'status', align: 'center', label: 'Status', field: 'status', sortable: true },
  { name: 'correlation_id', align: 'left', label: 'Correlation ID', field: 'correlation_id' }
]

const actionOptions = [
  { label: 'All actions', value: 'ALL' },
  { label: 'Activation', value: 'ACTIVATION' },
  { label: 'Rotation', value: 'ROTATION' },
  { label: 'Health', value: 'HEALTH' },
  { label: 'Deactivation', value: 'DEACTIVATION' },
  { label: 'Connection', value: 'CONNECTION' },
  { label: 'Security', value: 'SECURITY' }
]

const statusOptions = [
  { label: 'All results', value: 'ALL' },
  { label: 'Success', value: 'SUCCESS' },
  { label: 'Failed', value: 'FAILED' }
]

const tablePagination = computed(() => ({
  page: pagination.value.page,
  rowsPerPage: pagination.value.rowsPerPage,
  rowsNumber: filteredRows.value.length
}))

function resolveTenantId() {
  if (props.tenantId) return props.tenantId
  if (runtimeStore.config?.tenant?.id) return runtimeStore.config.tenant.id
  return localStorage.getItem('tenant_id') || ''
}

function classifyAction(action) {
  const a = String(action || '').toUpperCase()
  if (a.includes('ACTIV')) return 'ACTIVATION'
  if (a.includes('ROTAT') || a.includes('CREDENTIAL')) return 'ROTATION'
  if (a.includes('HEALTH') || a.includes('PING')) return 'HEALTH'
  if (a.includes('DEACTIV') || a.includes('SUSPEND')) return 'DEACTIVATION'
  if (a.includes('CONNECT') || a.includes('TEST')) return 'CONNECTION'
  if (a.includes('SECURITY') || a.includes('VAULT') || a.includes('SECRET')) return 'SECURITY'
  return 'OTHER'
}

function severityFor(action, status) {
  const bucket = classifyAction(action)
  if (status !== 'SUCCESS') return 'CRITICAL'
  if (bucket === 'DEACTIVATION' || bucket === 'SECURITY' || bucket === 'ROTATION') return 'WARNING'
  if (bucket === 'HEALTH' || bucket === 'CONNECTION') return 'HEALTHY'
  if (bucket === 'ACTIVATION') return 'SYNCING'
  return 'NEUTRAL'
}

function actionTone(action) {
  const bucket = classifyAction(action)
  const map = {
    ACTIVATION: { bg: 'indigo-9', fg: 'indigo-2' },
    ROTATION: { bg: 'amber-9', fg: 'amber-2' },
    HEALTH: { bg: 'green-10', fg: 'green-3' },
    DEACTIVATION: { bg: 'red-10', fg: 'red-3' },
    CONNECTION: { bg: 'cyan-10', fg: 'cyan-2' },
    SECURITY: { bg: 'purple-10', fg: 'purple-2' },
    OTHER: { bg: 'blue-grey-8', fg: 'grey-3' }
  }
  return map[bucket] || map.OTHER
}

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const bucket = classifyAction(row.action)
    if (actionFilter.value !== 'ALL' && bucket !== actionFilter.value) return false
    if (statusFilter.value !== 'ALL' && row.status !== statusFilter.value) return false
    if (!q) return true
    const hay = [row.action, row.actor_id, row.correlation_id, row.status, row.severity]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const pagedRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
  return filteredRows.value.slice(start, start + pagination.value.rowsPerPage)
})

watch([search, actionFilter, statusFilter], () => {
  pagination.value.page = 1
})

const onTableRequest = (req) => {
  pagination.value.page = req.pagination.page
  pagination.value.rowsPerPage = req.pagination.rowsPerPage
}

const fetchHistory = async () => {
  loading.value = true
  const tenantId = resolveTenantId()
  if (!tenantId) {
    loading.value = false
    return
  }

  try {
    const response = await financialPlatformApi.getHistory(tenantId, 1, 100)
    const logs = Array.isArray(response.data) ? response.data : (response.data?.data || [])
    rows.value = logs.map((l) => {
      const action = l.event_type || l.action
      const status = String(l.status || l.payload?.status || 'SUCCESS').toUpperCase()
      return {
        id: l.id || `${l.created_at}-${action}`,
        created_at: l.created_at,
        actor_id: l.actor_id || l.user_id || 'system',
        action,
        status: status.includes('FAIL') || status.includes('ERROR') ? 'FAILED' : 'SUCCESS',
        severity: severityFor(action, status.includes('FAIL') ? 'FAILED' : 'SUCCESS'),
        correlation_id: l.correlation_id || l.request_id || l.payload?.correlationId || l.id || null
      }
    })
    pagination.value.rowsNumber = rows.value.length
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to load audit history' })
  } finally {
    loading.value = false
  }
}

const refresh = () => fetchHistory()

const exportCsv = () => {
  if (!filteredRows.value.length) return
  const header = ['Time', 'User', 'Action', 'Severity', 'Status', 'Correlation ID']
  const lines = filteredRows.value.map((r) => [
    formatTime(r.created_at),
    r.actor_id,
    r.action,
    r.severity,
    r.status,
    r.correlation_id || ''
  ].map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `financial-platform-audit-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: 'Audit export downloaded.' })
}

watch(() => props.tenantId, (id) => {
  if (id) fetchHistory()
})

onMounted(async () => {
  if (!runtimeStore.isReady) await runtimeStore.hydrate()
  fetchHistory()
})

defineExpose({ refresh, exportCsv })
</script>

<style scoped>
.ops-card {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
}
.audit-table :deep(thead tr),
.audit-table :deep(.q-table__top),
.audit-table :deep(.q-table__bottom) {
  background: transparent;
}
.text-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
.empty-state { min-height: 220px; }
.empty-orb {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.28);
}
</style>
