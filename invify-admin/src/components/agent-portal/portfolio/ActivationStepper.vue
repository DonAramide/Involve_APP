<template>
  <div class="q-pa-md bg-panel rounded-borders border-muted">
    <div class="text-operator-title text-weight-bold q-mb-md">ACTIVATION STATUS</div>
    
    <q-stepper
      v-model="currentStep"
      vertical
      color="amber-4"
      animated
      dark
      flat
      class="bg-transparent"
    >
      <q-step
        v-for="(state, index) in states"
        :key="state"
        :name="index"
        :title="formatState(state)"
        :done="currentStep > index"
        :color="currentStep === index ? 'amber-4' : 'grey-8'"
        active-color="amber-4"
        done-color="green-4"
      >
        <div class="q-mt-sm">
          <p class="text-muted text-caption" v-if="currentStep === index">
            Current stage in the activation pipeline.
          </p>
          
          <div v-if="currentStep === index && state === 'KYC_APPROVED'" class="q-mt-md">
            <div class="text-caption text-main q-mb-xs">Assign Terminal</div>
            <q-input dark dense filled v-model="terminalSerial" placeholder="Enter Terminal Serial Number" class="q-mb-sm" />
            <q-btn dense color="amber-4" text-color="black" label="Assign Terminal" @click="assignTerminal" :loading="loading" />
          </div>
          
          <q-btn
            v-else-if="currentStep === index && state !== 'FULLY_ACTIVATED'"
            dense
            outline
            color="amber-4"
            label="Advance Stage"
            @click="advanceStage"
            :loading="loading"
            class="q-mt-sm"
          />
        </div>
      </q-step>
    </q-stepper>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'

const props = defineProps({
  merchantId: {
    type: [String, Number],
    required: true
  },
  initialStatus: {
    type: String,
    default: 'REGISTRATION'
  }
})

const emit = defineEmits(['updated'])

const $q = useQuasar()
const loading = ref(false)
const terminalSerial = ref('')

const states = [
  'REGISTRATION',
  'KYC_PENDING',
  'KYC_APPROVED',
  'TERMINAL_ASSIGNED',
  'TERMINAL_DEPLOYED',
  'TRAINING_COMPLETED',
  'FIRST_TRANSACTION',
  'FULLY_ACTIVATED'
]

const currentStatus = ref(props.initialStatus)
watch(() => props.initialStatus, (newVal) => {
  currentStatus.value = newVal || 'REGISTRATION'
})

const currentStep = computed(() => {
  const index = states.indexOf(currentStatus.value)
  return index >= 0 ? index : 0
})

const formatState = (state) => {
  return state.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}

const advanceStage = async () => {
  loading.value = true
  try {
    await api.post(`/agent/merchant/${props.merchantId}/activation/advance`)
    $q.notify({ type: 'positive', message: 'Stage advanced successfully', position: 'top-right' })
    // We optimistically advance or we emit an event to refresh
    const nextIndex = currentStep.value + 1
    if (nextIndex < states.length) {
      currentStatus.value = states[nextIndex]
    }
    emit('updated')
  } catch (err) {
    console.error('Failed to advance stage', err)
    $q.notify({ type: 'negative', message: 'Failed to advance stage', position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const assignTerminal = async () => {
  if (!terminalSerial.value) {
    $q.notify({ type: 'warning', message: 'Please enter a terminal serial number', position: 'top-right' })
    return
  }
  
  loading.value = true
  try {
    await api.post('/agent/merchant/terminal/assign', {
      merchant_id: props.merchantId,
      merchantId: props.merchantId, // send both just in case
      terminal_serial: terminalSerial.value,
      serialNumber: terminalSerial.value
    })
    $q.notify({ type: 'positive', message: 'Terminal assigned successfully', position: 'top-right' })
    
    // Automatically advance state locally
    currentStatus.value = 'TERMINAL_ASSIGNED'
    emit('updated')
  } catch (err) {
    console.error('Failed to assign terminal', err)
    $q.notify({ type: 'negative', message: 'Failed to assign terminal', position: 'top-right' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bg-panel { background-color: #12181c; }
.border-muted { border: 1px solid #2a3339; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
</style>
