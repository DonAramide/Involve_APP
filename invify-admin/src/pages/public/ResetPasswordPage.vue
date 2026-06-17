<template>
  <q-page class="flex flex-center bg-grey-2" padding>
    <q-card style="width: 100%; max-width: 400px" class="q-pa-md shadow-2">
      <q-card-section>
        <div class="text-h5 text-weight-bold text-center q-mb-md">Reset Password</div>
        <p class="text-center text-grey-7">Enter the 6-digit code sent to your email and your new password.</p>
      </q-card-section>

      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input 
          v-model="code" 
          label="6-digit OTP" 
          outlined 
          mask="######"
          lazy-rules
          :rules="[val => val && val.length === 6 || 'Enter the 6-digit OTP']"
          input-class="text-center tracking-widest"
        />

        <q-input 
          v-model="newPassword" 
          label="New Password" 
          type="password" 
          outlined 
          lazy-rules
          :rules="[val => !!val || 'Password is required']"
        />

        <q-input 
          v-model="confirmPassword" 
          label="Confirm New Password" 
          type="password" 
          outlined 
          lazy-rules
          :rules="[
            val => !!val || 'Confirm password is required',
            val => val === newPassword || 'Passwords do not match'
          ]"
        />

        <q-banner v-if="errorMsg" class="bg-negative text-white rounded-borders">
          {{ errorMsg }}
        </q-banner>
        <q-banner v-if="successMsg" class="bg-positive text-white rounded-borders">
          {{ successMsg }}
        </q-banner>

        <div class="flex justify-between items-center q-mt-md">
          <q-btn flat color="primary" label="Back to Login" to="/login" />
          <q-btn type="submit" color="primary" label="Reset Password" :loading="loading" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const email = ref('');

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const route = useRoute();
const router = useRouter();

onMounted(() => {
  if (route.query.email) {
    email.value = route.query.email as string;
  } else {
    // If no email query param, they might have navigated here manually.
    // They should go back to forgot-password.
    errorMsg.value = 'Email context lost. Please start over from Forgot Password.';
  }
});

async function onSubmit() {
  if (!email.value) {
    errorMsg.value = 'Missing email. Please go back to Forgot Password.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    // 1. Verify OTP
    const verifyRes = await axios.post('/api/auth/verify-email-otp', { email: email.value, code: code.value, purpose: 'PASSWORD_RESET' });
    
    // 2. If verified, proceed to reset password (we'll reuse the auth reset endpoint we fixed earlier)
    if (verifyRes.data.success) {
      // The authController resetPassword expects email and newPassword
      await axios.post('/api/auth/reset-password', { email: email.value, newPassword: newPassword.value });
      
      successMsg.value = 'Password reset successfully.';
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.error || 'Failed to reset password.';
  } finally {
    loading.value = false;
  }
}
</script>
