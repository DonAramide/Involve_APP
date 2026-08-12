<!-- invify-admin/src/pages/governance/AuditTrailPage.vue -->
<!-- Enterprise Audit Trail Ledger — Full IP, Location, Module, Maker-Checker context -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">

    <!-- ── HEADER ───────────────────────────────────────────────────── -->
    <div class="row items-start justify-between no-wrap border-bottom q-pb-md">
      <div class="row items-center op-gap-10 no-wrap">
        <div class="ledger-icon-ring">
          <q-icon name="history_edu" size="22px" color="blue-4" />
        </div>
        <div>
          <div class="text-weight-bold" style="font-size: 15px; letter-spacing: 0.3px;">Audit Trail Ledger</div>
          <div class="text-muted font-mono" style="font-size: 10px;">
            IMMUTABLE · MULTI-SOURCE · IP/LOCATION TRACED · MAKER-CHECKER INCLUSIVE
          </div>
        </div>
      </div>

      <div class="row items-center op-gap-8 no-wrap">
        <!-- Export CSV -->
        <q-btn
          unelevated dense size="sm"
          color="blue-grey-8" text-color="white"
          icon="download" label="Export CSV"
          class="font-mono text-caption q-px-sm"
          @click="exportCsv"
        />
        <!-- Force Archive Sweep -->
        <q-btn
          unelevated dense size="sm"
          color="deep-orange-9" text-color="white"
          icon="archive" label="Archive Sweep"
          class="font-mono text-caption q-px-sm"
          :loading="archiving"
          @click="triggerArchive"
        />
        <!-- Refresh -->
        <q-btn
          unelevated dense size="sm"
          color="blue-5" text-color="white"
          icon="refresh" label="Refresh"
          class="font-mono text-caption q-px-sm"
          :loading="loading"
          @click="fetchLogs"
        />
      </div>
    </div>

    <!-- ── STATS STRIP ─────────────────────────────────────────────── -->
    <div class="row q-col-gutter-sm">
      <div class="col-6 col-sm-3" v-for="stat in computedStats" :key="stat.label">
        <div class="stat-card bg-panel border-muted rounded-borders q-pa-sm row items-center op-gap-8 no-wrap">
          <div class="stat-icon-wrap" :class="stat.bg">
            <q-icon :name="stat.icon" size="16px" :color="stat.color" />
          </div>
          <div>
            <div class="text-weight-bold" style="font-size: 18px; line-height: 1;" :class="`text-${stat.color}`">{{ stat.value }}</div>
            <div class="text-muted font-mono" style="font-size: 9px;">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── FILTER BAR ───────────────────────────────────────────────── -->
    <div class="bg-panel border-muted rounded-borders q-pa-sm">
      <div class="row items-center op-gap-8 q-mb-sm no-wrap">
        <!-- Search -->
        <q-input
          v-model="filters.search"
          :dark="true" filled dense
          placeholder="Search tenant, user, IP, action, target..."
          class="bg-subpanel col rounded-borders"
          clearable
          @update:model-value="debounceFetch"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="xs" color="grey-6" />
          </template>
        </q-input>

        <!-- Date From -->
        <q-input
          v-model="filters.dateFrom"
          :dark="true" filled dense
          type="date" label="From"
          class="bg-subpanel rounded-borders"
          style="width: 150px;"
          @update:model-value="debounceFetch"
        />

        <!-- Date To -->
        <q-input
          v-model="filters.dateTo"
          :dark="true" filled dense
          type="date" label="To"
          class="bg-subpanel rounded-borders"
          style="width: 150px;"
          @update:model-value="debounceFetch"
        />
      </div>

      <!-- Module Chips -->
      <div class="row items-center op-gap-6 no-wrap overflow-x-auto q-pb-xs">
        <span class="text-muted font-mono" style="font-size: 10px; white-space: nowrap;">MODULE:</span>
        <q-chip
          v-for="mod in moduleOptions"
          :key="mod.value"
          dense clickable
          :color="filters.module === mod.value ? mod.active : 'grey-9'"
          :text-color="filters.module === mod.value ? 'white' : 'grey-5'"
          :icon="mod.icon"
          class="font-mono text-caption"
          style="font-size: 10px;"
          @click="setModule(mod.value)"
        >{{ mod.label }}</q-chip>

        <q-separator vertical class="q-mx-sm" color="grey-8" />

        <!-- Status chips -->
        <span class="text-muted font-mono" style="font-size: 10px; white-space: nowrap;">STATUS:</span>
        <q-chip
          v-for="s in statusOptions"
          :key="s.value"
          dense clickable
          :color="filters.status === s.value ? s.active : 'grey-9'"
          :text-color="filters.status === s.value ? 'white' : 'grey-5'"
          class="font-mono text-caption"
          style="font-size: 10px;"
          @click="setStatus(s.value)"
        >{{ s.label }}</q-chip>
      </div>
    </div>

    <!-- ── MAIN TABLE ───────────────────────────────────────────────── -->
    <div class="enterprise-panel bg-panel col column overflow-hidden border-muted rounded-borders">

      <!-- Table Header -->
      <div class="ledger-thead bg-subpanel q-px-md q-py-xs border-bottom row items-center no-wrap" style="min-width: 980px;">
        <div class="col-2 font-mono text-muted text-caption">TIMESTAMP</div>
        <div class="col-1 font-mono text-muted text-caption">MODULE</div>
        <div class="col-2 font-mono text-muted text-caption">ACTION</div>
        <div class="col-2 font-mono text-muted text-caption">TENANT</div>
        <div class="col-2 font-mono text-muted text-caption">OPERATOR</div>
        <div class="col-15 font-mono text-muted text-caption">TARGET</div>
        <div class="col-1 font-mono text-muted text-caption text-right">STATUS</div>
      </div>

      <!-- Table Body -->
      <div class="col q-overflow-y-auto" style="min-width: 980px; max-height: calc(100vh - 380px); overflow-y: auto;">

        <!-- Loading State -->
        <div v-if="loading" class="column items-center justify-center q-py-xl">
          <q-spinner-dots color="blue-4" size="40px" />
          <div class="text-muted font-mono text-caption q-mt-sm">Pulling audit matrices...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="logs.length === 0" class="column items-center justify-center q-py-xl">
          <q-icon name="playlist_remove" size="42px" color="grey-7" />
          <div class="text-muted font-mono text-caption q-mt-sm">No audit records match filters</div>
        </div>

        <!-- Log Rows -->
        <transition-group name="fade-row" tag="div" v-else>
          <div
            v-for="(log, idx) in logs"
            :key="log.id"
            class="ledger-row row items-start no-wrap q-px-md q-py-sm"
            :class="idx % 2 === 0 ? 'row-even' : 'row-odd'"
            @click="selectLog(log)"
          >
            <!-- Timestamp -->
            <div class="col-2">
              <div class="font-mono text-secondary" style="font-size: 11px;">{{ formatDate(log.timestamp) }}</div>
              <div class="font-mono text-muted" style="font-size: 9px;">{{ formatTime(log.timestamp) }}</div>
            </div>

            <!-- Module Badge -->
            <div class="col-1">
              <q-badge
                :color="getModuleColor(log.module)"
                text-color="black"
                class="font-mono text-weight-bold"
                style="font-size: 8px; padding: 2px 5px;"
              >{{ log.module?.replace('_', '-') }}</q-badge>
            </div>

            <!-- Action -->
            <div class="col-2">
              <span class="font-mono text-weight-semibold" :class="getActionColor(log.action)" style="font-size: 10px;">
                {{ log.action }}
              </span>
            </div>

            <!-- Tenant -->
            <div class="col-2 column no-wrap">
              <div class="text-main text-weight-medium ellipsis" style="font-size: 11px; max-width: 150px;">
                {{ log.tenant_name || '—' }}
              </div>
              <div class="text-muted ellipsis font-mono" style="font-size: 9px; max-width: 150px;" v-if="log.tenant_id">
                {{ String(log.tenant_id).slice(0, 8) }}…
              </div>
            </div>

            <!-- Operator -->
            <div class="col-2 column no-wrap">
              <div class="text-main text-weight-medium ellipsis" style="font-size: 11px; max-width: 150px;">{{ log.user_name || '—' }}</div>
              <div class="text-muted ellipsis" style="font-size: 9px; max-width: 150px;">{{ log.user_email || '—' }}</div>
            </div>

            <!-- Target -->
            <div class="col-15">
              <span class="text-secondary ellipsis font-mono" style="font-size: 10px; max-width: 120px;">{{ log.target || '—' }}</span>
            </div>

            <!-- Status -->
            <div class="col-1 text-right">
              <q-badge
                :color="getStatusColor(log.status)"
                text-color="white"
                class="font-mono"
                style="font-size: 8px;"
              >{{ log.status }}</q-badge>
            </div>
          </div>
        </transition-group>
      </div>

      <!-- Table Footer / Pagination -->
      <div class="ledger-footer bg-subpanel border-top q-px-md q-py-xs row items-center justify-between">
        <span class="text-muted font-mono" style="font-size: 10px;">
          Showing <span class="text-main">{{ logs.length }}</span> of <span class="text-main">{{ totalCount }}</span> records
          &nbsp;·&nbsp; {{ stats.uniqueIPs || 0 }} unique IPs &nbsp;·&nbsp; {{ stats.makerChecker || 0 }} Maker-Checker events
        </span>

        <div class="row items-center op-gap-8 no-wrap">
          <q-btn flat dense icon="chevron_left" color="grey-5" size="sm" :disable="page <= 1" @click="prevPage" />
          <span class="text-muted font-mono" style="font-size: 10px;">Page {{ page }} / {{ totalPages }}</span>
          <q-btn flat dense icon="chevron_right" color="grey-5" size="sm" :disable="page >= totalPages" @click="nextPage" />
        </div>
      </div>
    </div>

    <!-- ── LOG DETAIL DRAWER ────────────────────────────────────────── -->
    <q-drawer
      v-model="drawerOpen"
      side="right"
      overlay
      bordered
      class="bg-panel border-left"
      :width="480"
    >
      <div class="column full-height no-wrap" v-if="selectedLog">
        <!-- Drawer Header -->
        <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
          <div>
            <div class="text-weight-bold font-mono" style="font-size: 13px;">{{ selectedLog.action }}</div>
            <div class="text-muted font-mono" style="font-size: 10px;">{{ selectedLog.module }} · {{ formatDate(selectedLog.timestamp) }} {{ formatTime(selectedLog.timestamp) }}</div>
          </div>
          <q-btn flat dense round icon="close" color="grey-5" @click="drawerOpen = false" />
        </div>

        <div class="q-pa-md col overflow-y-auto">
          <!-- Detail Fields -->
          <div class="column op-gap-12">
            <div class="detail-section">
              <div class="detail-section-title">TENANT</div>
              <div class="bg-subpanel rounded-borders q-pa-sm column op-gap-4">
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">NAME</span>
                  <span class="text-main text-weight-medium" style="font-size: 12px;">{{ selectedLog.tenant_name || 'Platform' }}</span>
                </div>
                <div class="row items-center justify-between" v-if="selectedLog.tenant_id">
                  <span class="text-muted font-mono" style="font-size: 10px;">TENANT ID</span>
                  <span class="text-muted font-mono" style="font-size: 10px;">{{ selectedLog.tenant_id }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <div class="detail-section-title">OPERATOR</div>
              <div class="row items-center op-gap-8">
                <q-avatar size="32px" color="blue-8" text-color="white" font-size="12px" class="font-mono">
                  {{ (selectedLog.tenant_name || selectedLog.user_name || '?').charAt(0) }}
                </q-avatar>
                <div>
                  <div class="text-main text-weight-medium" style="font-size: 12px;">{{ selectedLog.user_name }}</div>
                  <div class="text-muted font-mono" style="font-size: 10px;">{{ selectedLog.user_email }}</div>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <div class="detail-section-title">NETWORK ORIGIN</div>
              <div class="bg-subpanel rounded-borders q-pa-sm column op-gap-4">
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">IP ADDRESS</span>
                  <span class="text-blue-3 font-mono text-weight-bold" style="font-size: 12px;">{{ selectedLog.ip_address }}</span>
                </div>
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">LOCATION</span>
                  <div class="row items-center op-gap-4">
                    <q-icon name="location_on" size="12px" :color="selectedLog.location === 'Local Network' ? 'grey-5' : 'green-4'" />
                    <span class="text-secondary font-mono" style="font-size: 11px;">{{ selectedLog.location }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <div class="detail-section-title">ACTION DETAILS</div>
              <div class="bg-subpanel rounded-borders q-pa-sm column op-gap-4">
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">MODULE</span>
                  <q-badge :color="getModuleColor(selectedLog.module)" text-color="black" class="font-mono" style="font-size: 9px;">{{ selectedLog.module }}</q-badge>
                </div>
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">ACTION</span>
                  <span :class="getActionColor(selectedLog.action)" class="font-mono text-weight-bold" style="font-size: 11px;">{{ selectedLog.action }}</span>
                </div>
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">TARGET</span>
                  <span class="text-secondary font-mono ellipsis" style="font-size: 11px; max-width: 220px;">{{ selectedLog.target }}</span>
                </div>
                <div class="row items-center justify-between">
                  <span class="text-muted font-mono" style="font-size: 10px;">STATUS</span>
                  <q-badge :color="getStatusColor(selectedLog.status)" text-color="white" class="font-mono" style="font-size: 9px;">{{ selectedLog.status }}</q-badge>
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0">
              <div class="detail-section-title">METADATA</div>
              <pre class="bg-subpanel rounded-borders q-pa-sm text-secondary font-mono" style="font-size: 10px; white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
            </div>

            <!-- Audit log ID -->
            <div class="row items-center justify-between border-top q-pt-sm">
              <span class="text-muted font-mono" style="font-size: 9px;">AUDIT LOG ID</span>
              <span class="text-muted font-mono" style="font-size: 9px;">{{ selectedLog.id }}</span>
            </div>
          </div>
        </div>
      </div>
    </q-drawer>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const API_BASE = import.meta.env.VITE_API_URL || 'https://bertie-archegoniate-causelessly.ngrok-free.dev'

const loading = ref(false)
const archiving = ref(false)
const logs = ref([])
const totalCount = ref(0)
const page = ref(1)
const limit = 25
const stats = ref({ total: 0, critical: 0, pending: 0, makerChecker: 0, uniqueIPs: 0 })
const drawerOpen = ref(false)
const selectedLog = ref(null)

const filters = ref({
  search: '',
  module: 'ALL',
  status: 'ALL',
  dateFrom: '',
  dateTo: ''
})

const moduleOptions = [
  { value: 'ALL', label: 'ALL', icon: 'layers', active: 'blue-grey-6' },
  { value: 'AUTH', label: 'AUTH', icon: 'lock', active: 'indigo-6' },
  { value: 'MAKER_CHECKER', label: 'MAKER-CHECKER', icon: 'fact_check', active: 'purple-7' },
  { value: 'TERMINAL', label: 'TERMINAL', icon: 'point_of_sale', active: 'teal-7' },
  { value: 'DEVICE', label: 'DEVICE', icon: 'devices', active: 'orange-8' },
  { value: 'GOVERNANCE', label: 'GOVERNANCE', icon: 'gavel', active: 'deep-purple-7' },
  { value: 'USER_MGMT', label: 'USER MGMT', icon: 'manage_accounts', active: 'cyan-8' },
  { value: 'FINANCIAL', label: 'FINANCIAL', icon: 'account_balance', active: 'green-8' },
  { value: 'SYSTEM', label: 'SYSTEM', icon: 'settings', active: 'blue-grey-7' },
]

const statusOptions = [
  { value: 'ALL', label: 'ALL', active: 'blue-grey-6' },
  { value: 'success', label: 'SUCCESS', active: 'green-8' },
  { value: 'failed', label: 'FAILED', active: 'red-8' },
  { value: 'pending', label: 'PENDING', active: 'amber-8' },
  { value: 'approved', label: 'APPROVED', active: 'teal-7' },
  { value: 'rejected', label: 'REJECTED', active: 'deep-orange-8' },
  { value: 'blocked', label: 'BLOCKED', active: 'red-9' },
]

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / limit)))

const computedStats = computed(() => [
  { label: 'TOTAL EVENTS', value: stats.value.total || totalCount.value, icon: 'history_edu', color: 'blue-3', bg: 'stat-bg-blue' },
  { label: 'CRITICAL EVENTS', value: stats.value.critical || 0, icon: 'warning', color: 'red-4', bg: 'stat-bg-red' },
  { label: 'PENDING REVIEW', value: stats.value.pending || 0, icon: 'pending', color: 'amber-4', bg: 'stat-bg-amber' },
  { label: 'MAKER-CHECKER', value: stats.value.makerChecker || 0, icon: 'fact_check', color: 'purple-4', bg: 'stat-bg-purple' },
])

let debounceTimer = null
function debounceFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchLogs()
  }, 400)
}

function setModule(mod) {
  filters.value.module = mod
  page.value = 1
  fetchLogs()
}

function setStatus(status) {
  filters.value.status = status
  page.value = 1
  fetchLogs()
}

function prevPage() {
  if (page.value > 1) { page.value--; fetchLogs() }
}

function nextPage() {
  if (page.value < totalPages.value) { page.value++; fetchLogs() }
}

const MOCK_LOGS = [
  {
    id: 'mock-001',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    module: 'MAKER_CHECKER',
    action: 'APPROVAL_GRANTED',
    user_email: 'superadmin@invify.app',
    user_name: 'System Administrator',
    ip_address: '192.168.1.14',
    location: 'Local Network',
    target: 'TERMINAL_ASSIGNMENT:2215850F',
    status: 'approved',
    metadata: { approvalId: 'APR-2024-001', riskScore: 72 }
  },
  {
    id: 'mock-002',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    module: 'AUTH',
    action: 'LOGIN_SUCCESS',
    user_email: 'ops@invify.app',
    user_name: 'Operations Staff',
    ip_address: '192.168.1.20',
    location: 'Local Network',
    target: 'Admin Portal',
    status: 'success',
    metadata: { role: 'INTERNAL_STAFF', device: 'Chrome/Windows' }
  },
  {
    id: 'mock-003',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    module: 'DEVICE',
    action: 'DEVICE_BLOCKED',
    user_email: 'superadmin@invify.app',
    user_name: 'System Administrator',
    ip_address: '192.168.1.14',
    location: 'Local Network',
    target: 'dev-UNKN-003 (ops-staff@invify.app)',
    status: 'blocked',
    metadata: { reason: 'Unrecognized device flagged by security review' }
  },
  {
    id: 'mock-004',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    module: 'MAKER_CHECKER',
    action: 'APPROVAL_REJECTED',
    user_email: 'security@invify.app',
    user_name: 'Security Lead',
    ip_address: '192.168.1.8',
    location: 'Local Network',
    target: 'BULK_PAYOUT_REQUEST:TXN-88811',
    status: 'rejected',
    metadata: { approvalId: 'APR-2024-002', reason: 'Exceeds daily limit threshold' }
  },
  {
    id: 'mock-005',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    module: 'USER_MGMT',
    action: 'USER_CREATED',
    user_email: 'superadmin@invify.app',
    user_name: 'System Administrator',
    ip_address: '192.168.1.14',
    location: 'Local Network',
    target: 'new-ops-staff@invify.app',
    status: 'success',
    metadata: { role: 'INTERNAL_STAFF', department: 'Operations' }
  },
  {
    id: 'mock-006',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    module: 'SYSTEM',
    action: 'AUDIT_ARCHIVE_RUN',
    user_email: 'system@invify.internal',
    user_name: 'Invify System',
    ip_address: '127.0.0.1',
    location: 'Local Network',
    target: 'archived_audit_logs.json',
    status: 'success',
    metadata: { archivedCount: 47, retentionHours: 72 }
  },
  {
    id: 'mock-007',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    module: 'GOVERNANCE',
    action: 'POLICY_UPDATED',
    user_email: 'superadmin@invify.app',
    user_name: 'System Administrator',
    ip_address: '192.168.1.14',
    location: 'Local Network',
    target: 'AML_POLICY_V2',
    status: 'success',
    metadata: { version: '2.1.0', changes: 'Updated KYC threshold to {{ currentCurrency.symbol }}5,000,000' }
  },
  {
    id: 'mock-008',
    timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
    module: 'AUTH',
    action: 'FAILED_LOGIN',
    user_email: 'unknown@external.com',
    user_name: 'Unknown',
    ip_address: '102.89.47.28',
    location: 'Lagos, Lagos, Nigeria',
    target: 'Admin Portal',
    status: 'failed',
    metadata: { attempts: 3, blocked: false }
  },
  {
    id: 'mock-009',
    timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
    module: 'TERMINAL',
    action: 'ASSIGNED',
    user_email: 'superadmin@invify.app',
    user_name: 'System Administrator',
    ip_address: '192.168.1.14',
    location: 'Local Network',
    target: 'TERMINAL:2215850F → DSPREAD-0081',
    status: 'success',
    metadata: { terminalId: '2215850F', deviceId: 'DSPREAD-POS-0081MM-4521' }
  }
]

async function fetchLogs() {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_token')
    const params = {
      page: page.value,
      limit,
      ...(filters.value.search && { search: filters.value.search }),
      ...(filters.value.module !== 'ALL' && { module: filters.value.module }),
      ...(filters.value.status !== 'ALL' && { status: filters.value.status }),
      ...(filters.value.dateFrom && { dateFrom: filters.value.dateFrom }),
      ...(filters.value.dateTo && { dateTo: filters.value.dateTo }),
    }
    const res = await axios.get(`${API_BASE}/api/admin/audit/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    })
    if (res.data?.success) {
      logs.value = res.data.data || []
      totalCount.value = res.data.total || 0
      stats.value = res.data.stats || {}
    } else {
      logs.value = []
      totalCount.value = 0
    }
  } catch (err) {
    console.warn('[AuditTrail] Failed to load ledger:', err)
    logs.value = []
    totalCount.value = 0
    $q.notify({ type: 'negative', message: 'Failed to load audit trail' })
  } finally {
    loading.value = false
  }
}

function applyLocalFilters(source) {
  let result = [...source]
  if (filters.value.module !== 'ALL') result = result.filter(l => l.module === filters.value.module)
  if (filters.value.status !== 'ALL') result = result.filter(l => l.status === filters.value.status)
  if (filters.value.search) {
    const q = filters.value.search.toLowerCase()
    result = result.filter(l =>
      l.user_email?.toLowerCase().includes(q) ||
      l.user_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.target?.toLowerCase().includes(q) ||
      l.ip_address?.toLowerCase().includes(q)
    )
  }
  return result
}

function selectLog(log) {
  selectedLog.value = log
  drawerOpen.value = true
}

async function triggerArchive() {
  archiving.value = true
  try {
    const token = localStorage.getItem('invify_token')
    const res = await axios.post(`${API_BASE}/api/admin/audit/archive`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: `Archive sweep complete. ${res.data?.archivedCount ?? 0} records shifted.`, icon: 'archive' })
    fetchLogs()
  } catch {
    $q.notify({ type: 'warning', message: 'Archive sweep triggered (offline mode)', icon: 'archive' })
  } finally {
    archiving.value = false
  }
}

function exportCsv() {
  const headers = ['ID', 'Timestamp', 'Module', 'Action', 'Tenant', 'Tenant ID', 'User Name', 'User Email', 'IP Address', 'Location', 'Target', 'Status']
  const rows = logs.value.map(l => [
    l.id, l.timestamp, l.module, l.action, l.tenant_name, l.tenant_id, l.user_name, l.user_email, l.ip_address, l.location, l.target, l.status
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: '2-digit', year: '2-digit' })
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getModuleColor(mod) {
  const map = {
    AUTH: 'indigo-4', MAKER_CHECKER: 'purple-4', TERMINAL: 'teal-4',
    DEVICE: 'orange-4', GOVERNANCE: 'deep-purple-4', USER_MGMT: 'cyan-4',
    FINANCIAL: 'green-4', SYSTEM: 'blue-grey-4'
  }
  return map[mod] || 'grey-5'
}

function getActionColor(action) {
  if (!action) return 'text-grey-5'
  if (action.includes('BLOCKED') || action.includes('REJECTED') || action.includes('FAILED')) return 'text-red-4'
  if (action.includes('APPROVED') || action.includes('GRANTED') || action.includes('SUCCESS')) return 'text-green-4'
  if (action.includes('PENDING') || action.includes('REGISTERED')) return 'text-amber-4'
  if (action.includes('IMPERSONATION') || action.includes('REVOCATION')) return 'text-purple-4'
  return 'text-blue-3'
}

function getStatusColor(status) {
  const map = {
    success: 'green-8', failed: 'red-8', pending: 'amber-8',
    approved: 'teal-7', rejected: 'deep-orange-8', blocked: 'red-9'
  }
  return map[status] || 'grey-7'
}

onMounted(() => { fetchLogs() })
</script>

<style scoped>
.ledger-icon-ring {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: rgba(66, 165, 245, 0.12);
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(66, 165, 245, 0.2);
}

.stat-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.stat-icon-wrap {
  width: 28px; height: 28px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.stat-bg-blue { background: rgba(66, 165, 245, 0.1); }
.stat-bg-red { background: rgba(239, 83, 80, 0.1); }
.stat-bg-amber { background: rgba(255, 193, 7, 0.1); }
.stat-bg-purple { background: rgba(171, 71, 188, 0.1); }

.border-bottom { border-bottom: 1px solid var(--enterprise-border, rgba(255,255,255,0.08)); }
.border-top { border-top: 1px solid var(--enterprise-border, rgba(255,255,255,0.08)); }
.border-left { border-left: 1px solid var(--enterprise-border, rgba(255,255,255,0.08)); }
.border-muted { border: 1px solid var(--enterprise-border, rgba(255,255,255,0.06)); }
.op-gap-4 { gap: 4px; }
.op-gap-6 { gap: 6px; }
.op-gap-8 { gap: 8px; }
.op-gap-10 { gap: 10px; }
.op-gap-12 { gap: 12px; }
.op-gap-16 { gap: 16px; }
.font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
.overflow-x-auto { overflow-x: auto; }
.overflow-y-auto { overflow-y: auto; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ledger-thead {
  font-size: 9px;
  letter-spacing: 0.8px;
  user-select: none;
}

.col-15 { flex: 0 0 12.5%; max-width: 12.5%; }

.ledger-row {
  border-bottom: 1px solid rgba(255,255,255,0.03);
  cursor: pointer;
  transition: background 0.1s ease;
  min-height: 40px;
  align-items: flex-start;
}
.ledger-row:hover { background: rgba(255,255,255,0.04) !important; }
.row-even { background: rgba(0,0,0,0.1); }
.row-odd { background: transparent; }

.ledger-footer { font-size: 10px; }

.fade-row-enter-active { transition: opacity 0.2s ease; }
.fade-row-enter-from { opacity: 0; }

.detail-section { display: flex; flex-direction: column; gap: 6px; }
.detail-section-title {
  font-size: 9px; font-family: monospace; letter-spacing: 0.8px;
  color: var(--q-grey-6, #757575); font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 4px; margin-bottom: 2px;
}
</style>
