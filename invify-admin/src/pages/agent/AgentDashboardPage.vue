<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16" style="height: calc(100vh - 50px);">
    
    <!-- Header -->
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="dashboard" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">ONBOARDING & COMMISSIONS TERMINAL</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">{{ agentInfo?.agentCode }} // ACTIVE_PROFILE</div>
        </div>
      </div>
      <q-btn dense flat color="amber-4" icon="refresh" label="Refresh" @click="fetchDashboard" :loading="loading" />
    </div>

    <!-- Stats Row -->
    <div class="row items-stretch op-gap-16 shrink-0">
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-4">
        <div class="text-caption text-muted">Total Onboarded Tenants</div>
        <div class="text-h4 text-weight-bold text-main">{{ stats.totalTenants }}</div>
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-4 border-left-green">
        <div class="text-caption text-muted">Earned Commissions</div>
        <div class="text-h4 text-weight-bold text-green-4">${{ stats.commissions.toFixed(2) }}</div>
      </div>
      <div class="col panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-4 border-left-cyan">
        <div class="text-caption text-muted">Reputation Points</div>
        <div class="text-h4 text-weight-bold text-cyan-3">{{ stats.points }}</div>
      </div>
    </div>

    <!-- Tenants Table -->
    <div class="col column border-muted rounded-borders bg-panel overflow-hidden">
      <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center op-gap-4 shrink-0">
        <q-icon name="storefront" size="xs" color="amber-4" />
        <span class="text-operator-title text-weight-bold" style="font-size: 12px;">ONBOARDED TENANT PORTFOLIO</span>
      </div>
      
      <div class="col overflow-auto custom-scrollbar">
        <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
          <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
            <tr>
              <th class="q-pa-sm">Tenant ID</th>
              <th class="q-pa-sm">Business Name</th>
              <th class="q-pa-sm">Industry</th>
              <th class="q-pa-sm">Status</th>
              <th class="q-pa-sm">Onboarded At</th>
            </tr>
          </thead>
          <tbody class="text-caption" style="font-size: 12px;">
            <tr v-for="t in tenants" :key="t.id" class="border-bottom-light hover-row">
              <td class="q-pa-sm text-metric-mono text-secondary">{{ t.id }}</td>
              <td class="q-pa-sm text-main text-weight-bold">{{ t.businessName }}</td>
              <td class="q-pa-sm text-muted">{{ t.industry }}</td>
              <td class="q-pa-sm">
                <span :class="t.status === 'ACTIVE' ? 'text-green-4' : 'text-amber-4'">{{ t.status }}</span>
              </td>
              <td class="q-pa-sm text-metric-mono text-muted" style="font-size: 10px;">{{ new Date(t.onboardedAt).toLocaleString() }}</td>
            </tr>
            <tr v-if="tenants.length === 0 && !loading">
              <td colspan="5" class="q-pa-md text-center text-muted">No tenants onboarded yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const router = useRouter()

const agentInfo = ref(null)
const loading = ref(false)

const stats = ref({
  totalTenants: 0,
  commissions: 0,
  points: 0
})
const tenants = ref([])

onMounted(() => {
  const stored = localStorage.getItem('invify_agent_info')
  if (!stored) {
    router.push('/agent/login')
    return
  }
  agentInfo.value = JSON.parse(stored)
  fetchDashboard()
})

const fetchDashboard = async () => {
  loading.value = true
  try {
    const res = await axios.get(`http://localhost:3004/api/agent/dashboard?agentCode=${agentInfo.value.agentCode}`)
    stats.value = res.data.stats
    tenants.value = res.data.tenants
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to load dashboard: ${msg}`, position: 'top-right' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-bottom-light { border-bottom: 1px solid #1a2024; }
.border-left-green { border-left: 3px solid #40c057; }
.border-left-cyan { border-left: 3px solid #3bc9db; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
}

.hover-row:hover {
  background-color: #1a2327 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0b0f12;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #22282d;
  border-radius: 3px;
}
</style>
