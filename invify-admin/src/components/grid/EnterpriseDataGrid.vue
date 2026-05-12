<!-- invify-admin/src/components/grid/EnterpriseDataGrid.vue -->
<template>
  <div class="enterprise-panel full-width overflow-hidden bg-[#12161a]">
    <!-- Grid Control Command Bar -->
    <div class="enterprise-subpanel q-pa-sm row items-center justify-between no-wrap border-bottom">
      <!-- Left side: Title, Live Ticker, Counters -->
      <div class="row items-center op-gap-8 no-wrap">
        <div class="text-operator-title text-white text-weight-bold q-mr-xs">{{ title }}</div>
        <div class="text-caption text-grey-6 v-hide-sm" v-if="subtitle">| {{ subtitle }}</div>
        
        <!-- Live Stream Status Patch Dot -->
        <q-chip 
          dense 
          size="xs" 
          :color="streamingActive ? 'green-9' : 'blue-grey-9'" 
          text-color="white" 
          class="q-ml-sm"
        >
          <span class="live-indicator-dot q-mr-xs" :class="streamingActive ? 'pulse-healthy' : ''"></span>
          <span class="text-metric-sm">{{ streamingActive ? 'STREAMING' : 'STATIC' }}</span>
        </q-chip>

        <!-- Dynamic Counter -->
        <div class="text-caption text-grey-5 q-ml-sm">
          Total Rows: <span class="text-metric-mono text-cyan-3">{{ internalRows.length }}</span>
        </div>
      </div>

      <!-- Right side: Filters, Density Toggle, Preset Views -->
      <div class="row items-center op-gap-8 no-wrap">
        <!-- Global filter text box -->
        <q-input 
          v-model="filter" 
          dense 
          dark 
          filled 
          placeholder="Filter grid..." 
          class="bg-[#161b20]"
          style="width: 140px; font-size: 11px;"
        >
          <template v-slot:append>
            <q-icon name="search" size="xs" color="grey-6" />
          </template>
        </q-input>

        <!-- Density Selector -->
        <q-btn-dropdown 
          dense 
          flat 
          size="sm" 
          color="grey-4" 
          icon="view_compact" 
          :label="densityMode.toUpperCase()" 
          content-style="background-color: #101826; border: 1px solid #1F2D42;"
          class="text-caption"
        >
          <q-list dark class="bg-[#101826] text-caption">
            <q-item clickable v-close-popup @click="setDensity('ultra-dense')" class="hover-bg">
              <q-item-section><q-item-label class="text-metric-sm text-white">ULTRA-DENSE (22px)</q-item-label></q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="setDensity('compact')" class="hover-bg">
              <q-item-section><q-item-label class="text-metric-sm text-white">COMPACT (26px)</q-item-label></q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="setDensity('standard')" class="hover-bg">
              <q-item-section><q-item-label class="text-metric-sm text-white">STANDARD (28px)</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <!-- Preset Operator Saved Views -->
        <q-btn-dropdown 
          dense 
          flat 
          size="sm" 
          color="indigo-3" 
          icon="bookmarks" 
          label="VIEW PRESET" 
          content-style="background-color: #101826; border: 1px solid #1F2D42;"
          class="text-caption"
        >
          <q-list dark class="bg-[#101826] text-caption">
            <q-item clickable v-close-popup @click="applyPreset('default')" class="hover-bg">
              <q-item-section class="text-white">Default Topology</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="applyPreset('critical')" class="hover-bg">
              <q-item-section class="text-red-4">Critical Exceptions</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="applyPreset('recent')" class="hover-bg">
              <q-item-section class="text-cyan-4">Latest Ingestion</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <!-- Toggle Row Stream Simulation Patch Trigger -->
        <q-btn 
          flat 
          dense 
          round 
          size="xs" 
          :color="streamingActive ? 'green-4' : 'grey-6'" 
          icon="bolt" 
          @click="toggleStreaming" 
          :title="streamingActive ? 'Pause real-time WebSocket patch engine' : 'Activate live stream rows'"
        />
      </div>
    </div>

    <!-- Data Table Wrapper -->
    <div :class="`enterprise-data-grid enterprise-data-grid--${densityMode}`">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        :row-key="rowKey"
        :loading="loading"
        :filter="filter"
        flat
        dark
        dense
        virtual-scroll
        :virtual-scroll-item-size="virtualSize"
        :virtual-scroll-sticky-size-start="28"
        :pagination="initialPagination"
        class="bg-[#12161a] full-width"
        style="max-height: 480px;"
      >
        <!-- Custom Row Rendering enabling inline sub-row timeline expansion -->
        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th auto-width />
            <q-th v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr :props="props" :class="getRowSeverityClass(props.row)">
            <!-- Sub-row Expand Action Trigger -->
            <q-td auto-width>
              <q-btn 
                size="xs" 
                color="grey-5" 
                round 
                dense 
                flat 
                :icon="props.expand ? 'arrow_drop_down' : 'arrow_right'" 
                @click="props.expand = !props.expand" 
              />
            </q-td>

            <!-- Column Iteration -->
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <!-- Render specialized formats for Severity/Status indicators -->
              <template v-if="col.name === 'severity' || col.name === 'status'">
                <span class="live-indicator-dot q-mr-xs" :class="getBadgeDotClass(props.row[col.field])"></span>
                <span class="text-metric-sm text-weight-bold" :class="getBadgeTextColor(props.row[col.field])">
                  {{ String(props.row[col.field] || 'UNDEFINED').toUpperCase() }}
                </span>
              </template>
              
              <!-- Render numeric metrics using Monospace scales -->
              <template v-else-if="typeof props.row[col.field] === 'number'">
                <span class="text-metric-mono">{{ props.row[col.field].toLocaleString() }}</span>
              </template>

              <!-- Default render -->
              <template v-else>
                {{ col.value !== undefined ? col.value : props.row[col.field] }}
              </template>
            </q-td>
          </q-tr>

          <!-- Inline Expandable Timeline Sub-row Panel -->
          <q-tr v-show="props.expand" :props="props" class="bg-[#161b20]">
            <q-td colspan="100%" class="q-pa-sm">
              <div class="row op-gap-12 items-start text-caption text-grey-4">
                <!-- Trace Event metadata -->
                <div class="col-auto border-right q-pr-md">
                  <div class="text-operator-title text-indigo-3 q-mb-xs">Stream Narrative trace</div>
                  <div class="text-metric-sm text-grey-5">ID: {{ props.row[rowKey] || props.row.id || 'N/A' }}</div>
                  <div class="text-metric-sm text-grey-5">Ingested: {{ props.row.created_at ? new Date(props.row.created_at).toLocaleTimeString() : 'Live' }}</div>
                </div>
                <!-- Payload string -->
                <div class="col">
                  <div class="text-operator-title text-cyan-3 q-mb-xs">Event Detail / Log Timeline</div>
                  <div class="text-metric-mono text-grey-3" style="white-space: pre-wrap; font-size: 11px;">
                    {{ props.row.description || props.row.narrative || JSON.stringify(props.row, null, 2) }}
                  </div>
                  <div class="q-mt-xs row items-center op-gap-8" v-if="props.row.operator || props.row.provider">
                    <q-badge color="blue-grey-9" text-color="cyan-2" class="text-metric-sm">
                      Operator Attribution: {{ props.row.operator || 'SYSTEM_AUTO' }}
                    </q-badge>
                    <q-badge color="blue-grey-9" text-color="amber-3" class="text-metric-sm" v-if="props.row.provider">
                      Provider Bridge: {{ props.row.provider?.toUpperCase() }}
                    </q-badge>
                  </div>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Telemetry Data Grid' },
  subtitle: { type: String, default: 'Real-time patch pipeline' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['preset-changed'])

// Grid State Parameters
const filter = ref('')
const densityMode = ref('compact') // 'ultra-dense' | 'compact' | 'standard'
const streamingActive = ref(true)
const internalRows = ref([...props.rows])

// Sync reactive properties gracefully
watch(() => props.rows, (newRows) => {
  internalRows.value = [...newRows]
}, { deep: true })

// Simulated Real-time WebSocket Row Injection loop
let streamInterval = null
const startPatchEngine = () => {
  if (streamInterval) clearInterval(streamInterval)
  streamInterval = setInterval(() => {
    if (!streamingActive.value || internalRows.value.length === 0) return
    // Patch existing random rows incrementally to simulate continuous active telemetry updates
    const randomIndex = Math.floor(Math.random() * internalRows.value.length)
    const targetRow = internalRows.value[randomIndex]
    if (targetRow && typeof targetRow.amount === 'number') {
      // Simulate real-time stream variations
      const diff = Math.floor(Math.random() * 500) - 250
      targetRow.amount += diff
      targetRow.updated_at = new Date().toISOString()
    }
  }, 2500)
}

const toggleStreaming = () => {
  streamingActive.value = !streamingActive.value
}

// Compute table item size based on active density
const virtualSize = computed(() => {
  if (densityMode.value === 'ultra-dense') return 22
  if (densityMode.value === 'compact') return 26
  return 28
})

const setDensity = (mode) => {
  densityMode.value = mode
}

// Apply Saved Views/Presets
const currentPreset = ref('default')
const applyPreset = (preset) => {
  currentPreset.value = preset
  emit('preset-changed', preset)
  if (preset === 'critical') {
    filter.value = 'critical'
  } else {
    filter.value = ''
  }
}

// Map custom filters beautifully
const filteredRows = computed(() => {
  let res = [...internalRows.value]
  if (currentPreset.value === 'critical') {
    res = res.filter(r => String(r.severity).toLowerCase() === 'critical' || String(r.status).toLowerCase() === 'failed')
  }
  return res
})

const initialPagination = {
  rowsPerPage: 50
}

// Severity status formatting methods mapping strictly to the Global Severity Model
const getRowSeverityClass = (row) => {
  const sev = String(row.severity || row.status || '').toLowerCase()
  if (sev === 'critical' || sev === 'failed') return 'bg-[#2b1215] text-red-3'
  if (sev === 'warning') return 'bg-[#2b2412] text-amber-3'
  return ''
}

const getBadgeDotClass = (val) => {
  const s = String(val).toLowerCase()
  if (s === 'critical' || s === 'failed') return 'pulse-critical'
  if (s === 'warning' || s === 'high') return 'pulse-warning'
  if (s === 'healthy' || s === 'succeeded' || s === 'active') return 'pulse-healthy'
  return ''
}

const getBadgeTextColor = (val) => {
  const s = String(val).toLowerCase()
  if (s === 'critical' || s === 'failed') return 'text-red-4'
  if (s === 'warning' || s === 'high') return 'text-amber-4'
  if (s === 'healthy' || s === 'succeeded' || s === 'active') return 'text-green-4'
  return 'text-cyan-4'
}

onMounted(() => {
  startPatchEngine()
})

onBeforeUnmount(() => {
  if (streamInterval) clearInterval(streamInterval)
})
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-right { border-right: 1px solid var(--enterprise-border); }
@media (max-width: 599px) {
  .v-hide-sm { display: none; }
}
</style>
