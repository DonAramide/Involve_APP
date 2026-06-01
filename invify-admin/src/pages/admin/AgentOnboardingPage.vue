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
            label="Full Legal Name"
            placeholder="e.g. John Doe"
            class="bg-panel-darker text-caption"
            required
          />
          <q-input
            v-model="newAgent.email"
            dark filled dense
            type="email"
            label="Email Address"
            placeholder="agent@example.com"
            class="bg-panel-darker text-caption"
            required
          />
          <q-input
            v-model="newAgent.phone"
            dark filled dense
            label="Primary Phone Number"
            placeholder="+1234567890"
            class="bg-panel-darker text-caption"
            required
          />
          <div class="row items-center justify-between no-wrap op-gap-8">
            <q-input
              v-model="newAgent.whatsappNumber"
              dark filled dense
              label="WhatsApp Number"
              placeholder="+1234567890"
              class="bg-panel-darker text-caption col"
              :disable="sameAsPhone"
              required
            />
            <q-checkbox v-model="sameAsPhone" dark dense label="Same as Phone" color="cyan-3" class="text-caption text-muted" />
          </div>
          <q-input
            v-model="newAgent.address"
            dark filled dense
            type="textarea"
            rows="2"
            label="Full Residential Address"
            placeholder="123 Main St..."
            class="bg-panel-darker text-caption"
            required
          />
          <q-file
            v-model="passportFile"
            dark filled dense
            label="Upload Passport Photo"
            accept="image/*"
            class="bg-panel-darker text-caption"
            required
          >
            <template v-slot:prepend><q-icon name="face" /></template>
          </q-file>
          <q-file
            v-model="idCardFile"
            dark filled dense
            label="Upload Government ID"
            accept="image/*,application/pdf"
            class="bg-panel-darker text-caption"
            required
          >
            <template v-slot:prepend><q-icon name="badge" /></template>
          </q-file>
          <q-input
            v-model="newAgent.agentCode"
            dark filled dense
            label="Custom Agent Code (Optional)"
            placeholder="e.g. BTA123"
            class="bg-panel-darker text-caption"
            maxlength="6"
            hint="Leave blank to auto-generate"
          />
          <q-btn type="submit" dense color="cyan-3" text-color="black" label="Provision Agent & Verify KYC" :loading="loading" class="q-mt-sm text-weight-bold" />
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
                <th class="q-pa-xs">KYC Status</th>
                <th class="q-pa-xs">Profile Status</th>
                <th class="q-pa-xs">Commissions</th>
              </tr>
            </thead>
            <tbody class="text-caption" style="font-size: 11px;">
              <tr v-for="agent in agents" :key="agent.id" class="hover-row border-bottom-light">
                <td class="q-pa-xs text-metric-mono text-amber-4 text-weight-bold">{{ agent.agentCode }}</td>
                <td class="q-pa-xs text-main">
                  <div>{{ agent.name }}</div>
                  <div class="text-muted" style="font-size: 9px;">{{ agent.phone }}</div>
                </td>
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.kycStatus === 'VERIFIED' ? 'green-10' : 'amber-10'" :text-color="agent.kycStatus === 'VERIFIED' ? 'green-2' : 'amber-2'">
                    {{ agent.kycStatus || 'PENDING' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.isFirstLogin ? 'blue-grey-8' : 'green-10'" :text-color="agent.isFirstLogin ? 'blue-grey-2' : 'green-2'">
                    {{ agent.isFirstLogin ? 'PENDING ACTIVATION' : 'ACTIVE' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs text-metric-mono text-green-4">${{ agent.commissions?.toFixed(2) || '0.00' }}</td>
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
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

const agents = ref([])
const loading = ref(false)
const loadingList = ref(false)

const newAgent = ref({
  name: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  address: '',
  agentCode: ''
})

const sameAsPhone = ref(false)

watch(sameAsPhone, (val) => {
  if (val) {
    newAgent.value.whatsappNumber = newAgent.value.phone
  } else {
    newAgent.value.whatsappNumber = ''
  }
})

watch(() => newAgent.value.phone, (newPhone) => {
  if (sameAsPhone.value) {
    newAgent.value.whatsappNumber = newPhone
  }
})

const passportFile = ref(null)
const idCardFile = ref(null)

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

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
    
    let passportImage = ''
    let idCard = ''
    if (passportFile.value) passportImage = await toBase64(passportFile.value)
    if (idCardFile.value) idCard = await toBase64(idCardFile.value)

    const token = localStorage.getItem('invify_access_token')
    await axios.post('http://localhost:3004/admin/agents/onboard', {
      name: newAgent.value.name,
      email: newAgent.value.email,
      phone: newAgent.value.phone,
      whatsappNumber: newAgent.value.whatsappNumber,
      address: newAgent.value.address,
      passportImage,
      idCard,
      agentCode: code
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    $q.notify({ type: 'positive', message: `Agent ${code} provisioned successfully`, position: 'top-right' })
    newAgent.value.name = ''
    newAgent.value.email = ''
    newAgent.value.phone = ''
    newAgent.value.whatsappNumber = ''
    sameAsPhone.value = false
    newAgent.value.address = ''
    newAgent.value.agentCode = ''
    passportFile.value = null
    idCardFile.value = null
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
