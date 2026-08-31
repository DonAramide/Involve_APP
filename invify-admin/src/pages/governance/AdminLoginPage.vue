<!-- invify-admin/src/pages/governance/AdminLoginPage.vue -->
<!-- Visual: Invify Super Admin reference gateway. Behavior: existing /api/auth/* only. -->
<template>
  <div class="sac" :class="{ 'sac--light': !prefs.isDarkMode }">
    <!-- Ambient mesh and radial lighting -->
    <div class="sac__mesh" aria-hidden="true" />
    <div class="sac__ambient sac__ambient--top-left" aria-hidden="true" />
    <div class="sac__ambient sac__ambient--bottom-left" aria-hidden="true" />
    <div class="sac__ambient sac__ambient--right" aria-hidden="true" />

    <!-- Top Header -->
    <header class="sac__header">
      <div class="sac__brand">
        <div class="sac__logo-wrap">
          <img :src="logoImg" alt="Invify" class="sac__logo-img" />
        </div>
        <div class="sac__brand-text">
          <div class="sac__brand-name">INVIFY</div>
          <div class="sac__brand-sub">{{ t.brandSub }}</div>
        </div>
      </div>

      <div class="sac__header-actions">
        <!-- Dark / Light Theme Toggle -->
        <button
          type="button"
          class="sac__action-pill sac__theme-btn"
          aria-label="Toggle theme"
          @click="toggleTheme"
        >
          <q-icon :name="prefs.isDarkMode ? 'dark_mode' : 'light_mode'" size="16px" />
          <q-tooltip>{{ prefs.isDarkMode ? 'Dark Theme Active (Click for Light)' : 'Light Theme Active (Click for Dark)' }}</q-tooltip>
        </button>

        <!-- Interactive Language Selector: English, Yorùbá, Igbo, Hausa -->
        <div class="sac__action-pill sac__lang-select" role="button" tabindex="0" aria-label="Language selector">
          <q-icon name="public" size="15px" class="sac__lang-icon" />
          <span class="sac__lang-label">{{ currentLangLabel }}</span>
          <q-icon name="expand_more" size="16px" class="sac__lang-arrow" />

          <q-menu auto-close class="sac__lang-menu" :dark="prefs.isDarkMode">
            <q-list dense style="min-width: 150px">
              <q-item
                v-for="lang in availableLanguages"
                :key="lang.code"
                clickable
                :active="currentLang === lang.code"
                active-class="text-indigo-4 text-weight-bold"
                @click="setLanguage(lang.code)"
              >
                <q-item-section avatar style="min-width: 28px;">
                  <span class="sac__lang-flag">{{ lang.flag }}</span>
                </q-item-section>
                <q-item-section>{{ lang.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
      </div>
    </header>

    <!-- Main 2-Column Gateway Content -->
    <main class="sac__main">
      <!-- Left Column: Hero & Platform Introduction -->
      <section class="sac__left" aria-labelledby="sac-heading">
        <div class="sac__left-inner">
          <div class="sac__hero">
            <h1 id="sac-heading" class="sac__h1">
              <span class="sac__h1-white">{{ t.superAdmin }}</span>
              <span class="sac__h1-accent">{{ t.commandCenter }}</span>
            </h1>

            <p class="sac__desc">
              {{ t.heroDesc }}
            </p>
          </div>

          <!-- Feature Rows -->
          <div class="sac__features">
            <div
              v-for="feature in platformFeatures"
              :key="feature.title"
              class="sac__feature-row"
            >
              <div class="sac__feature-icon-wrap" :style="{ backgroundColor: feature.bgColor, borderColor: feature.borderColor }">
                <q-icon :name="feature.icon" size="20px" :style="{ color: feature.iconColor }" />
              </div>
              <div class="sac__feature-info">
                <div class="sac__feature-title">{{ feature.title }}</div>
                <div class="sac__feature-desc">{{ feature.body }}</div>
              </div>
            </div>
          </div>

          <!-- 3D Holographic Platform Visual matching reference -->
          <div class="sac__hologram" aria-hidden="true">
            <div class="sac__holo-canvas">
              <!-- Glow and flare effects -->
              <div class="sac__holo-beam" />
              <div class="sac__holo-spotlight" />

              <!-- Neon platform rings -->
              <div class="sac__holo-disc-base" />
              <div class="sac__holo-ring sac__holo-ring--outer" />
              <div class="sac__holo-ring sac__holo-ring--inner" />
              <div class="sac__holo-core" />

              <!-- Isometric floating crystal cube -->
              <div class="sac__holo-cube-container">
                <svg class="sac__holo-cube-svg" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="cubeTopGrad" x1="30" y1="20" x2="130" y2="70" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#818CF8" stop-opacity="0.9" />
                      <stop offset="1" stop-color="#4F46E5" stop-opacity="0.6" />
                    </linearGradient>
                    <linearGradient id="cubeLeftGrad" x1="20" y1="50" x2="80" y2="140" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#4338CA" stop-opacity="0.85" />
                      <stop offset="1" stop-color="#1E1B4B" stop-opacity="0.95" />
                    </linearGradient>
                    <linearGradient id="cubeRightGrad" x1="80" y1="50" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#6366F1" stop-opacity="0.8" />
                      <stop offset="1" stop-color="#312E81" stop-opacity="0.95" />
                    </linearGradient>
                  </defs>

                  <!-- Cube Shadow -->
                  <ellipse cx="80" cy="148" rx="42" ry="12" fill="#4F46E5" opacity="0.3" filter="blur(6px)" />

                  <!-- Top Face -->
                  <polygon points="80,24 136,54 80,84 24,54" fill="url(#cubeTopGrad)" stroke="#A5B4FC" stroke-width="1.5" stroke-linejoin="round" />

                  <!-- Left Face with Launch Glyph -->
                  <polygon points="24,54 80,84 80,144 24,114" fill="url(#cubeLeftGrad)" stroke="#818CF8" stroke-width="1.5" stroke-linejoin="round" />
                  
                  <!-- Left Face Engraving: Launch / Platform icon -->
                  <g transform="translate(42, 78) scale(0.65)" stroke="#C7D2FE" stroke-width="2" fill="none" opacity="0.9">
                    <path d="M12 2C12 2 19 6 19 14C19 18 16 21 16 21L12 18L8 21C8 21 5 18 5 14C5 6 12 2 12 2Z" fill="#818CF8" fill-opacity="0.4" />
                    <circle cx="12" cy="11" r="2.5" fill="#E0E7FF" />
                    <path d="M5 14L2 17L5 18" />
                    <path d="M19 14L22 17L19 18" />
                  </g>

                  <!-- Right Face with Tech Node Glyph -->
                  <polygon points="80,84 136,54 136,114 80,144" fill="url(#cubeRightGrad)" stroke="#A5B4FC" stroke-width="1.5" stroke-linejoin="round" />
                  
                  <!-- Right Face Engraving: 4-square / data block -->
                  <g transform="translate(96, 78) scale(0.65)" fill="#C7D2FE" opacity="0.85">
                    <rect x="2" y="2" width="8" height="8" rx="2" fill="#818CF8" />
                    <rect x="14" y="2" width="8" height="8" rx="2" fill="#A5B4FC" />
                    <rect x="2" y="14" width="8" height="8" rx="2" fill="#6366F1" />
                    <rect x="14" y="14" width="8" height="8" rx="2" fill="#C7D2FE" />
                  </g>

                  <!-- Center highlight edge -->
                  <line x1="80" y1="84" x2="80" y2="144" stroke="#E0E7FF" stroke-width="2" opacity="0.6" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Factual Platform Security Indicators -->
          <div class="sac__trust-wrap">
            <div class="sac__trust-label">{{ t.trustLabel }}</div>
            <div class="sac__trust-grid">
              <div class="sac__trust-item">
                <div class="sac__trust-icon-box">
                  <q-icon name="verified_user" size="18px" />
                </div>
                <div class="sac__trust-text">
                  <span class="sac__trust-title">{{ t.trust1Title }}</span>
                  <span class="sac__trust-sub">{{ t.trust1Sub }}</span>
                </div>
              </div>

              <div class="sac__trust-item">
                <div class="sac__trust-icon-box">
                  <q-icon name="lock" size="18px" />
                </div>
                <div class="sac__trust-text">
                  <span class="sac__trust-title">{{ t.trust2Title }}</span>
                  <span class="sac__trust-sub">{{ t.trust2Sub }}</span>
                </div>
              </div>

              <div class="sac__trust-item">
                <div class="sac__trust-icon-box">
                  <q-icon name="speed" size="18px" />
                </div>
                <div class="sac__trust-text">
                  <span class="sac__trust-title">{{ t.trust3Title }}</span>
                  <span class="sac__trust-sub">{{ t.trust3Sub }}</span>
                </div>
              </div>

              <div class="sac__trust-item">
                <div class="sac__trust-icon-box">
                  <q-icon name="policy" size="18px" />
                </div>
                <div class="sac__trust-text">
                  <span class="sac__trust-title">{{ t.trust4Title }}</span>
                  <span class="sac__trust-sub">{{ t.trust4Sub }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Login Card -->
      <section class="sac__right">
        <div class="sac__card" role="region" aria-label="Super admin sign in">
          <!-- Card Header with Logo -->
          <div class="sac__card-head">
            <div class="sac__logo-badge">
              <img :src="logoImg" alt="Invify" style="height: 48px; width: auto;" />
            </div>
            <h2 class="sac__welcome">{{ t.welcome }}</h2>
            <p class="sac__welcome-sub">{{ t.welcomeSub }}</p>

            <div class="sac__secure-divider">
              <span class="sac__secure-line" />
              <span class="sac__secure-pill">{{ t.secureAdminAccess }}</span>
              <span class="sac__secure-line" />
            </div>
          </div>

          <!-- Alert Banners -->
          <div class="sac__alerts" role="status" aria-live="polite">
            <q-banner v-if="errorMessage" dense class="sac__banner sac__banner--error">
              <template v-slot:avatar><q-icon name="warning" size="18px" /></template>
              {{ errorMessage }}
            </q-banner>
            <q-banner v-if="successMessage" dense class="sac__banner sac__banner--ok">
              <template v-slot:avatar><q-icon name="check_circle" size="18px" /></template>
              {{ successMessage }}
            </q-banner>
            <div v-if="lockoutRemainingMs > 0" class="sac__banner sac__banner--error">
              Too many sign-in attempts. Please wait {{ Math.ceil(lockoutRemainingMs / 1000) }}s before trying again.
            </div>
          </div>

          <!-- Force Password Reset State -->
          <q-form v-if="pendingResetState" class="sac__form" @submit.prevent="executeResetPassword">
            <div class="sac__form-note">First sign-in — set a new password</div>
            <div class="sac__form-group">
              <label class="sac__input-label">New Password</label>
              <q-input
                v-model="resetForm.newPassword"
                :dark="prefs.isDarkMode"
                filled
                dense
                :type="showForceResetPassword ? 'text' : 'password'"
                placeholder="Enter new password"
                autocomplete="new-password"
                class="sac__custom-input"
                :rules="[val => !!val || 'Password required', val => val.length >= 6 || 'At least 6 characters']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock_outline" size="18px" class="sac__input-icon" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showForceResetPassword ? 'visibility_off' : 'visibility'"
                    size="18px"
                    class="sac__eye-icon"
                    @click="showForceResetPassword = !showForceResetPassword"
                  />
                </template>
              </q-input>
            </div>

            <div class="sac__form-group">
              <label class="sac__input-label">Confirm Password</label>
              <q-input
                v-model="resetForm.confirmPassword"
                :dark="prefs.isDarkMode"
                filled
                dense
                :type="showForceResetConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
                autocomplete="new-password"
                class="sac__custom-input"
                :rules="[val => val === resetForm.newPassword || 'Passwords do not match']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock_outline" size="18px" class="sac__input-icon" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showForceResetConfirmPassword ? 'visibility_off' : 'visibility'"
                    size="18px"
                    class="sac__eye-icon"
                    @click="showForceResetConfirmPassword = !showForceResetConfirmPassword"
                  />
                </template>
              </q-input>
            </div>

            <q-btn type="submit" unelevated class="sac__primary-btn" label="Save Password" :loading="loading" />
          </q-form>

          <!-- OTP Password Recovery State -->
          <q-form v-else-if="pendingOtpResetState" class="sac__form" @submit.prevent="onRecoveryPrimaryAction">
            <div class="sac__form-note">Super Admin Password Recovery</div>
            <template v-if="recoveryStep === 'email'">
              <div class="sac__form-group">
                <label class="sac__input-label">{{ t.emailLabel }}</label>
                <q-input
                  v-model="otpForm.email"
                  :dark="prefs.isDarkMode"
                  filled
                  dense
                  type="email"
                  :placeholder="t.emailPlaceholder"
                  autocomplete="email"
                  class="sac__custom-input"
                  :rules="[emailRule]"
                >
                  <template v-slot:prepend>
                    <q-icon name="mail_outline" size="18px" class="sac__input-icon" />
                  </template>
                </q-input>
              </div>
            </template>
            <template v-else-if="recoveryStep === 'verify'">
              <div class="sac__form-group">
                <label class="sac__input-label">6-Digit Recovery Code</label>
                <q-input
                  v-model="otpForm.otpCode"
                  :dark="prefs.isDarkMode"
                  filled
                  dense
                  mask="######"
                  placeholder="000000"
                  class="sac__custom-input"
                  :rules="[val => (val && val.length === 6) || 'Enter the 6-digit code']"
                >
                  <template v-slot:prepend>
                    <q-icon name="dialpad" size="18px" class="sac__input-icon" />
                  </template>
                </q-input>
              </div>
              <div class="sac__row-between">
                <button v-if="resendCooldownRemaining <= 0" type="button" class="sac__link-btn" :disabled="loading" @click="requestOtpCode">
                  Resend OTP
                </button>
                <span v-else class="sac__muted-text">Resend in {{ resendCountdownLabel }}</span>
              </div>
            </template>
            <template v-else>
              <div class="sac__form-group">
                <label class="sac__input-label">New Password</label>
                <q-input
                  v-model="otpForm.newPassword"
                  :dark="prefs.isDarkMode"
                  filled
                  dense
                  :type="showRecoveryPassword ? 'text' : 'password'"
                  placeholder="Enter new password"
                  autocomplete="new-password"
                  class="sac__custom-input"
                  :rules="[val => !!val || 'Password required', val => val.length >= 6 || 'At least 6 characters']"
                >
                  <template v-slot:prepend>
                    <q-icon name="lock_outline" size="18px" class="sac__input-icon" />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      :name="showRecoveryPassword ? 'visibility_off' : 'visibility'"
                      size="18px"
                      class="sac__eye-icon"
                      @click="showRecoveryPassword = !showRecoveryPassword"
                    />
                  </template>
                </q-input>
              </div>
              <div class="sac__form-group">
                <label class="sac__input-label">Confirm Password</label>
                <q-input
                  v-model="otpForm.confirmPassword"
                  :dark="prefs.isDarkMode"
                  filled
                  dense
                  :type="showRecoveryConfirmPassword ? 'text' : 'password'"
                  placeholder="Confirm new password"
                  autocomplete="new-password"
                  class="sac__custom-input"
                  :rules="[val => val === otpForm.newPassword || 'Passwords do not match']"
                >
                  <template v-slot:prepend>
                    <q-icon name="lock_outline" size="18px" class="sac__input-icon" />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      :name="showRecoveryConfirmPassword ? 'visibility_off' : 'visibility'"
                      size="18px"
                      class="sac__eye-icon"
                      @click="showRecoveryConfirmPassword = !showRecoveryConfirmPassword"
                    />
                  </template>
                </q-input>
              </div>
            </template>
            <div class="sac__actions-dual">
              <q-btn flat class="sac__secondary-btn" label="Back" :disable="loading" @click="onRecoveryBack" />
              <q-btn type="submit" unelevated class="sac__primary-btn" :label="recoveryPrimaryLabel" :loading="loading" />
            </div>
          </q-form>

          <!-- MFA Totp Verification State -->
          <q-form v-else-if="pendingChallengeState" class="sac__form" @submit.prevent="executeMfaVerification">
            <div class="sac__form-note">{{ challengeContextMessage || 'Enter the 6-digit code from your authenticator app.' }}</div>
            <div class="sac__form-group">
              <label class="sac__input-label">Authentication Code</label>
              <q-input
                v-model="form.totpCode"
                :dark="prefs.isDarkMode"
                filled
                dense
                mask="######"
                placeholder="000000"
                class="sac__custom-input"
                autofocus
                :rules="[val => (val && val.length === 6) || 'Enter 6 digits']"
              >
                <template v-slot:prepend>
                  <q-icon name="pin" size="18px" class="sac__input-icon" />
                </template>
              </q-input>
            </div>
            <div class="sac__actions-dual">
              <q-btn flat class="sac__secondary-btn" label="Cancel" :disable="loading" @click="cancelChallengeState" />
              <q-btn type="submit" unelevated class="sac__primary-btn" label="Verify Code" :loading="loading" />
            </div>
          </q-form>

          <!-- Standard Super Admin Login Form -->
          <q-form v-else class="sac__form" @submit.prevent="executeLoginPass">
            <!-- Email Field -->
            <div class="sac__form-group">
              <label class="sac__input-label" for="admin-login-email">{{ t.emailLabel }}</label>
              <q-input
                id="admin-login-email"
                v-model="form.email"
                :dark="prefs.isDarkMode"
                filled
                dense
                type="email"
                autocomplete="username"
                :placeholder="t.emailPlaceholder"
                class="sac__custom-input"
                autofocus
                :disable="loading || lockoutRemainingMs > 0"
                :error="emailTouched && !!emailError"
                :error-message="emailError"
                :aria-invalid="emailTouched && !!emailError"
                lazy-rules
                :rules="[emailRule]"
                @blur="emailTouched = true"
              >
                <template v-slot:prepend>
                  <q-icon name="mail_outline" size="18px" class="sac__input-icon" />
                </template>
              </q-input>
            </div>

            <!-- Password Field -->
            <div class="sac__form-group">
              <label class="sac__input-label" for="admin-login-password">{{ t.passwordLabel }}</label>
              <q-input
                id="admin-login-password"
                v-model="form.password"
                :dark="prefs.isDarkMode"
                filled
                dense
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :placeholder="t.passwordPlaceholder"
                class="sac__custom-input"
                :disable="loading || lockoutRemainingMs > 0"
                lazy-rules
                :rules="[val => !!val || 'Password is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock_outline" size="18px" class="sac__input-icon" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    size="18px"
                    class="sac__eye-icon cursor-pointer"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>
            </div>

            <!-- Remember Device & Forgot Password Row -->
            <div class="sac__row-between sac__aux-row">
              <q-checkbox
                v-model="rememberDevice"
                dense
                color="indigo-5"
                :label="t.rememberDevice"
                class="sac__remember-checkbox"
              />
              <button
                type="button"
                class="sac__link-btn"
                @click="triggerRecoveryHint"
              >
                {{ t.forgotPassword }}
              </button>
            </div>

            <!-- Primary Sign In Button -->
            <button
              type="submit"
              class="sac__primary-btn"
              :disabled="loading || lockoutRemainingMs > 0"
            >
              <q-spinner-dots v-if="loading" size="20px" class="q-mr-sm" />
              <q-icon v-else name="lock" size="18px" class="q-mr-sm" />
              <span>{{ loading ? t.signingIn : t.signIn }}</span>
            </button>

            <!-- Real WebAuthn / Security Key capability only if supported by backend -->
            <template v-if="WEBAUTHN_AVAILABLE">
              <div class="sac__or-divider">
                <span class="sac__or-line" />
                <span class="sac__or-text">OR</span>
                <span class="sac__or-line" />
              </div>

              <button
                type="button"
                class="sac__secondary-btn sac__security-key-btn"
                @click="executeWebAuthnLogin"
              >
                <q-icon name="key" size="18px" class="q-mr-sm" />
                <span>{{ t.securityKey }}</span>
              </button>
            </template>

            <!-- Audit & Security Notice at Bottom of Card -->
            <div class="sac__card-notice">
              <div class="sac__notice-icon-box">
                <q-icon name="verified_user" size="18px" class="sac__notice-icon" />
              </div>
              <div class="sac__notice-copy">
                <div>{{ t.auditNotice1 }}</div>
                <div class="sac__notice-sub">{{ t.auditNotice2 }}</div>
              </div>
            </div>
          </q-form>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="sac__footer">
      <div class="sac__footer-left">
        © {{ currentYear }} {{ t.copyright }} <span class="q-ml-sm text-grey-6 text-weight-medium">version 1.0.0</span>
      </div>
      <div class="sac__footer-right">
        <span class="sac__footer-link" role="button" tabindex="0">{{ t.privacy }}</span>
        <span class="sac__footer-link" role="button" tabindex="0">{{ t.terms }}</span>
        <span class="sac__footer-link" role="button" tabindex="0">{{ t.security }}</span>
        <span class="sac__footer-link" role="button" tabindex="0">{{ t.support }}</span>
      </div>
    </footer>

    <!-- Device Approval Modal Dialog -->
    <q-dialog v-model="showDeviceApprovalDialog" persistent>
      <q-card class="sac__dialog">
        <q-card-section class="row items-center">
          <div class="text-weight-bold text-negative">Device Access Restricted</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="column q-gutter-sm">
          <div class="text-caption text-grey-5">
            This Super Admin account requires administrator approval for new browser environments.
          </div>
          <q-input outlined dense readonly :dark="prefs.isDarkMode" v-model="approvalDeviceId">
            <template v-slot:append>
              <q-btn flat round dense icon="content_copy" @click="copyApprovalId" />
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { joinApiUrl } from '../../config/env'
import { useQuasar, copyToClipboard } from 'quasar'
import logoImg from '../../assets/logo_transparent.png'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const { prefs, toggleTheme } = useOperatorPreferences()

const currentYear = new Date().getFullYear()

// Language Selector & Multi-Language Dictionary (English, Yorùbá, Igbo, Hausa)
const availableLanguages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'yo', label: 'Yorùbá', flag: '🇳🇬' },
  { code: 'ig', label: 'Igbo', flag: '🇳🇬' },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬' }
]

const currentLang = ref(localStorage.getItem('invify_login_locale') || 'en')

const currentLangLabel = computed(() => {
  const match = availableLanguages.find(l => l.code === currentLang.value)
  return match ? match.label : 'English'
})

function setLanguage(code) {
  currentLang.value = code
  localStorage.setItem('invify_login_locale', code)
}

const translations = {
  en: {
    brandSub: 'Enterprise Platform',
    superAdmin: 'Super Admin',
    commandCenter: 'Command Center',
    heroDesc: 'Securely access the Invify orchestration platform. Manage tenants, modules, users, integrations, and enterprise operations from a single unified hub.',
    feat1Title: 'Enterprise Grade Security',
    feat1Body: 'Bank-level encryption, device binding, and multi-layer authentication.',
    feat2Title: 'Multi-Tenant Orchestration',
    feat2Body: 'Onboard, manage, and monitor all tenants from a centralized dashboard.',
    feat3Title: 'Real-time Intelligence',
    feat3Body: 'Live analytics, system health, and operational insights at your fingertips.',
    feat4Title: 'Full Platform Control',
    feat4Body: 'Control modules, permissions, integrations, and system configurations.',
    trustLabel: 'Enterprise Security Indicators',
    trust1Title: 'Enterprise Security',
    trust1Sub: 'Multi-Layered',
    trust2Title: 'Encrypted Data',
    trust2Sub: 'TLS & At-Rest',
    trust3Title: 'Platform Availability',
    trust3Sub: '99.99% Target',
    trust4Title: 'Audited Admin',
    trust4Sub: 'Tamper-Evident',
    welcome: 'Welcome Back',
    welcomeSub: 'Sign in to your super admin account',
    secureAdminAccess: 'Secure Admin Access',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email address',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberDevice: 'Remember this device',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In to Dashboard',
    signingIn: 'Signing In...',
    securityKey: 'Sign in with Security Key',
    auditNotice1: 'All admin sessions are monitored and audited',
    auditNotice2: 'Unauthorized access is strictly prohibited',
    copyright: 'Invify Enterprise Platform. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    security: 'Security',
    support: 'Support'
  },
  yo: {
    brandSub: 'Pẹpẹ Idawọle',
    superAdmin: 'Oludari Agba',
    commandCenter: 'Gbongan Aṣẹ',
    heroDesc: 'Wọle si pẹpẹ iṣakoso Invify ni aabo. Ṣakoso awọn ayalegbe, awọn modulu, awọn olumulo, ati awọn iṣẹ idawọle lati ibi aringbungbun kan.',
    feat1Title: 'Aabo Ipele Idawọle',
    feat1Body: 'Idaabobo ipele banki, isopọ ẹrọ, ati ijẹrisi ipele pupọ.',
    feat2Title: 'Iṣakoso Ayalegbe Pupọ',
    feat2Body: 'Gba wọle, ṣakoso, ati ṣe abojuto gbogbo awọn ayalegbe lati ibi aṣẹ kanṣoṣo.',
    feat3Title: 'Oye Akoko Gidi',
    feat3Body: 'Itupalẹ lẹsẹkẹsẹ, ilera eto, ati oye iṣiṣẹ ni ika rẹ.',
    feat4Title: 'Iṣakoso Pẹpẹ Ni Kikun',
    feat4Body: 'Ṣakoso awọn modulu, awọn igbanilaaye, awọn iṣọpọ, ati awọn iṣeto eto.',
    trustLabel: 'Awọn Afihan Aabo Idawọle',
    trust1Title: 'Aabo Idawọle',
    trust1Sub: 'Ipele Pupọ',
    trust2Title: 'Data Ti A Pa Mọ',
    trust2Sub: 'TLS & Ibi-ipamọ',
    trust3Title: 'Wiwa Pẹpẹ',
    trust3Sub: 'Ifojusun 99.99%',
    trust4Title: 'Ayẹwo Abojuto',
    trust4Sub: 'Ailẹfọwọkan',
    welcome: 'Ẹ Ku Abo Pada',
    welcomeSub: 'Wọle si akọọlẹ oludari agba rẹ',
    secureAdminAccess: 'Wiwọle Aabo Oludari',
    emailLabel: 'Adirẹsi Imeeli',
    emailPlaceholder: 'Tẹ adirẹsi imeeli rẹ sii',
    passwordLabel: 'Ọrọigbaniwọle',
    passwordPlaceholder: 'Tẹ ọrọigbaniwọle rẹ sii',
    rememberDevice: 'Ranti ẹrọ yii',
    forgotPassword: 'Gbagbe ọrọigbaniwọle?',
    signIn: 'Wọle si Gbongan Iṣakoso',
    signingIn: 'N wọle...',
    securityKey: 'Wọle pẹlu Kókóro Aabo',
    auditNotice1: 'Gbogbo awọn igba oludari ni a n ṣe abojuto ati ayẹwo',
    auditNotice2: 'Wiwọle laigba aṣẹ jẹ eewọ patapata',
    copyright: 'Pẹpẹ Idawọle Invify. Gbogbo ẹtọ ni a daabobo.',
    privacy: 'Ilana Aṣiri',
    terms: 'Awọn Ofin Iṣẹ',
    security: 'Aabo',
    support: 'Atilẹyin'
  },
  ig: {
    brandSub: 'Usoro Ụlọ Ọrụ',
    superAdmin: 'Nnukwu Onye Nlekọta',
    commandCenter: 'Ebe Nchịkwa',
    heroDesc: "Nweta usoro nhazi Invify n'enweghị nchegbu. Jikwaa ndị nwe ụlọ, modul, ndị ọrụ, ntinye aka, na ọrụ ụlọ ọrụ site n'otu ebe.",
    feat1Title: 'Nchekwa Ọkwa Ụlọ Ọrụ',
    feat1Body: 'Nkwekorita ọkwa ụlọ akụ, nkekọ ngwaọrụ, na nkwenye ọtụtụ ọkwa.',
    feat2Title: 'Nchikota Ọtụtụ Ndị Nwe Ụlọ',
    feat2Body: "Banye, jikwaa ma nyochaa ndị nwe ụlọ niile site n'otu ebe nchịkwa.",
    feat3Title: 'Ọgụgụ Isi Oge Gboo',
    feat3Body: "Nchịkọta data ozugbo, ahụike sistemụ, na nghọta ọrụ n'aka gị.",
    feat4Title: 'Nchịkwa Sistemụ Zuru Ezu',
    feat4Body: 'Jikwaa modul, ikikere, ntinye aka, na nhazi sistemụ.',
    trustLabel: 'Ihe Ngosi Nchekwa Ụlọ Ọrụ',
    trust1Title: 'Nchekwa Ụlọ Ọrụ',
    trust1Sub: 'Ọtụtụ Ọkwa',
    trust2Title: 'Data Echekwara',
    trust2Sub: 'TLS & Nchedo',
    trust3Title: 'Ọnụnọ Usoro',
    trust3Sub: 'Ebumnuche 99.99%',
    trust4Title: 'Nyocha Nlekọta',
    trust4Sub: 'Nchekwa Nkwenye',
    welcome: 'Nnọọ Ọzọ',
    welcomeSub: 'Banye na akaụntụ nnukwu onye nlekọta gị',
    secureAdminAccess: 'Ntinye Nchebe Onye Nlekọta',
    emailLabel: 'Adreesị Ozi Ịntanetị',
    emailPlaceholder: 'Tinye adreesị ozi ịntanetị gị',
    passwordLabel: 'Okwuntughe',
    passwordPlaceholder: 'Tinye okwuntughe gị',
    rememberDevice: 'Cheta ngwaọrụ a',
    forgotPassword: 'Chefuru okwuntughe?',
    signIn: 'Banye na Ebe Nchịkwa',
    signingIn: 'Na-abanye...',
    securityKey: 'Jiri Igodo Nchekwa Banye',
    auditNotice1: 'A na-enyocha ma na-edekọ oge nlekọta niile',
    auditNotice2: 'A machibidoro ịbanye na-enweghị ikike kpamkpam',
    copyright: 'Usoro Ụlọ Ọrụ Invify. Ikike niile echekwara.',
    privacy: 'Iwu Nzuzo',
    terms: 'Usoro Ọrụ',
    security: 'Nchekwa',
    support: 'Nkwado'
  },
  ha: {
    brandSub: "Dandalin Masana'antu",
    superAdmin: 'Babban Manaja',
    commandCenter: 'Cibiyar Umarni',
    heroDesc: "Shiga dandalin tsara ayyuka na Invify cikin aminci. Gudanar da masu haya, kayayyaki, masu amfani, haɗin kai, da ayyukan masana'antu daga wuri guda.",
    feat1Title: "Kariyar Matakin Masana'antu",
    feat1Body: "Boye bayanai matakin banki, daidaita na'ura, da tantancewa mai matakai da yawa.",
    feat2Title: 'Tsarin Masu Haya Da Yawa',
    feat2Body: 'Shigar, gudanar, da lura da dukkan masu haya daga cibiyar umarni guda.',
    feat3Title: 'Fahimtar Lokaci Na Gaskiya',
    feat3Body: 'Binciken kai tsaye, lafiyar tsarin, da fahimtar aiki a hannunka.',
    feat4Title: 'Cikakken Ikon Dandali',
    feat4Body: 'Kula da kayayyaki, izini, haɗin kai, da tsarin aiki.',
    trustLabel: "Alamomin Tsaron Masana'antu",
    trust1Title: "Tsaron Masana'antu",
    trust1Sub: 'Matakai Da Yawa',
    trust2Title: 'Boyayyen Bayani',
    trust2Sub: 'TLS & Adanawa',
    trust3Title: 'Samuwar Dandali',
    trust3Sub: 'Manufar 99.99%',
    trust4Title: 'Binciken Gudanarwa',
    trust4Sub: 'Kariya Daga Sauyi',
    welcome: 'Barka Da Dawowa',
    welcomeSub: 'Shiga asusunka na babban manaja',
    secureAdminAccess: 'Hanyar Shiga Mai Tsaro Ta Manaja',
    emailLabel: 'Adireshin Imel',
    emailPlaceholder: 'Shigar da adireshin imel dinka',
    passwordLabel: 'Kalmar Sirri',
    passwordPlaceholder: 'Shigar da kalmar sirrinka',
    rememberDevice: "Tuna wannan na'urar",
    forgotPassword: 'Ka manta kalmar sirri?',
    signIn: 'Shiga Cibiyar Gudanarwa',
    signingIn: 'Ana Shiga...',
    securityKey: 'Shiga da Mabudin Tsaro',
    auditNotice1: 'Ana lura da duk lokutan shiga na manaja kuma ana bincika su',
    auditNotice2: 'An haramta shiga ba tare da izini ba kwata-kwata',
    copyright: "Dandalin Masana'antu Na Invify. Duk hakki mallaka ne.",
    privacy: 'Manufar Tsare Sirri',
    terms: 'Sharuddan Sabis',
    security: 'Tsaro',
    support: 'Tallafi'
  }
}

const t = computed(() => translations[currentLang.value] || translations.en)

// Feature rows dynamically reacting to chosen language
const platformFeatures = computed(() => [
  {
    title: t.value.feat1Title,
    body: t.value.feat1Body,
    icon: 'shield',
    iconColor: '#818CF8',
    bgColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  {
    title: t.value.feat2Title,
    body: t.value.feat2Body,
    icon: 'domain',
    iconColor: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.25)'
  },
  {
    title: t.value.feat3Title,
    body: t.value.feat3Body,
    icon: 'show_chart',
    iconColor: '#34D399',
    bgColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.25)'
  },
  {
    title: t.value.feat4Title,
    body: t.value.feat4Body,
    icon: 'settings',
    iconColor: '#FBBF24',
    bgColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.25)'
  }
])

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

function isPlatformStaffRole(roleRaw) {
  return String(roleRaw || '')
    .split(',')
    .map((r) => r.trim().toUpperCase().replace(/-/g, '_'))
    .filter(Boolean)
    .some((r) => PLATFORM_STAFF_ROLES.has(r))
}

const loading = ref(false)
const showPassword = ref(false)
const showRecoveryPassword = ref(false)
const showRecoveryConfirmPassword = ref(false)
const showForceResetPassword = ref(false)
const showForceResetConfirmPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const emailTouched = ref(false)
const rememberDevice = ref(true)

const form = ref({ email: '', password: '', totpCode: '' })
const resetForm = ref({ newPassword: '', confirmPassword: '' })
const pendingChallengeState = ref(false)
const pendingResetState = ref(false)
const pendingOtpResetState = ref(false)
const activeUserId = ref(null)
const activeUserRole = ref('SUPER_ADMIN')
const challengeToken = ref('')
const challengeContextMessage = ref('')
const lockoutRemainingMs = ref(0)
const failedAttemptsCount = ref(0)

const deviceId = ref('')
const showDeviceApprovalDialog = ref(false)
const approvalDeviceId = ref('')
const approvalUserEmail = ref('')

const otpForm = ref({ email: '', otpCode: '', newPassword: '', confirmPassword: '' })
const recoveryStep = ref('email')
const otpVerified = ref(false)
const RESEND_OTP_COOLDOWN_SEC = 60
const resendCooldownRemaining = ref(0)
let resendCooldownTimer = null
let lockoutTimer = null

/**
 * WebAuthn / Passkey capability flag.
 * Only enabled when connected to a real WebAuthn authentication implementation.
 */
const WEBAUTHN_AVAILABLE = false

const emailRule = (val) => {
  const v = String(val || '').trim()
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return true
}

const emailError = computed(() => {
  const result = emailRule(form.value.email)
  return result === true ? '' : result
})

const resendCountdownLabel = computed(() => {
  const s = Math.max(0, resendCooldownRemaining.value)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

const recoveryPrimaryLabel = computed(() => {
  if (recoveryStep.value === 'email') return 'Request OTP'
  if (recoveryStep.value === 'verify') return 'Validate code'
  return 'Reset password'
})

async function executeWebAuthnLogin() {
  if (!WEBAUTHN_AVAILABLE) return
}

function clearResendCooldown() {
  if (resendCooldownTimer) {
    clearInterval(resendCooldownTimer)
    resendCooldownTimer = null
  }
  resendCooldownRemaining.value = 0
}

function startResendCooldown(seconds = RESEND_OTP_COOLDOWN_SEC) {
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

function mapAuthError(err) {
  const status = err?.response?.status
  const data = err?.response?.data || {}
  const code = String(data.code || data.error || '')
  const raw = String(data.message || data.error || err?.message || '')

  if (!err?.response) {
    return 'Unable to connect to Invify. Check your connection and try again.'
  }
  if (status === 429 || /rate|too many/i.test(raw)) {
    return 'Too many sign-in attempts. Please wait before trying again.'
  }
  if (code === 'WRONG_LOGIN_PORTAL' || data.error === 'WRONG_LOGIN_PORTAL') {
    return data.message || 'This account does not have Super Admin access. Use /tenant/login.'
  }
  if (code === 'MAINTENANCE_LOCK' || data.error === 'MAINTENANCE_LOCK') {
    return data.message || 'The platform is temporarily unavailable for maintenance.'
  }
  if (/disabled|inactive|suspended/i.test(raw)) {
    return 'Your administrator account is currently disabled. Contact your platform administrator.'
  }
  if (status === 401 || /invalid credentials|invalid login|email or password/i.test(raw)) {
    return 'Email or password is incorrect.'
  }
  if (status === 403 && /super admin|unauthorized|forbidden|portal/i.test(raw)) {
    return 'This account does not have Super Admin access.'
  }
  if (status >= 500 || data.error === 'AUTH_SERVICE_UNAVAILABLE') {
    return 'Your session could not be established. Please try again.'
  }
  return 'Sign-in failed. Please try again.'
}

function ensureDeviceId() {
  const persistentKey = 'invify_browser_device_id'
  const sessionKey = 'invify_browser_device_id_session'

  if (rememberDevice.value) {
    let stored = localStorage.getItem(persistentKey)
    if (!stored) {
      stored = `browser-id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(persistentKey, stored)
    }
    sessionStorage.removeItem(sessionKey)
    deviceId.value = stored
    return
  }

  let sessionId = sessionStorage.getItem(sessionKey)
  if (!sessionId) {
    sessionId = `browser-id-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(sessionKey, sessionId)
  }
  deviceId.value = sessionId
}

function copyApprovalId() {
  copyToClipboard(approvalDeviceId.value)
  $q.notify({ type: 'positive', message: 'Device ID copied' })
}

function triggerRecoveryHint() {
  errorMessage.value = ''
  successMessage.value = ''
  pendingOtpResetState.value = true
  recoveryStep.value = 'email'
  otpVerified.value = false
  clearResendCooldown()
  otpForm.value = {
    email: form.value.email || '',
    otpCode: '',
    newPassword: '',
    confirmPassword: ''
  }
}

function onRecoveryBack() {
  errorMessage.value = ''
  successMessage.value = ''
  if (recoveryStep.value === 'password') {
    recoveryStep.value = 'verify'
    otpVerified.value = false
    return
  }
  if (recoveryStep.value === 'verify') {
    recoveryStep.value = 'email'
    otpForm.value.otpCode = ''
    clearResendCooldown()
    return
  }
  pendingOtpResetState.value = false
  clearResendCooldown()
}

async function onRecoveryPrimaryAction() {
  if (recoveryStep.value === 'email') return requestOtpCode()
  if (recoveryStep.value === 'verify') return verifyRecoveryOtp()
  return executeOtpResetPassword()
}

async function requestOtpCode() {
  if (resendCooldownRemaining.value > 0) {
    errorMessage.value = `Please wait ${resendCountdownLabel.value} before requesting another OTP.`
    return
  }
  const email = String(otpForm.value.email || '').trim().toLowerCase()
  const valid = emailRule(email)
  if (valid !== true) {
    errorMessage.value = valid
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
    recoveryStep.value = 'verify'
    otpVerified.value = false
    startResendCooldown()
    successMessage.value = `Recovery OTP sent to ${email}.`
  } catch (err) {
    errorMessage.value = mapAuthError(err)
  } finally {
    loading.value = false
  }
}

async function verifyRecoveryOtp() {
  const email = String(otpForm.value.email || '').trim().toLowerCase()
  const code = String(otpForm.value.otpCode || '').trim()
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
    if (res.data?.success === false) throw new Error(res.data?.error || 'Invalid code')
    otpVerified.value = true
    recoveryStep.value = 'password'
    successMessage.value = 'Recovery email verified. Set your new password.'
  } catch (err) {
    otpVerified.value = false
    errorMessage.value = mapAuthError(err)
  } finally {
    loading.value = false
  }
}

async function executeOtpResetPassword() {
  if (!otpVerified.value) {
    errorMessage.value = 'Validate your recovery code before setting a new password.'
    return
  }
  if (otpForm.value.newPassword !== otpForm.value.confirmPassword) {
    errorMessage.value = 'Passwords do not match.'
  }
  if (!otpForm.value.newPassword || otpForm.value.newPassword.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const email = String(otpForm.value.email || '').trim().toLowerCase()
    const res = await axios.post(joinApiUrl('/api/auth/reset-password'), {
      email,
      recoveryVerified: true,
      newPassword: otpForm.value.newPassword
    })
    successMessage.value = res.data.message || 'Password updated. You can sign in now.'
    form.value.email = email
    pendingOtpResetState.value = false
    recoveryStep.value = 'email'
    otpForm.value = { email: '', otpCode: '', newPassword: '', confirmPassword: '' }
    otpVerified.value = false
    clearResendCooldown()
  } catch (err) {
    const raw = String(err?.response?.data?.error || err?.message || '')
    if (
      err?.response?.data?.code === 'SAME_AS_PREVIOUS_PASSWORD' ||
      /same as your previous|same password|different from the old/i.test(raw)
    ) {
      errorMessage.value = 'New password cannot be the same as your previous password.'
    } else {
      errorMessage.value = mapAuthError(err)
    }
  } finally {
    loading.value = false
  }
}

async function executeLoginPass() {
  if (loading.value || lockoutRemainingMs.value > 0) return
  const emailCheck = emailRule(form.value.email)
  if (emailCheck !== true) {
    emailTouched.value = true
    errorMessage.value = emailCheck
    return
  }
  if (!form.value.password) {
    errorMessage.value = 'Password is required.'
    return
  }

  ensureDeviceId()
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await axios.post(joinApiUrl('/api/auth/login'), {
      email: String(form.value.email || '').trim().toLowerCase(),
      password: form.value.password,
      portal: 'admin',
      isolationTier: 'staff',
      deviceId: deviceId.value
    })

    if (res.data?.requiresPasswordReset) {
      activeUserId.value = res.data.userId
      activeUserRole.value = res.data.role || activeUserRole.value
      pendingResetState.value = true
      successMessage.value = 'First sign-in detected. Please set a new password.'
      return
    }

    if (res.status === 202 || res.data?.requiresMfaSetup || res.data?.requires2FA) {
      activeUserId.value = res.data.userId
      activeUserRole.value = res.data.role || activeUserRole.value
      challengeToken.value = res.data.challengeToken || ''
      sessionStorage.setItem('mfa_challenge_userId', res.data.userId || '')
      sessionStorage.setItem('operator_role', activeUserRole.value)
      if (res.data.requiresMfaSetup) {
        sessionStorage.setItem('mfa_setup_token', res.data.setupToken || res.data.challengeToken)
        sessionStorage.setItem('mfa_setup_userId', res.data.userId)
        sessionStorage.removeItem('mfa_challenge_token')
        router.push('/mfa/challenge').catch(() => {})
        return
      }
      sessionStorage.setItem('mfa_challenge_token', challengeToken.value)
      pendingChallengeState.value = true
      challengeContextMessage.value =
        res.data.message || 'Enter the 6-digit code from your authenticator app.'
      return
    }

    if (res.data?.token) {
      const role = res.data?.user?.role || res.data?.role || ''
      if (!isPlatformStaffRole(role)) {
        errorMessage.value = 'This account does not have Super Admin access.'
        return
      }
      localStorage.setItem('mfa_status_verified', 'true')
      finalizeAuthenticatedSession(res.data)
      return
    }

    errorMessage.value = 'Your session could not be established. Please try again.'
  } catch (err) {
    const errorResponse = err.response?.data
    if (errorResponse?.error === 'DEVICE_APPROVAL_REQUIRED') {
      errorMessage.value = errorResponse.message || 'This browser device is pending approval.'
      showDeviceApprovalDialog.value = true
      approvalDeviceId.value = errorResponse.deviceId || deviceId.value
      approvalUserEmail.value = form.value.email
    } else {
      failedAttemptsCount.value += 1
      if (failedAttemptsCount.value >= 3) {
        lockoutRemainingMs.value = 15000
        if (lockoutTimer) clearInterval(lockoutTimer)
        lockoutTimer = setInterval(() => {
          lockoutRemainingMs.value -= 1000
          if (lockoutRemainingMs.value <= 0) {
            clearInterval(lockoutTimer)
            lockoutTimer = null
            failedAttemptsCount.value = 0
          }
        }, 1000)
        errorMessage.value = 'Too many sign-in attempts. Please wait before trying again.'
      } else {
        errorMessage.value = mapAuthError(err)
      }
    }
  } finally {
    loading.value = false
  }
}

async function executeMfaVerification() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await axios.post(joinApiUrl('/api/auth/mfa/verify'), {
      userId: activeUserId.value,
      tokenCode: form.value.totpCode,
      challengeToken: challengeToken.value,
      role: activeUserRole.value
    })
    if (res.data?.token) {
      localStorage.setItem('mfa_status_verified', 'true')
      finalizeAuthenticatedSession(res.data)
    } else {
      errorMessage.value = 'Your session could not be established. Please try again.'
    }
  } catch (err) {
    errorMessage.value = mapAuthError(err)
  } finally {
    loading.value = false
  }
}

async function executeResetPassword() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const res = await axios.post(joinApiUrl('/api/auth/reset-password'), {
      userId: activeUserId.value,
      newPassword: resetForm.value.newPassword
    })
    successMessage.value = res.data.message || 'Password updated. You can sign in now.'
    pendingResetState.value = false
    resetForm.value = { newPassword: '', confirmPassword: '' }
  } catch (err) {
    errorMessage.value = mapAuthError(err)
  } finally {
    loading.value = false
  }
}

function cancelChallengeState() {
  pendingChallengeState.value = false
  form.value.totpCode = ''
  errorMessage.value = ''
}

function finalizeAuthenticatedSession(tokenData) {
  localStorage.setItem('invify_token', tokenData.token)
  if (tokenData.refreshToken) {
    localStorage.setItem('invify_refresh_token', tokenData.refreshToken)
  }
  const cleanRole = (tokenData.user?.role || tokenData.role || activeUserRole.value || 'SUPER_ADMIN').toUpperCase()
  localStorage.setItem('operator_role', cleanRole)
  localStorage.setItem('operator_email', form.value.email || tokenData.user?.email || '')
  localStorage.setItem('mfa_status_verified', 'true')

  const fullName = tokenData.user?.name || tokenData.user?.full_name || ''
  if (fullName) {
    const parts = fullName.trim().split(' ')
    localStorage.setItem('operator_first_name', parts[0] || '')
    localStorage.setItem('operator_last_name', parts.slice(1).join(' ') || '')
  }

  const tenantId = tokenData.user?.tenantId || tokenData.tenantId
  if (tenantId) localStorage.setItem('tenant_id', tenantId)

  successMessage.value = 'Signed in successfully. Opening your dashboard…'
  setTimeout(() => {
    const dest = route.query?.redirect || '/'
    router.push(dest).catch(() => {})
  }, 400)
}

onMounted(() => {
  rememberDevice.value = localStorage.getItem('invify_remember_device') !== 'false'
  ensureDeviceId()
})

onUnmounted(() => {
  clearResendCooldown()
  if (lockoutTimer) clearInterval(lockoutTimer)
})

watch(rememberDevice, (val) => {
  localStorage.setItem('invify_remember_device', val ? 'true' : 'false')
  ensureDeviceId()
})
</script>

<style scoped>
/* ==========================================================================
   SUPER ADMIN COMMAND CENTER - ENTERPRISE AUTHENTICATION GATEWAY
   Dynamic Theme Support & Multi-Language Support (EN, YO, IG, HA)
   ========================================================================== */

.sac {
  --sac-bg: #060814;
  --sac-card-bg: rgba(13, 19, 33, 0.78);
  --sac-card-border: rgba(255, 255, 255, 0.08);
  --sac-card-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.8), 0 0 50px -10px rgba(99, 102, 241, 0.15);
  --sac-text-primary: #FFFFFF;
  --sac-text-secondary: #94A3B8;
  --sac-text-muted: #64748B;
  --sac-input-bg: rgba(11, 17, 30, 0.85);
  --sac-input-border: rgba(255, 255, 255, 0.1);
  --sac-input-text: #FFFFFF;
  --sac-input-placeholder: #64748B;
  --sac-pill-bg: rgba(255, 255, 255, 0.03);
  --sac-pill-border: rgba(255, 255, 255, 0.1);
  --sac-pill-text: #CBD5E1;
  --sac-divider: rgba(255, 255, 255, 0.1);
  --sac-border-subtle: rgba(255, 255, 255, 0.06);
  --sac-box-bg: rgba(255, 255, 255, 0.04);
  --sac-box-border: rgba(255, 255, 255, 0.08);
  --sac-accent-blue: #6366F1;
  --sac-accent-purple: #818CF8;
  --sac-accent-gradient: linear-gradient(90deg, #5B48EE 0%, #4361EE 100%);
  --sac-shield-bg: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.22), rgba(30, 27, 75, 0.6));
  --sac-dialog-bg: #0F172A;
  --sac-dialog-text: #FFFFFF;
  --sac-dialog-border: rgba(255, 255, 255, 0.1);

  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  color: var(--sac-text-primary);
  background-color: var(--sac-bg);
  position: relative;
  overflow-x: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Light Theme Overrides */
.sac.sac--light {
  --sac-bg: #F8FAFC;
  --sac-card-bg: rgba(255, 255, 255, 0.94);
  --sac-card-border: rgba(226, 232, 240, 0.95);
  --sac-card-shadow: 0 20px 60px -15px rgba(15, 23, 42, 0.08), 0 0 35px -10px rgba(99, 102, 241, 0.08);
  --sac-text-primary: #0F172A;
  --sac-text-secondary: #475569;
  --sac-text-muted: #64748B;
  --sac-input-bg: #FFFFFF;
  --sac-input-border: #CBD5E1;
  --sac-input-text: #0F172A;
  --sac-input-placeholder: #94A3B8;
  --sac-pill-bg: rgba(0, 0, 0, 0.04);
  --sac-pill-border: rgba(0, 0, 0, 0.1);
  --sac-pill-text: #334155;
  --sac-divider: rgba(0, 0, 0, 0.1);
  --sac-border-subtle: rgba(0, 0, 0, 0.08);
  --sac-box-bg: rgba(0, 0, 0, 0.03);
  --sac-box-border: rgba(0, 0, 0, 0.08);
  --sac-accent-blue: #4F46E5;
  --sac-accent-purple: #6366F1;
  --sac-accent-gradient: linear-gradient(90deg, #6366F1 0%, #4F46E5 100%);
  --sac-shield-bg: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.15), rgba(238, 242, 255, 0.8));
  --sac-dialog-bg: #FFFFFF;
  --sac-dialog-text: #0F172A;
  --sac-dialog-border: rgba(0, 0, 0, 0.1);
}

/* Background grid mesh */
.sac__mesh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 50% 50%, #000 40%, transparent 95%);
  z-index: 0;
}

.sac.sac--light .sac__mesh {
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
}

/* Ambient glow system */
.sac__ambient {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  z-index: 0;
  filter: blur(80px);
}

.sac__ambient--top-left {
  width: 600px;
  height: 600px;
  top: -150px;
  left: -150px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%);
}

.sac.sac--light .sac__ambient--top-left {
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08), transparent 70%);
}

.sac__ambient--bottom-left {
  width: 550px;
  height: 550px;
  bottom: -100px;
  left: 15%;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.18), transparent 70%);
}

.sac.sac--light .sac__ambient--bottom-left {
  background: radial-gradient(circle, rgba(79, 70, 229, 0.08), transparent 70%);
}

.sac__ambient--right {
  width: 650px;
  height: 650px;
  top: 15%;
  right: -100px;
  background: radial-gradient(circle, rgba(67, 97, 238, 0.12), transparent 70%);
}

.sac.sac--light .sac__ambient--right {
  background: radial-gradient(circle, rgba(67, 97, 238, 0.06), transparent 70%);
}

/* --------------------------------------------------------------------------
   Header Bar
   -------------------------------------------------------------------------- */
.sac__header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 48px;
  width: 100%;
}

.sac__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sac__logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sac__logo-img {
  height: 36px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(99, 102, 241, 0.25));
}

.sac__brand-text {
  display: flex;
  flex-direction: column;
}

.sac__brand-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--sac-text-primary);
  line-height: 1.1;
  transition: color 0.2s ease;
}

.sac__brand-sub {
  font-size: 12px;
  color: var(--sac-text-secondary);
  font-weight: 400;
  margin-top: 2px;
  transition: color 0.2s ease;
}

.sac__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sac__action-pill {
  background: var(--sac-pill-bg);
  border: 1px solid var(--sac-pill-border);
  color: var(--sac-pill-text);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.sac__action-pill:hover {
  filter: brightness(1.15);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--sac-text-primary);
}

.sac__theme-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  padding: 0;
}

.sac__lang-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
}

.sac__lang-icon {
  color: var(--sac-text-secondary);
}

.sac__lang-arrow {
  color: var(--sac-text-secondary);
}

.sac__lang-flag {
  font-size: 14px;
}

.sac__lang-menu {
  border-radius: 12px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;
  overflow: hidden;
}

/* --------------------------------------------------------------------------
   Main Content Layout: 50% Left / 50% Right
   -------------------------------------------------------------------------- */
.sac__main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 48px;
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  padding: 10px 48px 30px;
}

/* --------------------------------------------------------------------------
   Left Column: Hero & Platform Features
   -------------------------------------------------------------------------- */
.sac__left {
  display: flex;
  justify-content: center;
  width: 100%;
}

.sac__left-inner {
  width: 100%;
  max-width: 540px;
}

.sac__hero {
  margin-bottom: 28px;
}

.sac__h1 {
  margin: 0 0 16px;
  font-size: clamp(2.4rem, 3.6vw, 3.2rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  display: flex;
  flex-direction: column;
}

.sac__h1-white {
  color: var(--sac-text-primary);
  transition: color 0.2s ease;
}

.sac__h1-accent {
  background: linear-gradient(90deg, #818CF8 0%, #6366F1 50%, #7C3AED 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.sac.sac--light .sac__h1-accent {
  background: linear-gradient(90deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.sac__desc {
  font-size: 15px;
  line-height: 1.6;
  color: var(--sac-text-secondary);
  margin: 0;
  transition: color 0.2s ease;
}

/* Feature rows */
.sac__features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 26px;
}

.sac__feature-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.sac__feature-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.sac__feature-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.sac__feature-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--sac-text-primary);
  margin-bottom: 2px;
  transition: color 0.2s ease;
}

.sac__feature-desc {
  font-size: 13px;
  line-height: 1.45;
  color: var(--sac-text-secondary);
  transition: color 0.2s ease;
}

/* --------------------------------------------------------------------------
   3D Holographic Platform Visual matching reference image
   -------------------------------------------------------------------------- */
.sac__hologram {
  position: relative;
  width: 100%;
  height: 170px;
  margin: 10px 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sac__holo-canvas {
  position: relative;
  width: 240px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sac__holo-spotlight {
  position: absolute;
  bottom: 0;
  width: 200px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4), transparent 70%);
  filter: blur(12px);
}

.sac__holo-beam {
  position: absolute;
  bottom: 20px;
  width: 100px;
  height: 120px;
  background: linear-gradient(180deg, rgba(129, 140, 248, 0.25) 0%, transparent 100%);
  clip-path: polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%);
  filter: blur(4px);
}

.sac__holo-disc-base {
  position: absolute;
  bottom: 12px;
  width: 180px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%);
  border: 1px solid rgba(129, 140, 248, 0.35);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.sac.sac--light .sac__holo-disc-base {
  background: linear-gradient(180deg, #EEF2FF 0%, #E0E7FF 100%);
  border: 1px solid rgba(99, 102, 241, 0.3);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
}

.sac__holo-ring--outer {
  position: absolute;
  bottom: 18px;
  width: 150px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(165, 180, 252, 0.5);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
}

.sac__holo-ring--inner {
  position: absolute;
  bottom: 24px;
  width: 110px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid #818CF8;
  box-shadow: 0 0 20px #6366F1;
}

.sac__holo-core {
  position: absolute;
  bottom: 28px;
  width: 60px;
  height: 18px;
  border-radius: 50%;
  background: #C7D2FE;
  box-shadow: 0 0 30px 6px #818CF8;
  filter: blur(2px);
}

.sac__holo-cube-container {
  position: absolute;
  top: 0;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: floatCube 4s ease-in-out infinite alternate;
}

.sac__holo-cube-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.45));
}

@keyframes floatCube {
  0% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(-8px);
  }
}

/* --------------------------------------------------------------------------
   Trust & Compliance Section (Factual Platform Security Only)
   -------------------------------------------------------------------------- */
.sac__trust-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.sac__trust-label {
  font-size: 12px;
  color: var(--sac-text-muted);
  font-weight: 500;
}

.sac__trust-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.sac__trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sac__trust-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--sac-box-bg);
  border: 1px solid var(--sac-box-border);
  display: grid;
  place-items: center;
  color: var(--sac-text-secondary);
  transition: all 0.2s ease;
}

.sac__trust-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.sac__trust-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--sac-text-primary);
  transition: color 0.2s ease;
}

.sac__trust-sub {
  font-size: 11px;
  color: var(--sac-text-muted);
}

/* --------------------------------------------------------------------------
   Right Column: Super Admin Login Card
   -------------------------------------------------------------------------- */
.sac__right {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.sac__card {
  width: 100%;
  max-width: 470px;
  background: var(--sac-card-bg);
  border: 1px solid var(--sac-card-border);
  border-radius: 24px;
  padding: 42px 38px 36px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--sac-card-shadow);
  position: relative;
  z-index: 2;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.sac__card-head {
  text-align: center;
  margin-bottom: 24px;
}

.sac__logo-badge {
  display: flex;
  justify-content: center;
  margin: 0 auto 16px;
}

.sac__shield-svg {
  width: 28px;
  height: 28px;
}

.sac__welcome {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--sac-text-primary);
  letter-spacing: -0.02em;
  transition: color 0.2s ease;
}

.sac__welcome-sub {
  margin: 6px 0 20px;
  font-size: 13.5px;
  color: var(--sac-text-secondary);
  transition: color 0.2s ease;
}

.sac__secure-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.sac__secure-line {
  flex: 1;
  height: 1px;
  background: var(--sac-divider);
  transition: background 0.2s ease;
}

.sac__secure-pill {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--sac-accent-purple);
  letter-spacing: 0.04em;
}

/* Alerts */
.sac__alerts {
  margin-bottom: 8px;
}

.sac__banner {
  border-radius: 10px;
  font-size: 12.5px;
  padding: 8px 12px;
  margin-bottom: 10px;
}

.sac__banner--error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #DC2626;
}

.sac.sac--light .sac__banner--error {
  background: rgba(254, 226, 226, 0.9);
  color: #B91C1C;
  border-color: #FCA5A5;
}

.sac__banner--ok {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #16A34A;
}

.sac.sac--light .sac__banner--ok {
  background: rgba(220, 252, 231, 0.9);
  color: #15803D;
  border-color: #86EFAC;
}

/* Form Styles */
.sac__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sac__form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sac__input-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--sac-text-primary);
  transition: color 0.2s ease;
}

.sac__custom-input :deep(.q-field__control) {
  background: var(--sac-input-bg) !important;
  border: 1px solid var(--sac-input-border);
  border-radius: 10px;
  padding: 0 14px;
  min-height: 46px;
  transition: all 0.2s ease;
}

.sac__custom-input :deep(.q-field__control:hover) {
  border-color: rgba(99, 102, 241, 0.4);
}

.sac__custom-input :deep(.q-field--focused .q-field__control) {
  border-color: var(--sac-accent-blue) !important;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

.sac__custom-input :deep(.q-field__native),
.sac__custom-input :deep(.q-field__input) {
  color: var(--sac-input-text) !important;
  font-size: 14px;
}

.sac__custom-input :deep(.q-field__native::placeholder),
.sac__custom-input :deep(.q-field__input::placeholder) {
  color: var(--sac-input-placeholder) !important;
}

.sac__input-icon {
  color: var(--sac-text-muted);
  margin-right: 6px;
}

.sac__eye-icon {
  color: var(--sac-text-secondary);
  cursor: pointer;
  transition: color 0.15s ease;
}

.sac__eye-icon:hover {
  color: var(--sac-text-primary);
}

/* Auxiliary Row */
.sac__aux-row {
  margin-top: -2px;
  margin-bottom: 4px;
}

.sac__row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sac__remember-checkbox :deep(.q-checkbox__label) {
  font-size: 13px;
  color: var(--sac-text-secondary);
  transition: color 0.2s ease;
}

.sac__link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--sac-accent-purple);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease;
}

.sac__link-btn:hover {
  filter: brightness(1.2);
  text-decoration: underline;
}

/* Primary Button */
.sac__primary-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: var(--sac-accent-gradient);
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px -4px rgba(67, 97, 238, 0.45);
  transition: all 0.2s ease;
}

.sac__primary-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: 0 10px 28px -2px rgba(67, 97, 238, 0.6);
  transform: translateY(-1px);
}

.sac__primary-btn:active:not(:disabled) {
  transform: translateY(0);
}

.sac__primary-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* OR Divider */
.sac__or-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}

.sac__or-line {
  flex: 1;
  height: 1px;
  background: var(--sac-divider);
}

.sac__or-text {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--sac-text-muted);
  letter-spacing: 0.05em;
}

/* Secondary Button */
.sac__secondary-btn {
  width: 100%;
  height: 46px;
  border-radius: 12px;
  border: 1px solid var(--sac-pill-border);
  background: var(--sac-pill-bg);
  color: var(--sac-text-primary);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sac__secondary-btn:hover {
  filter: brightness(1.1);
  border-color: rgba(99, 102, 241, 0.3);
}

.sac__actions-dual {
  display: flex;
  gap: 12px;
}

/* Card Notice */
.sac__card-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--sac-border-subtle);
}

.sac__notice-icon-box {
  flex-shrink: 0;
  margin-top: 2px;
}

.sac__notice-icon {
  color: #10B981;
}

.sac__notice-copy {
  font-size: 12px;
  color: var(--sac-text-secondary);
  line-height: 1.45;
  transition: color 0.2s ease;
}

.sac__notice-sub {
  color: var(--sac-text-muted);
}

/* Form note */
.sac__form-note {
  text-align: center;
  color: var(--sac-accent-purple);
  font-size: 13px;
  font-weight: 600;
}

.sac__muted-text {
  font-size: 12px;
  color: var(--sac-text-muted);
}

/* --------------------------------------------------------------------------
   Footer
   -------------------------------------------------------------------------- */
.sac__footer {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 48px;
  border-top: 1px solid var(--sac-border-subtle);
  font-size: 13px;
  color: var(--sac-text-muted);
  transition: border-color 0.2s ease;
}

.sac__footer-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.sac__footer-link {
  color: var(--sac-text-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.sac__footer-link:hover {
  color: var(--sac-text-primary);
}

/* Modal Dialog */
.sac__dialog {
  width: 480px;
  max-width: 95vw;
  background: var(--sac-dialog-bg);
  color: var(--sac-dialog-text);
  border: 1px solid var(--sac-dialog-border);
  border-radius: 16px;
}

/* --------------------------------------------------------------------------
   Responsive Design & Breakpoints
   -------------------------------------------------------------------------- */
@media (max-width: 1180px) {
  .sac__main {
    gap: 32px;
    padding: 10px 28px 24px;
  }

  .sac__header,
  .sac__footer {
    padding: 18px 28px;
  }
}

@media (max-width: 960px) {
  .sac__main {
    grid-template-columns: 1fr;
    max-width: 500px;
    padding-top: 10px;
  }

  .sac__left {
    text-align: center;
  }

  .sac__left-inner {
    max-width: 100%;
  }

  .sac__h1 {
    font-size: 2.2rem;
  }

  .sac__feature-row {
    text-align: left;
  }

  .sac__hologram {
    display: none;
  }

  .sac__trust-grid {
    justify-content: center;
  }

  .sac__footer {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .sac__footer-right {
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .sac__header {
    padding: 16px 18px;
  }

  .sac__main {
    padding: 10px 16px 20px;
  }

  .sac__card {
    padding: 30px 20px 24px;
    border-radius: 18px;
  }

  .sac__footer {
    padding: 16px 18px;
  }

  .sac__trust-grid {
    gap: 12px;
  }
}
</style>
