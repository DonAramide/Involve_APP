<template>
  <q-drawer
    v-model="isOpen"
    side="right"
    overlay
    behavior="mobile"
    elevated
    :width="500"
    class="bg-panel-darker text-main border-left custom-drawer"
  >
    <div v-if="merchant" class="column full-height">
      <div class="row items-center justify-between q-pa-md border-bottom bg-panel shrink-0">
        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="close" @click="close" color="grey-5" />
          <div class="text-operator-title text-weight-bold" style="font-size: 16px;">
            MERCHANT DETAIL
          </div>
        </div>
        <q-badge color="amber-4" text-color="black">{{ merchant.status || 'UNKNOWN' }}</q-badge>
      </div>
      
      <div class="col custom-scrollbar overflow-auto q-pa-md column op-gap-16">
        <!-- Merchant Info -->
        <div class="bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-h6 text-weight-bold text-main q-mb-sm">{{ merchant.business_name || merchant.businessName }}</div>
          <div class="row op-gap-16 text-caption text-muted q-mb-sm">
            <div><strong>Industry:</strong> {{ merchant.industry_type || merchant.industry || 'N/A' }}</div>
            <div><strong>Volume:</strong> ${{ (merchant.volume || 0).toLocaleString() }}</div>
          </div>
          <div class="row items-center op-gap-8">
            <q-linear-progress :value="(merchant.health || 0) / 100" color="green-4" track-color="grey-9" style="width: 100px" />
            <span class="text-metric-mono" style="font-size: 10px;">{{ merchant.health }} Health</span>
          </div>
        </div>

        <!-- Activation Stepper -->
        <ActivationStepper 
          :merchant-id="merchant.id" 
          :initial-status="merchant.activation_status || merchant.activationStatus || 'REGISTRATION'" 
          @updated="onUpdated"
        />
      </div>
    </div>
  </q-drawer>
</template>

<script setup>
import { ref } from 'vue'
import ActivationStepper from './ActivationStepper.vue'

const isOpen = ref(false)
const merchant = ref(null)

const emit = defineEmits(['updated'])

const open = (data) => {
  merchant.value = data
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
  merchant.value = null
}

const onUpdated = () => {
  emit('updated')
}

defineExpose({
  open,
  close
})
</script>

<style scoped>
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.border-left { border-left: 1px solid #1a2024; }

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
