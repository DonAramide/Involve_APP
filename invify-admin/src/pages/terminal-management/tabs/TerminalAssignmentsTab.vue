<template>
  <div class="column op-gap-12">

    <!-- Toolbar -->
    <div class="row items-center justify-between q-pb-xs border-bottom">
      <div class="row items-center op-gap-8">
        <q-icon name="link" color="green-4" size="xs" />
        <span class="text-caption text-secondary">{{ terminals.length }} active assignment{{ terminals.length !== 1 ? 's' : '' }}</span>
      </div>
      <q-btn
        dense flat size="sm"
        icon="refresh" label="Refresh"
        color="teal-4"
        @click="$emit('refresh')"
        :loading="loading"
      />
    </div>

    <!-- Active Assignments Table -->
    <q-table
      :rows="terminals"
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
      style="height: calc(100vh - 300px);"
    >
      <!-- Terminal ID -->
      <template v-slot:body-cell-terminal_id="props">
        <q-td :props="props">
          <div class="text-weight-bold text-teal-4 font-mono" style="font-size: 12px;">
            {{ props.value }}
          </div>
        </q-td>
      </template>

      <!-- MPOS Terminal -->
      <template v-slot:body-cell-mpos_terminal_id="props">
        <q-td :props="props">
          <div class="text-caption text-indigo-3 font-mono">{{ props.value || '—' }}</div>
        </q-td>
      </template>

      <!-- Assigned Device -->
      <template v-slot:body-cell-assigned_device_id="props">
        <q-td :props="props">
          <div class="text-caption font-mono text-blue-3" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ props.value || '—' }}
          </div>
        </q-td>
      </template>

      <!-- Sync Status -->
      <template v-slot:body-cell-sync_status="props">
        <q-td :props="props">
          <q-badge
            :color="syncBadgeColor(props.row.last_sync_at)"
            :text-color="syncTextColor(props.row.last_sync_at)"
            class="text-caption text-weight-bold"
          >
            {{ syncLabel(props.row.last_sync_at) }}
          </q-badge>
        </q-td>
      </template>

      <!-- Config Version -->
      <template v-slot:body-cell-config_version="props">
        <q-td :props="props">
          <q-chip dense square color="indigo-10" text-color="indigo-3" class="text-caption">
            v{{ props.value || 1 }}
          </q-chip>
        </q-td>
      </template>

      <!-- Actions -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <div class="row items-center op-gap-4">
            <q-btn
              flat round dense size="xs" icon="link_off" color="orange-4"
              @click="$emit('unassign', props.row)"
            >
              <q-tooltip>Unassign Terminal</q-tooltip>
            </q-btn>
            <q-btn
              flat round dense size="xs" icon="swap_horiz" color="blue-4"
              @click="$emit('transfer', props.row)"
            >
              <q-tooltip>Transfer to Another Device</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>

      <!-- Empty state -->
      <template v-slot:no-data>
        <div class="full-width column flex-center q-pa-xl text-secondary">
          <q-icon name="link_off" size="3em" color="grey-7" />
          <div class="q-mt-md text-weight-bold">No active terminal assignments</div>
          <div class="text-caption q-mt-xs">Assign terminals from the Inventory tab</div>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { useOperatorPreferences } from '../../../composables/useOperatorPreferences'

const props = defineProps({
  terminals: { type: Array, default: () => [] },
  loading:   { type: Boolean, default: false }
})

const emit = defineEmits(['refresh', 'unassign', 'transfer'])
const { prefs } = useOperatorPreferences()

// ── Columns ───────────────────────────────────────────────────────────
const columns = [
  { name: 'terminal_id',       label: 'Terminal ID',    field: 'terminal_id',        align: 'left',   sortable: true },
  { name: 'mpos_terminal_id',  label: 'MPOS Terminal',  field: 'mpos_terminal_id',   align: 'left'                   },
  { name: 'business_name',     label: 'Business Name',  field: 'business_name',      align: 'left',   sortable: true },
  { name: 'assigned_device_id',label: 'Device ID',      field: 'assigned_device_id', align: 'left'                   },
  { name: 'pos_serial_number', label: 'POS Serial',     field: 'pos_serial_number',  align: 'left'                   },
  { name: 'assigned_at',       label: 'Assigned At',    field: 'assigned_at',        align: 'left',
    format: v => v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  },
  { name: 'sync_status',       label: 'Sync Status',    field: 'last_sync_at',       align: 'center'                 },
  { name: 'config_version',    label: 'Config Ver',     field: 'config_version',     align: 'center'                 },
  { name: 'actions',           label: 'Actions',        field: 'actions',            align: 'center'                 }
]

// ── Helpers ───────────────────────────────────────────────────────────
const STALE_MS = 24 * 60 * 60 * 1000

const isStale = (d) => d && (Date.now() - new Date(d).getTime()) > STALE_MS

const syncLabel      = (d) => !d ? 'NEVER' : isStale(d) ? 'STALE' : 'SYNCED'
const syncBadgeColor = (d) => !d ? 'grey-10' : isStale(d) ? 'orange-10' : 'green-10'
const syncTextColor  = (d) => !d ? 'grey-3'  : isStale(d) ? 'orange-3'  : 'green-3'
</script>

<style scoped>
.font-mono    { font-family: 'Courier New', monospace; }
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
</style>
