<template>
  <q-page class="flex flex-center bg-grey-2" padding>
    <q-card style="width: 100%; max-width: 420px" class="q-pa-md shadow-2">
      <q-card-section>
        <div class="text-h5 text-weight-bold text-center q-mb-md">
          {{ step === 'verify' ? 'Validate Recovery Email' : 'Set New Password' }}
        </div>
        <p class="text-center text-grey-7">
          <template v-if="step === 'verify'">
            Enter the 6-digit code sent to <strong>{{ email }}</strong>.
          </template>
          <template v-else>
            Recovery verified. Choose a new password for <strong>{{ email }}</strong>.
          </template>
        </p>
      </q-card-section>

      <q-form v-if="step === 'verify'" @submit="onVerify" class="q-gutter-md">
        <q-input 
          v-model="code" 
          label="6-digit OTP" 
          outlined 
          mask="######"
          lazy-rules
          :rules="[val => val && val.length === 6 || 'Enter the 6-digit OTP']"
          input-class="text-center tracking-widest"
        />

        <q-banner v-if="errorMsg" class="bg-negative text-white rounded-borders">
          {{ errorMsg }}
        </q-banner>
        <q-banner v-if="successMsg" class="bg-positive text-white rounded-borders">
          {{ successMsg }}
        </q-banner>

        <div class="flex justify-between items-center q-mt-md">
          <q-btn flat color="primary" label="Back" to="/forgot-password" />
          <q-btn type="submit" color="primary" label="Validate Code" :loading="loading" />
        </div>
      </q-form>

      <q-form v-else @submit="onReset" class="q-gutter-md">
        <q-input 
          v-model="newPassword" 
          label="New Password" 
          :type="showNewPassword ? 'text' : 'password'"
          outlined 
          lazy-rules
          :rules="[val => !!val || 'Password is required', val => evaluatePasswordPolicy(val, { email: email }).ok || evaluatePasswordPolicy(val, { email: email }).errors[0]]"
        >
          <template v-slot:append>
            <q-icon
              :name="showNewPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showNewPassword = !showNewPassword"
            />
          </template>
        </q-input>
        <PasswordStrengthHints :password="newPassword" :email="email" />

        <q-input 
          v-model="confirmPassword" 
          label="Confirm New Password" 
          :type="showConfirmPassword ? 'text' : 'password'"
          outlined 
          lazy-rules
          :rules="[
            val => !!val || 'Confirm password is required',
            val => val === newPassword || 'Passwords do not match'
          ]"
        >
          <template v-slot:append>
            <q-icon
              :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showConfirmPassword = !showConfirmPassword"
            />
          </template>
        </q-input>

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
import { evaluatePasswordPolicy } from '../../utils/passwordPolicy';
import PasswordStrengthHints from '../../components/PasswordStrengthHints.vue';

const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const email = ref('');
const step = ref<'verify' | 'password'>('verify');
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const route = useRoute();
const router = useRouter();

onMounted(() => {
  if (route.query.email) {
    email.value = String(route.query.email).trim().toLowerCase();
  } else {
    errorMsg.value = 'Email context lost. Please start over from Forgot Password.';
  }
});

async function onVerify() {
  if (!email.value) {
    errorMsg.value = 'Missing email. Please go back to Forgot Password.';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const verifyRes = await axios.post('/api/auth/verify-email-otp', {
      email: email.value,
      code: code.value,
      otp: code.value,
      purpose: 'PASSWORD_RESET',
    });

    if (verifyRes.data?.success === false) {
      throw new Error(verifyRes.data?.error || 'Invalid or expired verification code.');
    }

    successMsg.value = 'Recovery email verified.';
    step.value = 'password';
  } catch (err: any) {
    errorMsg.value = err.response?.data?.error || err.message || 'Failed to verify code.';
  } finally {
    loading.value = false;
  }
}

async function onReset() {
  if (!email.value) {
    errorMsg.value = 'Missing email. Please go back to Forgot Password.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.';
    return;
  }
  const policy = evaluatePasswordPolicy(newPassword.value, { email: email.value });
  if (!policy.ok) {
    errorMsg.value = policy.errors[0];
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    await axios.post('/api/auth/reset-password', {
      email: email.value,
      // OTP already validated in previous step; backend trusts fresh VERIFIED session
      recoveryVerified: true,
      newPassword: newPassword.value,
    });

    successMsg.value = 'Password reset successfully. Redirecting to login…';
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  } catch (err: any) {
    const raw = err.response?.data?.error || err.message || 'Failed to reset password.';
    const lower = String(raw).toLowerCase();
    if (
      err.response?.data?.code === 'SAME_AS_PREVIOUS_PASSWORD' ||
      lower.includes('same as your previous') ||
      lower.includes('same password') ||
      lower.includes('different from the old')
    ) {
      errorMsg.value =
        'New password cannot be the same as your previous password. Please choose a different passphrase.';
    } else {
      errorMsg.value = raw;
    }
  } finally {
    loading.value = false;
  }
}
</script>
