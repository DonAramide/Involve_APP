<template>
  <q-card class="danger-zone shadow-2 bg-red-1">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <q-icon name="warning" size="sm" color="negative" class="q-mr-sm" />
        <div class="text-h6 text-negative">Danger Zone</div>
      </div>
      
      <p class="text-body2 text-grey-9">
        Deactivating the Financial Platform will immediately suspend all ledger operations, virtual accounts, and reconciliation capabilities.
        This action cannot be easily reversed.
      </p>
    </q-card-section>
    
    <q-card-actions align="right" class="q-pa-md">
      <q-btn 
        color="negative" 
        icon="power_off" 
        label="Deactivate Platform" 
        @click="confirmDeactivation"
      />
    </q-card-actions>

    <!-- Confirmation Dialog -->
    <q-dialog v-model="confirmDialog" persistent>
      <q-card class="bg-negative text-white">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="white" text-color="negative" />
          <span class="q-ml-sm text-h6">Absolute Confirmation Required</span>
        </q-card-section>
        
        <q-card-section class="q-pt-none text-body1">
          Are you completely sure you want to deactivate the Financial Platform? All real-time ledger 
          processing will be halted for your business.
        </q-card-section>

        <q-card-actions align="right" class="bg-white text-negative">
          <q-btn flat label="Cancel" color="grey-8" v-close-popup />
          <q-btn flat label="Deactivate Now" color="negative" @click="executeDeactivation" :loading="deactivating" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const emit = defineEmits(['deactivate'])

const confirmDialog = ref(false)
const deactivating = ref(false)

const confirmDeactivation = () => {
  confirmDialog.value = true
}

const executeDeactivation = async () => {
  deactivating.value = true
  try {
    await financialPlatformApi.deactivate()
    $q.notify({ type: 'warning', message: 'Financial Platform Deactivated.' })
    confirmDialog.value = false
    emit('deactivate')
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to deactivate platform.' })
  } finally {
    deactivating.value = false
  }
}
</script>

<style scoped>
.danger-zone {
  border: 1px solid var(--q-negative);
}
</style>
