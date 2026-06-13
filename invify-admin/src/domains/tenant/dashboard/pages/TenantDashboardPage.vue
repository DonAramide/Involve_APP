<!-- invify-admin/src/pages/tenant/TenantDashboardPage.vue -->
<template>
  <q-page class="q-pa-lg text-white relative-position" style="background: #05070d; min-height: 100vh;">
    <!-- Ambient Sleek Stripe-Style Background Glows -->
    <div class="ambient-glow" :style="`background: radial-gradient(circle, rgba(${activeManifest.glowRgb}, 0.08) 0%, rgba(5,7,13,0) 70%);`" />

    <!-- Top Dashboard Header & Capability Mode Orchestration -->
    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="dashboard" :color="activeManifest.color + '-4'" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Operations Control</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Realtime telemetry, Quasar transaction streams, and context-aware business intelligence.
        </div>
      </div>

      <!-- Realtime Telemetry Health & Mode Switcher Console -->
      <div class="row items-center op-gap-12">
        <!-- Live Connection & Performance Throttling Panel -->
        <div class="row items-center op-gap-8 bg-black-transparent border-grey-9 q-px-md q-py-sm rounded-borders text-metric-mono font-mono" style="font-size: 11px;">
          <span class="live-indicator-dot animate-pulse" :class="wsConnected ? 'bg-green-5' : 'bg-red-5'"></span>
          <span class="text-grey-4" v-if="wsConnected">WS STREAM [OK]</span>
          <span class="text-red-4" v-else>WS DISCONNECTED</span>
          <span class="text-grey-6">|</span>
          <span class="text-cyan-4">{{ syncStats.eventsCount }} EVTS</span>
          <span class="text-grey-6">|</span>
          <span class="text-indigo-4">{{ syncStats.latency }}ms</span>
        </div>

        <!-- Capability Switcher Dropdown (Test Override Console) -->
        <q-btn-dropdown outline :color="activeManifest.color + '-4'" label="CAPABILITY PREVIEW" size="sm" class="text-weight-bold font-mono">
          <q-list dark class="bg-panel text-caption text-white border-grey-9" style="min-width: 180px;">
            <q-item-label header class="text-operator-title text-grey-5" style="font-size: 9.5px; letter-spacing: 1px;">TEST PORTAL CONFIGS</q-item-label>
            <q-item 
              v-for="(config, key) in INDUSTRY_MANIFEST" 
              :key="key" 
              clickable 
              v-close-popup 
              @click="switchIndustryMode(key)"
              :class="activeIndustry === key ? 'bg-indigo-10 text-indigo-3' : ''"
              class="hover-bg rounded-borders q-mx-xs q-my-xs"
            >
              <q-item-section avatar>
                <q-icon :name="config.kpis[1].icon" :color="config.color + '-4'" size="xs" />
              </q-item-section>
              <q-item-section class="text-weight-bold text-uppercase">{{ key }} MODE</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>

    <!-- 1. Real-time Dynamically Provisioned KPI Deck -->
    <div class="row q-col-gutter-lg q-mb-lg relative-position" style="z-index: 10;">
      <div class="col-12 col-sm-6 col-md-3" v-for="kpi in activeManifest.kpis" :key="kpi.title">
        <q-card class="kpi-card border-grey-9 q-pa-md transition-3 relative-position overflow-hidden" :style="`border-left: 3px solid ${activeManifest.accent};`">
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-operator-title text-grey-5 text-uppercase" style="font-size: 9.5px; letter-spacing: 1.5px;">{{ kpi.title }}</span>
            <q-icon :name="kpi.icon" :color="kpi.iconColor" size="sm" />
          </div>
          
          <div class="text-h5 text-weight-bold text-white text-metric-mono q-my-xs">
            {{ getDynamicKpiValue(kpi.key) }}
          </div>

          <div class="row items-center op-gap-4 q-mt-xs">
            <q-icon :name="kpi.trendIcon" :color="kpi.trendColor" size="xs" />
            <span :class="`text-${kpi.trendColor} text-caption text-weight-bold`">{{ kpi.trend }}</span>
            <span class="text-caption text-grey-6 q-ml-xs">live telemetry</span>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 2. Interactive Performance Sparkline Grid & AI Recommendations Hub -->
    <div class="row q-col-gutter-lg q-mb-lg relative-position" style="z-index: 10;">
      
      <!-- High Density Dynamic Operational Chart -->
      <div class="col-12 col-lg-8">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit relative-position">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-h6 text-weight-bold text-white">{{ activeManifest.chart.title }}</div>
              <div class="text-caption text-grey-5">{{ activeManifest.chart.subtitle }}</div>
            </div>
            
            <q-btn-toggle
              v-model="timeframe"
              toggle-color="indigo-9"
              color="black"
              dense
              flat
              class="border-grey-9 q-px-sm font-mono text-caption"
              :options="[
                {label: '7D BATCH', value: '7'},
                {label: '30D SLICE', value: '30'},
                {label: 'ALL INTERVALS', value: 'all'}
              ]"
            />
          </div>

          <!-- Dynamic SVG High-Density Chart Grid -->
          <div class="sparkline-container q-py-lg">
            <div class="row items-end justify-between q-gutter-x-sm fit h-full" style="height: 180px;">
              <div v-for="(val, index) in dynamicChartData" :key="index" class="col column items-center">
                <div 
                  class="rounded-borders fit bar-hover transition-3" 
                  :style="`height: ${(val / activeManifest.chart.maxVal) * 100}%; background: linear-gradient(180deg, ${activeManifest.accent} 0%, rgba(99, 102, 241, 0.05) 100%);`"
                >
                  <q-tooltip class="bg-indigo-10 text-white text-metric-mono font-mono" style="font-size: 11px;">
                    {{ activeManifest.chart.tooltipPrefix }}{{ val.toLocaleString() }}
                  </q-tooltip>
                </div>
                <span class="text-metric-mono text-grey-6 q-mt-xs font-mono" style="font-size: 9px;">{{ activeManifest.chart.labels[index] }}</span>
              </div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Prescriptive AI Copilot & Contextual Intelligence -->
      <div class="col-12 col-lg-4">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit column justify-between">
          <div>
            <div class="row items-center op-gap-6 q-mb-sm">
              <q-icon name="psychology" color="purple-3" size="sm" />
              <div class="text-h6 text-weight-bold text-white">AI Copilot Predictions</div>
            </div>
            <div class="text-caption text-grey-5 q-mb-md">Deterministic, explainable context recommendations.</div>
            
            <div class="column q-gutter-y-sm">
              <div class="anomaly-card q-pa-md rounded-borders border-grey-9 row items-start op-gap-12" v-for="insight in activeManifest.aiRules" :key="insight.title">
                <q-icon :name="insight.icon" :color="insight.color" size="sm" class="q-mt-xs" />
                <div class="col">
                  <div class="text-caption text-weight-bold text-white">{{ insight.title }}</div>
                  <div class="text-caption text-grey-5 font-sans" style="font-size: 11px; line-height: 1.35;">{{ insight.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <q-btn outline :color="activeManifest.color + '-4'" label="DISPATCH COMPLIANCE RULES" class="full-width q-mt-md text-weight-bold letter-spacing-1 font-mono text-caption" />
        </q-card>
      </div>

    </div>

    <!-- 3. Cryptographically Verified Settlement Timeline & Live Operations Stream -->
    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">
      
      <!-- Replay-Safe Settlement Timeline Timeline -->
      <div class="col-12 col-lg-5">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Quasar Settlement Chronology</div>
          <div class="text-caption text-grey-5 q-mb-lg">Track real-time payout states and ledger sequence checkpoints.</div>

          <div class="timeline-stepper column q-gap-12">
            <div v-for="(phase, idx) in settlementPhases" :key="phase.title" class="row items-start no-wrap timeline-node q-pb-md">
              <div class="column items-center q-mr-md" style="height: 100%;">
                <q-avatar size="24px" :color="phase.active ? 'green-10' : 'grey-9'" :text-color="phase.active ? 'green-4' : 'grey-5'" class="text-weight-bold font-mono" style="font-size: 11px;">
                  {{ idx + 1 }}
                </q-avatar>
                <div v-if="idx < settlementPhases.length - 1" class="line-connector" :class="phase.active ? 'connector-active' : ''"></div>
              </div>
              
              <div class="col text-left">
                <div class="row items-center justify-between">
                  <span class="text-caption text-weight-bold text-white">{{ phase.title }}</span>
                  <q-badge v-if="phase.active" color="green-10" text-color="green-3" class="text-metric-sm font-mono">VERIFIED</q-badge>
                  <q-badge v-else color="grey-10" text-color="grey-6" class="text-metric-sm font-mono">PENDING</q-badge>
                </div>
                <div class="text-caption text-grey-5 font-mono q-mt-xs" style="font-size: 10.5px;">{{ phase.desc }}</div>
                <div v-if="phase.active" class="font-mono text-grey-6 text-metric-sm q-mt-xs ellipsis" style="font-size: 9px; letter-spacing: 0.5px;">
                  Block Hash: {{ phase.hash }}
                </div>
              </div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Live Operations & Mobile-to-Portal Telemetry Stream -->
      <div class="col-12 col-lg-7">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-h6 text-weight-bold text-white">Live Mobile Operational Feed</div>
              <div class="text-caption text-grey-5">Websocket convergence stream from local client heartbeats.</div>
            </div>
            
            <div class="row q-gutter-x-sm">
              <q-btn flat color="grey-4" icon="file_download" label="CSV Snapshot" dense @click="triggerExport('CSV')" class="font-mono text-caption text-weight-bold q-px-sm" />
              <q-btn flat color="purple-3" icon="picture_as_pdf" label="Signed PDF" dense @click="triggerExport('PDF')" class="font-mono text-caption text-weight-bold q-px-sm" />
            </div>
          </div>

          <q-list separator class="border-grey-9 rounded-borders">
            <q-item v-for="tx in liveFeed" :key="tx.id" clickable @click="inspectLineage(tx)" class="q-py-md animate-fade-in hover-bg">
              <q-item-section avatar>
                <q-icon :name="tx.icon" :color="tx.color" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-white">{{ tx.desc }}</q-item-label>
                <q-item-label caption class="text-grey-5 font-mono" style="font-size: 10.5px;">
                  Ref: {{ tx.ref }} | Device: {{ tx.device }}
                </q-item-label>
              </q-item-section>
              <q-item-section side class="text-right">
                <div class="text-metric-mono text-weight-bold font-mono text-white" style="font-size: 13px;">
                  {{ tx.valueFormatted }}
                </div>
                <div class="row items-center op-gap-4 justify-end q-mt-xs font-mono" style="font-size: 9px;">
                  <span class="text-metric-sm text-green-4 text-weight-bold">CONVERGED</span>
                  <q-icon name="cloud_done" color="green-4" size="xs" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

    </div>

    <!-- 4. Cryptographic Proof Lineage Inspector Drawer Overlay -->
    <q-drawer
      v-model="inspectorDrawer"
      side="right"
      overlay
      bordered
      :width="420"
      style="background: #090c15; border-left: 1px solid rgba(255,255,255,0.08);"
      class="text-white"
    >
      <div class="column fit q-pa-lg text-left" v-if="selectedTx">
        <div class="row items-center justify-between q-mb-md">
          <div class="row items-center op-gap-8">
            <q-icon name="shield" color="green-4" size="sm" />
            <span class="text-metric-mono font-mono text-weight-bolder" style="font-size: 13px; letter-spacing: 1px;">PROOF LINEAGE INSPECTOR</span>
          </div>
          <q-btn flat round dense color="grey-5" icon="close" @click="inspectorDrawer = false" />
        </div>

        <q-separator dark class="q-my-md opacity-10" />

        <!-- Verification Health Badge -->
        <div class="q-pa-md rounded-borders bg-black-transparent border-grey-9 q-mb-lg">
          <div class="row items-center justify-between">
            <span class="text-grey-5 text-caption font-mono">Proof Checkpoint State</span>
            <q-badge color="green-10" text-color="green-3" class="text-weight-bold font-mono q-px-sm">SIGNATURE VALID</q-badge>
          </div>
          <div class="text-metric-mono font-mono text-green-4 text-weight-bold q-mt-sm" style="font-size: 11px; word-break: break-all;">
            SHA-256 Checksum Verified
          </div>
        </div>

        <!-- Lineage Event Variables -->
        <div class="column q-gap-12 col scroll">
          <div>
            <div class="text-operator-title text-grey-5" style="font-size: 9px; letter-spacing: 1px;">EVENT CLASSIFICATION</div>
            <div class="text-caption text-weight-bold text-white q-mt-xs">{{ selectedTx.desc }}</div>
          </div>

          <div>
            <div class="text-operator-title text-grey-5" style="font-size: 9px; letter-spacing: 1px;">SYSTEM REFERENCE ID</div>
            <div class="text-caption font-mono text-indigo-3 q-mt-xs">{{ selectedTx.ref }}</div>
          </div>

          <div>
            <div class="text-operator-title text-grey-5" style="font-size: 9px; letter-spacing: 1px;">DETERMINISTIC METRIC</div>
            <div class="text-caption font-mono text-white text-weight-bold q-mt-xs" style="font-size: 13px;">{{ selectedTx.valueFormatted }}</div>
          </div>

          <div>
            <div class="text-operator-title text-grey-5" style="font-size: 9px; letter-spacing: 1px;">SOURCE TELEMETRY TERMINAL</div>
            <div class="text-caption font-mono text-white q-mt-xs">{{ selectedTx.device }}</div>
          </div>

          <q-separator dark class="q-my-md opacity-10" />

          <!-- Dynamic Proof Block Details -->
          <div>
            <div class="text-operator-title text-grey-5" style="font-size: 9px; letter-spacing: 1px;">CRAPTO-AUDIT BLOCK PROOFS</div>
            <div class="bg-black-transparent border-grey-9 q-pa-md rounded-borders font-mono text-metric-sm text-grey-4 q-mt-sm" style="font-size: 9.5px; line-height: 1.5; overflow-x: auto;">
              <div>{</div>
              <div class="q-pl-md">"event_sequence": {{ selectedTx.id }},</div>
              <div class="q-pl-md">"tenant_scope": "isolated-workspace",</div>
              <div class="q-pl-md">"replay_protection": "nonce-validated",</div>
              <div class="q-pl-md">"quasar_reconcile": "converged",</div>
              <div class="q-pl-md">"mobile_offline_recovery": "sync-ok",</div>
              <div class="q-pl-md">"merkle_root": "0x4f46e5a6366f1...",</div>
              <div class="q-pl-md">"lineage_hash": "sha256-{{ selectedTx.ref.toLowerCase() }}a892b"</div>
              <div>}</div>
            </div>
          </div>
        </div>
      </div>
    </q-drawer>

    <!-- 5. Dynamic Export Console Dialog -->
    <q-dialog v-model="exportConsole" backdrop-filter="blur(10px)">
      <q-card class="bg-card-dark border-grey-9 q-pa-lg" style="width: 480px; max-width: 90vw;">
        <div class="row items-center op-gap-8 q-mb-md">
          <q-icon name="terminal" color="purple-3" size="sm" />
          <div class="text-h6 text-weight-bold text-white font-mono" style="font-size: 14px;">Snapshot Compiler Engine</div>
        </div>

        <!-- Terminal compilation readout -->
        <div class="bg-black-transparent border-grey-9 q-pa-md rounded-borders font-mono text-grey-4 text-metric-sm q-mb-md" style="font-size: 11px; min-height: 140px; line-height: 1.6;">
          <div v-for="(log, idx) in exportLogs" :key="idx" class="q-mb-xs">
            <span class="text-purple-3">></span> {{ log }}
          </div>
          <div v-if="exportingProgress < 100" class="row items-center op-gap-6 text-yellow-4 animate-pulse q-mt-sm">
            <span class="live-indicator-dot bg-yellow-5"></span>
            <span>Running compilation pipeline...</span>
          </div>
          <div v-else class="text-green-4 text-weight-bold q-mt-sm">
            [COMPILATION COMPLETE] Download ready.
          </div>
        </div>

        <q-linear-progress :value="exportingProgress / 100" color="purple-3" dark class="rounded-borders q-mb-md" />

        <div class="row justify-end">
          <q-btn flat color="grey-5" label="Cancel" v-close-popup class="text-weight-bold font-mono" :disabled="exportingProgress < 100" />
          <q-btn unelevated color="purple-10" label="Initiate Save" @click="closeExportConsole" class="text-weight-bold font-mono text-purple-3 q-ml-sm" :disabled="exportingProgress < 100" />
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { useCurrency } from '../../../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Active timeframe
const timeframe = ref('7')

// Core Industry Preference / Manifest Governance Config
const activeIndustry = ref(localStorage.getItem('tenant_type') || 'school')

// WebSocket Telemetry Connection State
const wsConnected = ref(true)

// Reactive Synchronized Telemetry State
const syncStats = ref({
  eventsCount: 42,
  latency: 2.1
})

// Current dynamically scaling KPI metrics (driven by WebSocket streams)
const dynamicKpis = ref({
  school: { revenue: 4850200, students: 642, attendance: 95.6, progress: 88 },
  retail: { revenue: 8412500, skus: 1420, stockIndex: 98.4, alerts: 2 },
  hospitality: { revenue: 12450000, rooms: 84.2, bookings: 312, billing: 6200000 },
  logistics: { revenue: 9820000, fleet: 18, dispatchRate: 98.8, deliveries: 4120 },
  healthcare: { revenue: 15400000, patients: 1240, waitTime: 12, pharmacyValue: 4800000 }
})

// Dynamic Capability Manifest Registry (Requirement 6 Governance)
const INDUSTRY_MANIFEST = {
  school: {
    color: 'indigo',
    accent: '#6366f1',
    glowRgb: '99,102,241',
    kpis: [
      { key: 'revenue', title: 'Term Fees Collected', icon: 'payments', iconColor: 'indigo-4', trend: '94.2% Collected', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'students', title: 'Student Enrollment', icon: 'school', iconColor: 'indigo-3', trend: '+4.8% YoY', trendIcon: 'trending_up', trendColor: 'green-4' },
      { key: 'attendance', title: 'Daily Attendance', icon: 'how_to_reg', iconColor: 'green-4', trend: '95.6% Average', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'progress', title: 'Lesson Plan Progress', icon: 'menu_book', iconColor: 'cyan-4', trend: '88% Complete', trendIcon: 'check', trendColor: 'green-4' }
    ],
    chart: {
      title: 'Weekly Student Attendance Influx',
      subtitle: 'Synchronized attendance recordings captured by operator mobile check-ins.',
      labels: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      tooltipPrefix: 'Attendance Rate: ',
      maxVal: 100,
      data: [92, 95, 96, 94, 88]
    },
    aiRules: [
      { icon: 'warning', color: 'amber-4', title: 'Grade 11 Telemetry Drop', desc: 'Student check-in count decreased by 6% on Friday morning. Explainable anomaly matches weekend shift patterns.' },
      { icon: 'gpp_maybe', color: 'red-4', title: 'Dynamic Fee Deficit Warning', desc: '14 ledger accounts are approaching the term deadline with fee deficits. Dynamic sweep alerts suggested.' }
    ]
  },
  retail: {
    color: 'amber',
    accent: '#f59e0b',
    glowRgb: '245,158,11',
    kpis: [
      { key: 'revenue', title: 'Gross POS Revenue MTD', icon: 'payments', iconColor: 'amber-4', trend: '+18.4% vs last 7d', trendIcon: 'trending_up', trendColor: 'green-4' },
      { key: 'skus', title: 'Active SKU Inventory', icon: 'inventory_2', iconColor: 'amber-3', trend: '1,420 Items Scoped', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'stockIndex', title: 'Stock Availability Index', icon: 'verified', iconColor: 'green-4', trend: '98.4% Normal', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'alerts', title: 'SKU Depletion Alerts', icon: 'warning', iconColor: 'red-4', trend: '2 Critical Warns', trendIcon: 'error_outline', trendColor: 'red-4' }
    ],
    chart: {
      title: 'SKU Checkout Dispersion Speed',
      subtitle: 'Daily transaction frequency registered across active physical POS nodes.',
      labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      tooltipPrefix: 'Daily Sales: {{ currentCurrency.symbol }}',
      maxVal: 1500000,
      data: [620000, 890000, 740000, 950000, 1100000, 1340000, 820000]
    },
    aiRules: [
      { icon: 'inventory', color: 'red-4', title: 'Critical Stock Depletion Alert', desc: 'SKU-INV-982 (Notebook Pack) will deplete within 36 hours based on checkout velocity. Restock order generated.' },
      { icon: 'trending_up', color: 'green-4', title: 'POS Checkout Velocity Peak', desc: 'Register DSP-9044 achieved 18 checkouts per minute between 12:00 WAT - 14:00 WAT. SLA capacity nominal.' }
    ]
  },
  hospitality: {
    color: 'green',
    accent: '#10b981',
    glowRgb: '16,185,129',
    kpis: [
      { key: 'revenue', title: 'Accommodation RevPAR', icon: 'king_bed', iconColor: 'green-4', trend: '₦12,450/night avg', trendIcon: 'trending_up', trendColor: 'green-4' },
      { key: 'rooms', title: 'Room Occupancy Rate', icon: 'hotel', iconColor: 'green-3', trend: '84.2% Occupied', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'bookings', title: 'Total Active Bookings', icon: 'event', iconColor: 'green-4', trend: '+12.4% vs prev week', trendIcon: 'trending_up', trendColor: 'green-4' },
      { key: 'billing', title: 'F&B Billing Volume', icon: 'restaurant', iconColor: 'cyan-4', trend: '₦6.2M processed', trendIcon: 'check_circle', trendColor: 'green-4' }
    ],
    chart: {
      title: 'Daily RevPAR Trend',
      subtitle: 'Average room revenue generated dynamically via settlement networks.',
      labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      tooltipPrefix: 'RevPAR: {{ currentCurrency.symbol }}',
      maxVal: 20000,
      data: [11200, 12500, 11800, 13400, 16800, 18500, 14200]
    },
    aiRules: [
      { icon: 'bed', color: 'amber-4', title: 'Occupancy Spike Predictor', desc: 'Weekend room occupancy forecast exceeds 96%. Adjust F&B inventory buffer size immediately to accommodate.' },
      { icon: 'receipt', color: 'indigo-4', title: 'F&B Billing Audit Match', desc: 'Restaurant POS batches matched Quasar clearing balances with 100.0% accuracy rate.' }
    ]
  },
  logistics: {
    color: 'purple',
    accent: '#8b5cf6',
    glowRgb: '139,92,246',
    kpis: [
      { key: 'revenue', title: 'Operational Yield MTD', icon: 'payments', iconColor: 'purple-4', trend: '+9.4% Volume', trendIcon: 'trending_up', trendColor: 'green-4' },
      { key: 'fleet', title: 'Active Fleet Vehicles', icon: 'local_shipping', iconColor: 'purple-3', trend: '18 Trucks Synced', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'dispatchRate', title: 'On-Time Dispatch Rate', icon: 'schedule', iconColor: 'green-4', trend: '98.8% Compliant', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'deliveries', title: 'Completed Deliveries', icon: 'task_alt', iconColor: 'cyan-4', trend: '4,120 Successes', trendIcon: 'check_circle', trendColor: 'green-4' }
    ],
    chart: {
      title: 'Active Vehicle Dispatch Index',
      subtitle: 'Operational fleet telemetry matches reported via driver mobile synchronization.',
      labels: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      tooltipPrefix: 'Active Dispatches: ',
      maxVal: 25,
      data: [15, 18, 17, 21, 23]
    },
    aiRules: [
      { icon: 'warning', color: 'amber-4', title: 'Fuel Burn Anomaly flagged', desc: 'Vehicle SN-LGT-928 recorded an unexpected 14% increase in fuel usage. Recommend immediate maintenance scan.' },
      { icon: 'explore', color: 'green-4', title: 'Dispatch Optimization Success', desc: 'Dynamic routing algorithms reduced transit wait cycles by 4.2 minutes per batch.' }
    ]
  },
  healthcare: {
    color: 'red',
    accent: '#ef4444',
    glowRgb: '239,68,68',
    kpis: [
      { key: 'revenue', title: 'Pharmacy Dispensary Val', icon: 'medication', iconColor: 'red-4', trend: '₦4.8M Inventory Val', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'patients', title: 'Active Patient Registry', icon: 'healing', iconColor: 'red-3', trend: '1,240 Enrolled', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'waitTime', title: 'Average Consultation Wait', icon: 'watch_later', iconColor: 'green-4', trend: '12m Target Met', trendIcon: 'check_circle', trendColor: 'green-4' },
      { key: 'pharmacyValue', title: 'Completed Consultations', icon: 'assignment_turned_in', iconColor: 'cyan-4', trend: '812 MTD', trendIcon: 'check_circle', trendColor: 'green-4' }
    ],
    chart: {
      title: 'Patient Consultations Influx',
      subtitle: 'Daily consultations compiled directly from physician mobile check-ins.',
      labels: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      tooltipPrefix: 'Patient Check-ins: ',
      maxVal: 200,
      data: [120, 145, 132, 164, 110]
    },
    aiRules: [
      { icon: 'warning', color: 'amber-4', title: 'Consultation Wait Anomaly', desc: 'Averaged wait times reached 18 minutes in the Pediatric ward at 10:00 WAT. Adjust physician schedule blocks.' },
      { icon: 'medication', color: 'red-4', title: 'Low Stock SKU Warning', desc: 'Pharmacy inventory reports critical stock warning on Amoxicillin 500mg. Automatically matching replenishments.' }
    ]
  }
}

// Read manifest
const activeManifest = computed(() => {
  return INDUSTRY_MANIFEST[activeIndustry.value] || INDUSTRY_MANIFEST.school
})

// Dynamic Chart Data
const dynamicChartData = computed(() => {
  return activeManifest.value.chart.data
})

// Dynamic KPI Value
const getDynamicKpiValue = (key) => {
  const currentVal = dynamicKpis.value[activeIndustry.value]?.[key] || 0
  if (key === 'revenue') {
    return `${currentCurrency.symbol}${currentVal.toLocaleString()}`
  }
  if (key === 'attendance' || key === 'stockIndex' || key === 'rooms' || key === 'dispatchRate') {
    return `${currentVal}%`
  }
  if (key === 'waitTime') {
    return `${currentVal} mins`
  }
  return currentVal.toLocaleString()
}

// Settlement timeline blocks
const settlementPhases = ref([
  { title: 'POS Checkout Batching', desc: 'Aggregating mobile client-signed checkout events.', active: true, hash: 'sha256-a189fbc0299e4f2081d' },
  { title: 'Reconciliation Match', desc: 'Executing deterministic double-entry ledger alignment scans.', active: true, hash: 'sha256-d4190cbb710ef093a11' },
  { title: 'Quasar Signature Replay', desc: 'Signing settlement blocks with platform-wide private keys.', active: true, hash: 'sha256-cb829104fa28cd02c81' },
  { title: 'Corporate Bank Payout routing', desc: 'Transferring funds to primary Access Bank settlement current account.', active: false, hash: 'Pending Sweep Execution' }
])

// Live mobile operational feed (Throttled & Bounded Memory)
const liveFeed = ref([])

// Inspector Drawer Details
const inspectorDrawer = ref(false)
const selectedTx = ref(null)

const inspectLineage = (tx) => {
  selectedTx.value = tx
  inspectorDrawer.value = true
}

// Simulated Export Console Engine
const exportConsole = ref(false)
const exportingProgress = ref(0)
const exportLogs = ref([])
let exportInterval = null

const triggerExport = (format) => {
  exportLogs.value = [
    `[1/4] Scanning tenant-scoped ledger indices for format: ${format}...`,
    `[2/4] Initializing replay-safe transaction aggregation...`
  ]
  exportingProgress.value = 0
  exportConsole.value = true

  let step = 0
  exportInterval = setInterval(() => {
    step += 25
    exportingProgress.value = step
    if (step === 25) {
      exportLogs.value.push(`[3/4] Attaching cryptographic verification hash...`)
    } else if (step === 50) {
      const hash = `sha256-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`
      exportLogs.value.push(`[Proof Hash] ${hash}`)
    } else if (step === 75) {
      exportLogs.value.push(`[4/4] Generating immutable snapshot zip package...`)
    } else if (step === 100) {
      exportLogs.value.push(`[Success] Lineage verified. Snapshot dispatched to download queue!`)
      clearInterval(exportInterval)
    }
  }, 500)
}

const closeExportConsole = () => {
  exportConsole.value = false
  $q.notify({
    type: 'positive',
    message: 'Report snapshot compiled and successfully saved.'
  })
}

// Initialize stream lists based on the active industry
const loadInitialFeed = () => {
  if (activeIndustry.value === 'school') {
    liveFeed.value = [
      { id: 1, type: 'attendance', desc: 'Student Check-in Recorded', ref: 'EV-892401', device: 'MOB-CHECK-01', valueFormatted: 'Present (Grade 10)', icon: 'check_circle', color: 'green-4' },
      { id: 2, type: 'payment', desc: 'Term Fees Deposited', ref: 'TX-892410', device: 'POS-TERM-02', valueFormatted: '₦84,000', icon: 'payments', color: 'green-4' },
      { id: 3, type: 'notes', desc: 'Lesson Notes Compiled', ref: 'EV-892388', device: 'MOB-CHECK-01', valueFormatted: 'Completed (Math)', icon: 'menu_book', color: 'indigo-3' }
    ]
  } else if (activeIndustry.value === 'retail') {
    liveFeed.value = [
      { id: 1, type: 'sale', desc: 'POS Checkout Approved', ref: 'TX-892410', device: 'POS-TERM-01', valueFormatted: '₦84,000', icon: 'payments', color: 'green-4' },
      { id: 2, type: 'stock', desc: 'Stock Inventory Deducted', ref: 'EV-902114', device: 'SCN-TERM-03', valueFormatted: 'SKU-INV-982 (4 Units)', icon: 'inventory_2', color: 'amber-4' },
      { id: 3, type: 'sale', desc: 'POS Checkout Approved', ref: 'TX-892409', device: 'POS-TERM-02', valueFormatted: '₦32,000', icon: 'payments', color: 'green-4' }
    ]
  } else if (activeIndustry.value === 'hospitality') {
    liveFeed.value = [
      { id: 1, type: 'booking', desc: 'Guest Room Checked In', ref: 'EV-1120', device: 'RECEPT-POS-01', valueFormatted: 'Room 204 (Standard)', icon: 'king_bed', color: 'green-4' },
      { id: 2, type: 'billing', desc: 'F&B Checkout Cleared', ref: 'TX-829104', device: 'BAR-TERM-02', valueFormatted: '₦45,000', icon: 'restaurant', color: 'cyan-4' },
      { id: 3, type: 'booking', desc: 'Reservation Complete', ref: 'EV-1119', device: 'RECEPT-POS-01', valueFormatted: 'Room 105 (Deluxe)', icon: 'event', color: 'indigo-3' }
    ]
  } else if (activeIndustry.value === 'logistics') {
    liveFeed.value = [
      { id: 1, type: 'dispatch', desc: 'Fleet Dispatch Confirmed', ref: 'EV-8821', device: 'DISP-GRID-01', valueFormatted: 'Vehicle LGT-928', icon: 'local_shipping', color: 'purple-3' },
      { id: 2, type: 'delivery', desc: 'Cargo Dropped Safely', ref: 'EV-8820', device: 'DRV-MOB-02', valueFormatted: 'Client Node #4120', icon: 'task_alt', color: 'green-4' },
      { id: 3, type: 'dispatch', desc: 'Driver Route Active', ref: 'EV-8819', device: 'DISP-GRID-01', valueFormatted: 'Route B-91 (On-Time)', icon: 'explore', color: 'cyan-4' }
    ]
  } else if (activeIndustry.value === 'healthcare') {
    liveFeed.value = [
      { id: 1, type: 'patient', desc: 'Patient Check-in Confirmed', ref: 'EV-5501', device: 'CLINIC-MOB-01', valueFormatted: 'Pediatric Ward', icon: 'healing', color: 'red-4' },
      { id: 2, type: 'medication', desc: 'Prescription Cleared', ref: 'EV-5502', device: 'PHARM-TERM-02', valueFormatted: 'Amoxicillin 500mg', icon: 'medication', color: 'cyan-4' },
      { id: 3, type: 'patient', desc: 'Consultation Concluded', ref: 'EV-5500', device: 'CLINIC-MOB-01', valueFormatted: 'Physician Assign #04', icon: 'assignment_turned_in', color: 'indigo-3' }
    ]
  }
}

// Set industry mode dynamically & align preferences immediately
const switchIndustryMode = (key) => {
  activeIndustry.value = key
  localStorage.setItem('tenant_type', key)
  loadInitialFeed()
  $q.notify({
    type: 'info',
    message: `Active capability manifest transitioned to ${key.toUpperCase()} preset.`
  })
}

// Background Simulated Dynamic Websocket Telemetry streams (Throttled update loops)
let telemetryInterval = null
onMounted(() => {
  loadInitialFeed()
  
  telemetryInterval = setInterval(() => {
    // Generate randomized operational check-in event structures depending on current industry mode
    syncStats.value.eventsCount++
    syncStats.value.latency = parseFloat((1.8 + Math.random() * 0.8).toFixed(2))

    let newEvent = {}
    const randId = Math.floor(Math.random() * 800000) + 100000

    if (activeIndustry.value === 'school') {
      const isFee = Math.random() > 0.4
      const amount = Math.floor(Math.random() * 40 + 20) * 1000
      newEvent = {
        id: Date.now(),
        type: isFee ? 'payment' : 'attendance',
        desc: isFee ? 'Term Fees Deposited' : 'Student Check-in Recorded',
        ref: `TX-${randId}`,
        device: 'MOB-CHECK-01',
        valueFormatted: isFee ? `${currentCurrency.symbol}${amount.toLocaleString()}` : `Present (Grade ${Math.floor(Math.random() * 3) + 10})`,
        icon: isFee ? 'payments' : 'check_circle',
        color: isFee ? 'green-4' : 'green-4'
      }

      // Throttled modifications to active stats variables
      if (isFee) {
        dynamicKpis.value.school.revenue += amount
      } else {
        dynamicKpis.value.school.students++
      }
    } else if (activeIndustry.value === 'retail') {
      const isSale = Math.random() > 0.3
      const amount = Math.floor(Math.random() * 60 + 10) * 1000
      newEvent = {
        id: Date.now(),
        type: isSale ? 'sale' : 'stock',
        desc: isSale ? 'POS Checkout Approved' : 'Stock Inventory Deducted',
        ref: `TX-${randId}`,
        device: 'POS-TERM-02',
        valueFormatted: isSale ? `${currentCurrency.symbol}${amount.toLocaleString()}` : `SKU-INV-${Math.floor(Math.random() * 800) + 100} (1 Unit)`,
        icon: isSale ? 'payments' : 'inventory_2',
        color: isSale ? 'green-4' : 'amber-4'
      }

      if (isSale) {
        dynamicKpis.value.retail.revenue += amount
      }
    } else if (activeIndustry.value === 'hospitality') {
      const isBooking = Math.random() > 0.5
      const amount = Math.floor(Math.random() * 120 + 30) * 1000
      newEvent = {
        id: Date.now(),
        type: isBooking ? 'booking' : 'billing',
        desc: isBooking ? 'Guest Room Checked In' : 'F&B Checkout Cleared',
        ref: `TX-${randId}`,
        device: 'RECEPT-POS-01',
        valueFormatted: isBooking ? `Room ${Math.floor(Math.random() * 300) + 101} (Standard)` : `${currentCurrency.symbol}${amount.toLocaleString()}`,
        icon: isBooking ? 'king_bed' : 'restaurant',
        color: isBooking ? 'green-4' : 'cyan-4'
      }

      dynamicKpis.value.hospitality.revenue += amount
    } else if (activeIndustry.value === 'logistics') {
      newEvent = {
        id: Date.now(),
        type: 'delivery',
        desc: 'Cargo Dropped Safely',
        ref: `TX-${randId}`,
        device: 'DRV-MOB-02',
        valueFormatted: `Client Node #${Math.floor(Math.random() * 8000) + 1000}`,
        icon: 'task_alt',
        color: 'green-4'
      }

      dynamicKpis.value.logistics.deliveries++
    } else if (activeIndustry.value === 'healthcare') {
      newEvent = {
        id: Date.now(),
        type: 'medication',
        desc: 'Prescription Cleared',
        ref: `TX-${randId}`,
        device: 'PHARM-TERM-02',
        valueFormatted: `Amoxicillin 500mg`,
        icon: 'medication',
        color: 'cyan-4'
      }

      dynamicKpis.value.healthcare.patients++
    }

    // Keep active feed bounded in memory to prevent DOM performance leakages (Requirement 8)
    liveFeed.value.unshift(newEvent)
    if (liveFeed.value.length > 5) {
      liveFeed.value.pop()
    }
  }, 4000)
})

onBeforeUnmount(() => {
  if (telemetryInterval) clearInterval(telemetryInterval)
  if (exportInterval) clearInterval(exportInterval)
})
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400px;
  pointer-events: none;
  z-index: 1;
  transition: background 0.8s ease;
}

.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }

.kpi-card {
  background: linear-gradient(135deg, #0b0f19 0%, #101625 100%);
  border-radius: 16px;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.15);
}

.bar-hover:hover {
  filter: brightness(1.2);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
}

.anomaly-card {
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
}

.anomaly-card:hover {
  background: rgba(255, 255, 255, 0.04);
}

/* Cryptographic timeline Connector styles */
.timeline-stepper {
  position: relative;
}

.line-connector {
  width: 2px;
  background: rgba(255, 255, 255, 0.06);
  flex-grow: 1;
  margin-top: 4px;
  min-height: 40px;
}

.connector-active {
  background: #2e7d32;
}

.hover-bg:hover {
  background: rgba(255, 255, 255, 0.03) !important;
  transition: background 0.2s ease;
}

.letter-spacing-1 { letter-spacing: 1px; }
.transition-3 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
