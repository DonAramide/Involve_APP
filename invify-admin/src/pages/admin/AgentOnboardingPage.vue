<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="admin_panel_settings" size="sm" color="cyan-3" />
        <div class="text-operator-title text-weight-bold" style="font-size: 14px;">AGENT GOVERNANCE & ONBOARDING</div>
      </div>
    </div>

    <div class="row items-stretch op-gap-16 col min-h-0">
      <!-- Create Agent Form -->
      <div class="col-12 col-md-4 panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-12 shrink-0">
        <div class="text-weight-bold text-main border-bottom-light q-pb-xs">Provision New Agent</div>
        <q-form @submit="onboardAgent" class="column op-gap-8">
          <q-input
            v-model="newAgent.name"
            dark filled dense
            label="Agent Name"
            placeholder="e.g. John Doe"
            class="bg-panel-darker text-caption"
            required
          />
          <q-input
            v-model="newAgent.agentCode"
            dark filled dense
            label="Custom Agent Code (Optional)"
            placeholder="e.g. BTA123"
            class="bg-panel-darker text-caption"
            maxlength="6"
            hint="Leave blank to auto-generate"
          />
          <q-btn type="submit" dense color="cyan-3" text-color="black" label="Provision Agent" :loading="loading" class="q-mt-sm text-weight-bold" />
        </q-form>
      </div>

      <!-- Agent Directory -->
      <div class="col-12 col-md-8 column border-muted rounded-borders bg-panel overflow-hidden">
        <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
          <span class="text-operator-title text-weight-bold">Active Agent Roster</span>
          <q-btn dense flat size="xs" color="cyan-3" icon="refresh" @click="fetchAgents" :loading="loadingList" />
        </div>
        <div class="col overflow-auto custom-scrollbar">
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
              <tr>
                <th class="q-pa-xs">Agent Code</th>
                <th class="q-pa-xs">Name</th>
                <th class="q-pa-xs">Status</th>
                <th class="q-pa-xs">Commissions</th>
              </tr>
            </thead>
            <tbody class="text-caption" style="font-size: 11px;">
              <tr v-for="agent in agents" :key="agent.id" class="hover-row border-bottom-light">
                <td class="q-pa-xs text-metric-mono text-amber-4 text-weight-bold">{{ agent.agentCode }}</td>
                <td class="q-pa-xs text-main">{{ agent.name }}</td>
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.isFirstLogin ? 'amber-10' : 'green-10'" :text-color="agent.isFirstLogin ? 'amber-2' : 'green-2'">
                    {{ agent.isFirstLogin ? 'PENDING ACTIVATION' : 'ACTIVE' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs text-metric-mono text-green-4">${{ agent.commissions.toFixed(2) }}</td>
              </tr>
              <tr v-if="agents.length === 0 && !loadingList">
                <td colspan="4" class="q-pa-md text-center text-muted">No agents provisioned yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

const agents = ref([])
const loading = ref(false)
const loadingList = ref(false)

const newAgent = ref({
  name: '',
  agentCode: ''
})

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const fetchAgents = async () => {
  loadingList.value = true
  try {
    const token = localStorage.getItem('invify_access_token')
    const res = await axios.get('http://localhost:3004/admin/agents', {
      headers: { Authorization: `Bearer ${token}` }
    })
    agents.value = res.data.agents
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to fetch agents: ${msg}`, position: 'top-right' })
  } finally {
    loadingList.value = false
  }
}

const onboardAgent = async () => {
  loading.value = true
  try {
    const code = newAgent.value.agentCode.trim().toUpperCase() || generateCode()
    
    const token = localStorage.getItem('invify_access_token')
    await axios.post('http://localhost:3004/admin/agents/onboard', {
      name: newAgent.value.name,
      agentCode: code
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    $q.notify({ type: 'positive', message: `Agent ${code} provisioned successfully`, position: 'top-right' })
    newAgent.value.name = ''
    newAgent.value.agentCode = ''
    fetchAgents()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Provisioning failed: ${msg}`, position: 'top-right' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAgents()
})
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
