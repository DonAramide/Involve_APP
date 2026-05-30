<template>
  <div class="column op-gap-16 q-pt-md">

    <!-- KPI Metric Cards -->
    <div class="row q-col-gutter-sm">
      <div class="col-6 col-sm-4 col-md-2" v-for="m in metrics" :key="m.label">
        <q-card flat class="bg-panel border-main rounded-borders">
          <q-card-section class="q-pa-sm">
            <div class="row items-start justify-between no-wrap">
              <div>
                <div class="text-muted" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                  {{ m.label }}
                </div>
                <div :class="['text-weight-bold', m.color]" style="font-size: 24px;">{{ m.value }}</div>
              </div>
              <q-icon :name="m.icon" :color="m.iconColor" size="sm" style="opacity: 0.7; margin-top: 2px;" />
            </div>
            <q-linear-progress
              v-if="props.stats?.total > 0"
              :value="m.rawValue / (props.stats.total || 1)"
              :color="m.iconColor"
              track-color="blue-grey-10"
              class="q-mt-xs"
              size="2px"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="row q-col-gutter-md">

      <!-- Assignment Distribution Donut -->
      <div class="col-12 col-md-5">
        <q-card flat class="bg-panel border-main">
          <q-card-section class="q-pa-sm border-bottom">
            <div class="row items-center op-gap-8">
              <q-icon name="donut_large" color="teal-4" size="xs" />
              <div class="text-weight-bold text-caption text-teal-4">Assignment Distribution</div>
            </div>
          </q-card-section>
          <q-card-section class="q-pa-md">
            <apexchart
              v-if="chartReady && donutSeries.some(v => v > 0)"
              type="donut"
              height="240"
              :options="donutOptions"
              :series="donutSeries"
            />
            <div v-else class="text-center text-muted q-pa-xl text-caption">
              No terminal data available
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Terminal Type Bar Chart -->
      <div class="col-12 col-md-7">
        <q-card flat class="bg-panel border-main">
          <q-card-section class="q-pa-sm border-bottom">
            <div class="row items-center op-gap-8">
              <q-icon name="bar_chart" color="teal-4" size="xs" />
              <div class="text-weight-bold text-caption text-teal-4">Terminal Type Breakdown</div>
            </div>
          </q-card-section>
          <q-card-section class="q-pa-md">
            <apexchart
              v-if="chartReady && Object.keys(terminalTypeBreakdown).length > 0"
              type="bar"
              height="240"
              :options="barOptions"
              :series="barSeries"
            />
            <div v-else class="text-center text-muted q-pa-xl text-caption">
              No type data available
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Business Allocation -->
    <q-card flat class="bg-panel border-main">
      <q-card-section class="q-pa-sm border-bottom">
        <div class="row items-center justify-between">
          <div class="row items-center op-gap-8">
            <q-icon name="business" color="teal-4" size="xs" />
            <div class="text-weight-bold text-caption text-teal-4">Business Terminal Allocation</div>
          </div>
          <div class="text-muted text-caption">{{ businessAllocation.length }} businesses</div>
        </div>
      </q-card-section>
      <q-card-section class="q-pa-md">
        <div v-if="businessAllocation.length === 0" class="text-center text-muted text-caption q-pa-lg">
          <q-icon name="business" size="2em" color="grey-7" />
          <div class="q-mt-sm">No terminal data available</div>
        </div>
        <div v-else>
          <div
            v-for="(biz, i) in businessAllocation"
            :key="biz.name"
            class="q-mb-md"
          >
            <div class="row items-center justify-between q-mb-xs">
              <div class="row items-center op-gap-8">
                <span class="text-caption text-weight-bold text-main">{{ biz.name }}</span>
                <q-badge
                  :color="biz.assignedCount > 0 ? 'teal-10' : 'grey-10'"
                  :text-color="biz.assignedCount > 0 ? 'teal-3' : 'grey-3'"
                  class="text-caption"
                >
                  {{ biz.assignedCount }} assigned
                </q-badge>
              </div>
              <span class="text-caption text-teal-4 text-weight-bold">{{ biz.count }} terminal{{ biz.count !== 1 ? 's' : '' }}</span>
            </div>
            <q-linear-progress
              :value="biz.count / (props.stats?.total || 1)"
              color="teal-6"
              track-color="blue-grey-10"
              size="6px"
              rounded
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Sync Health -->
    <q-card flat class="bg-panel border-main">
      <q-card-section class="q-pa-sm border-bottom">
        <div class="row items-center op-gap-8">
          <q-icon name="sync" color="teal-4" size="xs" />
          <div class="text-weight-bold text-caption text-teal-4">Sync Health Overview</div>
        </div>
      </q-card-section>
      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">
          <div class="col-6 col-sm-3" v-for="sh in syncHealth" :key="sh.label">
            <q-card flat class="bg-subpanel border-main">
              <q-card-section class="q-pa-sm text-center">
                <q-icon :name="sh.icon" :color="sh.color" size="sm" />
                <div :class="['text-weight-bold q-mt-xs', sh.textColor]" style="font-size: 20px;">{{ sh.value }}</div>
                <div class="text-muted" style="font-size: 10px; text-transform: uppercase;">{{ sh.label }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue'
import ApexCharts from 'vue3-apexcharts'

const apexchart = ApexCharts

const props = defineProps({
  stats:     { type: Object, default: () => ({}) },
  terminals: { type: Array,  default: () => [] }
})

const chartReady = ref(false)
onMounted(() => nextTick(() => { chartReady.value = true }))

// ── KPI Metrics ───────────────────────────────────────────────────────
const metrics = computed(() => [
  { label: 'Total',         value: props.stats?.total        || 0, rawValue: props.stats?.total        || 0, icon: 'credit_card',   color: 'text-main',     iconColor: 'blue-4'   },
  { label: 'Assigned',      value: props.stats?.assigned     || 0, rawValue: props.stats?.assigned     || 0, icon: 'link',          color: 'text-green-4',  iconColor: 'green-4'  },
  { label: 'Unassigned',    value: props.stats?.unassigned   || 0, rawValue: props.stats?.unassigned   || 0, icon: 'link_off',      color: 'text-amber-4',  iconColor: 'amber-4'  },
  { label: 'Suspended',     value: props.stats?.suspended    || 0, rawValue: props.stats?.suspended    || 0, icon: 'block',         color: 'text-red-4',    iconColor: 'red-4'    },
  { label: 'Sync Failures', value: props.stats?.syncFailures || 0, rawValue: props.stats?.syncFailures || 0, icon: 'sync_problem',  color: 'text-orange-4', iconColor: 'orange-4' },
  { label: 'Updated Config',value: updatedConfigCount.value,       rawValue: updatedConfigCount.value,       icon: 'layers',        color: 'text-indigo-4', iconColor: 'indigo-4' },
])

const updatedConfigCount = computed(() =>
  (props.terminals || []).filter(t => (t.config_version || 1) > 1).length
)

// ── Donut Chart ───────────────────────────────────────────────────────
const donutSeries = computed(() => [
  props.stats?.assigned   || 0,
  props.stats?.unassigned || 0,
  props.stats?.suspended  || 0
])

const donutOptions = computed(() => ({
  chart:   { type: 'donut', background: 'transparent' },
  labels:  ['Assigned', 'Unassigned', 'Suspended'],
  colors:  ['#26a69a', '#ffa726', '#ef5350'],
  theme:   { mode: 'dark' },
  legend:  { position: 'bottom', labels: { colors: '#9e9e9e' } },
  dataLabels: { enabled: true },
  plotOptions: { pie: { donut: { size: '60%' } } },
  tooltip: { theme: 'dark' }
}))

// ── Bar Chart (Terminal Types) ────────────────────────────────────────
const terminalTypeBreakdown = computed(() => {
  const counts = {}
  ;(props.terminals || []).forEach(t => {
    const key = t.terminal_type || 'Unknown'
    counts[key] = (counts[key] || 0) + 1
  })
  return counts
})

const barSeries  = computed(() => [{ name: 'Terminals', data: Object.values(terminalTypeBreakdown.value) }])
const barOptions = computed(() => ({
  chart:   { type: 'bar', background: 'transparent', toolbar: { show: false } },
  xaxis:   { categories: Object.keys(terminalTypeBreakdown.value), labels: { style: { colors: '#9e9e9e' } } },
  yaxis:   { labels: { style: { colors: '#9e9e9e' } } },
  colors:  ['#26a69a'],
  theme:   { mode: 'dark' },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', distributed: true } },
  legend:  { show: false },
  dataLabels: { enabled: true, style: { colors: ['#fff'], fontSize: '11px' } },
  grid:    { borderColor: '#1F2D42' },
  tooltip: { theme: 'dark' }
}))

// ── Business Allocation ───────────────────────────────────────────────
const businessAllocation = computed(() => {
  const counts = {}
  ;(props.terminals || []).forEach(t => {
    if (t.business_name) {
      if (!counts[t.business_name]) counts[t.business_name] = { count: 0, assignedCount: 0 }
      counts[t.business_name].count++
      if (t.assignment_status === 'assigned') counts[t.business_name].assignedCount++
    }
  })
  return Object.entries(counts)
    .map(([name, v]) => ({ name, count: v.count, assignedCount: v.assignedCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

// ── Sync Health ───────────────────────────────────────────────────────
const STALE_MS = 24 * 60 * 60 * 1000

const syncHealth = computed(() => {
  const all      = props.terminals || []
  const synced   = all.filter(t => t.last_sync_at && (Date.now() - new Date(t.last_sync_at).getTime()) <= STALE_MS).length
  const stale    = all.filter(t => t.last_sync_at && (Date.now() - new Date(t.last_sync_at).getTime()) > STALE_MS).length
  const neverSync= all.filter(t => !t.last_sync_at).length
  const failures = props.stats?.syncFailures || 0
  return [
    { label: 'Synced',    value: synced,    icon: 'check_circle', color: 'green-4',  textColor: 'text-green-4'  },
    { label: 'Stale',     value: stale,     icon: 'schedule',     color: 'orange-4', textColor: 'text-orange-4' },
    { label: 'Never Synced', value: neverSync, icon: 'sync_disabled', color: 'grey-5', textColor: 'text-secondary' },
    { label: 'Failures',  value: failures,  icon: 'error',        color: 'red-4',    textColor: 'text-red-4'    },
  ]
})
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
</style>
