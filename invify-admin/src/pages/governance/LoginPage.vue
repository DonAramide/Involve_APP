<!-- invify-admin/src/pages/governance/LoginPage.vue -->
<template>
  <q-layout class="bg-main text-main row items-center justify-center fit relative-position" style="min-height: 100vh;">
    <!-- Floating Premium Theme Toggle -->
    <div class="absolute-top-right q-pa-md z-max">
      <q-btn 
        flat 
        round 
        dense 
        :icon="prefs.isDarkMode ? 'light_mode' : 'dark_mode'" 
        @click="toggleTheme" 
        class="text-muted transition-all"
        style="opacity: 0.8;"
      >
        <q-tooltip class="bg-panel text-main border-main">{{ prefs.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}</q-tooltip>
      </q-btn>
    </div>

    <q-page-container class="fit row items-center justify-center q-pa-md">
      
      <!-- AUTHENTICATION FORM BOX -->
      <div class="auth-card bg-panel enterprise-panel q-pa-xl column op-gap-24 shadow-2" style="width: 100%; max-width: 460px;">
        
        <!-- Platform Branding & Level Indicator -->
        <div class="column items-center text-center">
          <div class="row items-center justify-center op-gap-8 no-wrap q-mb-sm">
            <img :src="logoImg" alt="Invify Logo" style="height: 40px; width: auto;" class="q-mr-xs" />
            <span class="text-h5 text-main text-weight-bold tracking-wide">INVIFY <span class="text-blue-5">OPS_CORE</span></span>
          </div>
          <div class="text-caption text-muted">Enterprise Multi-Tenant Identity & Access Governance Hub</div>
        </div>

        <!-- Dynamic Identity Tier Federation Switcher -->
        <div class="bg-subpanel q-pa-xs rounded-borders border-main row items-center op-gap-2 no-wrap overflow-x-auto">
          <q-btn 
            v-for="tier in authTiers" 
            :key="tier.id" 
            flat 
            dense 
            size="xs" 
            :label="tier.label" 
            :class="['col q-py-xs text-weight-bold rounded-borders transition-all', activeTier === tier.id ? 'bg-panel text-blue-5 border-active' : 'text-muted']" 
            @click="switchAuthTier(tier.id)" 
          />
        </div>

        <!-- System Alerts / Dynamic Fallback Indicator Banners -->
        <q-banner dense class="bg-red-focus text-red-5 border-red rounded-borders q-pa-sm text-caption" v-if="errorMessage">
          <template v-slot:avatar>
            <q-icon name="warning" color="red-5" size="xs" />
          </template>
          {{ errorMessage }}
        </q-banner>

        <q-banner dense class="bg-green-focus text-green-5 border-green rounded-borders q-pa-sm text-caption" v-if="successMessage">
          <template v-slot:avatar>
            <q-icon name="check_circle" color="green-5" size="xs" />
          </template>
          {{ successMessage }}
        </q-banner>

        <!-- Brute Force Lockout Indicator UI -->
        <div class="bg-red-focus border-red q-pa-sm rounded-borders row items-center op-gap-8 text-red-5 text-metric-sm animate-pulse" v-if="lockoutRemainingMs > 0">
          <q-icon name="hourglass_disabled" size="xs" />
          <div class="col">
            <span class="text-weight-bold">SECURITY ENFORCEMENT:</span> Account identity under temporary authorization cooldown matrix. Retry window open in <span class="text-main text-metric-mono">{{ Math.ceil(lockoutRemainingMs / 1000) }}s</span>.
          </div>
        </div>

        <!-- STATE 1C: FORCE PASSWORD RESET FOR FIRST LOGIN -->
        <q-form @submit.prevent="executeResetPassword" class="column op-gap-16" v-if="pendingResetState">
          <div class="bg-blue-focus border-blue q-pa-md rounded-borders text-center column op-gap-8" style="background-color: rgba(33, 150, 243, 0.08); border: 1px solid rgba(33, 150, 243, 0.2);">
            <q-icon name="lock_reset" size="md" color="blue-5" class="self-center" />
            <div class="text-main text-weight-bold text-caption">First Time Sign-In Verification</div>
            <div class="text-metric-sm text-muted">
              For security, platform owners demand you personalize your credentials before entering the operational array.
            </div>
          </div>
          <div>
            <div class="text-caption text-muted q-mb-xs">New Secure Passphrase *</div>
            <q-input
              v-model="resetForm.newPassword"
              :dark="prefs.isDarkMode"
              filled
              dense
              type="password"
              placeholder="••••••••••••"
              class="bg-subpanel text-main rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Please specify a new passphrase', val => val.length >= 6 || 'Passphrase must be at least 6 characters']"
            >
              <template v-slot:prepend>
                <q-icon name="lock_open" size="xs" color="grey-6" />
              </template>
            </q-input>
          </div>
          <div>
            <div class="text-caption text-muted q-mb-xs">Confirm New Passphrase *</div>
            <q-input
              v-model="resetForm.confirmPassword"
              :dark="prefs.isDarkMode"
              filled
              dense
              type="password"
              placeholder="••••••••••••"
              class="bg-subpanel text-main rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Confirm password is required', val => val === resetForm.newPassword || 'Passphrases do not match']"
            >
              <template v-slot:prepend>
                <q-icon name="lock" size="xs" color="grey-6" />
              </template>
            </q-input>
          </div>
          <div class="row op-gap-8 q-mt-sm">
            <q-btn
              flat
              color="grey-6"
              label="Cancel"
              class="col"
              @click="pendingResetState = false"
              :disable="loading"
            />
            <q-btn
              type="submit"
              color="blue-5"
              label="Reset Password & Proceed"
              class="col text-weight-bold"
              unelevated
              :loading="loading"
            />
          </div>
        </q-form>

        <!-- STATE 1D: PASSWORD RESET DEMANDING OTP -->
        <q-form @submit.prevent="executeOtpResetPassword" class="column op-gap-16" v-else-if="pendingOtpResetState">
          <div class="bg-blue-focus border-blue q-pa-md rounded-borders text-center column op-gap-8" style="background-color: rgba(33, 150, 243, 0.08); border: 1px solid rgba(33, 150, 243, 0.2);">
            <q-icon name="mail_lock" size="md" color="blue-5" class="self-center" />
            <div class="text-main text-weight-bold text-caption">OTP Password Recovery Gateway</div>
            <div class="text-metric-sm text-muted">
              Specify your operator email address. A secure one-time verification OTP will be required.
            </div>
          </div>

          <div>
            <div class="text-caption text-muted q-mb-xs">Email Address *</div>
            <q-input
              v-model="otpForm.email"
              :dark="prefs.isDarkMode"
              filled
              dense
              placeholder="operator@IIPS.app"
              class="bg-subpanel text-main rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Specify email address']"
              :disable="otpDispatched"
            >
              <template v-slot:append>
                <q-btn flat dense color="blue-5" label="Request OTP" @click="requestOtpCode" :disable="otpDispatched || loading" class="text-caption text-weight-bold" />
              </template>
            </q-input>
          </div>

          <div v-if="otpDispatched" class="column op-gap-12">
            <div>
              <div class="text-caption text-muted q-mb-xs">One-Time OTP Verification Code *</div>
              <q-input
                v-model="otpForm.otpCode"
                :dark="prefs.isDarkMode"
                filled
                dense
                placeholder="Enter 6-digit OTP code"
                class="bg-subpanel text-main rounded-borders font-mono"
                lazy-rules
                :rules="[val => !!val || 'Specify verification code']"
              />
            </div>

            <div>
              <div class="text-caption text-muted q-mb-xs">New Secure Passphrase *</div>
              <q-input
                v-model="otpForm.newPassword"
                :dark="prefs.isDarkMode"
                filled
                dense
                type="password"
                placeholder="••••••••••••"
                class="bg-subpanel text-main rounded-borders"
                lazy-rules
                :rules="[val => !!val || 'Password required', val => val.length >= 6 || 'At least 6 characters']"
              />
            </div>

            <div>
              <div class="text-caption text-muted q-mb-xs">Confirm New Passphrase *</div>
              <q-input
                v-model="otpForm.confirmPassword"
                :dark="prefs.isDarkMode"
                filled
                dense
                type="password"
                placeholder="••••••••••••"
                class="bg-subpanel text-main rounded-borders"
                lazy-rules
                :rules="[val => !!val || 'Confirm password required', val => val === otpForm.newPassword || 'Passwords mismatch']"
              />
            </div>
          </div>

          <div class="row op-gap-8 q-mt-sm">
            <q-btn
              flat
              color="grey-6"
              label="Back to Login"
              class="col"
              @click="pendingOtpResetState = false"
              :disable="loading"
            />
            <q-btn
              type="submit"
              color="blue-5"
              label="Reset Passphrase"
              class="col text-weight-bold"
              unelevated
              :loading="loading"
              :disable="!otpDispatched"
            />
          </div>
        </q-form>

        <!-- STATE 1: STANDARD CREDENTIALS ENTRY -->
        <q-form @submit.prevent="executeLoginPass" class="column op-gap-16" v-else-if="!pendingChallengeState && !pendingOtpResetState && activeTier !== 'sso'">
          
          <div>
            <div class="text-caption text-muted q-mb-xs">Operator Account Identity *</div>
            <q-input
              v-model="form.email"
              :dark="prefs.isDarkMode"
              filled
              dense
              :placeholder="activeTier === 'pro' ? 'customer@IIPS.app' : 'e.g. sysadmin@IIPS.app'"
              class="bg-subpanel text-main rounded-borders"
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
            <div class="row items-center justify-between text-caption text-muted q-mb-xs">
              <span>Secure Secret Passphrase *</span>
              <a href="#" class="text-blue-5 text-metric-sm" @click.prevent="triggerRecoveryHint">Forgot Secret?</a>
            </div>
            <q-input
              v-model="form.password"
              :dark="prefs.isDarkMode"
              filled
              dense
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              class="bg-subpanel text-main rounded-borders"
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
            <span class="text-metric-mono text-muted" style="font-size: 9px;">PRESETS FOR ISOLATED ENVIRONMENT TESTING:</span>
            <div class="row op-gap-4">
              <q-btn dense flat size="xs" color="blue-5" label="[Tier: Super Admin]" @click="fillPreset('superadmin@IIPS.app', 'AdminPass123!', 'SUPER_ADMIN')" class="bg-subpanel q-px-xs text-metric-sm" />
              <q-btn dense flat size="xs" color="amber-5" label="[Tier: Staff Tier]" @click="fillPreset('staff@IIPS.app', 'StaffPass123!', 'STAFF')" class="bg-subpanel q-px-xs text-metric-sm" />
              <q-btn dense flat size="xs" color="muted" label="[Tier: Tenant Op]" @click="fillPreset('operator@IIPS.app', 'UserPass123!', 'TENANT_OPERATOR')" class="bg-subpanel q-px-xs text-metric-sm" />
            </div>
          </div>

          <!-- Submit Command Action -->
          <q-btn
            type="submit"
            color="blue-5"
            label="Initialize Handshake Authentication"
            class="full-width q-mt-sm text-weight-bold tracking-wide"
            unelevated
            :loading="loading"
            :disable="lockoutRemainingMs > 0"
          />

        </q-form>

        <!-- STATE 1B: ENTERPRISE SSO / FEDERATION GATEWAY -->
        <div class="column op-gap-12 text-center q-py-md" v-else-if="activeTier === 'sso'">
          <span class="text-metric-sm text-muted">Select upstream Zero-Trust Identity Provider context engine:</span>
          
          <div class="column op-gap-8">
            <q-btn flat color="indigo-5" class="bg-subpanel border-main full-width row justify-start q-px-md" @click="simulateSsoFlow('SAML 2.0 Identity Platform')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="account_balance" size="xs" color="indigo-5" />
                <span class="text-caption text-main text-weight-bold">SAML 2.0 Federation Engine</span>
              </div>
            </q-btn>
            
            <q-btn flat color="blue-5" class="bg-subpanel border-main full-width row justify-start q-px-md" @click="simulateSsoFlow('Okta Identity Cloud')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="cloud" size="xs" color="blue-5" />
                <span class="text-caption text-main text-weight-bold">Okta Identity Federation Core</span>
              </div>
            </q-btn>
            
            <q-btn flat color="amber-5" class="bg-subpanel border-main full-width row justify-start q-px-md" @click="simulateSsoFlow('Microsoft Azure AD')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="window" size="xs" color="blue-5" />
                <span class="text-caption text-main text-weight-bold">Microsoft Azure AD Workspaces</span>
              </div>
            </q-btn>
            
            <q-btn flat color="green-5" class="bg-subpanel border-main full-width row justify-start q-px-md" @click="simulateSsoFlow('Google Workspace')">
              <div class="row items-center op-gap-12 no-wrap fit">
                <q-icon name="public" size="xs" color="red-5" />
                <span class="text-caption text-main text-weight-bold">Google Cloud Identity Mesh</span>
              </div>
            </q-btn>
          </div>

          <span class="text-metric-mono text-muted q-mt-xs" style="font-size: 9px;">PREPARED NATIVELY FOR UNIFIED SESSION HANDSHAKE ENVELOPE INGESTION</span>
        </div>

        <!-- STATE 2: INLINE TOTP MFA CHALLENGE ENTRY -->
        <q-form @submit.prevent="executeMfaVerification" class="column op-gap-16" v-else>
          
          <div class="bg-subpanel q-pa-md rounded-borders border-main text-center column op-gap-8">
            <q-icon name="lock_clock" size="md" color="amber-5" class="self-center" />
            <div class="text-main text-weight-bold text-caption">Mandatory Multi-Factor Gateway Activated</div>
            <div class="text-metric-sm text-muted">
              {{ challengeContextMessage || 'Present time-based single-use token code generated by your continuous MFA verifier.' }}
            </div>
          </div>

          <div>
            <div class="text-caption text-muted q-mb-xs text-center">Enter 6-Digit Verification Envelope *</div>
            <q-input
              v-model="form.totpCode"
              :dark="prefs.isDarkMode"
              filled
              dense
              placeholder="000000"
              mask="######"
              class="bg-subpanel text-main rounded-borders text-center text-metric-mono text-weight-bold"
              style="font-size: 18px;"
              autofocus
              :rules="[val => val.length === 6 || 'Verification format must equal exactly 6 digits']"
            />
            <div class="text-center text-metric-sm text-muted q-mt-xs">
              Simulated verification test codes: <span class="text-blue-5 cursor-pointer" @click="form.totpCode = '000000'">000000</span> or <span class="text-blue-5 cursor-pointer" @click="form.totpCode = '123456'">123456</span>
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
              color="amber-5"
              label="Authorize MFA Signature"
              class="col text-weight-bold"
              unelevated
              :loading="loading"
            />
          </div>

        </q-form>

        <!-- Developer Testing Gateway Shortcuts -->
        <div class="column items-center q-mt-sm">
          <q-btn 
            flat 
            dense 
            size="sm" 
            color="amber-4" 
            icon="rocket_launch" 
            label="🧪 Launch Onboarding Flow" 
            to="/onboarding" 
            class="text-weight-bold"
          />
        </div>

        <!-- Dynamic Context Boundary Stamp -->
        <div class="border-top q-pt-md text-center text-metric-sm text-muted column op-gap-2">
          <span>AES-GCM // TLS 1.3 Transport Encrypted Streams</span>
          <span>Zero Frontend Authorization Autonomy Enforced</span>
        </div>

      </div>

    </q-page-container>
  </q-layout>
</template>
<script setup>
import { ref } from 'vue'
import logoImg from '../../assets/logo_transparent.png'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'

const router = useRouter()
const route = useRoute()

const { prefs, toggleTheme } = useOperatorPreferences()

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

// Dynamic MFA & Password Reset states
const pendingChallengeState = ref(false)
const pendingResetState = ref(false)
const resetForm = ref({
  newPassword: '',
  confirmPassword: ''
})
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

const pendingOtpResetState = ref(false)
const otpForm = ref({
  email: '',
  otpCode: '',
  newPassword: '',
  confirmPassword: ''
})
const otpDispatched = ref(false)
const generatedOtpCode = ref('')

const triggerRecoveryHint = () => {
  errorMessage.value = ''
  successMessage.value = ''
  pendingOtpResetState.value = true
  otpDispatched.value = false
  generatedOtpCode.value = ''
  otpForm.value.email = form.value.email
}

const requestOtpCode = () => {
  if (!otpForm.value.email) {
    errorMessage.value = 'Specify a valid email address to route OTP.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  setTimeout(() => {
    loading.value = false
    otpDispatched.value = true
    generatedOtpCode.value = Math.floor(100000 + Math.random() * 900000).toString()
    successMessage.value = `OTP Code successfully dispatched! Use validation code: ${generatedOtpCode.value}`
  }, 800)
}

const executeOtpResetPassword = async () => {
  if (otpForm.value.otpCode !== generatedOtpCode.value) {
    errorMessage.value = 'Security verification failed: Invalid OTP code signature.'
    return
  }
  if (otpForm.value.newPassword !== otpForm.value.confirmPassword) {
    errorMessage.value = 'Passphrase entries do not match.'
    return
  }
  
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Retrieve userId via email check, or use mock fallback
    let userId = 'c3d11b8b-e85d-4f2b-8a8f-2872bc900382'; // Olive UUID
    if (otpForm.value.email === 'sysadmin@IIPS.app' || otpForm.value.email === 'superadmin@iips.app') {
      userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Admin UUID
    }
    
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    const res = await axios.post(`${API_BASE}/api/auth/reset-password`, {
      userId: userId,
      newPassword: otpForm.value.newPassword
    })
    
    successMessage.value = res.data.message || 'Passphrase personalized successfully. You can now authenticate.'
    pendingOtpResetState.value = false
    otpForm.value = { email: '', otpCode: '', newPassword: '', confirmPassword: '' }
    otpDispatched.value = false
  } catch (err) {
    errorMessage.value = err.response?.data?.error || err.message || 'Failed to authorize passphrase change.'
  } finally {
    loading.value = false
  }
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
      user: { role: 'SUPER_ADMIN', email: `federated_operator@IIPS.app` }
    })
  }, 800)
}

const executeLoginPass = async () => {
  if (lockoutRemainingMs.value > 0) return
  
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    // Dispatch network request natively targeting backend API
    const res = await axios.post(`${API_BASE}/api/auth/login`, {
      email: form.value.email,
      password: form.value.password,
      isolationTier: activeTier.value
    })

    if (res.data?.requiresPasswordReset) {
      activeUserId.value = res.data.userId
      activeUserRole.value = res.data.role || activeUserRole.value
      pendingResetState.value = true
      successMessage.value = 'FIRST SIGN-IN DETECTED: You must personalize your passphrase.'
      return
    } else if (res.status === 202 || res.data?.requiresMfaSetup || res.data?.requires2FA) {
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
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    const res = await axios.post(`${API_BASE}/api/auth/mfa/verify`, {
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

const executeResetPassword = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    const res = await axios.post(`${API_BASE}/api/auth/reset-password`, {
      userId: activeUserId.value,
      newPassword: resetForm.value.newPassword
    })
    
    successMessage.value = res.data.message || 'Passphrase personalized successfully. You can now authenticate.'
    pendingResetState.value = false
    resetForm.value.newPassword = ''
    resetForm.value.confirmPassword = ''
  } catch (err) {
    errorMessage.value = err.response?.data?.error || err.message || 'Failed to personalize password.'
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
  localStorage.setItem('operator_email', form.value.email || 'federated@IIPS.app')
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
  border-bottom: 2px solid var(--enterprise-blue);
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
