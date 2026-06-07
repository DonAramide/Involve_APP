<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm">
      <div class="row items-center op-gap-8">
        <q-icon name="insights" size="sm" color="blue-4" />
        <div class="text-operator-title text-weight-bold" style="font-size: 16px;">INTELLIGENCE & ANALYTICS</div>
      </div>
      <div v-if="refreshStatus" class="text-caption text-muted">
        Last Refresh: {{ new Date(refreshStatus.refresh_completed_at || refreshStatus.refresh_started_at).toLocaleString() }}
        <q-badge :color="refreshStatus.status === 'SUCCESS' ? 'green-9' : 'amber-9'" class="q-ml-sm">{{ refreshStatus.status }}</q-badge>
      </div>
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      class="bg-panel text-muted rounded-borders border-muted shrink-0"
      active-color="blue-4"
      indicator-color="blue-4"
      align="left"
      narrow-indicator
    >
      <q-tab name="performance" label="Performance" no-caps />
      <q-tab name="territory" label="Territory" no-caps />
      <q-tab name="risk" label="Risk Signals" no-caps />
    </q-tabs>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="blue-4" size="3em" />
    </div>

    <q-tab-panels v-else v-model="activeTab" animated class="bg-transparent flex-1" style="overflow-y: auto;">
      
      <!-- PERFORMANCE TAB -->
      <q-tab-panel name="performance" class="q-pa-none column op-gap-16">
        <div v-if="!performance" class="flex flex-center text-muted q-py-xl column">
          <q-icon name="analytics" size="xl" color="grey-8" class="q-mb-sm" />
          No performance data available yet.
        </div>
        <template v-else>
          <div class="row op-gap-16">
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Total Leads</div>
              <div class="text-h4 text-weight-bolder text-white">{{ performance.total_leads || 0 }}</div>
            </q-card-section></q-card>
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Total Merchants</div>
              <div class="text-h4 text-weight-bolder text-white">{{ performance.total_merchants || 0 }}</div>
            </q-card-section></q-card>
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Activations</div>
              <div class="text-h4 text-weight-bolder text-green-4">{{ performance.merchant_activations || 0 }}</div>
            </q-card-section></q-card>
          </div>

          <div class="row op-gap-16">
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Devices / Terminals</div>
              <div class="text-h4 text-weight-bolder text-cyan-4">{{ performance.devices_assigned || 0 }} / {{ performance.terminals_assigned || 0 }}</div>
            </q-card-section></q-card>
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Commissions Earned</div>
              <div class="text-h4 text-weight-bolder text-amber-4">${{ (performance.commissions_earned || 0).toLocaleString() }}</div>
            </q-card-section></q-card>
          </div>
        </template>
      </q-tab-panel>

      <!-- TERRITORY TAB -->
      <q-tab-panel name="territory" class="q-pa-none column op-gap-16">
        <div v-if="!territory" class="flex flex-center text-muted q-py-xl column">
          <q-icon name="map" size="xl" color="grey-8" class="q-mb-sm" />
          No territory intelligence data available.
        </div>
        <template v-else>
          <div class="row op-gap-16 items-center">
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Assigned Territory</div>
              <div class="text-h4 text-weight-bolder text-purple-4">{{ territory.territory || 'Unassigned' }}</div>
            </q-card-section></q-card>
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Activation Rate</div>
              <div class="text-h4 text-weight-bolder text-white">{{ territory.activation_rate || 0 }}%</div>
            </q-card-section></q-card>
            <q-card class="col bg-panel border-muted"><q-card-section>
              <div class="text-caption text-muted text-weight-bold text-uppercase">Deployment Success</div>
              <div class="text-h4 text-weight-bolder text-white">{{ territory.deployment_success_rate || 0 }}%</div>
            </q-card-section></q-card>
          </div>
        </template>
      </q-tab-panel>

      <!-- RISK SIGNALS TAB -->
      <q-tab-panel name="risk" class="q-pa-none column op-gap-16">
        <div v-if="!riskSignals.length" class="flex flex-center text-muted q-py-xl column">
          <q-icon name="check_circle" size="xl" color="green-6" class="q-mb-sm" />
          No operational risk signals detected.
        </div>
        <div v-else class="column op-gap-8">
          <q-card v-for="risk in riskSignals" :key="risk.signal_type" class="bg-panel border-muted row items-center q-pa-md op-gap-16">
            <q-icon :name="risk.severity === 'CRITICAL' ? 'error' : 'warning'" :color="risk.severity === 'CRITICAL' ? 'red-4' : 'amber-4'" size="md" />
            <div class="flex-1">
              <div class="text-weight-bold text-white">{{ risk.signal_type.replace(/_/g, ' ') }}</div>
              <div class="text-caption text-muted">{{ risk.description }}</div>
            </div>
            <div class="text-h5 text-weight-bold">{{ risk.count }}</div>
            <q-badge :color="risk.severity === 'CRITICAL' ? 'red-9' : 'amber-9'" :text-color="risk.severity === 'CRITICAL' ? 'red-3' : 'amber-3'">{{ risk.severity }}</q-badge>
          </q-card>
        </div>
      </q-tab-panel>

    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(true)
const activeTab = ref('performance')

const performance = ref(null)
const territory = ref(null)
const riskSignals = ref([])
const refreshStatus = ref(null)

const fetchAnalytics = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    const headers = { Authorization: `Bearer ${token}` }
    
    const [perfRes, terrRes, riskRes, statusRes] = await Promise.all([
      axios.get('/api/analytics/performance', { headers }),
      axios.get('/api/analytics/territory', { headers }),
      axios.get('/api/analytics/risk-signals', { headers }),
      // Keeping refresh-status as a relative path if it exists
      axios.get('/api/analytics/refresh-status', { headers }).catch(() => ({ data: { data: null } }))
    ])
    
    // Bind the first element of the returned arrays to the component refs
    performance.value = perfRes.data?.data?.performance?.[0] || null
    territory.value = terrRes.data?.data?.[0] || null
    riskSignals.value = riskRes.data?.data || []
    refreshStatus.value = statusRes.data?.data || null
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to load intelligence data' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchAnalytics)
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
