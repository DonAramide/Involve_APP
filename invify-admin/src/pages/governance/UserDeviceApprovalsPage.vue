<!-- invify-admin/src/pages/governance/UserDeviceApprovalsPage.vue -->
<template>
  <q-page class="bg-main text-main q-pa-md column op-gap-16">
    
    <!-- Title Configuration Header -->
    <div class="row items-center justify-between no-wrap border-bottom q-pb-sm">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="phonelink_lock" size="sm" color="red-5" />
        <div>
          <div class="text-operator-title text-main text-weight-bold" style="font-size: 14px;">User Device Authorization Center</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">FINGERPRINT_VERIFICATION // MULTI_FACTOR_DEVICE_BINDING</div>
        </div>
      </div>
      
      <div class="row items-center op-gap-8 no-wrap">
        <q-btn
          color="purple-6"
          label="Force Archiving Sweep"
          icon="archive"
          dense
          size="sm"
          class="q-px-sm text-weight-bold"
          unelevated
          @click="runManualArchiving"
          :loading="archivingLoading"
        >
          <q-tooltip>Shift all logs older than configured retention limits into archived_audit_logs.json</q-tooltip>
        </q-btn>
        
        <q-btn
          color="blue-5"
          label="Sync Queue Matrices"
          icon="refresh"
          dense
          size="sm"
          class="q-px-sm text-weight-bold"
          unelevated
          @click="fetchDevices"
          :loading="loading"
        />
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="row items-center justify-between no-wrap border-main bg-panel rounded-borders q-pa-xs">
      <div class="row items-center op-gap-8 col-6">
        <q-input
          v-model="searchQuery"
          :dark="true"
          filled
          dense
          placeholder="Filter by operator email, device identifier, or browser..."
          class="bg-subpanel text-main rounded-borders col"
          @update:model-value="filterData"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="xs" color="grey-6" />
          </template>
        </q-input>

        <q-select
          v-model="statusFilter"
          :options="['ALL', 'pending', 'approved', 'blocked']"
          :dark="true"
          filled
          dense
          label="Filter Status"
          class="bg-subpanel text-main rounded-borders"
          style="width: 150px;"
          @update:model-value="filterData"
        />
      </div>
      
      <span class="text-metric-mono text-muted q-px-sm text-metric-sm">
        Displaying Queue Matrix: {{ filteredDevices.length }} Environment Signature Records
      </span>
    </div>

    <!-- USER DEVICE REGISTRY GRID -->
    <div class="enterprise-panel bg-panel column col">
      <div class="panel-header bg-subpanel q-px-sm q-py-xs border-bottom row items-center justify-between text-metric-sm text-muted">
        <span class="col-3">Operator Context</span>
        <span class="col-3">Device Signature Hash</span>
        <span class="col-2">IP Origin & UA</span>
        <span class="col-2">Status Code</span>
        <span class="col-2 text-right">Verification Commands</span>
      </div>

      <div class="panel-body col q-pa-xs overflow-y-auto">
        <q-list dense class="q-gutter-y-xs" v-if="filteredDevices.length > 0">
          <q-item
            v-for="dev in filteredDevices"
            :key="dev.id"
            class="q-px-sm q-py-sm bg-subpanel rounded-borders row items-center justify-between no-wrap hover-row"
          >
            <!-- 1. Operator Info -->
            <div class="column col-3 no-wrap ellipsis">
              <span class="text-main text-weight-bold text-caption">{{ dev.email }}</span>
              <span class="text-muted text-metric-mono" style="font-size: 9px;">Registered: {{ formatLogTime(dev.created_at) }}</span>
            </div>

            <!-- 2. Device ID & Name -->
            <div class="column col-3 no-wrap ellipsis q-pr-sm">
              <span class="text-main text-metric-mono text-weight-bold font-mono text-caption text-cyan-3 cursor-pointer" @click="copyText(dev.device_id)">
                {{ dev.device_id }}
                <q-tooltip>Click to Copy Hash</q-tooltip>
              </span>
              <span class="text-muted text-caption ellipsis" style="font-size: 10px;">{{ dev.device_name }}</span>
            </div>

            <!-- 3. Network Origin UA -->
            <div class="column col-2 no-wrap ellipsis q-pr-sm">
              <span class="text-main text-metric-mono text-secondary text-caption font-mono">{{ dev.ip_address || 'Unknown' }}</span>
              <span class="text-muted text-caption ellipsis" style="font-size: 9px;" :title="dev.user_agent">
                {{ dev.user_agent || 'Browser Fingerprint' }}
              </span>
            </div>

            <!-- 4. Status Badge -->
            <div class="col-2">
              <q-badge :color="getStatusColor(dev.status)" text-color="black" class="text-weight-bold font-mono text-uppercase" style="font-size: 9px;">
                {{ dev.status }}
              </q-badge>
              <div class="text-muted font-mono" style="font-size: 8px;" v-if="dev.approved_at">
                Auth by: {{ dev.approved_by || 'system' }}
              </div>
            </div>

            <!-- 5. Verification Commands -->
            <div class="col-2 text-right row items-center justify-end op-gap-4 no-wrap">
              <q-btn
                v-if="dev.status !== 'approved'"
                outline
                color="green-4"
                icon="check_circle"
                dense
                size="sm"
                class="q-px-sm"
                @click="approveDevice(dev.id)"
              >
                <q-tooltip>Approve Access from Device</q-tooltip>
              </q-btn>
              
              <q-btn
                v-if="dev.status !== 'blocked'"
                outline
                color="red-4"
                icon="block"
                dense
                size="sm"
                class="q-px-sm"
                @click="blockDevice(dev.id)"
              >
                <q-tooltip>Revoke and Block Device</q-tooltip>
              </q-btn>
            </div>
          </q-item>
        </q-list>
        
        <!-- Empty State -->
        <div class="flex flex-center column q-py-xl text-muted font-mono text-caption" v-else>
          <q-icon name="phonelink_off" size="lg" color="grey-7" class="q-mb-sm" />
          No device authorization footprints found matching criteria.
        </div>
      </div>
    </div>

    <!-- Verification Footer -->
    <div class="border-top q-pt-xs text-metric-sm text-muted row justify-between">
      <span>Zero Trust Client Binding Policy active</span>
      <span>Post-Quantum Key Ring Signatures Enabled</span>
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { adminApi } from '../../api'

const $q = useQuasar()
const loading = ref(false)
const archivingLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('ALL')

const rawDevices = ref([])
const filteredDevices = ref([])

onMounted(() => {
  fetchDevices()
})

const fetchDevices = async () => {
  loading.value = true
  try {
    const res = await adminApi.getUserDevices()
    if (res.data?.data) {
      rawDevices.value = res.data.data
      filterData()
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to retrieve active devices queue: ' + (err.response?.data?.error || err.message)
    })
  } finally {
    loading.value = false
  }
}

const filterData = () => {
  let list = rawDevices.value
  
  if (statusFilter.value && statusFilter.value !== 'ALL') {
    list = list.filter(d => d.status === statusFilter.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(d => 
      d.email.toLowerCase().includes(q) || 
      d.device_id.toLowerCase().includes(q) ||
      (d.device_name && d.device_name.toLowerCase().includes(q))
    )
  }
  
  filteredDevices.value = list
}

const approveDevice = async (id) => {
  try {
    await adminApi.approveUserDevice(id)
    $q.notify({
      type: 'positive',
      message: 'Device footprint approved. Session authorized.'
    })
    fetchDevices()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to approve device: ' + (err.response?.data?.error || err.message)
    })
  }
}

const blockDevice = async (id) => {
  try {
    await adminApi.blockUserDevice(id)
    $q.notify({
      type: 'warning',
      message: 'Device footprint blacklisted. Access blocked.'
    })
    fetchDevices()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to block device: ' + (err.response?.data?.error || err.message)
    })
  }
}

const runManualArchiving = async () => {
  archivingLoading.value = true
  try {
    const res = await adminApi.triggerAuditArchiving()
    const count = res.data?.archivedCount || 0
    $q.notify({
      type: 'positive',
      message: `Forensic audit log sweeping completed. Archived ${count} records to local disk logs.`
    })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to trigger audit archive task: ' + (err.response?.data?.error || err.message)
    })
  } finally {
    archivingLoading.value = false
  }
}

const copyText = (val) => {
  copyToClipboard(val)
  $q.notify({
    type: 'positive',
    message: 'Value copied to clipboard.'
  })
}

const formatLogTime = (isoStr) => {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getStatusColor = (status) => {
  if (status === 'approved') return 'green-3'
  if (status === 'pending') return 'amber-3'
  if (status === 'blocked') return 'red-3'
  return 'grey-4'
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }

.hover-row:hover {
  background-color: var(--enterprise-subpanel-bg) !important;
}
</style>
