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
            <VueApexCharts 
              type="radar" 
              height="300" 
              :options="radarChartOptions" 
              :series="radarChartSeries" 
              class="full-width"
            />
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
              <div class="dot" :style="{ background: node.color, boxShadow: '0 0 10px ' + node.color }">
                <q-tooltip class="bg-dark text-caption font-mono border-main q-pa-sm" style="opacity: 0.95;">
                  <div class="text-weight-bold">{{ node.tenant }}</div>
                  <div>Location: {{ node.location }}</div>
                  <div>Status: <span :style="{ color: node.color }">{{ node.status.toUpperCase() }}</span></div>
                  <div>Activity: {{ node.activity }} TX/s</div>
                </q-tooltip>
              </div>
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

          <!-- Hardware Load History Area Chart -->
          <div class="col">
            <VueApexCharts 
              type="area" 
              height="160" 
              :options="infraChartOptions" 
              :series="infraChartSeries" 
            />
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
                  <q-badge color="purple-10" text-color="purple-3" size="xs">Conf: {{ rec.confidence }}%</q-badge>
                  <q-badge :color="rec.priorityColor" text-color="white" size="xs">{{ rec.priority.toUpperCase() }}</q-badge>
                </div>
              </div>
              
              <div class="text-grey-5 q-mb-sm" style="font-size: 11px;">
                Recommended: <span class="text-cyan-3">{{ rec.action }}</span>
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

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

// State controls
const timeRange = ref('Last 24 Hours')
const syncTimer = ref(0)
const refreshing = ref(false)

// Increment timer
let syncInterval = null
onMounted(() => {
  syncInterval = setInterval(() => {
    syncTimer.value++
  }, 1000)
})
onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval)
})

const refreshDashboard = () => {
  refreshing.value = true
  setTimeout(() => {
    refreshing.value = false
    syncTimer.value = 0
    $q.notify({
      type: 'positive',
      message: 'Platform telemetry refreshed successfully.',
      position: 'top-right',
      color: 'green-9'
    })
  }, 800)
}

const navigateRoute = (path) => {
  if (path) router.push(path)
}

// KPI Data
const kpis = ref([
  { 
    label: 'Platform Health Score', 
    value: '98.6%', 
    status: 'Excellent', 
    statusBg: 'green-10', 
    statusColor: 'green-2', 
    icon: 'monitor_heart', 
    colorName: 'green-4', 
    color: '#00E676', 
    sparkline: 'M0 25 Q15 5, 30 20 T60 5 T100 15', 
    trendUp: true, 
    trendColor: 'green-4', 
    comparison: '2.4% vs yesterday' 
  },
  { 
    label: 'Active Tenants', 
    value: '128', 
    status: 'Active', 
    statusBg: 'purple-10', 
    statusColor: 'purple-2', 
    icon: 'storefront', 
    colorName: 'purple-4', 
    color: '#8B5CF6', 
    sparkline: 'M0 25 L15 15 L35 25 L55 10 L75 22 L100 5', 
    trendUp: true, 
    trendColor: 'purple-4', 
    comparison: '5 vs yesterday' 
  },
  { 
    label: 'Total Transactions', 
    value: '24.58M', 
    status: 'Stable', 
    statusBg: 'cyan-10', 
    statusColor: 'cyan-2', 
    icon: 'account_balance_wallet', 
    colorName: 'cyan-4', 
    color: '#00B8FF', 
    sparkline: 'M0 25 Q20 25, 40 10 T80 20 T100 5', 
    trendUp: true, 
    trendColor: 'green-4', 
    comparison: '12.7% vs yesterday' 
  },
  { 
    label: 'System Uptime', 
    value: '99.98%', 
    status: 'Excellent', 
    statusBg: 'green-10', 
    statusColor: 'green-2', 
    icon: 'schedule', 
    colorName: 'green-4', 
    color: '#00E676', 
    sparkline: 'M0 10 L25 10 L50 8 L75 10 L100 10', 
    trendUp: true, 
    trendColor: 'green-4', 
    comparison: '0.02% vs yesterday' 
  },
  { 
    label: 'Security Posture', 
    value: 'A+', 
    status: 'Excellent', 
    statusBg: 'amber-10', 
    statusColor: 'amber-2', 
    icon: 'security', 
    colorName: 'amber-4', 
    color: '#FFC107', 
    sparkline: 'M0 15 L20 15 L40 18 L60 12 L80 15 L100 15', 
    trendUp: true, 
    trendColor: 'grey-5', 
    comparison: 'No threats detected' 
  },
  { 
    label: 'Open Incidents', 
    value: '3', 
    status: 'High Priority', 
    statusBg: 'red-10', 
    statusColor: 'red-2', 
    icon: 'warning', 
    colorName: 'red-4', 
    color: '#FF5252', 
    sparkline: 'M0 10 L20 25 L40 15 L60 28 L80 10 L100 20', 
    trendUp: false, 
    trendColor: 'green-4', 
    comparison: '2 vs yesterday' 
  }
])

// Radar chart options & series
const radarChartOptions = {
  chart: {
    toolbar: { show: false },
    background: 'transparent'
  },
  colors: ['#00B8FF', '#8B5CF6'],
  xaxis: {
    categories: ['Infrastructure', 'Applications', 'Security', 'Governance', 'Operations', 'Data Integrity', 'Compliance', 'Availability'],
    labels: {
      style: {
        colors: ['#9e9e9e', '#9e9e9e', '#9e9e9e', '#9e9e9e', '#9e9e9e', '#9e9e9e', '#9e9e9e', '#9e9e9e'],
        fontSize: '10px',
        fontFamily: 'monospace'
      }
    }
  },
  yaxis: {
    show: false,
    max: 100
  },
  stroke: {
    width: 2
  },
  fill: {
    opacity: 0.2
  },
  markers: {
    size: 3
  },
  legend: {
    show: true,
    position: 'bottom',
    labels: { colors: '#ffffff' },
    fontFamily: 'monospace'
  }
}

const radarChartSeries = [
  {
    name: 'Current Performance',
    data: [99, 98, 98, 96, 97, 98, 99, 100]
  },
  {
    name: 'Target Baseline',
    data: [98, 95, 95, 95, 95, 95, 95, 99]
  }
]

// Map node targets
const mapNodes = ref([
  { tenant: 'Lagos Hub Network', location: 'Nigeria', x: 48, y: 55, status: 'high', color: '#00E676', activity: 38.4 },
  { tenant: 'Acme School Group', location: 'UK', x: 46, y: 22, status: 'medium', color: '#FFC107', activity: 12.8 },
  { tenant: 'New York Retail Grid', location: 'USA', x: 23, y: 25, status: 'high', color: '#00E676', activity: 41.2 },
  { tenant: 'Cairo Services Co', location: 'Egypt', x: 52, y: 40, status: 'low', color: '#00B8FF', activity: 4.1 },
  { tenant: 'Beta Logistics', location: 'Germany', x: 49, y: 26, status: 'risk', color: '#FF5252', activity: 0 }
])

// Real-time alerts data
const alerts = ref([
  { severity: 'Critical', badgeColor: 'red-9', icon: 'gpp_bad', color: 'red-4', description: 'High Risk Login Attempt Blocked', entity: 'Tenant T-10082', time: '2m ago' },
  { severity: 'High', badgeColor: 'orange-9', icon: 'schedule', color: 'orange-4', description: 'Settlement Batch Processing Delayed', entity: 'Batch #SB-77891', time: '18m ago' },
  { severity: 'Medium', badgeColor: 'amber-9', icon: 'block', color: 'amber-4', description: 'Workflow Execution Failed', entity: 'Tenant T-10045', time: '32m ago' },
  { severity: 'Low', badgeColor: 'green-9', icon: 'check_circle', color: 'green-4', description: 'New Tenant Onboarded Successfully', entity: 'Tenant T-10521', time: '1h ago' },
  { severity: 'Medium', badgeColor: 'amber-9', icon: 'warning', color: 'amber-4', description: 'License Usage Threshold Reached', entity: 'Tenant T-10012', time: '2h ago' }
])

// Resources progress metrics
const hardwareResources = ref({
  cpu: { label: 'CPU Usage', value: 24, color: 'cyan-4' },
  memory: { label: 'Memory Usage', value: 48, color: 'purple-4' },
  storage: { label: 'Disk Space', value: 32, color: 'teal-4' },
  network: { label: 'Network I/O', value: 18, color: 'amber-4' }
})

// Real-time hardware load timeline chart
const infraChartOptions = {
  chart: {
    toolbar: { show: false },
    background: 'transparent',
    sparkline: { enabled: true }
  },
  colors: ['#00B8FF', '#8B5CF6', '#26A69A', '#FFC107'],
  stroke: { curve: 'smooth', width: 1.5 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.1, opacityTo: 0 }
  },
  tooltip: {
    theme: 'dark',
    x: { show: false }
  }
}

const infraChartSeries = ref([
  { name: 'CPU Load', data: [22, 25, 23, 27, 24, 26, 24, 25, 23, 24] },
  { name: 'Memory Load', data: [47, 48, 48, 49, 48, 48, 48, 48, 47, 48] },
  { name: 'Disk Space', data: [32, 32, 32, 32, 32, 32, 32, 32, 32, 32] },
  { name: 'Network I/O', data: [15, 18, 17, 20, 18, 19, 17, 18, 16, 18] }
])

// Simulate real-time metric variations
let timelineInterval = null
onMounted(() => {
  timelineInterval = setInterval(() => {
    // Modify current gauges slightly
    hardwareResources.value.cpu.value = Math.max(10, Math.min(95, hardwareResources.value.cpu.value + Math.floor(Math.random() * 5) - 2))
    hardwareResources.value.memory.value = Math.max(30, Math.min(95, hardwareResources.value.memory.value + Math.floor(Math.random() * 3) - 1))
    hardwareResources.value.network.value = Math.max(5, Math.min(80, hardwareResources.value.network.value + Math.floor(Math.random() * 7) - 3))

    // Shift timeline array series
    infraChartSeries.value.forEach(s => {
      const last = s.data[s.data.length - 1]
      let delta = Math.floor(Math.random() * 5) - 2
      if (s.name === 'Memory Load') delta = Math.floor(Math.random() * 3) - 1
      if (s.name === 'Disk Space') delta = 0 // Disk remains flat
      const newVal = Math.max(0, Math.min(100, last + delta))
      s.data.shift()
      s.data.push(newVal)
    })
  }, 3000)
})
onUnmounted(() => {
  if (timelineInterval) clearInterval(timelineInterval)
})

// Top Active modules
const activeModules = ref([
  { name: 'Financial Ledger', icon: 'account_balance', usage: 92 },
  { name: 'Payment Processing', icon: 'payment', usage: 78 },
  { name: 'Workflow Engine', icon: 'account_tree', usage: 67 },
  { name: 'Compliance Center', icon: 'gpp_maybe', usage: 54 },
  { name: 'Fraud Monitoring', icon: 'security', usage: 41 },
  { name: 'Notification Engine', icon: 'notifications_active', usage: 38 },
  { name: 'AI Insights', icon: 'insights', usage: 32 }
])

// Governance Matrices
const governanceCards = ref([
  { label: 'Approvals Pending', value: '41', icon: 'fact_check', color: 'purple-4', badgeBg: 'purple-10', comparison: '↑ 6 today', route: '/governance/approvals' },
  { label: 'SLA At Risk', value: '12', icon: 'alarm', color: 'red-4', badgeBg: 'red-10', comparison: '↑ 3 today', route: '/governance/sla' },
  { label: 'Policies Violated', value: '0', icon: 'policy', color: 'green-4', badgeBg: 'green-10', comparison: 'No change', route: '/governance/policy' },
  { label: 'Workflows Running', value: '187', icon: 'sync', color: 'cyan-4', badgeBg: 'cyan-10', comparison: '↑ 24 today', route: '/automation/workflows' },
  { label: 'Audit Events Tracked', value: '1.24M', icon: 'receipt_long', color: 'indigo-4', badgeBg: 'indigo-10', comparison: '↑ 18.6% today', route: '/observability/audit' },
  { label: 'Quarantine Items', value: '2', icon: 'gpp_bad', color: 'orange-4', badgeBg: 'orange-10', comparison: '↓ 1 today', route: '/governance/quarantine' }
])

// Tenant Intelligence Center
const tenantMatrixColumns = [
  { name: 'name', label: 'TENANT NAME', align: 'left', field: 'name' },
  { name: 'revenue', label: 'REVENUE', align: 'left', field: 'revenue' },
  { name: 'score', label: 'HEALTH SCORE', align: 'center', field: 'score' },
  { name: 'risk', label: 'RISK LEVEL', align: 'center', field: 'risk' },
  { name: 'growth', label: 'GROWTH', align: 'right', field: 'growth' }
]

const tenantMatrix = ref([
  { name: 'Lagos Hub Network', revenue: 'NGN 4,500,200', score: 98, risk: 'Low', growth: '+14.2%' },
  { name: 'Acme School Group', revenue: 'NGN 1,890,500', score: 92, risk: 'Medium', growth: '+8.4%' },
  { name: 'NY Retail Grid', revenue: 'USD 8,420', score: 96, risk: 'Low', growth: '+22.1%' },
  { name: 'Cairo Services Co', revenue: 'EGP 32,800', score: 84, risk: 'Medium', growth: '+3.8%' },
  { name: 'Beta Logistics', revenue: 'EUR 1,200', score: 76, risk: 'High', growth: '-1.2%' }
])

// AI Insights Cards
const aiRecommendations = ref([
  { title: 'SLA Limit Violation Risk', action: 'Assign additional reviewers to the KYC validation queues.', confidence: 94, impact: 'High Risk (SLA Breach)', priority: 'high', priorityColor: 'red-9' },
  { title: 'Treasury Capacity Threshold', action: 'Increase settlement buffer by 18% to absorb local payment demand spikes.', confidence: 89, impact: 'Medium Risk (Liquidity Constraint)', priority: 'medium', priorityColor: 'amber-9' }
])

const executeRecommendation = (rec) => {
  $q.notify({
    type: 'positive',
    message: `Executing optimization plan: "${rec.title}" successfully.`,
    position: 'top-right',
    color: 'purple-9',
    icon: 'auto_awesome'
  })
}

// Quick Actions Toolbar Configuration
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
