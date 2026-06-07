<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="bg-panel text-white" style="width: 450px; max-width: 90vw; border: 1px solid var(--q-dark-page)">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold">Assign {{ mode === 'DEVICE' ? 'Device' : 'Terminal' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-select
            v-model="form.tenantId"
            :options="tenantOptions"
            label="Select Merchant"
            outlined
            dark
            dense
            emit-value
            map-options
            :rules="[val => !!val || 'Merchant selection is required']"
          />
          
          <q-input 
            v-model="form.serialNumber" 
            :label="mode === 'DEVICE' ? 'Device Serial Number' : 'Terminal Serial Number (TID)'"
            outlined 
            dark 
            dense 
            :rules="[val => !!val || 'Serial Number is required']" 
          />
          
          <div class="row justify-end q-mt-md">
            <q-btn flat label="Cancel" color="white" v-close-popup />
            <q-btn type="submit" color="amber-4" text-color="black" label="Assign" :loading="loading" class="q-ml-sm" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const isOpen = ref(false)
const loading = ref(false)
const mode = ref<'DEVICE' | 'TERMINAL'>('DEVICE')

const tenantOptions = ref<any[]>([])

const form = ref({
  tenantId: '',
  serialNumber: ''
})

const emit = defineEmits(['assigned'])

const open = async (assignmentMode: 'DEVICE' | 'TERMINAL') => {
  mode.value = assignmentMode
  form.value = {
    tenantId: '',
    serialNumber: ''
  }
  isOpen.value = true
  
  try {
    loading.value = true
    const { data } = await api.get('/agent/tenants')
    tenantOptions.value = data.data.map((t: any) => ({
      label: `${t.business_name || t.name} (${t.id.substring(0,8)})`,
      value: t.id
    }))
  } catch (err: any) {
    $q.notify({ type: 'negative', message: 'Failed to load merchants' })
  } finally {
    loading.value = false
  }
}

const onSubmit = async () => {
  loading.value = true
  try {
    const payload = {
      type: mode.value,
      tenantId: form.value.tenantId,
      serialNumber: form.value.serialNumber
    }
    
    await api.post('/agent/hardware/assign', payload)
    
    $q.notify({
      type: 'positive',
      message: `${mode.value === 'DEVICE' ? 'Device' : 'Terminal'} assigned successfully`
    })
    
    isOpen.value = false
    emit('assigned')
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to assign hardware. Ensure uniqueness.'
    })
  } finally {
    loading.value = false
  }
}

defineExpose({
  open
})
</script>
