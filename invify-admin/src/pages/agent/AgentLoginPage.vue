<template>
  <q-page class="flex flex-center bg-main text-main font-inter">
    
    <div class="panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-16" style="width: 100%; max-width: 400px;">
      <div class="text-center column op-gap-4">
        <q-icon name="support_agent" size="xl" color="amber-4" class="self-center q-mb-sm" />
        <div class="text-operator-title text-weight-bold" style="font-size: 18px;">AGENT AUTHORIZATION</div>
        <div class="text-caption text-muted">Enter your email and password to authenticate</div>
      </div>

      <q-form @submit="handleLogin" class="column op-gap-12 q-mt-md" v-if="!requirePasswordChange">
        <q-input
          v-model="email"
          dark filled dense
          label="Email Address"
          class="bg-panel-darker"
        />
        <q-input
          v-model="password"
          dark filled dense
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          class="bg-panel-darker"
        >
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>
        <q-btn
          type="submit"
          color="amber-4"
          text-color="black"
          label="Authenticate"
          class="text-weight-bold q-mt-sm"
          :loading="loading"
        />
        
        <div class="row justify-between items-center q-mt-sm">
          <q-btn
            flat
            color="grey-4"
            label="Forgot Password?"
            class="text-caption text-weight-regular"
            @click="showForgotPasswordDialog = true"
            no-caps
          />
          <q-btn
            flat
            color="amber-4"
            label="Don't have an account? Sign up"
            class="text-caption text-weight-regular"
            to="/agent/signup"
          />
        </div>
      </q-form>

      <!-- Password Change Flow -->
      <q-form @submit="handleChangePassword" class="column op-gap-12 q-mt-md" v-else>
        <div class="bg-amber-10 text-amber-1 q-pa-sm rounded-borders border-left-amber text-caption row items-center op-gap-8">
          <q-icon name="warning" size="xs" />
          <span>First login detected. You must change your default password to continue.</span>
        </div>
        
        <q-input
          v-model="newPassword"
          dark filled dense
          :type="showNewPassword ? 'text' : 'password'"
          label="New Secure Password"
          class="bg-panel-darker"
        >
          <template v-slot:append>
            <q-icon
              :name="showNewPassword ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showNewPassword = !showNewPassword"
            />
          </template>
        </q-input>
        <q-input
          v-model="confirmPassword"
          dark filled dense
          :type="showConfirmPassword ? 'text' : 'password'"
          label="Confirm Password"
          class="bg-panel-darker"
        >
          <template v-slot:append>
            <q-icon
              :name="showConfirmPassword ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showConfirmPassword = !showConfirmPassword"
            />
          </template>
        </q-input>
        <q-btn
          type="submit"
          color="amber-4"
          text-color="black"
          label="Set Password & Login"
          class="text-weight-bold q-mt-sm"
          :loading="loading"
        />
      </q-form>

    </div>

    <!-- Suspension Action Dialog -->
    <q-dialog v-model="showResolveDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 450px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="text-weight-bold text-subtitle1 text-amber-4 row items-center op-gap-8">
            <q-icon name="warning" color="amber-4" />
            <span>Identity Action Required</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-4 q-mb-md font-mono" style="white-space: pre-line;">
            {{ suspensionMessage }}
          </div>

          <q-form @submit="submitResolution" class="column op-gap-12">
            <!-- Upload Passport Section -->
            <div v-if="suspensionAction === 'UPLOAD_PASSPORT' || suspensionAction === 'ALL'">
              <div class="text-caption text-weight-bold q-mb-xs">Upload Passport Photo</div>
              <q-file v-model="passportUploadFile" dark filled dense label="Select passport photo" accept="image/*" class="bg-panel-darker text-caption" :required="suspensionAction === 'UPLOAD_PASSPORT'">
                <template v-slot:prepend><q-icon name="face" /></template>
              </q-file>
            </div>

            <!-- Upload Government ID Section -->
            <div v-if="suspensionAction === 'UPLOAD_ID' || suspensionAction === 'ALL'">
              <div class="text-caption text-weight-bold q-mb-xs">Upload Government ID Card</div>
              <q-file v-model="idUploadFile" dark filled dense label="Select ID document" accept="image/*,application/pdf" class="bg-panel-darker text-caption" :required="suspensionAction === 'UPLOAD_ID'">
                <template v-slot:prepend><q-icon name="badge" /></template>
              </q-file>
            </div>

            <!-- Answer Question Section -->
            <div v-if="suspensionAction === 'ANSWER_QUESTION'">
              <div class="text-caption text-weight-bold q-mb-xs">Security Challenge:</div>
              <div class="text-caption text-indigo-3 q-mb-sm">{{ suspensionQuestion }}</div>
              <q-input v-model="resolutionAnswer" dark filled dense type="textarea" rows="3" placeholder="Provide answer here..." class="bg-panel-darker text-caption" required />
            </div>

            <!-- Update Address Section -->
            <div v-if="suspensionAction === 'UPDATE_ADDRESS'">
              <div class="text-caption text-weight-bold q-mb-xs">Update Residential Address</div>
              <q-input v-model="resolutionAddress" dark filled dense type="textarea" rows="2" placeholder="Enter updated residential address..." class="bg-panel-darker text-caption" required />
            </div>

            <!-- Update Phone Section -->
            <div v-if="suspensionAction === 'UPDATE_PHONE'">
              <div class="text-caption text-weight-bold q-mb-xs">Update Phone Number</div>
              <q-input v-model="resolutionPhone" dark filled dense placeholder="e.g. +234..." class="bg-panel-darker text-caption" required />
            </div>

            <!-- Update WhatsApp Section -->
            <div v-if="suspensionAction === 'UPDATE_WHATSAPP'">
              <div class="text-caption text-weight-bold q-mb-xs">Update WhatsApp Number</div>
              <q-input v-model="resolutionWhatsapp" dark filled dense placeholder="e.g. +234..." class="bg-panel-darker text-caption" required />
            </div>

            <q-btn type="submit" dense color="cyan-3" text-color="black" label="Submit Verification Details" :loading="submittingResolution" class="q-mt-md text-weight-bold full-width" />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Forgot Password Dialog -->
    <q-dialog v-model="showForgotPasswordDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-panel border-muted font-inter text-main" style="width: 400px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none border-bottom bg-panel-darker">
          <div class="text-weight-bold text-subtitle1 row items-center op-gap-8">
            <q-icon name="lock_reset" color="amber-4" />
            <span>Reset Password</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-muted q-mb-md">
            Enter your email address and we will send you a link to reset your password.
          </div>
          <q-form @submit="handleForgotPassword" class="column op-gap-12">
            <q-input
              v-model="forgotPasswordEmail"
              dark filled dense
              label="Email Address"
              type="email"
              class="bg-panel-darker"
              required
            />
            <q-btn
              type="submit"
              color="amber-4"
              text-color="black"
              label="Send Reset Link"
              class="text-weight-bold q-mt-sm full-width"
              :loading="forgotPasswordLoading"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const router = useRouter()

const email = ref('')
const password = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const showPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const requirePasswordChange = ref(false)
const loading = ref(false)
const agentCode = ref('')

const showForgotPasswordDialog = ref(false)
const forgotPasswordEmail = ref('')
const forgotPasswordLoading = ref(false)

const showResolveDialog = ref(false)
const suspensionAction = ref('NONE')
const suspensionQuestion = ref('')
const suspensionMessage = ref('')
const passportUploadFile = ref(null)
const idUploadFile = ref(null)
const resolutionAnswer = ref('')
const resolutionAddress = ref('')
const resolutionPhone = ref('')
const resolutionWhatsapp = ref('')
const submittingResolution = ref(false)

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
  reader.onerror = error => reject(error)
})

const submitResolution = async () => {
  if (suspensionAction.value === 'UPLOAD_PASSPORT' && !passportUploadFile.value) {
    $q.notify({ type: 'warning', message: 'Please select a passport photo file to upload', position: 'top-right' })
    return
  }
  if (suspensionAction.value === 'UPLOAD_ID' && !idUploadFile.value) {
    $q.notify({ type: 'warning', message: 'Please select a government ID file to upload', position: 'top-right' })
    return
  }
  if (suspensionAction.value === 'ALL' && !passportUploadFile.value && !idUploadFile.value) {
    $q.notify({ type: 'warning', message: 'Please select at least one document to upload', position: 'top-right' })
    return
  }
  if (suspensionAction.value === 'ANSWER_QUESTION' && !resolutionAnswer.value) {
    $q.notify({ type: 'warning', message: 'Please provide an answer', position: 'top-right' })
    return
  }
  if (suspensionAction.value === 'UPDATE_ADDRESS' && !resolutionAddress.value) {
    $q.notify({ type: 'warning', message: 'Please enter your updated residential address', position: 'top-right' })
    return
  }
  if (suspensionAction.value === 'UPDATE_PHONE' && !resolutionPhone.value) {
    $q.notify({ type: 'warning', message: 'Please enter your updated phone number', position: 'top-right' })
    return
  }
  if (suspensionAction.value === 'UPDATE_WHATSAPP' && !resolutionWhatsapp.value) {
    $q.notify({ type: 'warning', message: 'Please enter your updated WhatsApp number', position: 'top-right' })
    return
  }

  submittingResolution.value = true
  try {
    let passportImage = ''
    let idCard = ''
    if (passportUploadFile.value) {
      passportImage = await toBase64(passportUploadFile.value)
    }
    if (idUploadFile.value) {
      idCard = await toBase64(idUploadFile.value)
    }

    const payload = {
      email: email.value.trim(),
      passportImage,
      idCard,
      answer: resolutionAnswer.value,
      address: resolutionAddress.value,
      phone: resolutionPhone.value,
      whatsappNumber: resolutionWhatsapp.value
    }

    const res = await axios.post('/api/agent/resolve-suspension', payload)
    $q.notify({ type: 'positive', message: res.data.message || 'Verification details submitted successfully!', position: 'top-right' })
    showResolveDialog.value = false
    passportUploadFile.value = null
    idUploadFile.value = null
    resolutionAnswer.value = ''
    resolutionAddress.value = ''
    resolutionPhone.value = ''
    resolutionWhatsapp.value = ''
    router.push('/agent/success')
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Submission failed: ${msg}`, position: 'top-right' })
  } finally {
    submittingResolution.value = false
  }
}

const handleLogin = async () => {
  if (!email.value || !password.value) {
    $q.notify({ type: 'warning', message: 'Credentials required', position: 'top-right' })
    return
  }

  loading.value = true
  try {
    const res = await axios.post('/api/agent/login', {
      email: email.value.trim(),
      password: password.value
    })

    if (res.data.requirePasswordChange) {
      requirePasswordChange.value = true
      agentCode.value = res.data.agentCode || ''
      $q.notify({ type: 'info', message: 'Password change required', position: 'top-right' })
    } else {
      localStorage.setItem('invify_agent_token', res.data.token)
      localStorage.setItem('invify_agent_info', JSON.stringify(res.data.agent))
      router.push('/agent/dashboard')
    }
  } catch (err) {
    const errData = err.response?.data
    // If the server returns a 403 Forbidden for a suspended agent
    if (err.response?.status === 403 && errData) {
      suspensionAction.value = errData.requiredAction || 'ALL'
      if (suspensionAction.value === 'NONE') {
        suspensionAction.value = 'ALL'
      }
      suspensionQuestion.value = errData.actionQuestion || ''
      suspensionMessage.value = errData.message || 'Your account is suspended.'
      showResolveDialog.value = true
    } else {
      const msg = err.response?.data?.message || err.message
      $q.notify({ type: 'negative', message: `Login failed: ${msg}`, position: 'top-right' })
    }
  } finally {
    loading.value = false
  }
}

const handleChangePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    $q.notify({ type: 'warning', message: 'Passwords do not match', position: 'top-right' })
    return
  }
  if (newPassword.value.length < 6) {
    $q.notify({ type: 'warning', message: 'Password must be at least 6 characters', position: 'top-right' })
    return
  }

  loading.value = true
  try {
    const res = await axios.post('/api/agent/change-password', {
      agentCode: agentCode.value.trim().toUpperCase(),
      oldPassword: password.value,
      newPassword: newPassword.value
    })

    localStorage.setItem('invify_agent_token', res.data.token)
    localStorage.setItem('invify_agent_info', JSON.stringify(res.data.agent))
    
    $q.notify({ type: 'positive', message: 'Password updated successfully', position: 'top-right' })
    router.push('/agent/dashboard')
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Update failed: ${msg}`, position: 'top-right' })
  } finally {
    loading.value = false
  }
}

const handleForgotPassword = async () => {
  if (!forgotPasswordEmail.value) {
    $q.notify({ type: 'warning', message: 'Please enter your email', position: 'top-right' })
    return
  }

  forgotPasswordLoading.value = true
  try {
    const res = await axios.post('/api/agent/forgot-password', {
      email: forgotPasswordEmail.value.trim()
    })
    $q.notify({ type: 'positive', message: res.data.message || 'Reset link sent!', position: 'top-right' })
    showForgotPasswordDialog.value = false
    forgotPasswordEmail.value = ''
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Failed to send reset link: ${msg}`, position: 'top-right' })
  } finally {
    forgotPasswordLoading.value = false
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
.border-left-amber { border-left: 3px solid #fcc419; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
