<!-- invify-admin/src/pages/admin/BillingGovernanceCenterPage.vue -->
<template>
  <q-page class="q-pa-xl bg-main text-main" style="min-height: 100vh; position: relative; overflow: hidden;">
    <div class="ambient-glow" />

    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon name="account_balance" color="indigo-4" size="lg" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">Enterprise Billing</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs font-mono">
          Subscription mock on this page is not platform fee orchestration. Transaction tariffs live at Platform Fee Profiles.
        </div>
      </div>
      <q-btn unelevated color="indigo-8" icon="request_quote" label="Open Platform Fee Profiles" to="/admin/platform-fees" />
    </div>

    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">
      <div class="col-12 col-md-7">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg q-mb-lg shadow-24">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-h6 text-weight-bold text-white row items-center op-gap-8">
              <q-icon name="card_membership" color="indigo-4" size="sm" />
              <span>Subscription Plan Governance</span>
            </div>
            <q-badge color="grey-8" text-color="grey-4" class="font-mono">MOCK — NOT LIVE</q-badge>
          </div>
          <div class="text-caption text-grey-5 q-mb-md">
            These subscription cards are local placeholders. They are not persisted fee_profiles and do not charge tenants.
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-4" v-for="plan in subscriptionPlans" :key="plan.tier">
              <div class="bg-black-transparent border-grey-9 q-pa-md rounded-borders column full-height">
                <div class="row justify-between items-center q-mb-sm">
                  <span class="text-weight-bold text-white text-caption">{{ plan.tier }}</span>
                  <q-badge :color="plan.isActive ? 'green-10' : 'grey-9'" :text-color="plan.isActive ? 'green-4' : 'grey-6'">
                    {{ plan.isActive ? 'LIVE' : 'DRAFT' }}
                  </q-badge>
                </div>
                <div class="text-h5 text-weight-bolder text-indigo-3 font-mono q-mb-md">
                  {{ currentCurrency.symbol }}{{ plan.monthlyCost.toLocaleString() }}<span class="text-caption text-grey-6">/mo</span>
                </div>
                <div class="column q-gutter-y-xs q-mb-md text-caption text-grey-5 font-mono" style="font-size: 10px;">
                  <div class="row justify-between">
                    <span>Max Terminals:</span><span class="text-white">{{ plan.maxTerminals }}</span>
                  </div>
                  <div class="row justify-between">
                    <span>AI Tokens:</span><span class="text-white">{{ plan.aiTokens.toLocaleString() }}</span>
                  </div>
                </div>
                <q-space />
                <q-btn outline dense color="indigo-5" class="full-width font-mono" style="font-size: 10px;" label="CONFIGURE LIMITS" @click="configureLimits(plan)" />
              </div>
            </div>
          </div>
        </q-card>

        <q-card class="bg-card-dark border-grey-9 q-pa-lg shadow-24">
          <div class="text-h6 text-weight-bold text-white row items-center op-gap-8 q-mb-xs">
            <q-icon name="request_quote" color="indigo-4" size="sm" />
            <span>Platform Fee Profiles</span>
          </div>
          <div class="text-caption text-grey-5 q-mb-md">
            Real catalog from fee_profiles. Draft seeds are unpublished. Open a row to edit, preview, or publish.
          </div>

          <q-banner v-if="feeError" class="bg-red-10 text-red-2 q-mb-md" rounded>{{ feeError }}</q-banner>
          <q-list separator class="bg-black-transparent border-grey-9 rounded-borders">
            <q-item
              v-for="fee in platformFees"
              :key="fee.transaction_type"
              clickable
              v-ripple
              :to="`/admin/platform-fees/${fee.transaction_type}`"
            >
              <q-item-section>
                <q-item-label class="text-weight-bold text-white">{{ fee.display_name }}</q-item-label>
                <q-item-label caption class="text-grey-5 font-mono">{{ fee.transaction_type }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="fee.current_status === 'PUBLISHED' ? 'green-9' : 'orange-9'" :label="fee.current_status" />
                <div class="text-caption text-grey-5 font-mono q-mt-xs">
                  Published: {{ fee.current_published_version == null ? 'None' : ('v' + fee.current_published_version) }}
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-5">
        <q-card class="bg-card-dark border-grey-9 q-pa-md text-center shadow-24">
          <div class="text-grey-5 text-caption font-mono">PLATFORM FEE CONTROL PLANE</div>
          <div class="text-body1 text-white q-mt-sm">Use Save Draft and explicit Publish on the profile page. Publishing calls publish_fee_profile_version only.</div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useCurrency } from '../../composables/useCurrency'
import { adminApi } from '../../api'

const { currentCurrency } = useCurrency()
const $q = useQuasar()
const platformFees = ref([])
const feeError = ref('')

const subscriptionPlans = ref([
  { tier: 'FREE', monthlyCost: 0, maxTerminals: 1, aiTokens: 100, isActive: true },
  { tier: 'BASIC', monthlyCost: 15000, maxTerminals: 3, aiTokens: 5000, isActive: true },
  { tier: 'ENTERPRISE', monthlyCost: 120000, maxTerminals: 99, aiTokens: 500000, isActive: true }
])

const configureLimits = (plan) => {
  $q.dialog({
    title: `Configure Limits - ${plan.tier}`,
    message: 'Subscription limit configuration is still a local mock. It is not platform fee orchestration.',
    color: 'indigo-8',
    ok: 'Understood',
    dark: true
  })
}

async function loadPlatformFees() {
  try {
    const { data } = await adminApi.listPlatformFeeProfiles()
    platformFees.value = data?.data || []
  } catch (e) {
    feeError.value = e?.response?.data?.error || 'Could not load platform fee profiles'
  }
}

onMounted(loadPlatformFees)
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, rgba(5,7,13,0) 70%);
  pointer-events: none;
  z-index: 1;
}
.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }
.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
.bg-black-transparent { background: rgba(0, 0, 0, 0.2); }
</style>
