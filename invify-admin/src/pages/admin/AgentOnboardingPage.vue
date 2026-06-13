<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="admin_panel_settings" size="sm" color="cyan-3" />
        <div class="text-operator-title text-weight-bold" style="font-size: 14px;">AGENT GOVERNANCE & ONBOARDING</div>
      </div>
    </div>

    <div class="row items-stretch op-gap-16 col min-h-0">
      <!-- Agent Directory (Full Width) -->
      <div class="col-12 column border-muted rounded-borders bg-panel overflow-hidden">
        <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
          <span class="text-operator-title text-weight-bold">Active Agent Roster</span>
          <div class="row items-center op-gap-8">
            <q-btn dense outline color="cyan-3" label="PROVISION NEW AGENT" size="sm" @click="showProvisionDialog = true" class="text-weight-bold q-px-sm" />
            <q-btn dense flat size="sm" color="cyan-3" icon="refresh" @click="fetchAgents" :loading="loadingList" />
          </div>
        </div>
        <div class="col overflow-auto custom-scrollbar">
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom sticky-header" style="font-size: 10px;">
              <tr>
                <th class="q-pa-xs">Agent Code</th>
                <th class="q-pa-xs">Name</th>
                <th class="q-pa-xs">KYC Status</th>
                <th class="q-pa-xs">Profile Status</th>
                <th class="q-pa-xs">Operating State</th>
                <th class="q-pa-xs">Commissions</th>
              </tr>
            </thead>
            <tbody class="text-caption" style="font-size: 11px;">
              <tr v-for="agent in agents" :key="agent.id" class="hover-row border-bottom-light cursor-pointer" @click="openAgentProfile(agent.id)">
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
                <td class="q-pa-xs">
                  <q-chip dense size="xs" :color="agent.status === 'SUSPENDED' ? 'red-10' : 'blue-8'" :text-color="agent.status === 'SUSPENDED' ? 'red-2' : 'blue-2'">
                    {{ agent.status || 'ACTIVE' }}
                  </q-chip>
                </td>
                <td class="q-pa-xs text-metric-mono text-green-4">{{ currentCurrency.symbol }}{{ agent.commissions?.toFixed(2) || '0.00' }}</td>
              </tr>
              <tr v-if="(!agents || agents.length === 0) && !loadingList">
                <td colspan="6" class="q-pa-md text-center text-muted">No agents provisioned yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Provisioning Dialog -->
    <q-dialog v-model="showProvisionDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 500px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="text-weight-bold text-subtitle1">Provision New Agent</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="onboardAgent" class="column op-gap-8">
            <q-input v-model="newAgent.name" dark filled dense label="Full Legal Name" placeholder="e.g. John Doe" class="bg-panel-darker text-caption" required />
            <q-input v-model="newAgent.email" dark filled dense type="email" label="Email Address" placeholder="agent@example.com" class="bg-panel-darker text-caption" required />
            <q-input v-model="newAgent.phone" dark filled dense label="Primary Phone Number" placeholder="+1234567890" class="bg-panel-darker text-caption" required />
            <div class="row items-center justify-between no-wrap op-gap-8">
              <q-input v-model="newAgent.whatsappNumber" dark filled dense label="WhatsApp Number" placeholder="+1234567890" class="bg-panel-darker text-caption col" :disable="sameAsPhone" required />
              <q-checkbox v-model="sameAsPhone" dark dense label="Same as Phone" color="cyan-3" class="text-caption text-muted" />
            </div>
            <q-input v-model="newAgent.address" dark filled dense type="textarea" rows="2" label="Full Residential Address" placeholder="123 Main St..." class="bg-panel-darker text-caption" required />
            <q-file v-model="passportFile" dark filled dense label="Upload Passport Photo" accept="image/*" class="bg-panel-darker text-caption" required>
              <template v-slot:prepend><q-icon name="face" /></template>
            </q-file>
            <q-file v-model="idCardFile" dark filled dense label="Upload Government ID" accept="image/*,application/pdf" class="bg-panel-darker text-caption" required>
              <template v-slot:prepend><q-icon name="badge" /></template>
            </q-file>
            <q-input v-model="newAgent.agentCode" dark filled dense label="Agent Code" class="bg-panel-darker text-caption" maxlength="6" hint="Auto-generated from phone number" />
            
            <q-btn type="submit" dense color="cyan-3" text-color="black" label="Provision Agent & Verify KYC" :loading="loading" class="q-mt-md text-weight-bold full-width" />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Suspension Dialog -->
    <q-dialog v-model="showSuspendDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 450px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="text-weight-bold text-subtitle1 text-red-4">Suspend Agent</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pt-md">
          <div class="text-caption text-muted">
            Provide the suspension message displayed to the agent at login, and optionally require them to perform an action to reactivate.
          </div>
          
          <q-input 
            v-model="suspensionForm.suspensionReason" 
            dark filled dense type="textarea" rows="3"
            label="Suspension Reason / Message"
            placeholder="e.g. Your account has been temporarily flagged for high risk transactions."
            class="bg-panel-darker text-caption"
            required
          />

          <q-select
            v-model="suspensionForm.requiredAction"
            :options="actionOptionsList"
            label="Required Action at Login"
            dark filled dense
            emit-value
            map-options
            class="bg-panel-darker text-caption"
          />

          <template v-if="suspensionForm.requiredAction === 'ANSWER_QUESTION'">
            <q-input
              v-model="suspensionForm.actionQuestion"
              dark filled dense
              label="Verification Question"
              placeholder="e.g. Verify your manager's phone number or business ID"
              class="bg-panel-darker text-caption"
              required
            />
            <q-input
              v-model="suspensionForm.actionAnswer"
              dark filled dense
              label="Expected Answer"
              placeholder="e.g. +2348000000000"
              class="bg-panel-darker text-caption"
            />
          </template>
        </q-card-section>

        <q-card-actions align="right" class="border-top q-pa-md bg-panel-darker">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn label="Confirm Suspension" color="red-8" @click="confirmSuspension" :loading="loadingStatus" class="text-weight-bold" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Agent Profile Drawer -->
    <q-dialog v-model="showProfileDialog" position="right" seamless transition-show="slide-left" transition-hide="slide-right">
      <q-card class="bg-panel text-main font-inter border-left-muted column no-wrap drawer-shadow" style="width: 500px; max-width: 100vw; height: 100vh;">
        <q-card-section class="row items-center justify-between bg-panel-darker border-bottom shrink-0 q-pa-sm">
          <div class="row items-center op-gap-8">
            <q-btn icon="close" flat round dense v-close-popup size="sm" />
            <div class="text-weight-bold text-subtitle2">Agent Profile Inspector</div>
          </div>
          <template v-if="selectedAgent">
            <q-btn v-if="selectedAgent.status === 'PENDING_APPROVAL'" :loading="loadingStatus" dense size="sm" 
                   color="green-8" text-color="white" label="APPROVE & ACTIVATE AGENT" 
                   @click="approveAgentStatus" class="text-weight-bold q-px-sm" />
            <q-btn v-else :loading="loadingStatus" dense size="sm" 
                   :color="selectedAgent.status === 'SUSPENDED' ? 'green-10' : 'red-10'"
                   :text-color="selectedAgent.status === 'SUSPENDED' ? 'green-2' : 'red-2'"
                   :label="selectedAgent.status === 'SUSPENDED' ? 'REACTIVATE AGENT' : 'SUSPEND AGENT'" 
                   @click="toggleAgentStatus" class="text-weight-bold q-px-sm" />
          </template>
        </q-card-section>

        <q-card-section class="col overflow-auto custom-scrollbar q-pa-none">
          <div v-if="loadingProfile" class="q-pa-xl text-center"><q-spinner color="cyan-3" size="2em" /></div>
          
          <div v-else-if="selectedAgent" class="column">
            <!-- KYC & Profile Section -->
            <div class="q-pa-md column op-gap-16 border-bottom">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-h6 text-weight-bold text-amber-4 text-metric-mono">{{ selectedAgent.agentCode }}</div>
                  <div class="text-subtitle1">{{ selectedAgent.name }}</div>
                </div>
                <div class="column items-end op-gap-4">
                  <q-chip dense size="xs" :color="selectedAgent.kycStatus === 'VERIFIED' ? 'green-10' : 'amber-10'" :text-color="selectedAgent.kycStatus === 'VERIFIED' ? 'green-2' : 'amber-2'">
                    KYC: {{ selectedAgent.kycStatus || 'PENDING' }}
                  </q-chip>
                  <q-chip dense size="xs" :color="selectedAgent.status === 'SUSPENDED' ? 'red-10' : 'blue-8'" :text-color="selectedAgent.status === 'SUSPENDED' ? 'red-2' : 'blue-2'">
                    STATE: {{ selectedAgent.status || 'ACTIVE' }}
                  </q-chip>
                </div>
              </div>

              <!-- Contact Info -->
              <div class="bg-panel-darker rounded-borders border-muted q-pa-sm text-caption column op-gap-4">
                <div class="row"><div class="col-4 text-muted">Email</div><div class="col-8">{{ selectedAgent.email || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">Phone</div><div class="col-8">{{ selectedAgent.phone || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">WhatsApp</div><div class="col-8">{{ selectedAgent.whatsappNumber || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">Address</div><div class="col-8">{{ selectedAgent.address || 'N/A' }}</div></div>
                <div class="row"><div class="col-4 text-muted">Created</div><div class="col-8">{{ new Date(selectedAgent.createdAt).toLocaleDateString() }}</div></div>
              </div>

              <!-- KYC Documentation -->
              <div class="column op-gap-8">
                <div class="text-caption text-weight-bold text-muted" style="font-size: 10px; letter-spacing: 0.5px;">KYC DOCUMENTATION</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <div class="bg-panel-darker rounded-borders border-muted q-pa-sm text-center column justify-center items-center" style="min-height: 120px;">
                      <div class="text-caption text-muted q-mb-xs" style="font-size: 10px;">Passport Photo</div>
                      <q-img v-if="selectedAgent.passportImage" :src="selectedAgent.passportImage" spinner-color="cyan" style="max-height: 90px; width: 90px; border-radius: 4px;" contain />
                      <div v-else class="text-caption text-grey q-py-md">No image uploaded</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="bg-panel-darker rounded-borders border-muted q-pa-sm text-center column justify-center items-center" style="min-height: 120px;">
                      <div class="text-caption text-muted q-mb-xs" style="font-size: 10px;">Government ID</div>
                      <q-img v-if="selectedAgent.idCard && selectedAgent.idCard.startsWith('data:image')" :src="selectedAgent.idCard" spinner-color="cyan" style="max-height: 90px; width: 90px; border-radius: 4px;" contain />
                      <div v-else-if="selectedAgent.idCard" class="q-py-md">
                        <q-btn dense size="xs" color="cyan-9" icon="open_in_new" label="View ID Document" @click="openIdCard(selectedAgent.idCard)" />
                      </div>
                      <div v-else class="text-caption text-grey q-py-md">No ID uploaded</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- KYC Decisions -->
              <div v-if="selectedAgent.kycStatus === 'PENDING' || selectedAgent.kycStatus === 'REJECTED' || !selectedAgent.kycStatus" class="row op-gap-8">
                <q-btn color="green-8" text-color="white" label="Approve KYC" icon="check" size="sm" class="col text-weight-bold" :loading="loadingKyc" @click="updateKycStatus('VERIFIED')" />
                <q-btn color="red-8" text-color="white" label="Reject KYC" icon="close" size="sm" class="col text-weight-bold" :loading="loadingKyc" @click="updateKycStatus('REJECTED')" />
              </div>
              <div v-else-if="selectedAgent.kycStatus === 'VERIFIED'" class="bg-green-10 text-green-2 border-green rounded-borders q-pa-sm text-center row items-center justify-center op-gap-8">
                <q-icon name="verified" size="sm" color="green-4" />
                <span class="text-caption text-weight-bold" style="font-size: 11px;">KYC VERIFIED & APPROVED</span>
                <q-btn flat dense size="xs" color="red-2" label="Revert" class="q-ml-auto" @click="updateKycStatus('PENDING')" :loading="loadingKyc" />
              </div>

              <!-- Messaging Actions -->
              <div class="row op-gap-8">
                <q-btn outline color="cyan-3" label="Message Agent" icon="send" size="sm" class="col" @click="promptMessageAgent" />
                <q-btn outline color="amber-4" label="Broadcast to Tenants" icon="campaign" size="sm" class="col" @click="promptMessageTenants" />
              </div>
            </div>

            <!-- Onboarded Tenants Section -->
            <div class="column">
              <div class="panel-header bg-panel-darker q-px-sm q-py-xs border-bottom row items-center justify-between shrink-0">
                <span class="text-operator-title text-weight-bold text-muted">Onboarded Tenants Roster</span>
              </div>
              <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
                <thead class="bg-panel-darker text-muted text-metric-mono text-weight-bold border-bottom" style="font-size: 10px;">
                  <tr>
                    <th class="q-pa-xs">Tenant ID</th>
                    <th class="q-pa-xs">Business Name</th>
                    <th class="q-pa-xs">Status</th>
                  </tr>
                </thead>
                <tbody class="text-caption" style="font-size: 11px;">
                  <tr v-for="tenant in selectedAgentTenants" :key="tenant.id" class="border-bottom-light">
                    <td class="q-pa-xs text-metric-mono text-cyan-3">{{ tenant.id }}</td>
                    <td class="q-pa-xs text-main">{{ tenant.businessName }}</td>
                    <td class="q-pa-xs">
                      <q-chip dense size="xs" :color="tenant.status === 'ACTIVE' ? 'green-10' : 'amber-10'" :text-color="tenant.status === 'ACTIVE' ? 'green-2' : 'amber-2'">
                        {{ tenant.status }}
                      </q-chip>
                    </td>
                  </tr>
                  <tr v-if="selectedAgentTenants.length === 0">
                    <td colspan="3" class="q-pa-md text-center text-muted">No tenants onboarded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import axios from '../../api'
import { useCurrency } from '../../composables/useCurrency'

const $q = useQuasar()
const { currentCurrency } = useCurrency()

const agents = ref([])
const loading = ref(false)
const loadingList = ref(false)

const showProvisionDialog = ref(false)
const showProfileDialog = ref(false)
const loadingProfile = ref(false)
const loadingStatus = ref(false)
const loadingKyc = ref(false)
const showSuspendDialog = ref(false)
const suspensionForm = ref({
  suspensionReason: '',
  requiredAction: 'NONE',
  actionQuestion: '',
  actionAnswer: ''
})
const actionOptionsList = [
  { label: 'None (Manual Review Required)', value: 'NONE' },
  { label: 'Upload Passport Photo', value: 'UPLOAD_PASSPORT' },
  { label: 'Upload Government ID', value: 'UPLOAD_ID' },
  { label: 'Update Residential Address', value: 'UPDATE_ADDRESS' },
  { label: 'Update Phone Number', value: 'UPDATE_PHONE' },
  { label: 'Update WhatsApp Number', value: 'UPDATE_WHATSAPP' },
  { label: 'Answer Verification Question', value: 'ANSWER_QUESTION' }
]
const selectedAgent = ref(null)
const selectedAgentTenants = ref([])

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
  
  if (newPhone) {
    const digits = newPhone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const last10 = digits.slice(-10)
      const num = parseInt(last10, 10)
      newAgent.value.agentCode = num.toString(36).toUpperCase().padStart(6, '0').substring(0, 6)
    } else {
      newAgent.value.agentCode = ''
    }
  } else {
    newAgent.value.agentCode = ''
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
    const res = await axios.get('/admin/agents', {
      headers: { Authorization: `Bearer ${token}` }
    })
    agents.value = res.data.agents || []
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
    await axios.post('/admin/agents/onboard', {
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
    showProvisionDialog.value = false
    fetchAgents()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Provisioning failed: ${msg}`, position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const openAgentProfile = async (id) => {
  showProfileDialog.value = true
  loadingProfile.value = true
  selectedAgent.value = null
  selectedAgentTenants.value = []
  
  try {
    const token = localStorage.getItem('invify_access_token')
    const res = await axios.get(`/admin/agents/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    selectedAgent.value = res.data.agent
    selectedAgentTenants.value = res.data.tenants
  } catch (err) {
    $q.notify({ type: 'negative', message: `Failed to load profile: ${err.message}`, position: 'top-right' })
    showProfileDialog.value = false
  } finally {
    loadingProfile.value = false
  }
}

const approveAgentStatus = async () => {
  if (!selectedAgent.value) return
  loadingStatus.value = true
  try {
    const token = localStorage.getItem('invify_access_token')
    await axios.patch(`/admin/agents/${selectedAgent.value.id}/status`, {
      status: 'ACTIVE'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    selectedAgent.value.status = 'ACTIVE'
    selectedAgent.value.kycStatus = 'VERIFIED'
    $q.notify({ type: 'positive', message: `Agent approved and activated successfully`, position: 'top-right' })
    fetchAgents() // Refresh list in background
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to approve agent: ${msg}`, position: 'top-right' })
  } finally {
    loadingStatus.value = false
  }
}

const toggleAgentStatus = async () => {
  if (!selectedAgent.value) return
  
  if (selectedAgent.value.status === 'SUSPENDED') {
    loadingStatus.value = true
    try {
      const token = localStorage.getItem('invify_access_token')
      await axios.patch(`/admin/agents/${selectedAgent.value.id}/status`, {
        status: 'ACTIVE'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      selectedAgent.value.status = 'ACTIVE'
      $q.notify({ type: 'positive', message: `Agent status updated to ACTIVE`, position: 'top-right' })
      fetchAgents() // Refresh list in background
    } catch (err) {
      $q.notify({ type: 'negative', message: `Failed to update status: ${err.message}`, position: 'top-right' })
    } finally {
      loadingStatus.value = false
    }
  } else {
    suspensionForm.value = {
      suspensionReason: '',
      requiredAction: 'NONE',
      actionQuestion: '',
      actionAnswer: ''
    }
    showSuspendDialog.value = true
  }
}

const confirmSuspension = async () => {
  if (!suspensionForm.value.suspensionReason.trim()) {
    $q.notify({ type: 'warning', message: 'Suspension reason is required', position: 'top-right' })
    return
  }
  
  loadingStatus.value = true
  try {
    const token = localStorage.getItem('invify_access_token')
    await axios.patch(`/admin/agents/${selectedAgent.value.id}/status`, {
      status: 'SUSPENDED',
      suspensionReason: suspensionForm.value.suspensionReason,
      requiredAction: suspensionForm.value.requiredAction,
      actionQuestion: suspensionForm.value.actionQuestion,
      actionAnswer: suspensionForm.value.actionAnswer
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    selectedAgent.value.status = 'SUSPENDED'
    $q.notify({ type: 'positive', message: 'Agent has been suspended', position: 'top-right' })
    showSuspendDialog.value = false
    fetchAgents() // Refresh list in background
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to suspend agent: ${msg}`, position: 'top-right' })
  } finally {
    loadingStatus.value = false
  }
}

const updateKycStatus = async (newKycStatus) => {
  if (!selectedAgent.value) return
  loadingKyc.value = true
  
  try {
    const token = localStorage.getItem('invify_access_token')
    await axios.patch(`/admin/agents/${selectedAgent.value.id}/kyc`, {
      kycStatus: newKycStatus
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    selectedAgent.value.kycStatus = newKycStatus
    $q.notify({ type: 'positive', message: `Agent KYC status updated to ${newKycStatus}`, position: 'top-right' })
    fetchAgents() // Refresh list in background
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to update KYC status: ${msg}`, position: 'top-right' })
  } finally {
    loadingKyc.value = false
  }
}

const openIdCard = (idCard) => {
  const newTab = window.open()
  if (newTab) {
    newTab.document.write(`<iframe src="${idCard}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
  }
}

const promptMessageAgent = () => {
  $q.dialog({
    title: 'Direct Message Agent',
    message: 'Send a high-priority system notification to this agent.',
    prompt: {
      model: '',
      type: 'text',
      filled: true,
      dark: true
    },
    cancel: true,
    persistent: true,
    color: 'cyan-3',
    dark: true
  }).onOk(async data => {
    if (!data.trim()) return
    try {
      const token = localStorage.getItem('invify_access_token')
      await axios.post(`/admin/agents/${selectedAgent.value.id}/message`, {
        message: data
      }, { headers: { Authorization: `Bearer ${token}` }})
      $q.notify({ type: 'positive', message: 'Message dispatched successfully', position: 'top-right' })
    } catch(e) {
      $q.notify({ type: 'negative', message: 'Failed to send message', position: 'top-right' })
    }
  })
}

const promptMessageTenants = () => {
  $q.dialog({
    title: 'Broadcast to Tenants',
    message: 'Broadcast a message to ALL tenants managed by this agent.',
    prompt: {
      model: '',
      type: 'textarea',
      filled: true,
      dark: true
    },
    cancel: true,
    persistent: true,
    color: 'amber-4',
    dark: true
  }).onOk(async data => {
    if (!data.trim()) return
    try {
      const token = localStorage.getItem('invify_access_token')
      await axios.post(`/admin/agents/${selectedAgent.value.id}/message-tenants`, {
        message: data
      }, { headers: { Authorization: `Bearer ${token}` }})
      $q.notify({ type: 'positive', message: 'Broadcast dispatched to tenants', position: 'top-right' })
    } catch(e) {
      $q.notify({ type: 'negative', message: 'Failed to broadcast message', position: 'top-right' })
    }
  })
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
