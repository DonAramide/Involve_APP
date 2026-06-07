<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="bg-panel text-white" style="width: 400px; max-width: 90vw; border: 1px solid var(--q-dark-page)">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6 text-weight-bold">Create New Lead</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input 
            v-model="form.businessName" 
            label="Business Name" 
            outlined 
            dark 
            dense 
            :rules="[val => !!val || 'Business name is required']" 
          />
          <q-input 
            v-model="form.contactName" 
            label="Contact Person" 
            outlined 
            dark 
            dense 
            :rules="[val => !!val || 'Contact person is required']" 
          />
          <q-input 
            v-model="form.phone" 
            label="Phone Number" 
            outlined 
            dark 
            dense 
            :rules="[val => !!val || 'Phone is required']" 
          />
          <q-input 
            v-model="form.email" 
            label="Email Address (Optional)" 
            type="email"
            outlined 
            dark 
            dense 
          />
          <q-input 
            v-model="form.address" 
            label="Address" 
            outlined 
            dark 
            dense 
            type="textarea"
            rows="2"
          />
          <div class="row justify-end q-mt-md">
            <q-btn flat label="Cancel" color="white" v-close-popup />
            <q-btn type="submit" color="amber-4" text-color="black" label="Create Lead" :loading="loading" class="q-ml-sm" />
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

const form = ref({
  businessName: '',
  contactName: '',
  phone: '',
  email: '',
  address: ''
})

const emit = defineEmits(['created'])

const open = () => {
  form.value = {
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    address: ''
  }
  isOpen.value = true
}

const onSubmit = async () => {
  loading.value = true
  try {
    const payload = {
      businessName: form.value.businessName,
      contactName: form.value.contactName,
      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
      status: 'PROSPECT'
    }
    
    await api.post('/agent/leads', payload)
    
    $q.notify({
      type: 'positive',
      message: 'Lead created successfully'
    })
    
    isOpen.value = false
    emit('created')
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to create lead'
    })
  } finally {
    loading.value = false
  }
}

defineExpose({
  open
})
</script>
