<template>
  <q-page class="flex flex-center bg-main text-main font-inter">
    
    <div class="panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-16" style="width: 100%; max-width: 400px;">
      <div class="text-center column op-gap-4">
        <q-icon name="support_agent" size="xl" color="amber-4" class="self-center q-mb-sm" />
        <div class="text-operator-title text-weight-bold" style="font-size: 18px;">AGENT AUTHORIZATION</div>
        <div class="text-caption text-muted">Enter your Agent Code to authenticate</div>
      </div>

      <q-form @submit="handleLogin" class="column op-gap-12 q-mt-md" v-if="!requirePasswordChange">
        <q-input
          v-model="agentCode"
          dark filled dense
          label="Agent Code (e.g., AAA000)"
          class="bg-panel-darker"
        />
        <q-input
          v-model="password"
          dark filled dense
          type="password"
          label="Password"
          class="bg-panel-darker"
        />
        <q-btn
          type="submit"
          color="amber-4"
          text-color="black"
          label="Authenticate"
          class="text-weight-bold q-mt-sm"
          :loading="loading"
        />
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
          type="password"
          label="New Secure Password"
          class="bg-panel-darker"
        />
        <q-input
          v-model="confirmPassword"
          dark filled dense
          type="password"
          label="Confirm Password"
          class="bg-panel-darker"
        />
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

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const router = useRouter()

const agentCode = ref('')
const password = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const requirePasswordChange = ref(false)
const loading = ref(false)

const handleLogin = async () => {
  if (!agentCode.value || !password.value) {
    $q.notify({ type: 'warning', message: 'Credentials required', position: 'top-right' })
    return
  }

  loading.value = true
  try {
    const res = await axios.post('http://localhost:3004/api/agent/login', {
      agentCode: agentCode.value.trim().toUpperCase(),
      password: password.value
    })

    if (res.data.requirePasswordChange) {
      requirePasswordChange.value = true
      $q.notify({ type: 'info', message: 'Password change required', position: 'top-right' })
    } else {
      localStorage.setItem('invify_agent_token', res.data.token)
      localStorage.setItem('invify_agent_info', JSON.stringify(res.data.agent))
      router.push('/agent/dashboard')
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: `Login failed: ${msg}`, position: 'top-right' })
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
    const res = await axios.post('http://localhost:3004/api/agent/change-password', {
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
