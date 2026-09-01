<!-- invify-admin/src/pages/governance/LoginPage.vue -->
<template>
  <q-layout
    class="bg-main text-main relative-position"
    :class="isAdminPortal ? 'row items-center justify-center fit' : 'tenant-login-shell'"
    style="min-height: 100vh;"
  >
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

    <!-- Split shell: tenant = promo + form; admin = centered form only -->
    <div :class="isAdminPortal ? 'admin-centered-shell' : 'tenant-split-container'">
      <aside v-if="!isAdminPortal" class="tenant-promo-pane" aria-label="Invify product highlights">
        <div
          class="tenant-promo-fill"
          :style="{ backgroundImage: `url(${tenantPromoSlides[promoIndex].src})` }"
          aria-hidden="true"
        />
        <img
          :key="promoIndex"
          :src="tenantPromoSlides[promoIndex].src"
          :alt="tenantPromoSlides[promoIndex].alt"
          class="tenant-promo-img"
        />
        <div class="tenant-promo-dots">
          <button
            v-for="(slide, idx) in tenantPromoSlides"
            :key="slide.id"
            type="button"
            class="tenant-promo-dot"
            :class="{ active: promoIndex === idx }"
            :aria-label="`Show slide ${idx + 1}`"
            @click="goToPromoSlide(idx)"
          />
        </div>
      </aside>

      <div :class="isAdminPortal ? 'admin-auth-pane' : 'tenant-auth-pane'">
        <div
          class="auth-card bg-panel enterprise-panel column shadow-2"
          :class="isAdminPortal ? 'q-pa-xl op-gap-24' : 'auth-card--tenant q-pa-md op-gap-12'"
          :style="authCardStyle"
        >
        
        <!-- Platform Branding & Level Indicator -->
        <div class="column items-center text-center">
          <div class="row items-center justify-center op-gap-8 no-wrap" :class="isAdminPortal ? 'q-mb-sm' : 'q-mb-xs'">
            <img
              :src="logoImg"
              alt="Invify Logo"
              class="q-mr-xs"
              :style="isAdminPortal ? 'height: 40px; width: auto;' : 'height: 28px; width: auto;'"
            />
            <span
              class="text-main text-weight-bold tracking-wide"
              :class="isAdminPortal ? 'text-h5' : 'text-h6'"
            >
              INVIFY <span class="text-blue-5">{{ portalBrandAccent }}</span>
            </span>
          </div>
          <div class="text-caption text-muted" :class="{ 'tenant-subtitle-compact': !isAdminPortal }">
            {{ portalSubtitle }}
          </div>
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
              :type="showForceResetPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              class="bg-subpanel text-main rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Please specify a new passphrase', val => evaluatePasswordPolicy(val, { email: form.email, currentPassword: form.password }).ok || evaluatePasswordPolicy(val, { email: form.email, currentPassword: form.password }).errors[0]]"
            >
              <template v-slot:prepend>
                <q-icon name="lock_open" size="xs" color="grey-6" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showForceResetPassword ? 'visibility_off' : 'visibility'"
                  size="xs"
                  class="cursor-pointer text-grey-6"
                  @click="showForceResetPassword = !showForceResetPassword"
                />
              </template>
            </q-input>
            <PasswordStrengthHints
              :password="resetForm.newPassword"
              :email="form.email"
              :current-password="form.password"
            />
          </div>
          <div>
            <div class="text-caption text-muted q-mb-xs">Confirm New Passphrase *</div>
            <q-input
              v-model="resetForm.confirmPassword"
              :dark="prefs.isDarkMode"
              filled
              dense
              :type="showForceResetConfirmPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              class="bg-subpanel text-main rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Confirm password is required', val => val === resetForm.newPassword || 'Passphrases do not match']"
            >
              <template v-slot:prepend>
                <q-icon name="lock" size="xs" color="grey-6" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showForceResetConfirmPassword ? 'visibility_off' : 'visibility'"
                  size="xs"
                  class="cursor-pointer text-grey-6"
                  @click="showForceResetConfirmPassword = !showForceResetConfirmPassword"
                />
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
        <q-form @submit.prevent="onRecoveryPrimaryAction" class="column op-gap-16" v-else-if="pendingOtpResetState">
          <div class="bg-blue-focus border-blue q-pa-md rounded-borders text-center column op-gap-8" style="background-color: rgba(33, 150, 243, 0.08); border: 1px solid rgba(33, 150, 243, 0.2);">
            <q-icon name="mail_lock" size="md" color="blue-5" class="self-center" />
            <div class="text-main text-weight-bold text-caption">OTP Password Recovery Gateway</div>
            <div class="text-metric-sm text-muted">
              <template v-if="recoveryStep === 'email'">
                Specify your operator email address. A secure one-time verification OTP will be emailed to you.
              </template>
              <template v-else-if="recoveryStep === 'verify'">
                Enter the 6-digit recovery code we sent to <strong class="text-main">{{ otpForm.email }}</strong>.
              </template>
              <template v-else>
                Recovery email verified. Choose a new secure passphrase to finish.
              </template>
            </div>
          </div>

          <!-- Step 1: Email -->
          <div v-if="recoveryStep === 'email'">
            <div class="text-caption text-muted q-mb-xs">Email Address *</div>
            <q-input
              v-model="otpForm.email"
              :dark="prefs.isDarkMode"
              filled
              dense
              type="email"
              placeholder="operator@invify.org"
              class="bg-subpanel text-main rounded-borders"
              lazy-rules
              :rules="[val => !!val || 'Specify email address']"
            />
          </div>

          <!-- Step 2: Validate OTP -->
          <div v-else-if="recoveryStep === 'verify'" class="column op-gap-12">
            <div>
              <div class="text-caption text-muted q-mb-xs">One-Time OTP Verification Code *</div>
              <q-input
                v-model="otpForm.otpCode"
                :dark="prefs.isDarkMode"
                filled
                dense
                mask="######"
                placeholder="Enter 6-digit OTP code"
                class="bg-subpanel text-main rounded-borders font-mono"
                autofocus
                lazy-rules
                :rules="[val => (val && val.length === 6) || 'Enter the 6-digit code']"
              />
            </div>
            <div class="row items-center justify-between">
              <q-btn
                v-if="resendCooldownRemaining <= 0"
                flat
                dense
                color="blue-5"
                label="Resend OTP"
                class="text-caption"
                :disable="loading"
                @click="requestOtpCode"
              />
              <span
                v-else
                class="text-caption text-muted font-mono"
              >
                Resend OTP in {{ resendCountdownLabel }}
              </span>
              <span class="text-metric-sm text-muted">Code expires in 10 minutes</span>
            </div>
          </div>

          <!-- Step 3: New password -->
          <div v-else class="column op-gap-12">
            <div>
              <div class="text-caption text-muted q-mb-xs">New Secure Passphrase *</div>
              <q-input
                v-model="otpForm.newPassword"
                :dark="prefs.isDarkMode"
                filled
                dense
                :type="showRecoveryPassword ? 'text' : 'password'"
                placeholder="••••••••••••"
                class="bg-subpanel text-main rounded-borders"
                autofocus
                lazy-rules
                :rules="[val => !!val || 'Password required', val => evaluatePasswordPolicy(val, { email: otpForm.email || form.email }).ok || evaluatePasswordPolicy(val, { email: otpForm.email || form.email }).errors[0]]"
              >
                <template v-slot:append>
                  <q-icon
                    :name="showRecoveryPassword ? 'visibility_off' : 'visibility'"
                    size="xs"
                    class="cursor-pointer text-grey-6"
                    @click="showRecoveryPassword = !showRecoveryPassword"
                  >
                    <q-tooltip>{{ showRecoveryPassword ? 'Hide passphrase' : 'Show passphrase' }}</q-tooltip>
                  </q-icon>
                </template>
              </q-input>
              <PasswordStrengthHints
                :password="otpForm.newPassword"
                :email="otpForm.email || form.email"
              />
            </div>

            <div>
              <div class="text-caption text-muted q-mb-xs">Confirm New Passphrase *</div>
              <q-input
                v-model="otpForm.confirmPassword"
                :dark="prefs.isDarkMode"
                filled
                dense
                :type="showRecoveryConfirmPassword ? 'text' : 'password'"
                placeholder="••••••••••••"
                class="bg-subpanel text-main rounded-borders"
                lazy-rules
                :rules="[val => !!val || 'Confirm password required', val => val === otpForm.newPassword || 'Passwords mismatch']"
              >
                <template v-slot:append>
                  <q-icon
                    :name="showRecoveryConfirmPassword ? 'visibility_off' : 'visibility'"
                    size="xs"
                    class="cursor-pointer text-grey-6"
                    @click="showRecoveryConfirmPassword = !showRecoveryConfirmPassword"
                  >
                    <q-tooltip>{{ showRecoveryConfirmPassword ? 'Hide passphrase' : 'Show passphrase' }}</q-tooltip>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <div class="row op-gap-8 q-mt-sm">
            <q-btn
              flat
              color="grey-6"
              :label="recoveryStep === 'email' ? 'Back to Login' : 'Back'"
              class="col"
              @click="onRecoveryBack"
              :disable="loading"
            />
            <q-btn
              type="submit"
              color="blue-5"
              :label="recoveryPrimaryLabel"
              class="col text-weight-bold"
              unelevated
              :loading="loading"
            />
          </div>
        </q-form>

        <!-- STATE 1: STANDARD CREDENTIALS ENTRY -->
        <q-form
          @submit.prevent="executeLoginPass"
          class="column"
          :class="isAdminPortal ? 'op-gap-16' : 'op-gap-10'"
          v-else-if="!pendingChallengeState && !pendingOtpResetState"
        >
          
          <div>
            <div class="text-caption text-muted q-mb-xs">
              {{ isAdminPortal ? 'Operator Account Identity *' : 'Tenant Admin Identity *' }}
            </div>
            <q-input
              v-model="form.email"
              :dark="prefs.isDarkMode"
              filled
              dense
              :placeholder="isAdminPortal ? 'e.g. ops@invify.org' : 'e.g. admin@yourschool.com'"
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
          <div v-if="isAdminPortal" class="column op-gap-4 q-pt-xs">
            <span class="text-metric-mono text-muted" style="font-size: 9px;">PRESETS FOR ISOLATED ENVIRONMENT TESTING:</span>
            <div class="row op-gap-4">
              <q-btn dense flat size="xs" color="blue-5" label="[Tier: Super Admin]" @click="fillPreset('superadmin@invify.org', 'AdminPass123!', 'SUPER_ADMIN')" class="bg-subpanel q-px-xs text-metric-sm" />
              <q-btn dense flat size="xs" color="amber-5" label="[Tier: Staff Tier]" @click="fillPreset('staff@invify.org', 'StaffPass123!', 'STAFF')" class="bg-subpanel q-px-xs text-metric-sm" />
            </div>
          </div>

          <!-- Submit Command Action -->
          <q-btn
            type="submit"
            color="blue-5"
            label="Initialize Handshake Authentication"
            class="full-width text-weight-bold tracking-wide"
            :class="isAdminPortal ? 'q-mt-sm' : 'q-mt-xs'"
            unelevated
            :loading="loading"
            :disable="lockoutRemainingMs > 0"
          />

        </q-form>

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
        <div v-if="isAdminPortal" class="column items-center q-mt-sm">
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
        <div
          v-if="isAdminPortal"
          class="border-top q-pt-md text-center text-metric-sm text-muted column op-gap-2"
        >
          <span>AES-GCM // TLS 1.3 Transport Encrypted Streams</span>
          <span>Zero Frontend Authorization Autonomy Enforced</span>
        </div>

      </div>

        <!-- DEVICE APPROVAL PENDING DIALOG -->
        <q-dialog v-model="showDeviceApprovalDialog" persistent>
          <q-card style="width: 500px; max-width: 95vw;" class="enterprise-panel bg-panel text-main border-critical">
            <q-card-section class="row items-center q-pb-none border-bottom q-py-sm bg-subpanel">
              <div class="row items-center op-gap-8 text-weight-bold text-red-4">
                <q-icon name="gpp_bad" size="sm" />
                <span>DEVICE ACCESS RESTRICTED</span>
              </div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section class="column op-gap-16 q-pt-md">
              <div class="text-caption text-secondary">
                This account enforcement profile utilizes strict device fingerprint auditing. Logins from new or modified browser environments must be manually authorized.
              </div>

              <q-banner rounded class="bg-subpanel text-main border-main q-pa-sm font-mono text-metric-sm">
                <div class="row items-center justify-between text-weight-bold text-cyan-3">
                  <span>Operator Email:</span>
                  <span>{{ approvalUserEmail }}</span>
                </div>
                <div class="row items-center justify-between text-weight-bold text-amber-4 q-mt-xs">
                  <span>Device Footprint Status:</span>
                  <span>PENDING APPROVAL</span>
                </div>
              </q-banner>

              <div class="column op-gap-4">
                <span class="text-caption text-muted">Device Footprint Hash Identifier:</span>
                <q-input 
                  outlined 
                  dense 
                  readonly 
                  dark 
                  v-model="approvalDeviceId" 
                  class="bg-subpanel text-metric-mono font-mono"
                >
                  <template v-slot:append>
                    <q-btn 
                      flat 
                      round 
                      dense 
                      color="cyan-3" 
                      icon="content_copy" 
                      size="sm" 
                      @click="copyApprovalId" 
                    />
                  </template>
                </q-input>
              </div>

              <q-banner rounded class="bg-red-10 text-red-2 border-critical q-py-xs text-metric-sm">
                Share this Device Footprint Hash Identifier with your system administrator or the Invify Ops team to authorize access.
              </q-banner>
            </q-card-section>

            <q-card-actions align="right" class="q-pa-md border-top bg-subpanel">
              <q-btn flat label="Close" color="grey-5" v-close-popup />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </div>

    <!-- Footer -->
    <footer class="tenant__footer" v-if="!isAdminPortal">
      <div class="tenant__footer-left">
        © {{ currentYear }} Invify Enterprise Platform. All rights reserved. <span class="q-ml-sm text-grey-6 text-weight-medium">version 1.0.0</span>
      </div>
      <div class="tenant__footer-right">
        <span class="tenant__footer-link" role="button" tabindex="0">Privacy Policy</span>
        <span class="tenant__footer-link" role="button" tabindex="0">Terms of Service</span>
        <span class="tenant__footer-link" role="button" tabindex="0">Security</span>
        <span class="tenant__footer-link" role="button" tabindex="0">Support</span>
      </div>
    </footer>
  </q-layout>
</template>
<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import logoImg from '../../assets/logo_transparent.png'
const currentYear = new Date().getFullYear()
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { joinApiUrl } from '../../config/env'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'
import { persistAuthenticatedSession } from '../../auth/session'
import { resolvePostAuthRedirect, homePathForRole } from '../../utils/authLoginPaths'
import { evaluatePasswordPolicy } from '../../utils/passwordPolicy'
import PasswordStrengthHints from '../../components/PasswordStrengthHints.vue'
import { useQuasar, copyToClipboard } from 'quasar'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const { prefs, toggleTheme } = useOperatorPreferences()

const loading = ref(false)
const showPassword = ref(false)
const showRecoveryPassword = ref(false)
const showRecoveryConfirmPassword = ref(false)
const showForceResetPassword = ref(false)
const showForceResetConfirmPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const deviceId = ref('')
const showDeviceApprovalDialog = ref(false)
const approvalDeviceId = ref('')
const approvalUserEmail = ref('')

const isAdminPortal = computed(() => {
  const portal = route.meta?.portal || (route.path.startsWith('/tenant/login') ? 'tenant' : 'admin')
  return portal === 'admin'
})

const activeTier = computed(() => (isAdminPortal.value ? 'staff' : 'admin'))

const portalBrandAccent = computed(() => (isAdminPortal.value ? 'OPS_CORE' : 'TENANT'))
const portalSubtitle = computed(() =>
  isAdminPortal.value
    ? 'Platform operators & staff identity gateway'
    : 'Tenant owners & school / business admin gateway'
)

const PROMO_ROTATE_MS = 18000
const promoIndex = ref(0)
let promoTimer = null

const tenantPromoSlides = [
  { id: 'retail', src: '/login-promo/retail.png', alt: 'Boost your small retail business with Invify' },
  { id: 'service', src: '/login-promo/service.png', alt: 'Elevate your service business with Invify' },
  { id: 'school', src: '/login-promo/school.png', alt: 'Streamline school fees collection with Invify' }
]

const authCardStyle = computed(() => ({
  width: '100%',
  maxWidth: '460px'
}))

function stopPromoCarousel() {
  if (promoTimer) {
    clearInterval(promoTimer)
    promoTimer = null
  }
}

function startPromoCarousel() {
  stopPromoCarousel()
  promoTimer = setInterval(() => {
    promoIndex.value = (promoIndex.value + 1) % tenantPromoSlides.length
  }, PROMO_ROTATE_MS)
}

function goToPromoSlide(idx) {
  promoIndex.value = idx
  if (!isAdminPortal.value) startPromoCarousel()
}

watch(isAdminPortal, (admin) => {
  if (admin) stopPromoCarousel()
  else startPromoCarousel()
})

onMounted(() => {
  let storedId = localStorage.getItem('invify_browser_device_id')
  if (!storedId) {
    storedId = `browser-id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('invify_browser_device_id', storedId)
  }
  deviceId.value = storedId
  if (!isAdminPortal.value) startPromoCarousel()
})

onUnmounted(() => {
  clearResendCooldown()
  stopPromoCarousel()
})

function copyApprovalId() {
  copyToClipboard(approvalDeviceId.value)
  $q.notify({
    type: 'positive',
    message: 'Device ID copied to clipboard'
  })
}

const PLATFORM_STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'STAFF',
  'ADMIN_FINANCE',
  'ADMIN_TREASURY',
  'ADMIN_RISK',
  'ADMIN_OPS',
  'ADMIN_EXECUTIVE',
  'ADMIN_DEPLOY'
])

function roleMatchesPortal(roleRaw, adminPortal) {
  const roles = String(roleRaw || '')
    .split(',')
    .map((r) => r.trim().toUpperCase().replace(/-/g, '_'))
    .filter(Boolean)
  const isStaff = roles.some((r) => PLATFORM_STAFF_ROLES.has(r))
  return adminPortal ? isStaff : !isStaff
}

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
const challengeToken = ref('')
const challengeContextMessage = ref('')

// Brute Force metrics simulation
const lockoutRemainingMs = ref(0)
const failedAttemptsCount = ref(0)

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
/** Recovery wizard: email → verify OTP → set password */
const recoveryStep = ref('email') // 'email' | 'verify' | 'password'
const otpDispatched = ref(false)
const otpVerified = ref(false)
/** Seconds before Resend OTP is shown again (user-requested ~60s cooldown). */
const RESEND_OTP_COOLDOWN_SEC = 60
const resendCooldownRemaining = ref(0)
let resendCooldownTimer = null

const resendCountdownLabel = computed(() => {
  const s = Math.max(0, resendCooldownRemaining.value)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

const clearResendCooldown = () => {
  if (resendCooldownTimer) {
    clearInterval(resendCooldownTimer)
    resendCooldownTimer = null
  }
  resendCooldownRemaining.value = 0
}

const startResendCooldown = (seconds = RESEND_OTP_COOLDOWN_SEC) => {
  clearResendCooldown()
  resendCooldownRemaining.value = seconds
  resendCooldownTimer = setInterval(() => {
    if (resendCooldownRemaining.value <= 1) {
      clearResendCooldown()
      return
    }
    resendCooldownRemaining.value -= 1
  }, 1000)
}

const recoveryPrimaryLabel = computed(() => {
  if (recoveryStep.value === 'email') return 'Request OTP'
  if (recoveryStep.value === 'verify') return 'Validate Recovery Code'
  return 'Reset Passphrase'
})

const triggerRecoveryHint = () => {
  errorMessage.value = ''
  successMessage.value = ''
  pendingOtpResetState.value = true
  recoveryStep.value = 'email'
  otpDispatched.value = false
  otpVerified.value = false
  clearResendCooldown()
  otpForm.value = {
    email: form.value.email || '',
    otpCode: '',
    newPassword: '',
    confirmPassword: ''
  }
}

const onRecoveryBack = () => {
  errorMessage.value = ''
  successMessage.value = ''
  if (recoveryStep.value === 'password') {
    recoveryStep.value = 'verify'
    otpVerified.value = false
    return
  }
  if (recoveryStep.value === 'verify') {
    recoveryStep.value = 'email'
    otpDispatched.value = false
    otpForm.value.otpCode = ''
    clearResendCooldown()
    return
  }
  pendingOtpResetState.value = false
  clearResendCooldown()
}

const onRecoveryPrimaryAction = async () => {
  if (recoveryStep.value === 'email') {
    await requestOtpCode()
    return
  }
  if (recoveryStep.value === 'verify') {
    await verifyRecoveryOtp()
    return
  }
  await executeOtpResetPassword()
}

const requestOtpCode = async () => {
  if (resendCooldownRemaining.value > 0) {
    errorMessage.value = `Please wait ${resendCountdownLabel.value} before requesting another OTP.`
    return
  }

  const email = String(otpForm.value.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    errorMessage.value = 'Specify a valid email address to route OTP.'
    successMessage.value = ''
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  otpForm.value.email = email

  try {
    await axios.post(joinApiUrl('/api/auth/send-email-otp'), {
      email,
      purpose: 'PASSWORD_RESET'
    })
    otpDispatched.value = true
    otpVerified.value = false
    recoveryStep.value = 'verify'
    startResendCooldown()
    successMessage.value = `Recovery OTP sent to ${email}. Check your inbox (and spam).`
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to send recovery OTP. Please try again.'
  } finally {
    loading.value = false
  }
}

const verifyRecoveryOtp = async () => {
  const email = String(otpForm.value.email || '').trim().toLowerCase()
  const code = String(otpForm.value.otpCode || '').trim()
  if (!email) {
    errorMessage.value = 'Email is missing. Go back and request OTP again.'
    return
  }
  if (code.length !== 6) {
    errorMessage.value = 'Enter the 6-digit recovery code from your email.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await axios.post(joinApiUrl('/api/auth/verify-email-otp'), {
      email,
      code,
      otp: code,
      purpose: 'PASSWORD_RESET'
    })

    if (res.data?.success === false) {
      throw new Error(res.data?.error || 'Invalid or expired verification code.')
    }

    otpVerified.value = true
    recoveryStep.value = 'password'
    successMessage.value = 'Recovery email verified. Set your new passphrase.'
  } catch (err) {
    otpVerified.value = false
    errorMessage.value =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Invalid or expired recovery code. Request a new OTP.'
  } finally {
    loading.value = false
  }
}

const executeOtpResetPassword = async () => {
  if (!otpVerified.value) {
    errorMessage.value = 'Validate your recovery code before setting a new passphrase.'
    return
  }
  if (otpForm.value.newPassword !== otpForm.value.confirmPassword) {
    errorMessage.value = 'Passphrase entries do not match.'
    return
  }
  const otpPolicy = evaluatePasswordPolicy(otpForm.value.newPassword, {
    email: otpForm.value.email || form.value.email,
  })
  if (!otpPolicy.ok) {
    errorMessage.value = otpPolicy.errors[0]
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const email = String(otpForm.value.email || '').trim().toLowerCase()

    const res = await axios.post(joinApiUrl('/api/auth/reset-password'), {
      email,
      // OTP already validated in previous step; backend trusts fresh VERIFIED session
      recoveryVerified: true,
      newPassword: otpForm.value.newPassword
    })

    successMessage.value =
      res.data.message || 'Passphrase updated successfully. You can now sign in.'
    form.value.email = email
    pendingOtpResetState.value = false
    recoveryStep.value = 'email'
    otpForm.value = { email: '', otpCode: '', newPassword: '', confirmPassword: '' }
    otpDispatched.value = false
    otpVerified.value = false
    clearResendCooldown()
  } catch (err) {
    const raw =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to authorize passphrase change.'
    const lower = String(raw).toLowerCase()
    if (
      err?.response?.data?.code === 'SAME_AS_PREVIOUS_PASSWORD' ||
      lower.includes('same as your previous') ||
      lower.includes('same password') ||
      lower.includes('different from the old')
    ) {
      errorMessage.value =
        'New password cannot be the same as your previous password. Please choose a different passphrase.'
    } else {
      errorMessage.value = raw
    }
  } finally {
    loading.value = false
  }
}

const executeLoginPass = async () => {
  if (lockoutRemainingMs.value > 0) return
  
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await axios.post(joinApiUrl('/api/auth/login'), {
      email: form.value.email,
      password: form.value.password,
      portal: isAdminPortal.value ? 'admin' : 'tenant',
      isolationTier: activeTier.value,
      deviceId: deviceId.value
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
      challengeToken.value = res.data.challengeToken || ''
      
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
      const role = res.data?.user?.role || res.data?.role || ''
      if (!roleMatchesPortal(role, isAdminPortal.value)) {
        errorMessage.value = isAdminPortal.value
          ? 'This account belongs to a tenant workspace. Use /tenant/login.'
          : 'This account belongs to platform Admin / Ops. Use /admin/login.'
        return
      }
      localStorage.setItem('mfa_status_verified', 'true')
      finalizeAuthenticatedSession(res.data)
    }
  } catch (err) {
    const errorResponse = err.response?.data
    if (errorResponse?.error === 'DEVICE_APPROVAL_REQUIRED') {
      errorMessage.value = errorResponse.message || 'Browser device pending operations team approval.'
      showDeviceApprovalDialog.value = true
      approvalDeviceId.value = errorResponse.deviceId || deviceId.value
      approvalUserEmail.value = form.value.email
    } else {
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
        if (err.response?.status === 401) {
          errorMessage.value = 'Invalid user name or password'
        } else if (
          err.response?.data?.code === 'WRONG_LOGIN_PORTAL' ||
          err.response?.data?.error === 'WRONG_LOGIN_PORTAL'
        ) {
          errorMessage.value =
            err.response?.data?.message ||
            (isAdminPortal.value
              ? 'This account belongs to a tenant workspace. Use /tenant/login.'
              : 'This account belongs to platform Admin / Ops. Use /admin/login.')
        } else {
          errorMessage.value = err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication handshakes rejected due to origin validation blocks.'
        }
      }
    }
  } finally {
    loading.value = false
  }
}

const executeMfaVerification = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await axios.post(
      joinApiUrl('/api/auth/mfa/verify'),
      {
        userId: activeUserId.value,
        tokenCode: form.value.totpCode,
        challengeToken: challengeToken.value || sessionStorage.getItem('mfa_challenge_token') || '',
        role: activeUserRole.value
      },
      { withCredentials: true },
    )

    if (res.data?.token) {
      finalizeAuthenticatedSession(res.data)
    } else {
      errorMessage.value = 'Your session could not be established. Please try again.'
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Invalid single-use envelope signature.'
  } finally {
    loading.value = false
  }
}

const executeResetPassword = async () => {
  if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
    errorMessage.value = 'Passwords do not match.'
    return
  }
  const policy = evaluatePasswordPolicy(resetForm.value.newPassword, {
    email: form.value.email,
    currentPassword: form.value.password,
  })
  if (!policy.ok) {
    errorMessage.value = policy.errors[0]
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const res = await axios.post(joinApiUrl('/api/auth/reset-password'), {
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
  persistAuthenticatedSession({
    ...tokenData,
    user: {
      ...(tokenData.user || {}),
      role: tokenData.user?.role || tokenData.role || activeUserRole.value || 'SUPER_ADMIN',
      email: tokenData.user?.email || form.value.email,
    },
  })
  const cleanRole = (localStorage.getItem('operator_role') || 'SUPER_ADMIN').toUpperCase()
  localStorage.setItem('operator_role', cleanRole)
  localStorage.setItem('operator_email', form.value.email || tokenData.user?.email || '')

  const fullName = tokenData.user?.name || tokenData.user?.full_name || ''
  if (fullName) {
    const parts = fullName.trim().split(' ')
    localStorage.setItem('operator_first_name', parts[0] || '')
    localStorage.setItem('operator_last_name', parts.slice(1).join(' ') || '')
  } else if (!localStorage.getItem('operator_first_name')) {
    const emailPrefix = (form.value.email || '').split('@')[0]
    localStorage.setItem('operator_first_name', emailPrefix)
  }

  if (!localStorage.getItem('operator_joined')) {
    localStorage.setItem('operator_joined', String(Date.now()))
  }

  pendingChallengeState.value = false
  successMessage.value = 'Signed in successfully. Opening your dashboard…'
  const dest = resolvePostAuthRedirect(cleanRole, route.query?.redirect)
  router.replace(dest).catch(() => {
    router.replace(homePathForRole(cleanRole)).catch(() => {})
  })
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

.op-gap-8 { gap: 8px; }
.op-gap-10 { gap: 10px; }
.op-gap-12 { gap: 12px; }
.op-gap-16 { gap: 16px; }
.op-gap-24 { gap: 24px; }

.tenant-login-shell {
  position: relative !important;
  height: 100vh !important;
  height: 100dvh !important;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
}

.admin-centered-shell {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.admin-auth-pane {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tenant-split-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.tenant-promo-pane {
  position: relative;
  flex: 1 1 50%;
  width: 50%;
  height: 100%;
  background: #e8eef5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.tenant-promo-fill {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  filter: blur(18px) saturate(1.05);
  transform: scale(1.08);
  opacity: 0.9;
}

.tenant-promo-img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  display: block;
}

.tenant-promo-dots {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}

.tenant-promo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.28);
  transition: transform 0.2s ease, background 0.2s ease;
}

.tenant-promo-dot.active {
  background: #1976d2;
  transform: scale(1.25);
}

.tenant-auth-pane {
  flex: 1 1 50%;
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  background: inherit;
}

.auth-card--tenant {
  width: 100%;
  max-width: 460px;
}

.tenant-subtitle-compact {
  font-size: 11px;
  line-height: 1.3;
  max-width: 280px;
}

.tenant-login-shell .auth-card--tenant :deep(.q-field--dense .q-field__control) {
  height: 40px;
}

.tenant__footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(10, 10, 12, 0.45);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.tenant__footer-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.tenant__footer-link {
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: color 0.15s ease;
}

.tenant__footer-link:hover {
  color: #ffffff;
}

@media (max-width: 900px) {
  .tenant-login-shell {
    height: auto !important;
    max-height: none;
    overflow: auto;
  }

  .tenant-split-container {
    position: relative;
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .tenant-promo-pane {
    width: 100%;
    height: 40vh;
    flex: 0 0 auto;
  }

  .tenant-auth-pane {
    width: 100%;
    height: auto;
    flex: 1 1 auto;
    padding: 16px 12px 64px; /* extra bottom padding for relative footer */
  }

  .tenant__footer {
    position: relative;
    flex-direction: column;
    gap: 8px;
    text-align: center;
    padding: 16px 12px;
    background: #0a0a0c;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tenant__footer-right {
    gap: 12px;
    justify-content: center;
  }
}
</style>
