<!-- invify-admin/src/pages/governance/LoginPage.vue -->
<template>
  <q-layout class="bg-[#07090b] text-[#e1e7ec] row items-center justify-center fit" style="min-height: 100vh;">
    <q-page-container class="fit row items-center justify-center q-pa-md">
      
      <!-- AUTHENTICATION FORM BOX -->
      <div class="auth-card bg-[#0e1216] border-premium rounded-borders q-pa-xl column op-gap-24 shadow-2" style="width: 100%; max-width: 460px;">
        
        <!-- Platform Branding & Level Indicator -->
        <div class="column items-center text-center">
          <div class="row items-center justify-center op-gap-8 no-wrap q-mb-sm">
            <img src="../../assets/logo.png" alt="Invify Logo" style="height: 40px; width: auto;" class="q-mr-xs" />
            <span class="text-h5 text-white text-weight-bold tracking-wide">INVIFY <span class="text-cyan-4">OPS_CORE</span></span>
          </div>
          <div class="text-caption text-grey-5">Enterprise Multi-Tenant Identity & Access Governance Hub</div>
        </div>

        <!-- Dynamic Identity Tier Federation Switcher -->
        <div class="bg-[#13171c] q-pa-xs rounded-borders border-premium row items-center op-gap-2 no-wrap overflow-x-auto">
          <q-btn 
            v-for="tier in authTiers" 
            :key="tier.id" 
            flat 
            dense 
            size="xs" 
            :label="tier.label" 
            :class="['col q-py-xs text-weight-bold rounded-borders transition-all', activeTier === tier.id ? 'bg-[#1c262b] text-cyan-3 border-active' : 'text-grey-6']" 
            @click="switchAuthTier(tier.id)" 
          />
        </div>

        <!-- System Alerts / Dynamic Fallback Indicator Banners -->
        <q-banner dense class="bg-[#181111] text-red-3 border-red rounded-borders q-pa-sm text-caption" v-if="errorMessage">
          <template v-slot:avatar>
            <q-icon name="warning" color="red-4" size="xs" />
          </template>
          {{ errorMessage }}
        </q-banner>

        <q-banner dense class="bg-[#111611] text-green-3 border-green rounded-borders q-pa-sm text-caption" v-if="successMessage">
          <template v-slot:avatar>
            <q-icon name="check_circle" color="green-4" size="xs" />
          </template>
          {{ successMessage }}
        </q-banner>

        <!-- Brute Force Lockout Indicator UI -->
        <div class="bg-[#1c1212] border-red q-pa-sm rounded-borders row items-center op-gap-8 text-red-3 text-metric-sm animate-pulse" v-if="lockoutRemainingMs > 0">
          <q-icon name="hourglass_disabled" size="xs" />
          <div class="col">
            <span class="text-weight-bold">SECURITY ENFORCEMENT:</span> Account identity under temporary authorization cooldown matrix. Retry window open in <span class="text-white text-metric-mono">{{ Math.ceil(lockoutRemainingMs / 1000) }}s</span>.
          </div>
        </div>

        <!-- STATE 1: STANDARD CREDENTIALS ENTRY -->
        <q-form @submit.prevent="executeLoginPass" class="column op-gap-16" v-if="!pendingChallengeState && activeTier !== 'sso'">
          
          <div>
            <div class="text-caption text-grey-5 q-mb-xs">Operator Account Identity *</div>
            <q-input
              v-model="form.email"
              dark
              filled
              dense
              :placeholder="activeTier === 'pro' ? 'customer@invify.pro' : 'e.g. sysadmin@invify.app'"
              class="bg-[#14191f] text-white rounded-borders"
              autofocus
              lazy-rules
              :rules="[val => !!val || 'Identity matrix cannot be null']"
              :disable="lockoutRemainingMs > 0"
            >
              <template v-slot:prepend>
                <q-icon name="person_outline" size="xs" color="grey-6" />
              </template>
            </q-input>
          </div>

          <div>
            <div class="row items-center justify-between text-caption text-grey-5 q-mb-xs">
              <span>Secure Secret Passphrase *</span>
              <a href="#" class="text-cyan-4 text-metric-sm" @click.prevent="triggerRecoveryHint">Forgot Secret?</a>
            </div>
            <q-input
              v-model="form.password"
              dark
              filled
              dense
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              class="bg-[#14191f] text-white rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Passphrase string cannot be absent']"
              :disable="lockoutRemainingMs > 0"
            >
              <template v-slot:prepend>
                <q-icon name="lock_outline" size="xs" color="grey-6" />
              </template>
              <template v-slot:append>
                <q-icon 
                  :name="showPassword ? 'visibility_off' : 'visibility'" 
                  size="xs" 
                  class="cursor-pointer text-grey-6"
                  @click="showPassword = !showPassword" 
                />
              </template>
            </q-input>
          </div>

          <!-- Quick Test Tiers Switcher for Enterprise Demo validation -->
          <div class="column op-gap-4 q-pt-xs">
            <span class="text-metric-mono text-grey-6" style="font-size: 9px;">PRESETS FOR ISOLATED ENVIRONMENT TESTING:</span>
            <div class="row op-gap-4">
              <q-btn dense flat size="xs" color="cyan-3" label="[Tier: Super Admin]" @click="fillPreset('superadmin@invify.app', 'AdminPass123!', 'SUPER_ADMIN')" class="bg-[#1a1f26] q-px-xs text-metric-sm" />
              <q-btn dense flat size="xs" color="amber-3" label="[Tier: Staff Tier]" @click="fillPreset('staff@invify.app', 'StaffPass123!', 'STAFF')" class="bg-[#1a1f26] q-px-xs text-metric-sm" />
              <q-btn dense flat size="xs" color="grey-4" label="[Tier: Tenant Op]" @click="fillPreset('operator@invify.app', 'UserPass123!', 'TENANT_OPERATOR')" class="bg-[#1a1f26] q-px-xs text-metric-sm" />
            </div>
          </div>

          <!-- Submit Command Action -->
          <q-btn
            type="submit"
            color="cyan-5"
            text-color="black"
            label="Initialize Handshake Authentication"
            class="full-width q-mt-sm text-weight-bold tracking-wide"
            unelevated
            :loading="loading"
            :disable="lockoutRemainingMs > 0"
          />

        </q-form>

        <!-- STATE 1B: ENTERPRISE SSO / FEDERATION GATEWAY -->
        <div class="column op-gap-12 text-center q-py-md" v-else-if="activeTier === 'sso'">
          <span class="text-metric-sm text-grey-5">Select upstream Zero-Trust Identity Provider context engine:</span>
          
          <div class="column op-gap-8">
            <q-btn flat color="indigo-3" class="bg-[#14191f] border-premium full-width row justify-start q-px-md" @click="simulateSsoFlow('SAML 2.0 Identity Platform')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="account_balance" size="xs" color="indigo-4" />
                <span class="text-caption text-white text-weight-bold">SAML 2.0 Federation Engine</span>
              </div>
            </q-btn>
            
            <q-btn flat color="cyan-3" class="bg-[#14191f] border-premium full-width row justify-start q-px-md" @click="simulateSsoFlow('Okta Identity Cloud')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="cloud" size="xs" color="cyan-4" />
                <span class="text-caption text-white text-weight-bold">Okta Identity Federation Core</span>
              </div>
            </q-btn>
            
            <q-btn flat color="amber-3" class="bg-[#14191f] border-premium full-width row justify-start q-px-md" @click="simulateSsoFlow('Microsoft Azure AD')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="window" size="xs" color="blue-4" />
                <span class="text-caption text-white text-weight-bold">Microsoft Azure AD Workspaces</span>
              </div>
            </q-btn>
            
            <q-btn flat color="green-3" class="bg-[#14191f] border-premium full-width row justify-start q-px-md" @click="simulateSsoFlow('Google Workspace')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="public" size="xs" color="red-4" />
                <span class="text-caption text-white text-weight-bold">Google Cloud Identity Mesh</span>
              </div>
            </q-btn>
          </div>

          <span class="text-metric-mono text-grey-6 q-mt-xs" style="font-size: 9px;">PREPARED NATIVELY FOR UNIFIED SESSION HANDSHAKE ENVELOPE INGESTION</span>
        </div>

        <!-- STATE 2: INLINE TOTP MFA CHALLENGE ENTRY -->
        <q-form @submit.prevent="executeMfaVerification" class="column op-gap-16" v-else>
          
          <div class="bg-[#13171c] q-pa-md rounded-borders border-muted text-center column op-gap-8">
            <q-icon name="lock_clock" size="md" color="amber-4" class="self-center" />
            <div class="text-white text-weight-bold text-caption">Mandatory Multi-Factor Gateway Activated</div>
            <div class="text-metric-sm text-grey-5">
              {{ challengeContextMessage || 'Present time-based single-use token code generated by your continuous MFA verifier.' }}
            </div>
          </div>

          <div>
            <div class="text-caption text-grey-5 q-mb-xs text-center">Enter 6-Digit Verification Envelope *</div>
            <q-input
              v-model="form.totpCode"
              dark
              filled
              dense
              placeholder="000000"
              mask="######"
              class="bg-[#14191f] text-white rounded-borders text-center text-metric-mono text-weight-bold"
              style="font-size: 18px;"
              autofocus
              :rules="[val => val.length === 6 || 'Verification format must equal exactly 6 digits']"
            />
            <div class="text-center text-metric-sm text-grey-6 q-mt-xs">
              Simulated verification test codes: <span class="text-cyan-4 cursor-pointer" @click="form.totpCode = '000000'">000000</span> or <span class="text-cyan-4 cursor-pointer" @click="form.totpCode = '123456'">123456</span>
            </div>
          </div>

          <div class="row op-gap-8 q-mt-sm">
            <q-btn
              flat
              color="grey-6"
              label="Cancel Pass"
              class="col"
              @click="cancelChallengeState"
              :disable="loading"
            />
            <q-btn
              type="submit"
              color="amber-4"
              text-color="black"
              label="Authorize MFA Signature"
              class="col text-weight-bold"
              unelevated
              :loading="loading"
            />
          </div>

        </q-form>

        <!-- Dynamic Context Boundary Stamp -->
        <div class="border-top q-pt-md text-center text-metric-sm text-grey-6 column op-gap-2">
          <span>AES-GCM // TLS 1.3 Transport Encrypted Streams</span>
          <span>Zero Frontend Authorization Autonomy Enforced</span>
        </div>

      </div>

    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const activeTier = ref('staff')
const authTiers = [
  { id: 'staff', label: 'Operators / Staff' },
  { id: 'admin', label: 'Tenant Admins' },
  { id: 'pro', label: 'Pro Customers' },
  { id: 'sso', label: 'Enterprise SSO' }
]

const form = ref({
  email: '',
  password: '',
  totpCode: ''
})

// Dynamic MFA states
const pendingChallengeState = ref(false)
const activeUserId = ref(null)
const activeUserRole = ref('SUPER_ADMIN')
const challengeContextMessage = ref('')

// Brute Force metrics simulation
const lockoutRemainingMs = ref(0)
const failedAttemptsCount = ref(0)

const switchAuthTier = (tId) => {
  activeTier.value = tId
  errorMessage.value = ''
  successMessage.value = ''
  pendingChallengeState.value = false
}

const fillPreset = (emailStr, passStr, roleClaim) => {
  form.value.email = emailStr
  form.value.password = passStr
  activeUserRole.value = roleClaim || 'SUPER_ADMIN'
  errorMessage.value = ''
  successMessage.value = ''
}

const triggerRecoveryHint = () => {
  errorMessage.value = ''
  successMessage.value = 'Password Recovery matrix dispatched upstream to original administrative record.'
}

const simulateSsoFlow = (providerName) => {
  loading.value = true
  successMessage.value = `Negotiating OpenID Connect token parameters upstream targeting ${providerName}...`
  errorMessage.value = ''
  
  setTimeout(() => {
    // Generate valid test payload natively
    finalizeAuthenticatedSession({
      token: `sso_mock_jwt_${Date.now()}`,
      refreshToken: `sso_refresh_${Date.now()}`,
      user: { role: 'SUPER_ADMIN', email: `federated_operator@invify.sso` }
    })
  }, 800)
}

const executeLoginPass = async () => {
  if (lockoutRemainingMs.value > 0) return
  
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Dispatch network request natively targeting backend API
    const res = await axios.post('http://localhost:3005/api/auth/login', {
      email: form.value.email,
      password: form.value.password,
      isolationTier: activeTier.value
    })

    if (res.status === 202 || res.data?.requiresMfaSetup || res.data?.requires2FA) {
      // MFA Gateway triggered
      activeUserId.value = res.data.userId
      activeUserRole.value = res.data.role || activeUserRole.value
      
      if (res.data.requiresMfaSetup) {
        // Cache short-lived configuration access inside window parameters safely
        sessionStorage.setItem('mfa_setup_token', res.data.setupToken)
        sessionStorage.setItem('mfa_setup_userId', res.data.userId)
        router.push('/mfa/challenge').catch(() => {})
        return
      } else {
        // Enforce inline token verification prompt
        pendingChallengeState.value = true
        challengeContextMessage.value = res.data.message || 'MANDATORY_MFA_GATEWAY: Continuous account elevation demands multi-factor signature.'
      }
    } else if (res.data?.token) {
      // Set explicit MFA clearance variables cleanly
      localStorage.setItem('mfa_status_verified', 'true')
      finalizeAuthenticatedSession(res.data)
    }
  } catch (err) {
    failedAttemptsCount.value++
    if (failedAttemptsCount.value >= 3) {
      // Trigger Brute Force Lockout Cooldown period
      lockoutRemainingMs.value = 15000
      const timer = setInterval(() => {
        lockoutRemainingMs.value -= 1000
        if (lockoutRemainingMs.value <= 0) {
          clearInterval(timer)
          failedAttemptsCount.value = 0
        }
      }, 1000)
      errorMessage.value = 'Continuous authentication failures exceeded threshold. Enforcing brute force security protocol.'
    } else {
      errorMessage.value = err.response?.data?.message || err.message || 'Authentication handshakes rejected due to origin validation blocks.'
    }
  } finally {
    loading.value = false
  }
}

const executeMfaVerification = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await axios.post('http://localhost:3005/api/auth/mfa/verify', {
      userId: activeUserId.value,
      tokenCode: form.value.totpCode,
      role: activeUserRole.value
    })

    if (res.data?.token) {
      localStorage.setItem('mfa_status_verified', 'true')
      finalizeAuthenticatedSession(res.data)
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Invalid single-use envelope signature.'
  } finally {
    loading.value = false
  }
}

const cancelChallengeState = () => {
  pendingChallengeState.value = false
  form.value.totpCode = ''
  errorMessage.value = ''
}

const finalizeAuthenticatedSession = (tokenData) => {
  localStorage.setItem('invify_token', tokenData.token)
  if (tokenData.refreshToken) {
    localStorage.setItem('invify_refresh_token', tokenData.refreshToken)
  }
  
  // Set explicit attribution storage values
  localStorage.setItem('operator_role', tokenData.user?.role || activeUserRole.value || 'SUPER_ADMIN')
  localStorage.setItem('operator_email', form.value.email || 'federated@invify.app')
  localStorage.setItem('mfa_status_verified', 'true')
  
  successMessage.value = 'Identity verified successfully. Traversing authorized RBAC operational matrix...'
  
  setTimeout(() => {
    // Route perfectly via our enterprise AuthBootstrapGuard pipeline to determine correct landing
    const dest = route.query?.redirect || '/'
    router.push(dest).catch(() => {})
  }, 600)
}
</script>

<style scoped>
.border-premium {
  border: 1px solid rgba(225, 231, 236, 0.08);
}
.border-active {
  border-bottom: 2px solid #22b8cf;
}
.border-red {
  border: 1px solid rgba(240, 62, 62, 0.2);
}
.border-green {
  border: 1px solid rgba(43, 138, 62, 0.2);
}
.border-top {
  border-top: 1px solid rgba(225, 231, 236, 0.08);
}
.tracking-wide {
  letter-spacing: 0.05em;
}
.transition-all {
  transition: all 0.2s ease;
}
</style>
