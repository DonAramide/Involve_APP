<template>
  <q-page class="flex flex-center bg-main text-main font-inter">
    <div class="panel-card bg-panel border-muted rounded-borders q-pa-md column op-gap-16" style="width: 100%; max-width: 400px;">
      <div class="text-center column op-gap-4">
        <q-icon name="lock_reset" size="xl" color="amber-4" class="self-center q-mb-sm" />
        <div class="text-operator-title text-weight-bold" style="font-size: 18px;">SET YOUR AGENT PASSWORD</div>
        <div v-if="email" class="text-caption text-muted">{{ email }}</div>
      </div>

      <div v-if="!tokenHash" class="bg-red-10 text-red-1 q-pa-sm rounded-borders text-caption row items-center op-gap-8">
        <q-icon name="error" size="xs" />
        <span>This page needs the link from your email. Request a new one with "Forgot Password" on the agent login page.</span>
      </div>

      <div v-else-if="done" class="column op-gap-12">
        <div class="bg-green-10 text-green-1 q-pa-sm rounded-borders text-caption row items-center op-gap-8">
          <q-icon name="check_circle" size="xs" />
          <span>Your password has been set. You can now sign in.</span>
        </div>
        <q-btn color="amber-4" text-color="black" label="Go to Agent Login" class="text-weight-bold" @click="goToLogin" />
      </div>

      <q-form v-else @submit="submit" class="column op-gap-12 q-mt-sm">
        <q-input
          v-model="password"
          dark filled dense
          :type="showPassword ? 'text' : 'password'"
          label="New Password"
          class="bg-panel-darker"
          autocomplete="new-password"
        >
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility' : 'visibility_off'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>
        <PasswordStrengthHints :password="password" :email="email" />
        <q-input
          v-model="confirmPassword"
          dark filled dense
          :type="showPassword ? 'text' : 'password'"
          label="Confirm Password"
          class="bg-panel-darker"
          autocomplete="new-password"
        />
        <q-btn
          type="submit"
          color="amber-4"
          text-color="black"
          label="Set Password"
          class="text-weight-bold q-mt-sm"
          :loading="loading"
        />
      </q-form>

      <div class="text-center">
        <q-btn flat no-caps color="grey-4" label="Back to Institute Login" class="text-caption" to="/institute/login" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { evaluatePasswordPolicy } from '../../utils/passwordPolicy'
import PasswordStrengthHints from '../../components/PasswordStrengthHints.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const tokenHash = String(route.query.token_hash || '')
const email = String(route.query.email || '')

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const done = ref(false)

const submit = async () => {
  if (password.value !== confirmPassword.value) {
    $q.notify({ type: 'warning', message: 'Passwords do not match', position: 'top-right' })
    return
  }
  const policy = evaluatePasswordPolicy(password.value, { email })
  if (!policy.ok) {
    $q.notify({ type: 'warning', message: policy.errors[0], position: 'top-right' })
    return
  }

  loading.value = true
  try {
    await axios.post('/api/agent/reset-password', {
      token_hash: tokenHash,
      email,
      password: password.value
    })
    done.value = true
    router.replace({ query: email ? { email } : {} })
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    $q.notify({ type: 'negative', message: msg, position: 'top-right', timeout: 8000 })
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push({ path: '/institute/login', query: email ? { email } : {} })
}
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
