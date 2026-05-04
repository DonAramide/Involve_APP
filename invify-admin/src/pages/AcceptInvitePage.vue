<!-- invify-admin/src/pages/AcceptInvitePage.vue -->
<template>
  <q-page class="bg-dark flex flex-center q-pa-md">
    <q-card style="width: 450px; max-width: 95vw;" class="bg-blue-grey-10 text-white shadow-10 border-indigo">
      
      <q-card-section class="text-center q-pa-xl" v-if="loading">
         <q-spinner-dots color="indigo-4" size="3em" />
         <div class="text-subtitle1 q-mt-md">Validating your invitation...</div>
      </q-card-section>

      <template v-else-if="inviteData">
        <q-card-section class="q-pa-lg">
           <div class="text-center q-mb-lg">
              <q-icon name="email" color="indigo-4" size="4em" class="q-mb-md" />
              <div class="text-h5 text-weight-bold">Join {{ inviteData.schoolName }}</div>
              <div class="text-caption text-grey-6">You've been invited as a <span class="text-indigo-3 text-weight-bold">{{ inviteData.role.toUpperCase() }}</span> member.</div>
           </div>

           <q-form @submit="handleActivation" class="q-gutter-md">
              <q-input 
                v-model="inviteData.email" 
                label="Email Address" 
                dark filled dense disable 
              />
              <q-input 
                v-model="password" 
                label="Create Password" 
                type="password" 
                dark filled dense 
                :rules="[val => !!val || 'Required', val => val.length >= 6 || 'Min 6 characters']"
              />
              <q-input 
                v-model="confirmPassword" 
                label="Confirm Password" 
                type="password" 
                dark filled dense 
                :rules="[val => !!val || 'Required', val => val === password || 'Passwords do not match']"
              />

              <q-btn 
                color="indigo-7" 
                label="Activate Account" 
                class="full-width glossy q-py-md q-mt-lg" 
                native-type="submit"
                :loading="activating"
              />
           </q-form>
        </q-card-section>
      </template>

      <q-card-section class="text-center q-pa-xl" v-else>
         <q-icon name="error_outline" color="red-4" size="4em" class="q-mb-md" />
         <div class="text-h6">Invitation Invalid</div>
         <div class="text-caption text-grey-6 q-mt-sm">This link may be expired or already used. Please contact your administrator.</div>
         <q-btn outline label="Back to Login" color="white" class="q-mt-xl" to="/" />
      </q-card-section>

    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onboardingApi } from '../api'
import { supabase } from '../supabase'
import { Notify } from 'quasar'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const activating = ref(false)
const inviteData = ref(null)
const password = ref('')
const confirmPassword = ref('')

const token = route.query.token

const validateInvite = async () => {
  if (!token) {
    loading.value = false
    return
  }

  try {
    const { data } = await onboardingApi.validateInvite(token)
    inviteData.value = data
  } catch (error) {
    console.error('Validation failed', error)
  } finally {
    loading.value = false
  }
}

const handleActivation = async () => {
  activating.value = true
  try {
    // 1. Supabase Auth Signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteData.value.email,
      password: password.value
    })

    if (authError) throw authError

    // 2. Call backend to sync user and consume invite
    await onboardingApi.acceptInvite({
      token,
      userId: authData.user.id,
      password: password.value // Pass if needed, usually auth handles it
    })

    Notify.create({
      type: 'positive',
      message: 'Account activated! Welcome to Invify.',
      position: 'top'
    })

    router.push('/teacher-workspace')
  } catch (error) {
    console.error('Activation failed', error)
  } finally {
    activating.value = false
  }
}

onMounted(validateInvite)
</script>

<style scoped>
.bg-blue-grey-10 { background: #1c262b; }
.border-indigo { border-top: 5px solid #3f51b5; }
</style>
