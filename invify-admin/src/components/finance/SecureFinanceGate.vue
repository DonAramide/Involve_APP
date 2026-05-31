<!-- invify-admin/src/components/finance/SecureFinanceGate.vue -->
<template>
  <div class="secure-gate-container fit">
    <!-- Unlocked State: Render the protected content -->
    <div v-if="isUnlocked" class="fit relative-position" @mousemove="resetInactivityTimer" @keydown="resetInactivityTimer">
      <slot></slot>
    </div>

    <!-- Locked State: MFA Challenge -->
    <div v-else class="fit flex flex-center bg-main text-main q-pa-md">
      <div class="enterprise-panel bg-panel border-muted rounded-borders q-pa-xl column items-center text-center shadow-24" style="max-width: 400px; width: 100%;">
        <div class="q-mb-md">
          <q-icon name="lock_person" size="xl" color="amber-5" />
        </div>
        
        <div class="text-h6 text-main text-weight-bold q-mb-xs">Secure Finance Gateway</div>
        <div class="text-caption text-muted q-mb-lg">
          This operational zone contains highly sensitive financial and reconciliation telemetry.
          Please enter your 6-digit MFA token to proceed.
        </div>

        <q-input
          v-model="mfaToken"
          filled
          :dark="prefs.isDarkMode"
          dense
          placeholder="000000"
          mask="######"
          input-class="text-center text-h5 text-metric-mono letter-spacing-lg"
          class="full-width q-mb-md"
          :error="hasError"
          error-message="Invalid MFA Token. Try again."
          @update:model-value="hasError = false"
          @keyup.enter="verifyMfa"
        />

        <q-btn
          color="amber-6"
          text-color="black"
          label="Verify Identity & Unlock"
          class="full-width text-weight-bold"
          @click="verifyMfa"
          :loading="isVerifying"
          :disable="mfaToken.length !== 6"
        />

        <div class="row items-center op-gap-4 q-mt-lg text-secondary" style="font-size: 10px;">
          <q-icon name="security" size="xs" color="cyan-4" />
          <span>Session will auto-lock after 5 minutes of inactivity</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useOperatorPreferences } from '../../composables/useOperatorPreferences'
import { Notify } from 'quasar'

const { prefs } = useOperatorPreferences()

const isUnlocked = ref(false)
const mfaToken = ref('')
const hasError = ref(false)
const isVerifying = ref(false)

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
let inactivityTimer = null

const verifyMfa = () => {
  if (mfaToken.value.length !== 6) return

  isVerifying.value = true
  
  // Simulate network delay for verification
  setTimeout(() => {
    isVerifying.value = false
    // In a real app, this would validate against a backend.
    // For simulation, we accept any 6 digits that aren't '000000'
    if (mfaToken.value === '000000') {
      hasError.value = true
      mfaToken.value = ''
    } else {
      hasError.value = false
      isUnlocked.value = true
      mfaToken.value = ''
      startInactivityTimer()
      
      Notify.create({
        type: 'positive',
        message: 'Finance Node Unlocked',
        position: 'bottom-right'
      })
    }
  }, 800)
}

const startInactivityTimer = () => {
  clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => {
    lockGate()
  }, INACTIVITY_TIMEOUT_MS)
}

const resetInactivityTimer = () => {
  if (isUnlocked.value) {
    startInactivityTimer()
  }
}

const lockGate = () => {
  if (!isUnlocked.value) return
  isUnlocked.value = false
  clearTimeout(inactivityTimer)
  
  Notify.create({
    type: 'warning',
    icon: 'lock',
    message: 'Session Auto-Locked due to 5 minutes of inactivity.',
    position: 'top',
    timeout: 5000
  })
}

// Ensure cleanup
onUnmounted(() => {
  clearTimeout(inactivityTimer)
})
</script>

<style scoped>
.letter-spacing-lg {
  letter-spacing: 0.5em;
}
</style>
