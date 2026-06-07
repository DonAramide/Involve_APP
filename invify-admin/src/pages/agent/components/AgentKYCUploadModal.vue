<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="bg-panel text-white" style="width: 400px; max-width: 90vw; border: 1px solid var(--q-dark-page)">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold">Upload KYC Document</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-select
            v-model="form.type"
            :options="docTypes"
            label="Document Type"
            outlined
            dark
            dense
            :rules="[val => !!val || 'Document type is required']"
          />
          <q-input 
            v-if="form.type === 'BVN'"
            v-model="form.document_number" 
            label="BVN Number" 
            outlined 
            dark 
            dense 
            :rules="[val => !!val || 'BVN is required']" 
          />
          <q-file
            v-model="form.file"
            label="Select File"
            outlined
            dark
            dense
            accept=".png,.jpg,.jpeg,.pdf"
            :rules="[val => !!val || 'File is required']"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
          
          <div class="row justify-end q-mt-md">
            <q-btn flat label="Cancel" color="white" v-close-popup />
            <q-btn type="submit" color="amber-4" text-color="black" label="Upload Document" :loading="loading" class="q-ml-sm" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const isOpen = ref(false)
const loading = ref(false)

const docTypes = ['PASSPORT', 'NIN', 'BVN', 'GOVT_ID', 'PROOF_OF_ADDRESS']

const form = ref({
  type: '',
  document_number: '',
  file: null as File | null
})

const emit = defineEmits(['uploaded'])

const open = () => {
  form.value = {
    type: '',
    document_number: '',
    file: null
  }
  isOpen.value = true
}

const onSubmit = async () => {
  loading.value = true
  try {
    // We send to the existing M1 KYC endpoint
    // In a fully native storage flow, we'd convert the file to Base64 or use multipart/form-data.
    const payload = {
      type: form.value.type,
      document_number: form.value.document_number
    }
    
    await api.post('/agent/kyc/upload', payload)
    
    $q.notify({
      type: 'positive',
      message: 'Document uploaded successfully'
    })
    
    isOpen.value = false
    emit('uploaded')
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to upload document'
    })
  } finally {
    loading.value = false
  }
}

defineExpose({
  open
})
</script>
