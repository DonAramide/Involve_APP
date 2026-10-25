<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16" style="height: calc(100vh - 50px); overflow-y: auto;">
    
    <!-- Header -->
    <div class="row items-center justify-between border-bottom q-pb-sm shrink-0">
      <div class="row items-center op-gap-8 no-wrap">
        <q-icon name="manage_accounts" size="sm" color="amber-4" />
        <div>
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">IDENTITY & SECURITY CENTER</div>
          <div class="text-metric-mono text-muted" style="font-size: 10px;">{{ profileCode || '—' }}<template v-if="profile?.status"> // {{ profile.status }}</template></div>
        </div>
      </div>
      <div>
        <q-badge :color="profile?.status === 'ACTIVE' ? 'green-9' : 'red-9'" :text-color="profile?.status === 'ACTIVE' ? 'green-3' : 'red-3'">
          {{ profile?.status || 'UNKNOWN' }}
        </q-badge>
      </div>
    </div>

    <div v-if="loading" class="flex flex-center col">
      <q-spinner color="amber-4" size="3em" />
    </div>

    <!-- Main Workspace -->
    <div v-else class="col row op-gap-16">
      
      <!-- Desktop Sidebar / Mobile Accordion -->
      <div class="col-xs-12 col-md-3 bg-panel border-muted rounded-borders q-pa-md column shrink-0" style="max-height: 500px;">
        <div class="flex flex-center column q-mb-md">
          <q-avatar size="100px" color="amber-9" text-color="amber-2" class="q-mb-sm border-muted shadow-2">
            <img v-if="profile?.profile?.photo_url || profile?.profile?.profile_photo_url" :src="profile?.profile?.photo_url || profile?.profile?.profile_photo_url" />
            <span v-else>{{ profileInitials }}</span>
          </q-avatar>
          <div class="text-h6 text-weight-bold">{{ profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() }}</div>
          <div class="text-caption text-muted">{{ profile?.email }}</div>
          <div class="text-caption text-amber-4 q-mt-xs">{{ profile?.territory || 'Unassigned Territory' }}</div>
          
          <q-btn flat dense color="amber-4" label="Change Photo" size="sm" class="q-mt-sm" @click="simulatePhotoUpload" />
        </div>

        <q-separator dark class="q-mb-md" />

        <q-tabs
          v-model="activeTab"
          vertical
          dense
          active-color="amber-4"
          active-bg-color="grey-9"
          indicator-color="amber-4"
          class="text-muted text-left"
          style="width: 100%"
        >
          <q-tab name="personal" icon="person" label="Personal Info" class="justify-start q-pl-md" />
          <q-tab name="branding" icon="palette" label="Institution Branding" class="justify-start q-pl-md" />
          <q-tab name="kyc" icon="verified_user" label="KYC Documents" class="justify-start q-pl-md" />
          <q-tab name="security" icon="security" label="Security & MFA" class="justify-start q-pl-md" />
          <q-tab name="idcard" icon="badge" label="Identity Card" class="justify-start q-pl-md" />
        </q-tabs>
      </div>

      <!-- Tab Content Area -->
      <div class="col-xs-12 col-md-9 bg-panel border-muted rounded-borders q-pa-lg column overflow-auto custom-scrollbar">
        
        <!-- PERSONAL INFO TAB -->
        <div v-if="activeTab === 'personal'" class="column op-gap-16">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm">Personal Information</div>
          <q-form @submit="updateProfile" class="column op-gap-16">
            <div class="row op-gap-16">
              <q-input dark outlined dense v-model="formData.first_name" label="First Name" class="col" color="amber-4" />
              <q-input dark outlined dense v-model="formData.last_name" label="Last Name" class="col" color="amber-4" />
            </div>
            <div class="row op-gap-16">
              <q-input dark outlined dense v-model="formData.email" label="Email Address" type="email" class="col" color="amber-4" />
              <q-input dark outlined dense v-model="formData.phone_number" label="Mobile Number" class="col" color="amber-4" />
            </div>
            <q-input dark outlined dense v-model="formData.residential_address" label="Residential Address" type="textarea" rows="3" color="amber-4" />
            
            <div class="row justify-end q-mt-sm">
              <q-btn type="submit" color="amber-4" text-color="black" label="Save Changes" :loading="saving" />
            </div>
          </q-form>
        </div>

        <!-- INSTITUTION BRANDING TAB -->
        <div v-if="activeTab === 'branding'" class="column op-gap-16">
          <div class="row items-center justify-between border-bottom-light q-pb-sm">
            <div>
              <div class="text-h6 text-weight-bold">Institution Branding & Identity</div>
              <div class="text-caption text-muted">Manage your institution's official brand logo displayed across invoices, student portals, and health certificates.</div>
            </div>
            <q-badge color="teal-9" text-color="teal-2" class="text-caption">
              Classification: {{ profile?.institution_type || 'INSTITUTION' }}
            </q-badge>
          </div>

          <div class="bg-panel-darker q-pa-md rounded-borders border-muted column op-gap-16" style="max-width: 600px;">
            <div class="row items-center justify-between">
              <div>
                <div class="text-weight-bold">Official Institution Logo</div>
                <div class="text-caption text-muted">PNG, JPEG, or WebP. Max 3MB. Standard 512x512 canvas recommended.</div>
              </div>
              <q-btn
                v-if="profile?.logo_url || profile?.logoUrl"
                flat
                dense
                size="sm"
                color="red-4"
                label="Remove Logo"
                icon="delete"
                :loading="updatingLogo"
                @click="removeInstitutionLogo"
              />
            </div>

            <!-- Current / Preview Logo Avatar -->
            <div class="row items-center op-gap-16">
              <q-avatar size="80px" class="bg-panel rounded-borders border-muted shadow-2">
                <img v-if="logoPreviewUrl || profile?.logo_url || profile?.logoUrl" :src="logoPreviewUrl || profile?.logo_url || profile?.logoUrl" alt="Institution Logo" style="object-fit: contain;" />
                <q-icon v-else name="account_balance" size="40px" color="grey-6" />
              </q-avatar>
              <div class="column col op-gap-4">
                <div class="text-weight-bold">{{ profile?.institution_name || profile?.name || 'Your Institution' }}</div>
                <div class="text-caption text-muted">
                  {{ (logoPreviewUrl || profile?.logo_url || profile?.logoUrl) ? 'Official logo active on public documents and portals' : 'No official logo configured yet' }}
                </div>
                <div v-if="logoFile" class="text-caption text-cyan-3">
                  Selected: {{ logoFile.name }} ({{ (logoFile.size / 1024).toFixed(0) }} KB)
                </div>
              </div>
            </div>

            <!-- Upload File Input -->
            <div class="row items-center op-gap-12">
              <div class="col">
                <q-file
                  v-model="logoFile"
                  dark
                  filled
                  dense
                  label="Select Logo File (PNG/JPEG/WebP, Max 3MB, 512x512)"
                  accept="image/png,image/jpeg,image/webp"
                  class="bg-panel text-caption"
                  :loading="updatingLogo"
                  @update:model-value="onLogoFileSelected"
                >
                  <template v-slot:prepend><q-icon name="cloud_upload" color="cyan-3" /></template>
                  <template v-slot:append v-if="logoFile">
                    <q-icon name="close" class="cursor-pointer" @click.stop="clearProfileLogoSelection" />
                  </template>
                </q-file>
              </div>
              <q-btn
                v-if="logoFile"
                color="amber-4"
                text-color="black"
                label="Upload & Save"
                icon="save"
                no-caps
                :loading="updatingLogo"
                @click="uploadInstitutionLogo"
              />
            </div>
          </div>
        </div>

        <!-- KYC TAB -->
        <div v-if="activeTab === 'kyc'" class="column op-gap-16">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm">KYC Documents</div>
          <div class="text-caption text-muted">Upload and manage your required verification documents.</div>
          
          <div class="column op-gap-8">
            <div v-for="doc in kycTypes" :key="doc.value" class="bg-panel-darker q-pa-md rounded-borders border-muted row items-center justify-between">
              <div class="row items-center op-gap-16">
                <q-icon :name="doc.icon" size="md" color="grey-6" />
                <div>
                  <div class="text-weight-bold">{{ doc.label }}</div>
                  <div class="text-caption text-muted">{{ getKycStatus(doc.value).statusText }}</div>
                </div>
              </div>
              <div class="row items-center op-gap-8">
                <q-badge :color="getKycStatus(doc.value).color" text-color="black">
                  {{ getKycStatus(doc.value).badge }}
                </q-badge>
                <q-btn v-if="doc.value === 'BVN' && !getKycStatus(doc.value).exists" dense flat color="amber-4" label="Provide BVN" @click="promptBvn" />
                <q-btn v-else-if="!getKycStatus(doc.value).exists" dense flat color="amber-4" icon="upload" @click="simulateKycUpload(doc.value)">
                  <q-tooltip>Upload Document</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- SECURITY & MFA TAB -->
        <div v-if="activeTab === 'security'" class="column op-gap-16">
          <div class="text-h6 text-weight-bold border-bottom-light q-pb-sm">Security Center</div>
          
          <!-- Password -->
          <div class="bg-panel-darker q-pa-md rounded-borders border-muted column op-gap-8">
            <div class="text-weight-bold">Change Password</div>
            <div class="row op-gap-16">
              <q-input dark outlined dense v-model="securityData.new_password" type="password" label="New Password" class="col" color="amber-4" />
              <q-btn color="amber-4" text-color="black" label="Update" @click="changePassword" :loading="saving" />
            </div>
          </div>

          <!-- MFA -->
          <div class="bg-panel-darker q-pa-md rounded-borders border-muted row items-center justify-between">
            <div>
              <div class="text-weight-bold row items-center op-gap-8">
                <q-icon name="shield" :color="profile?.profile?.mfa_enabled ? 'green-4' : 'grey-6'" />
                Two-Factor Authentication (MFA)
              </div>
              <div class="text-caption text-muted">Protect your account with an authenticator app.</div>
            </div>
            <q-btn 
              :color="profile?.profile?.mfa_enabled ? 'red-9' : 'green-9'" 
              :text-color="profile?.profile?.mfa_enabled ? 'red-3' : 'green-3'" 
              :label="profile?.profile?.mfa_enabled ? 'Disable MFA' : 'Enable MFA'" 
              @click="toggleMfa" 
            />
          </div>

          <!-- Sessions -->
          <div class="bg-panel-darker q-pa-md rounded-borders border-muted column op-gap-8">
            <div class="text-weight-bold">Active Sessions & History</div>
            <div v-if="!sessions.length" class="text-caption text-muted">No session data available.</div>
            <table v-else class="enterprise-table full-width text-left" style="border-collapse: collapse;">
              <thead class="text-muted text-metric-mono" style="font-size: 10px;">
                <tr>
                  <th class="q-pa-sm border-bottom">Event / Device</th>
                  <th class="q-pa-sm border-bottom">IP Address</th>
                  <th class="q-pa-sm border-bottom">Time</th>
                </tr>
              </thead>
              <tbody class="text-caption">
                <tr v-for="s in sessions" :key="s.id" class="border-bottom-light">
                  <td class="q-pa-sm">{{ s.event_type || 'Active Session' }}</td>
                  <td class="q-pa-sm text-metric-mono">{{ s.ip_address }}</td>
                  <td class="q-pa-sm">{{ new Date(s.created_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- IDENTITY CARD TAB -->
        <div v-if="activeTab === 'idcard'" class="column op-gap-16 flex-center">
          <div class="text-h6 text-weight-bold q-mb-md">Digital Agent Card</div>
          
          <div class="id-card bg-panel-darker border-muted rounded-borders column shadow-4 relative-position overflow-hidden">
            <div class="bg-amber-4 q-pa-sm text-center text-weight-bold text-black text-h6">
              INVIFY
            </div>
            <div class="q-pa-lg row items-center op-gap-16">
              <q-avatar size="100px" class="shadow-2 border-muted">
                <img :src="profile?.profile?.photo_url || profile?.profile?.profile_photo_url || 'https://cdn.quasar.dev/img/avatar.png'" />
              </q-avatar>
              <div class="column flex-1">
                <div class="text-h5 text-weight-bold">{{ profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() }}</div>
                <div class="text-caption text-amber-4 text-uppercase">Field Agent</div>
                <div class="text-metric-mono text-muted q-mt-sm" style="font-size: 11px;">
                  <div>ID: {{ profile?.agent_code }}</div>
                  <div>TERR: {{ profile?.territory }}</div>
                  <div>ISSUED: {{ new Date(profile?.created_at).toLocaleDateString() }}</div>
                </div>
              </div>
              <div class="bg-white q-pa-xs rounded-borders">
                <qrcode-vue v-if="qrData.url" :value="qrData.url" :size="80" level="M" />
              </div>
            </div>
            <div class="bg-black text-center text-muted q-pa-xs text-metric-mono" style="font-size: 9px;">
              PROPERTY OF INVIFY - SCAN QR TO VERIFY
            </div>
          </div>

          <q-btn outline color="amber-4" icon="print" label="Download Card" class="q-mt-lg" />
        </div>

      </div>
    </div>

    <!-- MFA Setup Modal -->
    <q-dialog v-model="showMfaModal" persistent>
      <q-card class="bg-panel text-main" style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Setup Authenticator</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="column flex-center op-gap-16 q-pt-md">
          <div class="bg-white q-pa-sm rounded-borders">
            <qrcode-vue v-if="mfaSetupData.qrCodeUri" :value="mfaSetupData.qrCodeUri" :size="200" level="M" />
          </div>
          <div class="text-caption text-center text-muted">
            Scan this QR code with Google Authenticator or Authy.
          </div>
          <div class="text-metric-mono text-amber-4 text-center">
            Secret: {{ mfaSetupData.secret }}
          </div>
          <q-input dark outlined v-model="mfaVerifyCode" label="Enter 6-digit Code" color="amber-4" class="full-width" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn label="Verify & Enable" color="amber-4" text-color="black" @click="verifyMfa" :loading="saving" :disable="!mfaVerifyCode || mfaVerifyCode.length < 6" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'
import { pickInstituteCode } from '../../utils/instituteIdentity'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)

const profile = ref(null)
const kycDocs = ref([])
const sessions = ref([])
const qrData = ref({})
const showMfaModal = ref(false)
const mfaSetupData = ref({})
const mfaVerifyCode = ref('')

const activeTab = ref('personal')
const profileCode = computed(() =>
  pickInstituteCode(profile.value?.agent_code, profile.value?.agentCode),
)

const profileInitials = computed(() => {
  const name = profile.value?.name || `${profile.value?.first_name || ''} ${profile.value?.last_name || ''}`.trim() || profile.value?.email || ''
  const parts = String(name).split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase() || '?'
})

const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  residential_address: ''
})

const securityData = ref({
  new_password: ''
})

const kycTypes = [
  { label: 'Passport Photograph', value: 'PASSPORT', icon: 'face' },
  { label: 'Government ID', value: 'GOVT_ID', icon: 'badge' },
  { label: 'Bank Verification Number (BVN)', value: 'BVN', icon: 'account_balance' },
  { label: 'Proof of Address', value: 'PROOF_OF_ADDRESS', icon: 'home' }
]

const fetchProfileData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    if (!token) {
      router.push('/institute/login')
      return
    }
    try {
      const stored = JSON.parse(localStorage.getItem('invify_agent_info') || 'null')
      if (stored) profile.value = stored
    } catch { /* ignore */ }

    const headers = { Authorization: `Bearer ${token}` }
    const [pRes, kycRes, secRes, qrRes] = await Promise.allSettled([
      axios.get('/api/agent/profile', { headers }),
      axios.get('/api/agent/profile/kyc', { headers }),
      axios.get('/api/agent/security/sessions', { headers }),
      axios.get('/api/agent/profile/id-card', { headers }),
    ])

    if (pRes.status === 'fulfilled' && pRes.value.data?.data) {
      profile.value = pRes.value.data.data
    }
    kycDocs.value = kycRes.status === 'fulfilled' ? (kycRes.value.data.data || []) : []
    sessions.value = secRes.status === 'fulfilled' ? (secRes.value.data.data?.history || []) : []
    qrData.value = qrRes.status === 'fulfilled' ? (qrRes.value.data.data || {}) : {}

    formData.value = {
      first_name: profile.value?.first_name || '',
      last_name: profile.value?.last_name || '',
      email: profile.value?.email || '',
      phone_number: profile.value?.phone_number || profile.value?.phone || '',
      residential_address: profile.value?.profile?.residential_address || profile.value?.profile?.address || '',
    }

    if (pRes.status === 'rejected') {
      $q.notify({ type: 'negative', message: 'Failed to load profile data' })
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Failed to load profile data' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (String(route.query.tab || '') === 'security') activeTab.value = 'security'
  fetchProfileData()
})

const updateProfile = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.patch('/api/agent/profile', formData.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data?.data) profile.value = res.data.data
    $q.notify({ type: 'positive', message: 'Profile updated successfully' })
    await fetchProfileData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to update profile' })
  } finally {
    saving.value = false
  }
}

const simulatePhotoUpload = async () => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('/api/agent/profile/photo', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: 'Photo updated' })
    await fetchProfileData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to upload photo' })
  }
}

const simulateKycUpload = async (type) => {
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('/api/agent/profile/kyc', { type }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: `${type} document uploaded` })
    await fetchProfileData()
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Upload failed' })
  }
}

const promptBvn = () => {
  $q.dialog({
    title: 'Provide BVN',
    message: 'Enter your 11-digit Bank Verification Number',
    prompt: { model: '', type: 'text' },
    cancel: true,
    persistent: true
  }).onOk(async data => {
    if (data.length !== 11) {
      $q.notify({ type: 'negative', message: 'BVN must be 11 digits' })
      return
    }
    try {
      const token = localStorage.getItem('invify_agent_token')
      await axios.post('/api/agent/profile/kyc', { type: 'BVN', document_number: data }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      $q.notify({ type: 'positive', message: 'BVN linked successfully' })
      await fetchProfileData()
    } catch (err) {
      $q.notify({ type: 'negative', message: 'Failed to link BVN' })
    }
  })
}

const getKycStatus = (type) => {
  // If BVN and masked BVN exists in profile
  if (type === 'BVN' && profile.value?.profile?.bvn_masked) {
    return { exists: true, badge: profile.value.profile.bvn_masked, color: 'green-4', statusText: 'Verified automatically' }
  }

  const doc = kycDocs.value.find(d => d.document_type === type)
  if (!doc) return { exists: false, badge: 'MISSING', color: 'red-4', statusText: 'Action required' }
  
  if (doc.status === 'APPROVED') return { exists: true, badge: 'APPROVED', color: 'green-4', statusText: 'Verified' }
  if (doc.status === 'REJECTED') return { exists: false, badge: 'REJECTED', color: 'red-4', statusText: 'Please re-upload' }
  return { exists: true, badge: 'PENDING', color: 'amber-4', statusText: 'Under review by Ops' }
}

const changePassword = async () => {
  if (!securityData.value.new_password) return
  saving.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('/api/agent/security/change-password', securityData.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: 'Password updated' })
    securityData.value.new_password = ''
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Password update failed' })
  } finally {
    saving.value = false
  }
}

const toggleMfa = async () => {
  const isEnabled = profile.value?.profile?.mfa_enabled
  if (isEnabled) {
    $q.dialog({
      title: 'Disable 2FA',
      message: 'Enter the current 6-digit authenticator code to disable 2FA.',
      prompt: { model: '', type: 'text' },
      cancel: true,
      persistent: true,
      dark: true,
    }).onOk(async (code) => {
      try {
        const token = localStorage.getItem('invify_agent_token')
        await axios.post('/api/agent/security/mfa/disable', { code }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        $q.notify({ type: 'positive', message: '2FA disabled' })
        await fetchProfileData()
      } catch (err) {
        $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Failed to disable 2FA' })
      }
    })
    return
  }

  try {
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.post('/api/agent/security/mfa/enable', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    mfaSetupData.value = res.data
    mfaVerifyCode.value = ''
    showMfaModal.value = true
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Failed to start 2FA setup' })
  }
}

const verifyMfa = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.post('/api/agent/security/mfa/verify', { code: mfaVerifyCode.value }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    $q.notify({ type: 'positive', message: '2FA enabled' })
    showMfaModal.value = false
    await fetchProfileData()
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Invalid verification code' })
  } finally {
    saving.value = false
  }
}

// Institution Official Logo Management
const logoFile = ref(null)
const logoPreviewUrl = ref('')
const updatingLogo = ref(false)

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
  reader.onerror = (error) => reject(error)
})

const onLogoFileSelected = (file) => {
  if (!file) {
    logoPreviewUrl.value = ''
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: 'Logo file size exceeds the 3MB limit.', position: 'top-right' })
    logoFile.value = null
    logoPreviewUrl.value = ''
    return
  }
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!allowed.includes(file.type)) {
    $q.notify({ type: 'negative', message: 'Only PNG, JPEG, and WebP logos are supported.', position: 'top-right' })
    logoFile.value = null
    logoPreviewUrl.value = ''
    return
  }
  logoPreviewUrl.value = URL.createObjectURL(file)
}

const clearProfileLogoSelection = () => {
  logoFile.value = null
  logoPreviewUrl.value = ''
}

const uploadInstitutionLogo = async () => {
  if (!logoFile.value) return
  updatingLogo.value = true
  try {
    const base64Data = await toBase64(logoFile.value)
    const token = localStorage.getItem('invify_agent_token')
    const res = await axios.post('/api/agent/profile/logo', {
      logoImage: base64Data
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const newUrl = res.data?.logoUrl || ''
    if (profile.value) {
      profile.value.logo_url = newUrl
      profile.value.logoUrl = newUrl
    }
    clearProfileLogoSelection()
    $q.notify({ type: 'positive', message: 'Institution logo updated successfully', position: 'top-right' })
    await fetchProfileData()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Logo update failed: ${msg}`, position: 'top-right' })
  } finally {
    updatingLogo.value = false
  }
}

const removeInstitutionLogo = async () => {
  updatingLogo.value = true
  try {
    const token = localStorage.getItem('invify_agent_token')
    await axios.delete('/api/agent/profile/logo', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (profile.value) {
      profile.value.logo_url = null
      profile.value.logoUrl = null
    }
    clearProfileLogoSelection()
    $q.notify({ type: 'positive', message: 'Institution logo removed successfully', position: 'top-right' })
    await fetchProfileData()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Logo removal failed: ${msg}`, position: 'top-right' })
  } finally {
    updatingLogo.value = false
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
.font-inter { font-family: 'Inter', Roboto, sans-serif; }

.id-card {
  width: 100%;
  max-width: 450px;
  background-image: linear-gradient(145deg, #12181c 0%, #0e1216 100%);
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #0b0f12; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #22282d; border-radius: 3px; }
</style>
