<template>
  <q-page class="q-pa-lg text-main font-mono">
    <div class="row items-center q-mb-xl">
      <div class="col">
        <h1 class="text-h4 text-weight-bold q-my-none">Agent Commissions & Billing</h1>
        <div class="text-subtitle1 text-muted">Configure Revenue Sharing and Onboarding Fees for Agents</div>
      </div>
    </div>

    <!-- Global Settings Section -->
    <q-card dark bordered class="bg-panel border-muted q-mb-xl">
      <q-card-section class="border-bottom">
        <div class="text-h6 text-cyan-4">Global Default Commission Rates</div>
        <div class="text-caption text-muted">These rates apply to all agents unless specifically overridden below.</div>
      </q-card-section>
      
      <q-card-section>
        <div v-if="isLoadingGlobal" class="q-pa-md flex flex-center">
          <q-spinner-dots color="cyan" size="40px" />
        </div>
        <div v-else class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input 
              v-model.number="globalSettings.globalDefaultOnboardingFee" 
              type="number"
              label="Default Onboarding Fee (NGN)" 
              dark filled 
              :prefix="currentCurrency.symbol"
              hint="Flat fee paid to the agent per tenant successfully onboarded."
            />
          </div>
          <div class="col-12 col-md-6">
            <q-input 
              v-model.number="globalSettings.globalDefaultRevSharePercentage" 
              type="number"
              label="Default RevShare Percentage (%)" 
              dark filled 
              suffix="%"
              hint="Percentage of the platform's profit paid to the agent."
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="border-top q-pa-md">
        <q-btn color="cyan-8" icon="save" label="Save Global Defaults" @click="saveGlobalSettings" :loading="isSavingGlobal" />
      </q-card-actions>
    </q-card>

    <!-- Specific Agent Override Section -->
    <q-card dark bordered class="bg-panel border-muted">
      <q-card-section class="border-bottom">
        <div class="text-h6 text-purple-4">Specific Agent Overrides</div>
        <div class="text-caption text-muted">Lookup an agent and configure custom commission rates.</div>
      </q-card-section>
      
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-5">
            <q-select
              v-model="selectedAgentOption"
              :options="filteredAgentOptions"
              use-input
              fill-input
              hide-selected
              input-debounce="300"
              label="Select or Search Agent"
              placeholder="Type code or name to search..."
              dark
              filled
              option-value="id"
              option-label="label"
              @filter="filterAgents"
              @update:model-value="onAgentSelected"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    No agents found
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
        </div>

        <div v-if="selectedAgent" class="q-mt-lg">
          <q-banner rounded class="bg-dark border-muted q-mb-md">
            <div class="text-weight-bold text-main">Managing Overrides for: {{ selectedAgentName }} ({{ selectedAgentCode }})</div>
            <div class="text-caption text-warning mb-none">Note: Leaving a field blank will revert it to the Global Default.</div>
          </q-banner>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input 
                v-model.number="agentSettings.onboardingFee" 
                type="number"
                label="Custom Onboarding Fee (NGN)" 
                dark filled 
                :prefix="currentCurrency.symbol"
                clearable
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input 
                v-model.number="agentSettings.revSharePercentage" 
                type="number"
                label="Custom RevShare Percentage (%)" 
                dark filled 
                suffix="%"
                clearable
              />
            </div>
          </div>
          
          <div class="q-mt-md text-right">
             <q-btn color="purple-6" icon="save" label="Save Agent Override" @click="saveAgentSettings" :loading="isSavingAgent" />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { useCurrency } from '../../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from 'src/api'

const $q = useQuasar()

// State
const isLoadingGlobal = ref(true)
const isSavingGlobal = ref(false)
const globalSettings = ref({
  globalDefaultOnboardingFee: 10,
  globalDefaultRevSharePercentage: 5
})

const agentsList = ref([])
const agentOptions = ref([])
const filteredAgentOptions = ref([])
const selectedAgentOption = ref(null)

const selectedAgentId = ref('')
const selectedAgentName = ref('')
const selectedAgentCode = ref('')
const selectedAgent = ref(false)
const isSavingAgent = ref(false)
const agentSettings = ref({
  onboardingFee: null,
  revSharePercentage: null
})

// Load Data
const loadGlobalSettings = async () => {
  isLoadingGlobal.value = true
  try {
    const res = await adminApi.getGlobalCommissions()
    if (res.data?.success && res.data.commissions) {
      globalSettings.value = res.data.commissions
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Failed to load global commission settings' })
  } finally {
    isLoadingGlobal.value = false
  }
}

const loadAgents = async () => {
  try {
    const res = await adminApi.listAgents()
    if (res.data?.success && res.data.agents) {
      agentsList.value = res.data.agents
      agentOptions.value = res.data.agents.map(a => ({
        id: a.id,
        agentCode: a.agentCode,
        name: a.name,
        label: `${a.agentCode} - ${a.name}`
      }))
      filteredAgentOptions.value = [...agentOptions.value]
    }
  } catch (error) {
    console.error('Failed to load agents list:', error)
  }
}

const filterAgents = (val, update) => {
  if (val === '') {
    update(() => {
      filteredAgentOptions.value = agentOptions.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredAgentOptions.value = agentOptions.value.filter(
      v => v.label.toLowerCase().indexOf(needle) > -1
    )
  })
}

const onAgentSelected = async (agent) => {
  if (!agent) {
    selectedAgent.value = false
    selectedAgentId.value = ''
    selectedAgentName.value = ''
    selectedAgentCode.value = ''
    return
  }
  
  selectedAgentId.value = agent.id
  selectedAgentName.value = agent.name
  selectedAgentCode.value = agent.agentCode
  
  try {
    const res = await adminApi.getAgentCommissions(agent.id)
    if (res.data?.success) {
      selectedAgent.value = true
      agentSettings.value = {
        onboardingFee: res.data.commissionSettings?.onboardingFee ?? null,
        revSharePercentage: res.data.commissionSettings?.revSharePercentage ?? null
      }
    } else {
      $q.notify({ color: 'warning', message: 'Agent commission settings not found' })
    }
  } catch (error) {
    $q.notify({ color: 'warning', message: 'Agent not found or API error' })
  }
}

// Actions
const saveGlobalSettings = async () => {
  isSavingGlobal.value = true
  try {
    const res = await adminApi.updateGlobalCommissions(globalSettings.value)
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: 'Global defaults saved successfully', icon: 'check_circle' })
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Failed to save global settings' })
  } finally {
    isSavingGlobal.value = false
  }
}

const saveAgentSettings = async () => {
  if (!selectedAgentId.value) return
  isSavingAgent.value = true
  try {
    const payload = {
      onboardingFee: agentSettings.value.onboardingFee,
      revSharePercentage: agentSettings.value.revSharePercentage
    }
    const res = await adminApi.updateAgentCommissions(selectedAgentId.value, payload)
    if (res.data?.success) {
      $q.notify({ color: 'positive', message: `Overrides saved for ${selectedAgentName.value}`, icon: 'check_circle' })
    }
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Failed to save agent overrides' })
  } finally {
    isSavingAgent.value = false
  }
}

onMounted(() => {
  loadGlobalSettings()
  loadAgents()
})
</script>

<style scoped>
.bg-panel { background: var(--enterprise-surface); }
.border-muted { border: 1px solid var(--enterprise-border); }
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-top { border-top: 1px solid var(--enterprise-border); }
.text-main { color: var(--enterprise-text-main); }
.text-muted { color: var(--enterprise-text-muted); }
.font-mono { font-family: 'JetBrains Mono', monospace; }
</style>
