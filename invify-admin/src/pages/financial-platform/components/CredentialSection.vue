<template>
  <q-card class="credential-section shadow-2">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <q-icon name="key" size="sm" color="warning" class="q-mr-sm" />
        <div class="text-h6">Credentials & Security</div>
      </div>
      
      <p class="text-body2 text-grey-8">
        API Keys, Client Secrets, and Webhook Signatures are stored safely in the Enterprise Integration Vault. 
        Raw secrets are never exposed in the UI.
      </p>

      <div class="bg-grey-2 q-pa-md rounded-borders q-mt-md">
        <div class="row items-center">
          <q-icon name="lock" color="grey-7" class="q-mr-sm" />
          <span class="text-weight-medium">Vault Storage Enabled</span>
        </div>
        <div class="text-caption text-grey-7 q-mt-xs q-ml-lg">
          Credentials are automatically injected into backend requests.
        </div>
      </div>
    </q-card-section>
    
    <q-card-actions align="right" class="q-pa-md">
      <q-btn 
        outline 
        color="warning" 
        icon="autorenew" 
        label="Rotate Credentials" 
        @click="confirmRotation"
      />
    </q-card-actions>

    <!-- Confirmation Dialog -->
    <q-dialog v-model="confirmDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm">Are you sure you want to rotate financial credentials?</span>
        </q-card-section>
        
        <q-card-section class="q-pt-none text-body2 text-grey-8">
          This will revoke existing Quasar sandbox credentials and generate a new set. 
          Active financial operations might experience momentary disruption.
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Confirm Rotation" color="warning" @click="executeRotation" :loading="rotating" />
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
const emit = defineEmits(['rotate'])

const confirmDialog = ref(false)
const rotating = ref(false)

const confirmRotation = () => {
  confirmDialog.value = true
}

const executeRotation = async () => {
  rotating.value = true
  try {
    await financialPlatformApi.rotateCredentials()
    $q.notify({ type: 'positive', message: 'Credentials successfully rotated and stored in Vault.' })
    confirmDialog.value = false
    emit('rotate')
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to rotate credentials.' })
  } finally {
    rotating.value = false
  }
}
</script>
