<template>
  <div class="column op-gap-12">

    <!-- Filter Bar -->
    <div class="row items-center op-gap-8 no-wrap flex-wrap">
      <q-input
        v-model="search"
        dense filled
        placeholder="Search terminals, business, serial..."
        :dark="prefs.isDarkMode"
        style="max-width: 320px;"
        debounce="300"
      >
        <template v-slot:prepend>
          <q-icon name="search" color="blue-4" size="xs" />
        </template>
        <template v-slot:append v-if="search">
          <q-icon name="close" class="cursor-pointer" size="xs" @click="search = ''" />
        </template>
      </q-input>

      <q-select
        v-model="filterStatus"
        :options="statusOptions"
        dense filled emit-value map-options
        label="Status"
        :dark="prefs.isDarkMode"
        style="min-width: 140px;"
      />

      <q-select
        v-model="filterType"
        :options="typeOptions"
        dense filled emit-value map-options
        label="Terminal Type"
        :dark="prefs.isDarkMode"
        style="min-width: 140px;"
      />

      <q-btn
        v-if="search || filterStatus || filterType"
        dense flat size="sm"
        icon="filter_list_off"
        color="grey-5"
        @click="resetFilters"
      >
        <q-tooltip>Clear Filters</q-tooltip>
      </q-btn>

      <q-space />
      <div class="text-muted text-caption">{{ filtered.length }} terminals</div>
      <q-btn dense flat size="sm" icon="refresh" color="teal-4" @click="$emit('refresh')" :loading="loading">
        <q-tooltip>Refresh</q-tooltip>
      </q-btn>
    </div>

    <!-- Table -->
    <q-table
      :rows="filtered"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :dark="prefs.isDarkMode"
      class="bg-panel text-main border-main"
      card-class="bg-panel"
      table-header-class="bg-subpanel text-secondary text-weight-bold"
      :loading="loading"
      :rows-per-page-options="[25, 50, 100]"
      :rows-per-page="50"
      virtual-scroll
      style="height: calc(100vh - 340px);"
    >
      <!-- Terminal ID -->
      <template v-slot:body-cell-terminal_id="props">
        <q-td :props="props">
          <div class="text-weight-bold text-teal-4 font-mono" style="font-size: 12px;">
            {{ props.value }}
          </div>
        </q-td>
      </template>

      <!-- MPOS Terminal ID -->
      <template v-slot:body-cell-mpos_terminal_id="props">
        <q-td :props="props">
          <div class="text-caption text-indigo-3 font-mono">{{ props.value || '—' }}</div>
        </q-td>
      </template>

      <!-- Assignment Status -->
      <template v-slot:body-cell-assignment_status="props">
        <q-td :props="props">
          <q-badge
            :color="statusBadgeColor(props.value)"
            :text-color="statusTextColor(props.value)"
            class="text-caption text-weight-bold"
          >
            {{ props.value?.toUpperCase() }}
          </q-badge>
        </q-td>
      </template>

      <!-- Terminal Type -->
      <template v-slot:body-cell-terminal_type="props">
        <q-td :props="props">
          <q-badge color="indigo-10" text-color="indigo-2" class="text-caption">
            {{ props.value || '—' }}
          </q-badge>
        </q-td>
      </template>

      <!-- Last Sync -->
      <template v-slot:body-cell-last_sync_at="props">
        <q-td :props="props">
          <div v-if="props.value">
            <div class="text-caption">{{ formatDate(props.value) }}</div>
            <q-badge
              v-if="isStale(props.value)"
              color="orange-10" text-color="orange-3"
              class="text-caption q-mt-xs"
            >
              STALE
            </q-badge>
          </div>
          <span v-else class="text-muted text-caption">Never</span>
        </q-td>
      </template>

      <!-- Actions -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <div class="row items-center op-gap-4">
            <q-btn
              flat round dense size="xs" icon="link" color="green-4"
              :disable="props.row.assignment_status === 'assigned' || props.row.assignment_status === 'suspended'"
              @click="$emit('assign', props.row)"
            >
              <q-tooltip>Assign to Device</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense size="xs" icon="link_off" color="orange-4"
              :disable="props.row.assignment_status !== 'assigned'"
              @click="$emit('unassign', props.row)"
            >
              <q-tooltip>Unassign</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense size="xs" icon="swap_horiz" color="blue-4"
              :disable="props.row.assignment_status !== 'assigned'"
              @click="$emit('transfer', props.row)"
            >
              <q-tooltip>Transfer Terminal</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense size="xs" icon="block" color="red-4"
              :disable="props.row.assignment_status === 'suspended'"
              @click="$emit('suspend', props.row)"
            >
              <q-tooltip>Suspend Terminal</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense size="xs" icon="history" color="grey-4"
              @click="$emit('view-history', props.row)"
            >
              <q-tooltip>View History</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>

      <!-- Empty state -->
      <template v-slot:no-data>
        <div class="full-width column flex-center q-pa-xl text-secondary">
          <q-icon name="credit_card_off" size="3em" color="grey-7" />
          <div class="q-mt-md text-weight-bold">No terminals found</div>
          <div class="text-caption q-mt-xs">Import terminals using the Bulk Import button</div>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useOperatorPreferences } from '../../../composables/useOperatorPreferences'

const props = defineProps({
  terminals: { type: Array, default: () => [] },
  loading:   { type: Boolean, default: false },
  stats:     { type: Object, default: () => ({}) }
})

const emit = defineEmits(['refresh', 'assign', 'unassign', 'transfer', 'suspend', 'view-history'])
const { prefs } = useOperatorPreferences()

// ── Filters ──────────────────────────────────────────────────────────
const search       = ref('')
const filterStatus = ref(null)
const filterType   = ref(null)

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Assigned',     value: 'assigned'   },
  { label: 'Unassigned',   value: 'unassigned' },
  { label: 'Suspended',    value: 'suspended'  }
]

const typeOptions = [
  { label: 'All Types', value: null },
  { label: 'N3',   value: 'N3'   },
  { label: 'N8',   value: 'N8'   },
  { label: 'N86',  value: 'N86'  },
  { label: 'Other', value: 'Other' }
]

const resetFilters = () => {
  search.value       = ''
  filterStatus.value = null
  filterType.value   = null
}

const filtered = computed(() => {
  let result = props.terminals || []
  if (filterStatus.value) result = result.filter(t => t.assignment_status === filterStatus.value)
  if (filterType.value)   result = result.filter(t => t.terminal_type === filterType.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(t =>
      t.terminal_id?.toLowerCase().includes(q)       ||
      t.mpos_terminal_id?.toLowerCase().includes(q)  ||
      t.pos_serial_number?.toLowerCase().includes(q) ||
      t.business_name?.toLowerCase().includes(q)     ||
      t.account_name?.toLowerCase().includes(q)      ||
      t.assigned_device_id?.toLowerCase().includes(q)
    )
  }
  return result
})

// ── Columns ───────────────────────────────────────────────────────────
const columns = [
  { name: 'terminal_id',       label: 'Terminal ID',       field: 'terminal_id',       align: 'left',   sortable: true },
  { name: 'mpos_terminal_id',  label: 'MPOS Terminal',     field: 'mpos_terminal_id',  align: 'left'                   },
  { name: 'business_name',     label: 'Business Name',     field: 'business_name',     align: 'left',   sortable: true },
  { name: 'pos_serial_number', label: 'POS Serial',        field: 'pos_serial_number', align: 'left'                   },
  { name: 'terminal_type',     label: 'Type',              field: 'terminal_type',     align: 'center', sortable: true },
  { name: 'assignment_status', label: 'Status',            field: 'assignment_status', align: 'center', sortable: true },
  { name: 'assigned_device_id',label: 'Assigned Device',   field: 'assigned_device_id',align: 'left',   format: v => v || '—' },
  { name: 'last_sync_at',      label: 'Last Sync',         field: 'last_sync_at',      align: 'left'                   },
  { name: 'created_at',        label: 'Uploaded',          field: 'created_at',        align: 'left',
    format: v => v ? new Date(v).toLocaleDateString('en-GB') : '—'
  },
  { name: 'actions',           label: 'Actions',           field: 'actions',           align: 'center'                 }
]

// ── Helpers ───────────────────────────────────────────────────────────
const statusBadgeColor = (s) => ({ assigned: 'green-10', unassigned: 'blue-grey-10', suspended: 'red-10' }[s] || 'grey-10')
const statusTextColor  = (s) => ({ assigned: 'green-3',  unassigned: 'blue-grey-3',  suspended: 'red-3'  }[s] || 'grey-3')
const isStale = (d) => d && (Date.now() - new Date(d).getTime()) > 24 * 60 * 60 * 1000
const formatDate = (iso) => iso
  ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—'
</script>

<style scoped>
.font-mono { font-family: 'Courier New', monospace; }
</style>
