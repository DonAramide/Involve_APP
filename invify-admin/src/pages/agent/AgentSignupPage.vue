<template>
  <q-page class="flex flex-center bg-main text-main font-inter q-py-lg">
    
    <div class="panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-16" style="width: 100%; max-width: 500px;">
      <div class="row items-center q-pb-none border-bottom bg-panel-darker q-pa-sm">
        <div class="text-weight-bold text-subtitle1">Provision New Agent</div>
      </div>

      <q-form @submit="handleSignup" class="column op-gap-8 q-mt-sm">
        <q-input v-model="form.name" dark filled dense label="Full Legal Name" class="bg-panel-darker text-caption" required />
        <q-input v-model="form.email" dark filled dense type="email" label="Email Address" class="bg-panel-darker text-caption" required />
        <q-input v-model="form.phone" dark filled dense label="Primary Phone Number" class="bg-panel-darker text-caption" required />
        
        <div class="row items-center justify-between no-wrap op-gap-8">
          <q-input v-model="form.whatsappNumber" dark filled dense label="WhatsApp Number" class="bg-panel-darker text-caption col" :disable="sameAsPhone" required />
          <q-checkbox v-model="sameAsPhone" dark dense label="Same as Phone" color="cyan-3" class="text-caption text-muted" />
        </div>
        
        <q-input v-model="form.address" dark filled dense type="textarea" rows="2" label="Full Residential Address" class="bg-panel-darker text-caption" required />
        
        <q-file v-model="passportFile" dark filled dense label="Upload Passport Photo" accept="image/*" class="bg-panel-darker text-caption" required>
          <template v-slot:prepend><q-icon name="face" /></template>
        </q-file>
        
        <q-file v-model="idCardFile" dark filled dense label="Upload Government ID" accept="image/*,application/pdf" class="bg-panel-darker text-caption" required>
          <template v-slot:prepend><q-icon name="badge" /></template>
        </q-file>
        
        <q-input v-model="form.agentCode" dark filled dense label="Agent Code" class="bg-panel-darker text-caption" maxlength="6" hint="Auto-generated from phone number" />
        
        <q-input 
          v-model="form.password" 
          dark 
          filled 
          dense 
          :type="showPassword ? 'text' : 'password'" 
          label="Set Password" 
          class="bg-panel-darker text-caption" 
          required
        >
          <template v-slot:append>
            <q-icon 
              :name="showPassword ? 'visibility' : 'visibility_off'" 
              class="cursor-pointer" 
              @click="showPassword = !showPassword" 
            />
          </template>
        </q-input>

        <q-input 
          v-model="confirmPassword" 
          dark 
          filled 
          dense 
          :type="showPassword ? 'text' : 'password'" 
          label="Confirm Password" 
          class="bg-panel-darker text-caption" 
          required
          :rules="[val => val === form.password || 'Passwords do not match']"
        >
          <template v-slot:append>
            <q-icon 
              :name="showPassword ? 'visibility' : 'visibility_off'" 
              class="cursor-pointer" 
              @click="showPassword = !showPassword" 
            />
          </template>
        </q-input>

        <q-btn type="submit" dense color="cyan-3" text-color="black" label="PROVISION AGENT & VERIFY KYC" :loading="loading" class="q-mt-md text-weight-bold full-width" />
        
        <div class="row justify-center q-mt-sm">
          <q-btn flat color="cyan-3" label="Already have an account? Login" class="text-caption text-weight-regular" to="/agent/login" />
        </div>
      </q-form>
    </div>

  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const router = useRouter()

const form = ref({
  name: '',
  email: '',
  phone: '',
  whatsappNumber: '',
  address: '',
  agentCode: '',
  password: ''
})

const sameAsPhone = ref(false)
const passportFile = ref(null)
const idCardFile = ref(null)
const loading = ref(false)
const confirmPassword = ref('')
const showPassword = ref(false)

watch(sameAsPhone, (val) => {
  if (val) {
    form.value.whatsappNumber = form.value.phone
  } else {
    form.value.whatsappNumber = ''
  }
})

watch(() => form.value.phone, (newPhone) => {
  if (sameAsPhone.value) {
    form.value.whatsappNumber = newPhone
  }
  
  if (newPhone) {
    const digits = newPhone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const last10 = digits.slice(-10)
      const num = parseInt(last10, 10)
      form.value.agentCode = num.toString(36).toUpperCase().padStart(6, '0').substring(0, 6)
    } else {
      form.value.agentCode = ''
    }
  } else {
    form.value.agentCode = ''
  }
})

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
  reader.onerror = error => reject(error)
})

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const handleSignup = async () => {
  if (form.value.password !== confirmPassword.value) {
    $q.notify({ type: 'negative', message: 'Passwords do not match', position: 'top-right' })
    return
  }
  loading.value = true
  try {
    const code = form.value.agentCode.trim().toUpperCase() || generateCode()
    
    let passportImage = ''
    let idCard = ''
    if (passportFile.value) passportImage = await toBase64(passportFile.value)
    if (idCardFile.value) idCard = await toBase64(idCardFile.value)

    const payload = {
      fullName: form.value.name, // mapping name to fullName for backend compatibility
      email: form.value.email,
      phone: form.value.phone,
      password: form.value.password,
      whatsappNumber: form.value.whatsappNumber,
      address: form.value.address,
      passportImage,
      idCard,
      agentCode: code
    }

    const res = await axios.post('http://localhost:3004/api/agent/register', payload)
    
    $q.notify({ type: 'positive', message: res.data.message || 'Registration submitted successfully! Please wait for approval.', position: 'top-right' })
    router.push('/agent/success')
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Registration failed: ${msg}`, position: 'top-right' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>

