<template>
  <q-page class="flex flex-center bg-grey-2" padding>
    <q-card style="width: 100%; max-width: 400px" class="q-pa-md shadow-2">
      <q-card-section>
        <div class="text-h5 text-weight-bold text-center q-mb-md">Forgot Password</div>
        <p class="text-center text-grey-7">Enter your email address to receive a password reset code.</p>
      </q-card-section>

      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input 
          v-model="email" 
          label="Email Address" 
          type="email" 
          outlined 
          lazy-rules
          :rules="[val => !!val || 'Email is required']"
        />

        <q-banner v-if="errorMsg" class="bg-negative text-white rounded-borders">
          {{ errorMsg }}
        </q-banner>
        <q-banner v-if="successMsg" class="bg-positive text-white rounded-borders">
          {{ successMsg }}
        </q-banner>

        <div class="flex justify-between items-center q-mt-md">
          <q-btn flat color="primary" label="Back to Login" to="/login" />
          <q-btn type="submit" color="primary" label="Send Code" :loading="loading" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const email = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const router = useRouter();

async function onSubmit() {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    await axios.post('/api/auth/send-email-otp', { email: email.value, purpose: 'PASSWORD_RESET' });
    successMsg.value = 'Password reset code sent to your email.';
    setTimeout(() => {
      // Pass email as query param so reset page knows who to verify
      router.push({ path: '/reset-password', query: { email: email.value } });
    }, 2000);
  } catch (err: any) {
    errorMsg.value = err.response?.data?.error || 'Failed to send reset code.';
  } finally {
    loading.value = false;
  }
}
</script>
