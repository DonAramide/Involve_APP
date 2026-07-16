<!-- invify-admin/src/pages/admin/PlatformOverviewPage.vue -->
<template>
  <q-page class="q-pa-lg text-white command-center-page" style="background: #071220; min-height: 100vh;">
    
    <!-- SECTION 1: EXECUTIVE HEADER -->
    <div class="row items-center justify-between q-mb-lg header-panel border-main q-pa-md rounded-borders">
      <div class="column">
        <div class="text-caption text-grey-5 font-mono">
          Welcome back, <span class="text-cyan-4 text-weight-bold">Super Admin</span> 👋
        </div>
        <h1 class="text-h4 text-weight-bolder text-white q-ma-none font-sans" style="letter-spacing: -0.5px;">
          Platform Overview
        </h1>
        <div class="text-caption text-grey-5 q-mt-xs">
          Real-time health, usage, and governance insights across the Invify ecosystem.
        </div>
      </div>
      
      <div class="row items-center q-gutter-md">
        <!-- Environment Badges -->
        <div class="column items-end font-mono text-right hide-on-mobile">
          <div class="text-caption">
            Env: <q-badge color="green-9" text-color="green-2" label="PRODUCTION" class="text-weight-bold" />
          </div>
          <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 11px;">
            Version: <span class="text-cyan-3">v1.0.0</span> | Sync: <span class="text-cyan-3">{{ syncTimer }}s ago</span>
          </div>
        </div>

        <!-- Controls -->
        <q-select 
          v-model="timeRange" 
          :options="['Last 1 Hour', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days']" 
          dense dark outlined 
          class="bg-dark-panel font-mono" 
          style="width: 160px;" 
        />
        
        <q-btn 
          color="indigo-7" 
          icon="refresh" 
          label="Refresh" 
          unelevated 
          class="q-px-md font-mono" 
          @click="refreshDashboard" 
          :loading="refreshing"
        />
      </div>
    </div>

    <!-- SECTION 2: PLATFORM KPI STRIP -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="(kpi, i) in kpis" :key="i" class="col-12 col-sm-6 col-md-2">
        <q-card class="bg-panel border-main kpi-card hover-lift position-relative overflow-hidden q-pa-sm">
          <!-- Sparkline background decoration -->
          <div class="sparkline-container absolute-bottom-left full-width">
            <svg class="sparkline-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path :d="kpi.sparkline" fill="none" :stroke="kpi.color" stroke-width="1.5" />
            </svg>
          </div>
          
          <q-card-section class="q-pa-sm">
            <div class="row justify-between items-center q-mb-xs">
              <q-icon :name="kpi.icon" :color="kpi.colorName" size="sm" class="opacity-70" />
              <q-badge :color="kpi.statusBg" :text-color="kpi.statusColor" size="xs" class="text-weight-bold font-mono">
                {{ kpi.status }}
              </q-badge>
            </div>
            
            <div class="text-overline text-grey-5 font-mono" style="font-size: 9px; line-height: 1;">{{ kpi.label }}</div>
            <div class="text-h5 text-weight-bold text-white q-mt-xs font-mono">{{ kpi.value }}</div>
            
            <div class="row items-center q-mt-sm font-mono" style="font-size: 10px;">
              <q-icon :name="kpi.trendUp ? 'trending_up' : 'trending_down'" :color="kpi.trendColor" class="q-mr-xs" />
              <span :class="'text-' + kpi.trendColor" class="text-weight-bold">{{ kpi.comparison }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- MAIN MIDDLE GRID: Health Breakdown, Tenant Activity Map, Recent Alerts -->
    <div class="row q-col-gutter-lg q-mb-lg">
      
      <!-- SECTION 3: PLATFORM HEALTH RADAR -->
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">Platform Health Breakdown</div>
              <div class="text-caption text-grey-5">System status by operational categories</div>
            </div>
            <q-badge color="cyan-10" text-color="cyan-3" class="font-mono text-weight-bold">RADAR</q-badge>
          </div>
          <div class="col flex flex-center">
            <template v-if="radarChartSeries && radarChartSeries.length > 0">
              <VueApexCharts 
                type="radar" 
                height="300" 
                :options="radarChartOptions" 
                :series="radarChartSeries" 
                class="full-width"
              />
            </template>
            <template v-else>
              <div class="text-center q-pa-md border-main rounded-borders border-dashed" style="background: rgba(255,255,255,0.02)">
                <q-icon name="sensors_off" size="xl" color="grey-7" class="q-mb-sm" />
                <div class="text-grey-5 font-mono text-caption">Telemetry Unavailable</div>
                <div class="text-grey-7" style="font-size: 10px;">Prometheus provider not configured</div>
              </div>
            </template>
          </div>
        </q-card>
      </div>

      <!-- SECTION 4: GLOBAL TENANT INTELLIGENCE MAP -->
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-xs">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">Tenant Activity Map</div>
              <div class="text-caption text-grey-5">Live global tenant distribution and status</div>
            </div>
            <q-badge color="purple-10" text-color="purple-3" class="font-mono text-weight-bold">MAP</q-badge>
          </div>
          
          <div class="col position-relative flex flex-center map-bg q-py-lg">
            <!-- Custom Stylized SVG World Map Wireframe -->
            <svg class="world-map-svg" viewBox="0 0 1000 500" fill="none" stroke="#16324A" stroke-width="1" opacity="0.6">
              <!-- Grid lines for cyber design -->
              <line x1="0" y1="100" x2="1000" y2="100" stroke="#16324A" stroke-dasharray="2 4" />
              <line x1="0" y1="200" x2="1000" y2="200" stroke="#16324A" stroke-dasharray="2 4" />
              <line x1="0" y1="300" x2="1000" y2="300" stroke="#16324A" stroke-dasharray="2 4" />
              <line x1="0" y1="400" x2="1000" y2="400" stroke="#16324A" stroke-dasharray="2 4" />
              
              <!-- Continents (Simplified bounding structures) -->
              <!-- North America -->
              <path d="M100 120 L250 120 L280 200 L200 300 L160 300 L140 250 L100 200 Z" fill="#0D1B2A" stroke="#16324A" />
              <!-- South America -->
              <path d="M200 300 L250 320 L280 380 L230 460 L210 460 L180 350 Z" fill="#0D1B2A" stroke="#16324A" />
              <!-- Eurasia / Africa -->
              <path d="M450 100 L850 100 L900 180 L800 300 L650 320 L600 280 L520 220 L450 180 Z" fill="#0D1B2A" stroke="#16324A" />
              <path d="M450 200 L540 200 L580 280 L540 380 L480 380 L440 280 Z" fill="#0D1B2A" stroke="#16324A" />
              <!-- Australia -->
              <path d="M780 340 L850 340 L880 390 L820 400 Z" fill="#0D1B2A" stroke="#16324A" />
            </svg>

            <!-- Pulsing Hologram Nodes -->
            <div 
              v-for="(node, idx) in mapNodes" 
              :key="idx" 
              class="map-node absolute" 
              :style="{ left: node.x + '%', top: node.y + '%' }"
            >
              <div class="ping" :style="{ borderColor: node.color }"></div>
              <div class="dot" :style="{ background: node.color, boxShadow: '0 0 10px ' + node.color }"></div>
              
              <q-tooltip class="bg-dark text-caption font-mono border-main q-pa-sm" style="opacity: 0.95;">
                <div class="text-weight-bold">{{ node.tenant }}</div>
                <div>Location: {{ node.location }}</div>
                <div>Status: <span :style="{ color: node.color }">{{ node.status.toUpperCase() }}</span></div>
                <div>Activity: {{ node.activity }} TX/s</div>
              </q-tooltip>
            </div>
          </div>

          <!-- Map Legend -->
          <div class="row justify-around q-pt-sm border-top font-mono" style="font-size: 10px;">
            <div class="row items-center"><span class="legend-dot bg-green-5 q-mr-xs"></span> High Activity</div>
            <div class="row items-center"><span class="legend-dot bg-amber-5 q-mr-xs"></span> Medium Activity</div>
            <div class="row items-center"><span class="legend-dot bg-blue-5 q-mr-xs"></span> Low Activity</div>
            <div class="row items-center"><span class="legend-dot bg-red-5 q-mr-xs"></span> Offline / Risk</div>
          </div>
        </q-card>
      </div>

      <!-- SECTION 6: RECENT SYSTEM ALERTS FEED -->
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">Recent System Alerts</div>
              <div class="text-caption text-grey-5">Live platform operations anomalies feed</div>
            </div>
            <q-btn flat dense color="cyan-3" label="View All" size="sm" to="/observability/audit" />
          </div>

          <!-- Alert feed with scroll wrapper -->
          <q-scroll-area class="col" style="height: 300px;">
            <q-list dark separator class="font-mono text-caption q-pr-sm">
              <q-item v-for="(alert, idx) in alerts" :key="idx" class="q-py-sm q-px-none">
                <q-item-section avatar class="min-width-auto q-pr-sm">
                  <q-icon :name="alert.icon" :color="alert.color" size="sm" />
                </q-item-section>
                
                <q-item-section>
                  <q-item-label class="text-white text-weight-bold" style="font-size: 11px;">
                    {{ alert.description }}
                  </q-item-label>
                  <q-item-label caption class="text-grey-5" style="font-size: 10px;">
                    Affected: <span class="text-cyan-4">{{ alert.entity }}</span> | {{ alert.time }}
                  </q-item-label>
                </q-item-section>
                
                <q-item-section side>
                  <q-badge :color="alert.badgeColor" text-color="white" size="xs" class="text-weight-bold font-mono">
                    {{ alert.severity }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-card>
      </div>

    </div>

    <!-- LOWER DEEP INTELLIGENCE GRID: Telemetry, Active Modules, Governance Checklist -->
    <div class="row q-col-gutter-lg q-mb-lg">
      
      <!-- SECTION 7: INFRASTRUCTURE MONITORING -->
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">System Resource Utilization</div>
              <div class="text-caption text-grey-5">Real-time CPU, Memory, Disk, and Network telemetry</div>
            </div>
            <q-badge color="cyan-10" text-color="cyan-3" class="font-mono text-weight-bold">HARDWARE</q-badge>
          </div>

          <!-- Circular Gauges Row -->
          <template v-if="hardwareResources && Object.keys(hardwareResources).length > 0">
            <div class="row q-col-gutter-sm justify-around q-mb-md text-center font-mono">
              <div v-for="(res, key) in hardwareResources" :key="key" class="col-3 column items-center">
                <q-circular-progress
                  show-value
                  class="text-white text-caption text-weight-bold font-mono"
                  :value="res.value"
                  size="60px"
                  :thickness="0.18"
                  :color="res.color"
                  track-color="blue-grey-10"
                >
                  {{ res.value }}%
                </q-circular-progress>
                <div class="text-caption text-grey-5 q-mt-xs" style="font-size: 10px;">{{ res.label }}</div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="text-center q-pa-lg border-main rounded-borders border-dashed q-mb-md" style="background: rgba(255,255,255,0.02)">
              <q-icon name="memory" size="lg" color="grey-7" class="q-mb-sm" />
              <div class="text-grey-5 font-mono text-caption">Node Exporter Metrics Unavailable</div>
            </div>
          </template>

          <!-- Hardware Load History Area Chart -->
          <div class="col">
            <template v-if="infraChartSeries && infraChartSeries.length > 0">
              <VueApexCharts 
                type="area" 
                height="160" 
                :options="infraChartOptions" 
                :series="infraChartSeries" 
              />
            </template>
          </div>
        </q-card>
      </div>

      <!-- SECTION 8: TOP ACTIVE MODULES -->
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">Top Active Modules</div>
              <div class="text-caption text-grey-5">Usage load across key application microservices</div>
            </div>
            <q-badge color="teal-10" text-color="teal-3" class="font-mono text-weight-bold">SERVICES</q-badge>
          </div>

          <div class="col column justify-around font-mono text-caption">
            <div v-for="(mod, index) in activeModules" :key="index" class="q-mb-xs">
              <div class="row justify-between items-center q-mb-2">
                <div class="row items-center">
                  <q-icon :name="mod.icon" color="cyan-4" size="14px" class="q-mr-xs" />
                  <span>{{ mod.name }}</span>
                </div>
                <span class="text-weight-bold text-cyan-3">{{ mod.usage }}%</span>
              </div>
              <q-linear-progress 
                :value="mod.usage / 100" 
                color="cyan-4" 
                track-color="blue-grey-10" 
                size="4px" 
                class="rounded-borders"
              />
            </div>
          </div>
        </q-card>
      </div>

      <!-- SECTION 5: SECURITY & GOVERNANCE CENTER -->
      <div class="col-12 col-md-4">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">Governance & Compliance</div>
              <div class="text-caption text-grey-5">Real-time governance matrix status indicators</div>
            </div>
            <q-badge color="amber-10" text-color="amber-3" class="font-mono text-weight-bold">COMPLIANCE</q-badge>
          </div>

          <div class="col grid-governance">
            <q-card 
              v-for="(gov, idx) in governanceCards" 
              :key="idx" 
              clickable 
              v-ripple
              class="bg-subpanel border-main gov-item-card cursor-pointer hover-lift column justify-between q-pa-sm"
              @click="navigateRoute(gov.route)"
            >
              <div class="row justify-between items-center">
                <q-icon :name="gov.icon" :color="gov.color" size="xs" />
                <q-badge :color="gov.badgeBg" :text-color="gov.color" size="xs" class="font-mono text-weight-bold">
                  {{ gov.comparison }}
                </q-badge>
              </div>
              
              <div class="q-mt-xs">
                <div class="text-h6 text-weight-bold font-mono text-white" style="line-height: 1;">{{ gov.value }}</div>
                <div class="text-caption text-grey-5 font-sans q-mt-xs" style="font-size: 10px; line-height: 1.1;">{{ gov.label }}</div>
              </div>
            </q-card>
          </div>
        </q-card>
      </div>

    </div>

    <!-- TENANTS INTEL & AI INSIGHTS ROW -->
    <div class="row q-col-gutter-lg q-mb-lg">
      
      <!-- SECTION 9: TENANT INTELLIGENCE CENTER -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">Tenant Intelligence Center</div>
              <div class="text-caption text-grey-5">Tenant performance matrix, volume and safety stats</div>
            </div>
            <q-btn flat dense color="cyan-3" label="Manage All" size="sm" to="/admin/tenants" />
          </div>

          <q-table
            :rows="tenantMatrix"
            :columns="tenantMatrixColumns"
            row-key="name"
            flat
            dark
            dense
            class="bg-transparent border-none font-mono text-caption col"
            :pagination="{ rowsPerPage: 5 }"
            hide-bottom
          >
            <template v-slot:body-cell-score="props">
              <q-td :props="props">
                <q-chip 
                  :color="props.value >= 90 ? 'green-10' : (props.value >= 80 ? 'amber-10' : 'red-10')" 
                  text-color="white" 
                  size="xs" 
                  class="text-weight-bold"
                >
                  {{ props.value }}%
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.row.risk === 'Low' ? 'green-9' : (props.row.risk === 'Medium' ? 'amber-9' : 'red-9')" text-color="white">
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- SECTION 11: AI RECOMMENDATIONS CENTER -->
      <div class="col-12 col-md-6">
        <q-card class="bg-panel border-main fit column q-pa-md">
          <div class="row justify-between items-center q-mb-md">
            <div>
              <div class="text-subtitle2 text-weight-bold font-sans">AI Recommendations Center</div>
              <div class="text-caption text-grey-5">Predictive optimization and threat modeling advice</div>
            </div>
            <q-icon name="psychology" color="purple-4" size="md" />
          </div>

          <div class="col column justify-around font-mono text-caption">
            <q-card 
              v-for="(rec, index) in aiRecommendations" 
              :key="index" 
              class="bg-subpanel border-main q-pa-md hover-lift q-mb-xs"
            >
              <div class="row justify-between items-center q-mb-xs">
                <div class="row items-center">
                  <q-icon name="auto_awesome" color="purple-4" size="xs" class="q-mr-xs animate-pulse" />
                  <span class="text-white text-weight-bold">{{ rec.title }}</span>
                </div>
                <div class="row q-gutter-xs">
                  <q-badge color="purple-10" text-color="purple-3" size="xs">Conf: {{ rec.confidence || 95 }}%</q-badge>
                  <q-badge :color="rec.priorityColor || 'purple-5'" text-color="white" size="xs">{{ (rec.priority || 'HIGH').toUpperCase() }}</q-badge>
                </div>
              </div>
              
              <div class="text-grey-5 q-mb-sm" style="font-size: 11px;">
                Recommended: <span class="text-cyan-3">{{ rec.action || rec.description }}</span>
              </div>
              
              <div class="row justify-between items-center">
                <span class="text-grey-6" style="font-size: 10px;">Impact rating: {{ rec.impact }}</span>
                <q-btn 
                  color="purple-8" 
                  label="Execute Action" 
                  size="xs" 
                  unelevated 
                  dense 
                  class="q-px-sm" 
                  @click="executeRecommendation(rec)"
                />
              </div>
            </q-card>
          </div>
        </q-card>
      </div>

    </div>

    <!-- SECTION 10: QUICK ACTIONS ROW -->
    <q-card class="bg-panel border-main q-pa-md q-mb-sm">
      <div class="text-subtitle2 text-weight-bold font-sans q-mb-md">Quick Operations Controls</div>
      
      <div class="row q-col-gutter-md">
        <div v-for="(act, idx) in quickActions" :key="idx" class="col-6 col-sm-3 col-md-1-5">
          <q-btn 
            outline 
            color="cyan-3" 
            :icon="act.icon" 
            :label="act.label" 
            class="full-width font-mono text-caption hover-glow-btn text-weight-bold" 
            align="left"
            dense
            padding="sm"
            @click="navigateRoute(act.route)"
          />
        </div>
      </div>
    </q-card>

  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'
import { DashboardProviderFactory } from '../../services/dashboard/DashboardProviderFactory'
import type { 
  KpiData, RadarChartData, MapNode, AlertData, GovernanceCard, Recommendation,
  HardwareResource, InfraChartSeries, ActiveModule, TenantMatrixRow
} from '../../services/dashboard/DashboardDataProvider'

import { useFinanceStore } from '../../stores/finance.store'
import { useInventoryStore } from '../../stores/inventory.store'
// Removed missing store import
import { useRuntimeStore } from '../../stores/runtime.store'

const router = useRouter()
const $q = useQuasar()

// Stores
const financeStore = useFinanceStore()
const inventoryStore = useInventoryStore()
// const operationsStore = useOperationsStore()
const runtimeStore = useRuntimeStore()

// State controls
const timeRange = ref('Last 24 Hours')
const syncTimer = ref(0)
const refreshing = ref(false)
const pageLoading = ref(true)
const pageError = ref(false)
const errorMessage = ref('')

// Dashboard Data Refs
const kpis = ref<KpiData[]>([])
const radarChartOptions = ref<any>(null)
const radarChartSeries = ref<any[]>([])
const mapNodes = ref<MapNode[]>([])
const alerts = ref<AlertData[]>([])
const governanceCards = ref<GovernanceCard[]>([])
const aiRecommendations = ref<Recommendation[]>([])
const hardwareResources = ref<Record<string, HardwareResource>>({})
const infraChartSeries = ref<InfraChartSeries[]>([])
const activeModules = ref<ActiveModule[]>([])
const tenantMatrix = ref<TenantMatrixRow[]>([])

// Quick Actions Configuration
const quickActions = ref([
  { label: 'Add New Tenant', icon: 'storefront', route: '/admin/tenants' },
  { label: 'Create Operator', icon: 'person_add', route: '/admin/users' },
  { label: 'Configure Policies', icon: 'policy', route: '/governance/policy' },
  { label: 'View Audit Logs', icon: 'receipt_long', route: '/observability/audit' },
  { label: 'Workflow Studio', icon: 'account_tree', route: '/automation/workflows' },
  { label: 'System Settings', icon: 'tune', route: '/admin/config' },
  { label: 'Security Center', icon: 'security', route: '/governance/quarantine' },
  { label: 'Billing & Licensing', icon: 'payments', route: '/admin/billing' }
])

const tenantMatrixColumns = [
  { name: 'name', label: 'TENANT NAME', align: 'left', field: 'name' },
  { name: 'revenue', label: 'REVENUE', align: 'left', field: 'revenue' },
  { name: 'score', label: 'HEALTH SCORE', align: 'center', field: 'score' },
  { name: 'risk', label: 'RISK LEVEL', align: 'center', field: 'risk' },
  { name: 'growth', label: 'GROWTH', align: 'right', field: 'growth' }
]

// Real-time hardware load timeline chart base options
const infraChartOptions = {
  chart: { toolbar: { show: false }, background: 'transparent', sparkline: { enabled: true } },
  colors: ['#00B8FF', '#8B5CF6', '#26A69A', '#FFC107'],
  stroke: { curve: 'smooth', width: 1.5 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.1, opacityTo: 0 } },
  tooltip: { theme: 'dark', x: { show: false } }
}

const navigateRoute = (path: string) => {
  if (path) router.push(path)
}

const executeRecommendation = (rec: Recommendation) => {
  $q.notify({
    type: 'positive',
    message: `Executing optimization plan: "${rec.title}" successfully.`,
    position: 'top-right',
    color: 'purple-9',
    icon: 'auto_awesome'
  })
}

// Data Provider Initialization
const initializeDashboard = async () => {
  pageLoading.value = true
  pageError.value = false
  refreshing.value = true
  
  try {
    const provider = DashboardProviderFactory.getInstance()
    
    // Fetch all dashboard data concurrently
    const [
      kpiData,
      healthData,
      tenantData,
      alertsData,
      govData,
      recData,
      hardwareData,
      infraData,
      modulesData,
      matrixData
    ] = await Promise.all([
      provider.getOverviewKPIs(),
      provider.getSystemHealth(),
      provider.getTenantIntelligence(),
      provider.getRecentAlerts(),
      provider.getGovernanceMetrics(),
      provider.getRecommendations(),
      provider.getHardwareResources(),
      provider.getInfraChartSeries(),
      provider.getActiveModules(),
      provider.getTenantMatrix()
    ])

    // Hydrate state
    kpis.value = kpiData
    if (healthData.status === 'UNAVAILABLE') {
      radarChartOptions.value = {}
      radarChartSeries.value = []
    } else {
      radarChartOptions.value = healthData.options
      radarChartSeries.value = healthData.series
    }
    mapNodes.value = tenantData
    alerts.value = alertsData
    governanceCards.value = govData
    aiRecommendations.value = recData
    hardwareResources.value = hardwareData.status === 'UNAVAILABLE' ? {} : hardwareData
    infraChartSeries.value = infraData.status === 'UNAVAILABLE' ? [] : infraData
    activeModules.value = modulesData
    tenantMatrix.value = matrixData
    
    syncTimer.value = 0
  } catch (err: any) {
    console.error('[Dashboard] Error fetching provider data:', err)
    pageError.value = true
    errorMessage.value = err.message || 'The specified dashboard provider is unavailable.'
    $q.notify({
      type: 'negative',
      message: 'Failed to load platform dashboard data',
      position: 'top-right'
    })
  } finally {
    pageLoading.value = false
    refreshing.value = false
  }
}

// Refresh wrapper
const refreshDashboard = () => {
  initializeDashboard()
}

onMounted(async () => {
  await initializeDashboard()
  
  // Hydrate stores (they manage their own subscriptions via the Realtime Kernel)
  await Promise.all([
    financeStore.hydrate(),
    inventoryStore.hydrate(),
    // operationsStore.hydrate(),
    runtimeStore.hydrate()
  ]);
  
  // The system_telemetry and agent_locations streams are now managed by
  // the EnterpriseRealtimeKernel and dispatched to the RuntimeStore.
  
  // No legacy `setInterval` or `socket.io` connections are managed here.
})

onUnmounted(() => {
  financeStore.unsubscribe()
  inventoryStore.unsubscribe()
  // operationsStore.unsubscribe()
  runtimeStore.unsubscribe()
})

</script>


<style scoped>
.command-center-page {
  font-family: 'Outfit', sans-serif;
  letter-spacing: -0.2px;
}

/* Glass & Neon panels style */
.bg-panel {
  background: #0d1b2a;
  border-radius: 8px;
}
.bg-subpanel {
  background: #091320;
  border-radius: 6px;
}
.border-main {
  border: 1px solid #16324a;
}
.border-critical {
  border: 1px solid #ff5252;
}

/* KPI Card layout configuration */
.kpi-card {
  min-height: 110px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.kpi-card:hover {
  border-color: #00b8ff;
}

/* Sparklines path design rendering background layout */
.sparkline-container {
  height: 30px;
  opacity: 0.15;
  pointer-events: none;
}
.sparkline-svg {
  width: 100%;
  height: 100%;
}

/* World map alignment styling */
.map-bg {
  min-height: 250px;
  background: radial-gradient(circle, #0d1b2a 0%, #071220 100%);
  border-radius: 6px;
}
.world-map-svg {
  width: 100%;
  height: 100%;
  max-height: 230px;
}

/* Hologram pinging layout element rules */
.map-node {
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
}
.map-node .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.map-node .ping {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 1px solid;
  border-radius: 50%;
  transform: translate(-8px, -8px);
  animation: map-ping-pulsing 1.8s infinite ease-out;
  opacity: 0;
}

@keyframes map-ping-pulsing {
  0% {
    transform: translate(-8px, -8px) scale(0.2);
    opacity: 0.8;
  }
  100% {
    transform: translate(-8px, -8px) scale(1.4);
    opacity: 0;
  }
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Governance matrix layout settings */
.grid-governance {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.gov-item-card {
  min-height: 90px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.gov-item-card:hover {
  border-color: #00b8ff;
}

/* Pulsing styling helper tags */
.animate-pulse {
  animation: pulsing-glow 1.5s infinite alternate;
}
@keyframes pulsing-glow {
  0% {
    opacity: 0.6;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.hide-on-mobile {
  @media (max-width: 600px) {
    display: none;
  }
}

/* Buttons glow effects styles */
.hover-glow-btn {
  background: transparent;
  transition: all 0.2s ease;
}
.hover-glow-btn:hover {
  background: rgba(0, 184, 255, 0.08);
  box-shadow: 0 0 12px rgba(0, 184, 255, 0.25);
  border-color: #00b8ff;
}
.hover-lift:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}
</style>
