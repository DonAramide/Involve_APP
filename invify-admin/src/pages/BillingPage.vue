<!-- invify-admin/src/pages/BillingPage.vue -->
<template>
  <q-page class="q-pa-lg bg-dark text-white">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-weight-bolder q-ma-none text-white letter-spacing-1">Billing & Subscription</h1>
        <div class="text-grey-6">Manage your plan, monitor AI consumption, and scale your school.</div>
      </div>
    </div>

    <div class="row q-col-gutter-lg">
       <!-- Current Status & Usage -->
       <div class="col-12 col-md-4">
          <q-card class="bg-blue-grey-10 shadow-2 border-indigo q-mb-lg">
             <q-card-section>
                <div class="text-subtitle1 text-indigo-3 text-weight-bold">CURRENT PLAN</div>
                <div class="row items-center q-mt-sm">
                   <div class="text-h4 text-weight-bolder">{{ status?.plan?.toUpperCase() }}</div>
                   <q-chip :color="status?.status === 'active' ? 'green-10' : 'red-10'" text-color="white" size="sm" class="q-ml-md">
                      {{ status?.status?.toUpperCase() }}
                   </q-chip>
                </div>
                <div class="text-caption text-grey-6 q-mt-md" v-if="status?.expiry">
                  Next billing date: {{ new Date(status.expiry).toLocaleDateString() }}
                </div>
             </q-card-section>
             
             <q-separator dark />

             <q-card-section class="column items-center q-pa-xl">
                <q-knob
                   v-model="usagePercentage"
                   show-value
                   size="150px"
                   :thickness="0.15"
                   color="indigo-7"
                   track-color="blue-grey-9"
                   class="text-weight-bolder text-h5"
                   readonly
                >
                  {{ status?.usage }} / {{ status?.limit }}
                </q-knob>
                <div class="text-subtitle2 text-grey-6 q-mt-md">Monthly AI Units Used</div>
             </q-card-section>
          </q-card>
       </div>

       <!-- Plans Discovery -->
       <div class="col-12 col-md-8">
          <div class="row q-col-gutter-md">
             <div v-for="plan in plans" :key="plan.name" class="col-12 col-sm-4">
                <q-card 
                  class="bg-blue-grey-10 shadow-5 border-top-highlight h-100 flex column" 
                  :class="{ 'border-active-plan': status?.plan === plan.id }"
                >
                   <q-card-section class="text-center q-pa-lg">
                      <div class="text-overline text-indigo-3">{{ plan.name }}</div>
                      <div class="text-h3 text-weight-bolder q-mt-sm">
                        <span class="text-caption">{{ currentCurrency.symbol }}</span>{{ plan.price }}<span class="text-caption text-grey-6">/mo</span>
                      </div>
                      <div class="text-caption text-grey-6 q-mt-xs">{{ plan.subtitle }}</div>
                   </q-card-section>

                   <q-separator dark inset />

                   <q-card-section class="col">
                      <div v-for="feature in plan.features" :key="feature" class="row no-wrap items-center q-mb-sm">
                         <q-icon name="check" color="green-4" size="xs" class="q-mr-sm" />
                         <div class="text-body2 text-grey-4">{{ feature }}</div>
                      </div>
                   </q-card-section>

                   <q-card-actions class="q-pa-md">
                      <q-btn 
                        v-if="status?.plan === plan.id"
                        color="grey-8" 
                        label="CURRENT PLAN" 
                        disable 
                        class="full-width" 
                      />
                      <q-btn 
                        v-else
                        color="indigo-7" 
                        :label="plan.id === 'free' ? 'STAY ON FREE' : 'UPGRADE NOW'" 
                        class="full-width glossy" 
                        @click="upgrade(plan.id)"
                        :loading="upgrading === plan.id"
                      />
                   </q-card-actions>
                </q-card>
             </div>
          </div>
       </div>
    </div>

    <!-- Upgrade Dialog -->
    <q-dialog v-model="showUpgrade" backdrop-filter="blur(10px)">
       <q-card style="width: 400px" class="bg-blue-grey-10 text-white border-indigo">
          <q-card-section class="text-center q-pa-xl">
             <q-icon name="shopping_cart" size="4em" color="indigo-4" class="q-mb-md" />
             <div class="text-h6 text-weight-bold">Confirm Upgrade</div>
             <div class="text-body2 text-grey-6 q-mt-sm">
                You are about to switch to the <span class="text-indigo-3 text-weight-bold">{{ selectedPlan?.toUpperCase() }}</span> plan. 
                Payments are handled securely via Quaser.
             </div>
          </q-card-section>
          <q-card-actions align="center" class="q-pb-xl">
             <q-btn flat label="Cancel" color="white" v-close-popup />
             <q-btn color="indigo-7" label="Proceed to Checkout" class="q-px-lg glossy" @click="handleCheckout" />
          </q-card-actions>
       </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency';
const { currentCurrency } = useCurrency();

import { ref, onMounted, computed } from 'vue'
import { billingApi } from '../api'

const loading = ref(true)
const upgrading = ref(null)
const status = ref(null)
const showUpgrade = ref(false)
const selectedPlan = ref(null)

const plans = [
  { 
    id: 'free', name: 'FREE', price: '0', 
    subtitle: 'Great for small beginnings', 
    features: ['20 AI Units / month', 'NERDC Curriculum Access', 'Basic Lesson Notes', 'Platform Community'] 
  },
  { 
    id: 'basic', name: 'BASIC', price: '5,000', 
    subtitle: 'Most popular for private schools',
    features: ['200 AI Units / month', 'Teacher Dashboard', 'PDF Exports', 'Global Lesson Cache'] 
  },
  { 
    id: 'premium', name: 'PREMIUM', price: '15,000', 
    subtitle: 'Absolute power for elite schools',
    features: ['1,000 AI Units / month', 'Priority AI Models', 'Advanced Analytics', 'Dedicated Support'] 
  }
]

const usagePercentage = computed(() => {
  if (!status.value) return 0
  return Math.min(100, (status.value.usage / status.value.limit) * 100)
})

const fetchStatus = async () => {
  loading.value = true
  try {
    const { data } = await billingApi.getStatus()
    status.value = data
  } finally {
    loading.value = false
  }
}

const upgrade = (planId) => {
  selectedPlan.value = planId
  showUpgrade.value = true
}

const handleCheckout = async () => {
  const planId = selectedPlan.value
  upgrading.value = planId
  try {
    // 1. Initiate Subscription payment
    const { data } = await billingApi.subscribe({ plan: planId })
    
    // 2. Redirect to real Quaser checkout if integration is live
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl
    }
  } finally {
    upgrading.value = null
    showUpgrade.value = false
  }
}

onMounted(fetchStatus)
</script>

<style scoped>
.letter-spacing-1 { letter-spacing: 1px; }
.bg-blue-grey-10 { background: #1c262b; }
.bg-blue-grey-9 { background: #263238; }
.border-indigo { border-left: 5px solid #3f51b5; }
.border-top-highlight { border-top: 5px solid #3f51b5; }
.border-active-plan { border: 2px solid #3f51b5 !important; }
.h-100 { min-height: 450px; }
</style>
