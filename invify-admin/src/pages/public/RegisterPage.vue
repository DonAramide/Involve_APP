<template>
  <q-layout :class="isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'">
    <q-page-container>
      <q-page
        class="registration-page flex flex-center"
        :class="isDarkMode ? 'registration-page--dark bg-dark text-white' : 'bg-white text-dark'"
        padding
      >
    <q-btn
      flat
      no-caps
      icon="arrow_back"
      label="Back to Home"
      to="/"
      class="registration-home-button"
      :class="isDarkMode ? 'text-white' : 'text-dark'"
      aria-label="Back to home page"
    />

    <q-btn
      flat
      round
      dense
      class="registration-theme-toggle"
      :class="isDarkMode ? 'text-white' : 'text-dark'"
      :icon="isDarkMode ? 'light_mode' : 'dark_mode'"
      :aria-label="isDarkMode ? 'Use light mode' : 'Use dark mode'"
      @click="toggleTheme"
    />

    <q-card
      :dark="isDarkMode"
      style="width: 100%; max-width: 600px"
      class="registration-card q-pa-md shadow-2"
      :class="isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'"
    >
      <q-card-section>
        <div class="text-h5 text-weight-bold text-center q-mb-md">Invify Onboarding</div>
      </q-card-section>

      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        animated
        flat
        :dark="isDarkMode"
        :class="isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'"
      >
        <!-- Step 1: Account Details -->
        <q-step
          :name="1"
          title="Account Details"
          icon="person"
          :done="step > 1"
        >
          <q-form @submit="onAccountDetailsSubmit" class="q-gutter-md">
            <q-btn
              type="button"
              unelevated
              no-caps
              class="full-width google-signup-btn"
              :loading="googleLoading"
              :disable="googleLoading"
              @click="onGoogleSignup"
            >
              <svg class="google-signup-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </q-btn>
            <div v-if="googlePrefillNotice" class="text-caption text-positive">
              {{ googlePrefillNotice }}
            </div>
            <div class="signup-divider text-caption text-grey-6">or continue with your details</div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="store.userDetails.firstName" 
                  label="First Name" 
                  outlined 
                  :dark="isDarkMode"
                  lazy-rules
                  :rules="[val => !!String(val || '').trim() || 'First Name is required']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="store.userDetails.lastName" 
                  label="Last Name" 
                  outlined 
                  :dark="isDarkMode"
                  lazy-rules
                  :rules="[val => !!String(val || '').trim() || 'Last Name is required']"
                />
              </div>
            </div>

            <q-input 
              v-model="store.userDetails.email" 
              label="Email Address" 
              type="email" 
              outlined 
              :dark="isDarkMode"
              :readonly="emailFromGoogle"
              lazy-rules
              :rules="[emailRule]"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-5">
                <q-select
                  v-model="countryDial"
                  :options="africaDialOptions"
                  label="Country code"
                  outlined
                  :dark="isDarkMode"
                  emit-value
                  map-options
                  options-dense
                  use-input
                  input-debounce="0"
                  @filter="filterDialCodes"
                />
              </div>
              <div class="col-12 col-sm-7">
                <q-input
                  v-model="nationalPhone"
                  label="Mobile number"
                  type="tel"
                  outlined
                  :dark="isDarkMode"
                  maxlength="13"
                  counter
                  lazy-rules
                  :rules="[() => phoneRule(countryDial, nationalPhone)]"
                  hint="Local number without the country code"
                />
              </div>
            </div>

            <q-input 
              v-model="store.userDetails.password" 
              label="Password" 
              :type="showPassword ? 'text' : 'password'"
              outlined 
              :dark="isDarkMode"
              lazy-rules
              :rules="[passwordRule]"
              hint="At least 6 characters"
            >
              <template #append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="confirmPassword"
              label="Confirm Password"
              :type="showConfirmPassword ? 'text' : 'password'"
              outlined
              :dark="isDarkMode"
              lazy-rules
              :rules="[
                val => !!val || 'Please confirm your password',
                val => val === store.userDetails.password || 'Passwords do not match'
              ]"
            >
              <template #append>
                <q-icon
                  :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  :aria-label="showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'"
                  @click="showConfirmPassword = !showConfirmPassword"
                />
              </template>
            </q-input>

            <q-banner v-if="store.error" class="bg-negative text-white rounded-borders">
              {{ store.error }}
            </q-banner>

            <div class="flex justify-end q-mt-md">
              <q-btn type="submit" color="primary" label="Continue" :loading="store.isLoading" />
            </div>
          </q-form>
        </q-step>

        <!-- Step 2: Email Verification -->
        <q-step
          v-if="store.emailRequired"
          :name="2"
          title="Verify Email"
          icon="email"
          :done="step > 2"
        >
          <div class="text-center q-mb-md">
            We sent a verification code to:<br />
            <strong>{{ store.userDetails.email }}</strong>
          </div>

          <q-form @submit="onEmailVerifySubmit" class="q-gutter-md">
            <q-input 
              v-model="emailOtp" 
              label="6-digit OTP" 
              outlined 
              :dark="isDarkMode"
              mask="######"
              lazy-rules
              :rules="[val => val && val.length === 6 || 'Enter the 6-digit OTP']"
              class="q-mx-auto"
              style="max-width: 200px"
              input-class="text-center text-h6 tracking-widest"
            />

            <q-banner v-if="store.error" class="bg-negative text-white rounded-borders">
              {{ store.error }}
            </q-banner>

            <div class="flex justify-center q-mt-md q-gutter-sm">
              <q-btn type="submit" color="primary" label="Verify" :loading="store.isLoading" />
              <q-btn 
                flat 
                color="primary" 
                :label="emailResendLabel" 
                @click="onResendEmailOtp" 
                :disable="emailResendDisabled" 
              />
            </div>
          </q-form>
        </q-step>

        <!-- Step 3: WhatsApp Verification (server-configurable; default off) -->
        <q-step
          v-if="store.whatsappRequired"
          :name="3"
          title="Verify WhatsApp"
          icon="phone"
          :done="step > 3"
        >
          <div class="text-center q-mb-md">
            We sent a verification code to:<br />
            <strong>{{ store.userDetails.phone }}</strong>
          </div>

          <q-form @submit="onWhatsappVerifySubmit" class="q-gutter-md">
            <q-input 
              v-model="whatsappOtp" 
              label="6-digit OTP" 
              outlined 
              :dark="isDarkMode"
              mask="######"
              lazy-rules
              :rules="[val => val && val.length === 6 || 'Enter the 6-digit OTP']"
              class="q-mx-auto"
              style="max-width: 200px"
              input-class="text-center text-h6 tracking-widest"
            />

            <q-banner v-if="store.error" class="bg-negative text-white rounded-borders">
              {{ store.error }}
            </q-banner>

            <div class="flex justify-center q-mt-md q-gutter-sm">
              <q-btn type="submit" color="primary" label="Verify" :loading="store.isLoading" />
              <q-btn 
                flat 
                color="primary" 
                :label="whatsappResendLabel" 
                @click="onResendWhatsappOtp" 
                :disable="whatsappResendDisabled" 
              />
            </div>
          </q-form>
        </q-step>

        <!-- Step 4: Account Activated -->
        <q-step
          :name="4"
          title="Account Activated"
          icon="check_circle"
        >
          <div class="text-center q-pa-lg">
            <q-icon name="check_circle" color="positive" size="5rem" />
            <h5 class="q-mt-md q-mb-xs">Welcome to Invify</h5>
            <p class="text-grey-7">Your account has been successfully activated.</p>
            
            <q-btn 
              color="primary" 
              label="Go to Dashboard" 
              class="q-mt-lg" 
              to="/dashboard"
            />
          </div>
        </q-step>
      </q-stepper>
    </q-card>
  </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useOnboardingStore } from 'stores/onboarding.store';
import { AFRICA_DIAL_CODES, DEFAULT_AFRICA_DIAL } from '../../utils/africaDialCodes';
import {
  emailRule,
  phoneRule,
  passwordRule,
  buildE164,
  decodeJwtPayload,
} from '../../utils/onboardingValidation';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const $q = useQuasar();
const store = useOnboardingStore();
const step = ref(1);
const isDarkMode = ref(false);
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const countryDial = ref(DEFAULT_AFRICA_DIAL);
const nationalPhone = ref('');
const africaDialOptions = ref([...AFRICA_DIAL_CODES]);
const emailFromGoogle = ref(false);
const googlePrefillNotice = ref('');
const googleLoading = ref(false);
const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

const emailOtp = ref('');
const whatsappOtp = ref('');

const now = ref(Date.now());
let timerId: ReturnType<typeof setInterval>;

watch([countryDial, nationalPhone], () => {
  store.userDetails.phone = buildE164(countryDial.value, nationalPhone.value);
});

function formatResendLabel(availableAt: number): string {
  const remaining = Math.max(0, Math.ceil((availableAt - now.value) / 1000));
  if (remaining <= 0) return 'Resend Code';
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return `Resend in ${mm}:${ss}`;
}

function filterDialCodes(val: string, update: (fn: () => void) => void) {
  update(() => {
    const needle = String(val || '').toLowerCase();
    africaDialOptions.value = AFRICA_DIAL_CODES.filter((opt) =>
      opt.label.toLowerCase().includes(needle) || opt.value.includes(needle),
    );
  });
}

function applyGoogleProfile(payload: Record<string, unknown>) {
  const given = String(payload.given_name || '').trim();
  const family = String(payload.family_name || '').trim();
  const fullName = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  if (given) store.userDetails.firstName = given;
  else if (fullName) store.userDetails.firstName = fullName.split(/\s+/)[0] || '';
  if (family) store.userDetails.lastName = family;
  else if (fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length > 1) store.userDetails.lastName = parts.slice(1).join(' ');
  }
  if (email) {
    store.userDetails.email = email;
    emailFromGoogle.value = true;
  }
  googlePrefillNotice.value = email
    ? 'Google details added. Confirm your phone number and set a password of at least 6 characters.'
    : 'Google signed in. Add any missing details to continue.';
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed'));
    document.head.appendChild(script);
  });
}

async function onGoogleSignup() {
  if (!googleClientId) {
    $q.notify({
      type: 'warning',
      message: 'Google sign-up is not configured. Set VITE_GOOGLE_CLIENT_ID for this environment.',
    });
    return;
  }
  googleLoading.value = true;
  try {
    await loadGoogleScript();
    window.google?.accounts.id.initialize({
      client_id: googleClientId,
      ux_mode: 'popup',
      callback: (response: { credential?: string }) => {
        googleLoading.value = false;
        const payload = response.credential ? decodeJwtPayload(response.credential) : null;
        if (!payload) {
          $q.notify({ type: 'negative', message: 'Could not read Google account details.' });
          return;
        }
        applyGoogleProfile(payload);
      },
    });
    window.google?.accounts.id.prompt();
    window.setTimeout(() => {
      googleLoading.value = false;
    }, 4000);
  } catch {
    googleLoading.value = false;
    $q.notify({ type: 'negative', message: 'Unable to start Google sign-up. Check your network and try again.' });
  }
}

onMounted(async () => {
  const savedTheme = window.localStorage.getItem('invify_public_dark_mode');
  setTheme(savedTheme === 'true');

  await store.fetchOnboardingSettings();

  timerId = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timerId);
});

function setTheme(value: boolean) {
  isDarkMode.value = value;
  $q.dark.set(value);
  window.localStorage.setItem('invify_public_dark_mode', String(value));
  document.body.classList.toggle('theme-dark', value);
  document.body.classList.toggle('theme-light', !value);
}

function toggleTheme() {
  setTheme(!isDarkMode.value);
}

const emailResendDisabled = computed(() => store.emailResendAvailableAt > now.value);
const whatsappResendDisabled = computed(() => store.whatsappResendAvailableAt > now.value);
const emailResendLabel = computed(() => formatResendLabel(store.emailResendAvailableAt));
const whatsappResendLabel = computed(() => formatResendLabel(store.whatsappResendAvailableAt));

async function finishRegistration() {
  await store.completeRegistration();
  step.value = 4;
}

async function onAccountDetailsSubmit() {
  try {
    if (store.emailRequired) {
      await store.sendEmailOtp();
      step.value = 2;
      return;
    }
    if (store.whatsappRequired) {
      await store.sendWhatsappOtp();
      step.value = 3;
      return;
    }
    await finishRegistration();
  } catch (err) {
    // Error handled by store
  }
}

async function onResendEmailOtp() {
  try {
    await store.sendEmailOtp();
  } catch (err) {
    // Error handled by store
  }
}

async function onEmailVerifySubmit() {
  try {
    await store.verifyEmailOtp(emailOtp.value);
    if (store.whatsappRequired) {
      step.value = 3;
      await store.sendWhatsappOtp();
      return;
    }
    await finishRegistration();
  } catch (err) {
    // Email verify failure stays on step 2; WhatsApp send failure is shown on step 3.
  }
}

async function onResendWhatsappOtp() {
  try {
    await store.sendWhatsappOtp();
  } catch (err) {
    // Error handled by store
  }
}

async function onWhatsappVerifySubmit() {
  try {
    await store.verifyWhatsappOtp(whatsappOtp.value);
    await finishRegistration();
  } catch (err) {
    // Error handled by store
  }
}
</script>

<style scoped>
.registration-page {
  min-height: 100vh;
  transition: background-color 180ms ease, color 180ms ease;
}

.registration-page--dark {
  background: #0f1419 !important;
}

.registration-card {
  border: 1px solid #dfe4ea;
  border-radius: 12px;
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.registration-page--dark .registration-card {
  background: #18212a !important;
  border-color: #34414d;
}

.registration-page--dark :deep(.q-stepper) {
  background: #18212a !important;
}

.registration-theme-toggle {
  position: fixed;
  z-index: 10;
  top: 18px;
  right: 18px;
}

.registration-home-button {
  position: fixed;
  z-index: 10;
  top: 14px;
  left: 18px;
}

.google-signup-btn {
  background: #fff !important;
  color: #1f1f1f !important;
  border: 1px solid #dadce0;
  font-weight: 600;
}

.google-signup-icon {
  width: 18px;
  height: 18px;
  margin-right: 10px;
}

.signup-divider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.signup-divider::before,
.signup-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.25;
}

@media (max-width: 599px) {
  .registration-page {
    padding: 64px 12px 24px;
    align-items: flex-start;
  }

  .registration-card {
    padding: 8px;
  }
}
</style>
