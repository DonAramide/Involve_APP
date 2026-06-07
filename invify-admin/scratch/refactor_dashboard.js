const fs = require('fs');
const path = 'C:/dev/Involve_APP/invify-admin/src/pages/admin/PlatformOverviewPage.vue';
const bakPath = path + '.bak';

const orig = fs.readFileSync(bakPath, 'utf8');

// Split the file into parts: template, script, style
const templateMatch = orig.match(/<template>([\s\S]*?)<\/template>/);
const scriptMatch = orig.match(/<script setup>([\s\S]*?)<\/script>/);
const styleMatch = orig.match(/<style scoped>([\s\S]*?)<\/style>/);

if (!templateMatch || !scriptMatch || !styleMatch) {
  console.error("Failed to parse Vue SFC");
  process.exit(1);
}

// 1. Refactor the template
let template = templateMatch[1];
// Extract the <q-page> tag out
const qPageOpen = template.substring(0, template.indexOf('>') + 1);
const innerTemplate = template.substring(template.indexOf('>') + 1, template.lastIndexOf('</q-page>'));

const newTemplate = `<template>
${qPageOpen}
    <!-- Loading State -->
    <div v-if="pageLoading" class="flex flex-center" style="min-height: 80vh;">
      <q-spinner-grid color="cyan-4" size="4em" />
    </div>

    <!-- Error State -->
    <div v-else-if="pageError" class="flex flex-center column text-center" style="min-height: 80vh;">
      <q-icon name="error_outline" color="red-5" size="100px" />
      <div class="text-h5 q-mt-md font-mono text-weight-bold">Dashboard Provider Error</div>
      <div class="text-grey-5 q-mt-sm max-width-md">{{ errorMessage }}</div>
      <q-btn color="cyan-6" outline label="Retry Connection" class="q-mt-lg font-mono" @click="initializeDashboard" />
    </div>

    <!-- Main Content -->
    <div v-else>
${innerTemplate}
    </div>
  </q-page>
</template>
`;

// 2. Refactor the script setup
const newScript = `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import VueApexCharts from 'vue3-apexcharts'
import { DashboardProviderFactory } from '@/services/dashboard/DashboardProviderFactory'
import type { 
  KpiData, RadarChartData, MapNode, AlertData, GovernanceCard, Recommendation,
  HardwareResource, InfraChartSeries, ActiveModule, TenantMatrixRow
} from '@/services/dashboard/DashboardDataProvider'

const router = useRouter()
const $q = useQuasar()

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
    message: \`Executing optimization plan: "\${rec.title}" successfully.\`,
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
    radarChartOptions.value = healthData.options
    radarChartSeries.value = healthData.series
    mapNodes.value = tenantData
    alerts.value = alertsData
    governanceCards.value = govData
    aiRecommendations.value = recData
    hardwareResources.value = hardwareData
    infraChartSeries.value = infraData
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

// Increment timer
let syncInterval: any = null
onMounted(() => {
  initializeDashboard()
  syncInterval = setInterval(() => {
    syncTimer.value++
  }, 1000)
})

onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval)
})

</script>
`;

const newStyle = `<style scoped>
${styleMatch[1]}
</style>`;

const finalFile = newTemplate + '\n' + newScript + '\n' + newStyle;
fs.writeFileSync(path, finalFile);
console.log('PlatformOverviewPage refactored!');
