<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2" padding>
    <q-card style="width: 100%; max-width: 600px" class="q-pa-md shadow-2">
      <q-card-section>
        <div class="text-h5 text-weight-bold text-center q-mb-md">Invify Onboarding</div>
      </q-card-section>

      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        animated
        flat
      >
        <!-- Step 1: Account Details -->
        <q-step
          :name="1"
          title="Account Details"
          icon="person"
          :done="step > 1"
        >
          <q-form @submit="onAccountDetailsSubmit" class="q-gutter-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="store.userDetails.firstName" 
                  label="First Name" 
                  outlined 
                  lazy-rules
                  :rules="[val => !!val || 'First Name is required']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input 
                  v-model="store.userDetails.lastName" 
                  label="Last Name" 
                  outlined 
                  lazy-rules
                  :rules="[val => !!val || 'Last Name is required']"
                />
              </div>
            </div>

            <q-input 
              v-model="store.userDetails.email" 
              label="Email Address" 
              type="email" 
              outlined 
              lazy-rules
              :rules="[val => !!val || 'Email is required']"
            />

            <q-input 
              v-model="store.userDetails.phone" 
              label="Phone Number (e.g., +2348012345678)" 
              type="tel" 
              outlined 
              lazy-rules
              :rules="[val => !!val || 'Phone number is required']"
            />

            <q-input 
              v-model="store.userDetails.password" 
              label="Password" 
              type="password" 
              outlined 
              lazy-rules
              :rules="[val => !!val || 'Password is required']"
            />

            <q-banner v-if="store.error" class="bg-negative text-white rounded-borders">
              {{ store.error }}
            </q-banner>

            <div class="flex justify-end q-mt-md">
              <q-btn type="submit" color="primary" label="Continue" :loading="store.isLoading" />
            </div>
          </q-form>
        </q-step>

        <!-- Step 2: Email Verification -->
        <q-step
          :name="2"
          title="Verify Email"
          icon="email"
          :done="step > 2"
        >
          <div class="text-center q-mb-md">
            We sent a verification code to:<br />
            <strong>{{ store.userDetails.email }}</strong>
          </div>

          <q-form @submit="onEmailVerifySubmit" class="q-gutter-md">
            <q-input 
              v-model="emailOtp" 
              label="6-digit OTP" 
              outlined 
              mask="######"
              lazy-rules
              :rules="[val => val && val.length === 6 || 'Enter the 6-digit OTP']"
              class="q-mx-auto"
              style="max-width: 200px"
              input-class="text-center text-h6 tracking-widest"
            />

            <q-banner v-if="store.error" class="bg-negative text-white rounded-borders">
              {{ store.error }}
            </q-banner>

            <div class="flex justify-center q-mt-md q-gutter-sm">
              <q-btn type="submit" color="primary" label="Verify" :loading="store.isLoading" />
              <q-btn 
                flat 
                color="primary" 
                label="Resend Code" 
                @click="onResendEmailOtp" 
                :disable="emailResendDisabled" 
              />
            </div>
          </q-form>
        </q-step>

        <!-- Step 3: WhatsApp Verification -->
        <q-step
          :name="3"
          title="Verify WhatsApp"
          icon="phone"
          :done="step > 3"
        >
          <div class="text-center q-mb-md">
            We sent a verification code to:<br />
            <strong>{{ store.userDetails.phone }}</strong>
          </div>

          <q-form @submit="onWhatsappVerifySubmit" class="q-gutter-md">
            <q-input 
              v-model="whatsappOtp" 
              label="6-digit OTP" 
              outlined 
              mask="######"
              lazy-rules
              :rules="[val => val && val.length === 6 || 'Enter the 6-digit OTP']"
              class="q-mx-auto"
              style="max-width: 200px"
              input-class="text-center text-h6 tracking-widest"
            />

            <q-banner v-if="store.error" class="bg-negative text-white rounded-borders">
              {{ store.error }}
            </q-banner>

            <div class="flex justify-center q-mt-md q-gutter-sm">
              <q-btn type="submit" color="primary" label="Verify" :loading="store.isLoading" />
              <q-btn 
                flat 
                color="primary" 
                label="Resend Code" 
                @click="onResendWhatsappOtp" 
                :disable="whatsappResendDisabled" 
              />
            </div>
          </q-form>
        </q-step>

        <!-- Step 4: Account Activated -->
        <q-step
          :name="4"
          title="Account Activated"
          icon="check_circle"
        >
          <div class="text-center q-pa-lg">
            <q-icon name="check_circle" color="positive" size="5rem" />
            <h5 class="q-mt-md q-mb-xs">Welcome to Invify</h5>
            <p class="text-grey-7">Your account has been successfully activated.</p>
            
            <q-btn 
              color="primary" 
              label="Go to Dashboard" 
              class="q-mt-lg" 
              to="/dashboard"
            />
          </div>
        </q-step>
      </q-stepper>
    </q-card>
  </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useOnboardingStore } from 'stores/onboarding.store';

const store = useOnboardingStore();
const step = ref(1);

const emailOtp = ref('');
const whatsappOtp = ref('');

// Cooldown logic
const now = ref(Date.now());
let timerId: ReturnType<typeof setInterval>;

onMounted(() => {
  timerId = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timerId);
});

const emailResendDisabled = computed(() => store.emailResendAvailableAt > now.value);
const whatsappResendDisabled = computed(() => store.whatsappResendAvailableAt > now.value);

async function onAccountDetailsSubmit() {
  try {
    // Attempt to send the first OTP via email
    await store.sendEmailOtp();
    step.value = 2; // Proceed to Email Verification
  } catch (err) {
    // Error handled by store
  }
}

async function onResendEmailOtp() {
  try {
    await store.sendEmailOtp();
  } catch (err) {
    // Error handled by store
  }
}

async function onEmailVerifySubmit() {
  try {
    await store.verifyEmailOtp(emailOtp.value);
    
    // Now trigger WhatsApp verification
    await store.sendWhatsappOtp();
    step.value = 3; // Proceed to WhatsApp Verification
  } catch (err) {
    // Error handled by store
  }
}

async function onResendWhatsappOtp() {
  try {
    await store.sendWhatsappOtp();
  } catch (err) {
    // Error handled by store
  }
}

async function onWhatsappVerifySubmit() {
  try {
    await store.verifyWhatsappOtp(whatsappOtp.value);
    
    // Finally, register the user
    await store.completeRegistration();
    step.value = 4; // Proceed to Success Screen
  } catch (err) {
    // Error handled by store
  }
}
</script>
