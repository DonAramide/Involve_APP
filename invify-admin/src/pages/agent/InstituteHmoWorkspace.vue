<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16">
    <div class="row items-center justify-between">
      <div class="row items-center op-gap-8">
        <q-btn flat dense round icon="arrow_back" color="amber-4" aria-label="Back to dashboard" @click="router.push('/institute/dashboard')" />
        <div>
          <div class="text-weight-bold">HMO Management</div>
          <div class="text-caption text-muted">Published catalogue from Invify. This bank cannot edit the canonical HMO, plan, or provider records.</div>
        </div>
      </div>
    </div>

    <div class="row q-gutter-xs">
      <q-btn
        v-for="item in sections"
        :key="item.id"
        dense
        no-caps
        :outline="section !== item.id"
        :color="section === item.id ? 'amber-4' : 'grey-6'"
        :text-color="section === item.id ? 'black' : 'grey-4'"
        :label="item.label"
        @click="router.push('/institute/hmo/' + item.id)"
      />
    </div>

    <q-banner v-if="error" rounded class="bg-red-10 text-white">
      {{ error }}
      <template #action>
        <q-btn flat color="white" label="Retry" @click="load" />
      </template>
    </q-banner>
    <div v-if="loading" class="flex flex-center col"><q-spinner color="amber-4" size="2em" /></div>

    <template v-else>
      <div v-if="section === 'overview'" class="row q-col-gutter-md">
        <div v-for="card in overviewCards" :key="card.label" class="col-12 col-sm-6 col-md-3">
          <q-card flat bordered class="bg-panel q-pa-md">
            <div class="text-caption text-muted">{{ card.label }}</div>
            <div class="text-h6">{{ card.value }}</div>
            <div v-if="card.note" class="text-caption text-amber-4">{{ card.note }}</div>
          </q-card>
        </div>
        <div class="col-12 text-caption text-muted">{{ overview?.financeUnavailableReason }}</div>
        <div class="col-12 text-caption text-muted">Enrolment over time is not charted. A current count is not a historical trend.</div>
      </div>

      <div v-else-if="section === 'catalogue' || section === 'plans'" class="column op-gap-8">
        <q-input dark outlined dense v-model="search" label="Search HMO, plan, or category" color="amber-4" @keyup.enter="loadCatalogue" />
        <q-card v-for="plan in catalogue" :key="plan.planId" flat bordered class="bg-panel q-pa-md">
          <div class="text-weight-bold">{{ plan.providerName }}</div>
          <div>{{ plan.planName }} <span class="text-muted">({{ plan.planCode }})</span></div>
          <div v-for="version in plan.versions" :key="version.versionId" class="q-mt-sm text-caption">
            Version {{ version.version }} · {{ money(version.premiumMinor, version.currency) }} reference · {{ version.billingFrequency }}
            · {{ (version.memberCategories || []).join(', ') }}
            <div v-if="Array.isArray(version.benefits) && version.benefits.length">Benefits: {{ version.benefits.map(benefitLabel).join('; ') }}</div>
          </div>
        </q-card>
        <div v-if="!catalogue.length" class="text-muted">No published HMO plan is available for distribution.</div>
      </div>

      <div v-else-if="section === 'offerings'" class="column op-gap-8">
        <q-banner rounded class="bg-amber-9 text-white">{{ pricePolicy }}</q-banner>
        <q-banner v-if="offeringsUnavailable" rounded class="bg-red-10 text-white">{{ offeringsUnavailable }}</q-banner>
        <q-card v-for="offer in offerings" :key="offer.versionId" flat bordered class="bg-panel q-pa-md">
          <div class="text-weight-bold">{{ offer.providerName }} · {{ offer.planName }}</div>
          <div class="text-caption">Published version {{ offer.version }} · Bank offering {{ offer.offeringStatus }}</div>
          <div class="text-caption">Reference price {{ money(offer.referencePremiumMinor, offer.currency) }}. The bank cannot edit this price.</div>
          <div class="text-caption text-muted">{{ (offer.memberCategories || []).join(', ') }}</div>
          <div class="q-mt-sm row q-gutter-sm">
            <q-btn outline no-caps color="amber-4" label="Activate" :disable="busy || offer.activeForBank" @click="askChange(offer, true)" />
            <q-btn outline no-caps color="grey-5" label="Deactivate" :disable="busy || offer.offeringStatus !== 'active'" @click="askChange(offer, false)" />
          </div>
        </q-card>
        <div v-if="!offerings.length" class="text-muted">No eligible published plan is available to activate.</div>
      </div>

      <div v-else-if="section === 'categories'" class="column op-gap-8">
        <q-card v-for="row in categories" :key="row.category" flat bordered class="bg-panel q-pa-md">
          <div class="text-weight-bold">{{ row.category }}</div>
          <div class="text-caption text-muted">{{ row.planCount }} published plan{{ row.planCount === 1 ? '' : 's' }}</div>
        </q-card>
        <div v-if="!categories.length" class="text-muted">Published plans do not list any member category.</div>
      </div>

      <div v-else-if="section === 'providers'" class="column op-gap-8">
        <q-card v-for="place in facilities" :key="place.id" flat bordered class="bg-panel q-pa-md">
          <div class="text-weight-bold">{{ place.name }}</div>
          <div class="text-caption">{{ place.hmoName }} · {{ [place.lga, place.state].filter(Boolean).join(', ') || 'Location not recorded' }}</div>
          <div class="text-caption text-muted">{{ (place.services || []).join(', ') || 'Services not recorded' }}</div>
        </q-card>
        <div v-if="!facilities.length" class="text-muted">No active healthcare provider location is linked to a published HMO.</div>
      </div>

      <div v-else-if="section === 'tenants'" class="column op-gap-8">
        <q-banner rounded class="bg-amber-9 text-white">A new enrolment is checked again on the server. It is accepted only for an active offering of this bank whose plan version is still published. Existing enrolments and invoices stay as they are.</q-banner>
        <q-card v-for="tenant in tenants" :key="tenant.id" flat bordered class="bg-panel q-pa-md">
          <div class="text-weight-bold">{{ tenant.name }}</div>
          <div class="text-caption text-muted">{{ tenant.status || 'Status not recorded' }} · {{ tenant.hmoSelectionReason }}</div>
        </q-card>
        <div v-if="!tenants.length" class="text-muted">No tenant is attributed to this bank.</div>
      </div>

      <div v-else-if="section === 'enrolments' || section === 'premiums' || section === 'claims' || section === 'reconciliation' || section === 'reports'" class="column op-gap-8">
        <q-card flat bordered class="bg-panel q-pa-md">
          <div v-if="section === 'enrolments'">Enrolments for this bank's tenants: {{ metric(overview?.enrolments) }}</div>
          <div v-else-if="section === 'premiums'">Invoiced {{ money(overview?.premiums?.billedMinor) }} · Collected {{ money(overview?.premiums?.collectedMinor) }} · Outstanding {{ money(overview?.premiums?.outstandingMinor) }}</div>
          <div v-else-if="section === 'claims'">Claims by status: {{ metric(overview?.claims) }}. {{ overview?.claims?.disbursedReason }}</div>
          <div v-else-if="section === 'reconciliation'">Reconciled collections {{ money(overview?.premiums?.reconciledMinor) }}. Unreconciled successful receipts are excluded from that figure.</div>
          <div v-else>Reports use the same institution-scoped counts. Expenses, profit, and claims paid stay unavailable.</div>
          <div v-if="overview?.premiums?.unavailable" class="text-amber-4 q-mt-sm">{{ overview.premiums.unavailable }}</div>
        </q-card>
      </div>

      <div v-else class="text-muted">
        Distribution settings stay on the platform catalogue. This bank cannot publish an HMO or change a canonical plan from here.
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'offerings', label: 'Offerings' },
  { id: 'categories', label: 'Categories' },
  { id: 'plans', label: 'Plans' },
  { id: 'providers', label: 'Providers' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'enrolments', label: 'Enrolments' },
  { id: 'premiums', label: 'Premiums' },
  { id: 'claims', label: 'Claims' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]
const allowed = new Set(sections.map((item) => item.id))
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const section = computed(() => (allowed.has(String(route.params.section || '')) ? String(route.params.section) : 'overview'))
const loading = ref(true)
const error = ref('')
const search = ref('')
const overview = ref(null)
const catalogue = ref([])
const offerings = ref([])
const facilities = ref([])
const tenants = ref([])
const offeringsUnavailable = ref('')
const pricePolicy = ref('')
const busy = ref(false)

function headers() {
  return { Authorization: `Bearer ${localStorage.getItem('invify_agent_token') || ''}` }
}

function money(minor, currency = 'NGN') {
  if (minor === null || minor === undefined) return 'Unavailable'
  const amount = Number(minor) / 100
  if (!Number.isFinite(amount)) return 'Unavailable'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN' }).format(amount)
}

function metric(block) {
  if (!block) return 'Unavailable'
  if (block.unavailable) return block.unavailable
  if (block.total === null || block.total === undefined) return 'Unavailable'
  const parts = Object.entries(block.byStatus || {}).map(([status, count]) => `${status}: ${count}`)
  return parts.length ? `${block.total} (${parts.join(', ')})` : String(block.total)
}

function benefitLabel(benefit) {
  if (!benefit || typeof benefit !== 'object') return String(benefit || '')
  return benefit.category || benefit.name || 'Benefit'
}

const categories = computed(() => overview.value?.categories || [])
const overviewCards = computed(() => {
  const data = overview.value || {}
  return [
    { label: 'Published HMOs', value: data.publishedHmos ?? '—' },
    { label: 'Published plans', value: data.publishedPlans ?? '—' },
    { label: 'Active bank offerings', value: data.activeBankOfferings ?? 'Unavailable', note: data.activeBankOfferingsReason },
    { label: 'Attributed tenants', value: data.attributedTenants ?? '—' },
    { label: 'Enrolments', value: metric(data.enrolments) },
    { label: 'Premiums invoiced', value: money(data.premiums?.billedMinor) },
    { label: 'Premiums collected', value: money(data.premiums?.collectedMinor) },
    { label: 'Claims disbursed', value: 'Unavailable', note: data.claims?.disbursedReason },
  ]
})

async function load() {
  const token = localStorage.getItem('invify_agent_token')
  if (!token) {
    router.push('/institute/login')
    return
  }
  loading.value = true
  error.value = ''
  const read = async (url, params) => {
    try {
      const res = await axios.get(url, { headers: headers(), params })
      return res.data?.data
    } catch (err) {
      error.value = err?.response?.data?.message || error.value || 'Part of the HMO catalogue could not be loaded.'
      return null
    }
  }
  const [overviewData, catalogueData, offeringData, facilityData, tenantData] = await Promise.all([
    read('/api/agent/hmo-distribution/overview'),
    read('/api/agent/hmo-distribution/catalogue', { search: search.value, limit: 50 }),
    read('/api/agent/hmo-distribution/offerings', { limit: 50 }),
    read('/api/agent/hmo-distribution/facilities', { limit: 50 }),
    read('/api/agent/hmo-distribution/tenants'),
  ])
  overview.value = overviewData
  catalogue.value = catalogueData?.data || []
  offerings.value = offeringData?.data || []
  pricePolicy.value = offeringData?.pricePolicy || ''
  offeringsUnavailable.value = offeringData?.offeringsUnavailable || ''
  facilities.value = facilityData?.data || []
  tenants.value = tenantData || []
  loading.value = false
}

async function loadCatalogue() {
  try {
    const res = await axios.get('/api/agent/hmo-distribution/catalogue', {
      headers: headers(),
      params: { search: search.value, limit: 50 },
    })
    catalogue.value = res.data.data?.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.message || 'Search failed' })
  }
}

function askChange(offer, active) {
  if (busy.value) return
  $q.dialog({
    title: active ? 'Activate offering' : 'Deactivate offering',
    message: `${offer.providerName} / ${offer.planName}. The reference price stays read-only. Give a reason of at least 5 characters.`,
    prompt: { model: '', type: 'text', isValid: (value) => String(value || '').trim().length >= 5 },
    cancel: true,
    persistent: true,
    ok: { label: active ? 'Activate' : 'Deactivate', color: 'amber-4', textColor: 'black' },
  }).onOk(async (reason) => {
    if (busy.value) return
    busy.value = true
    try {
      await axios.post('/api/agent/hmo-distribution/offerings', {
        planVersionId: offer.versionId,
        active,
        reason,
      }, { headers: headers() })
      $q.notify({ type: 'positive', message: active ? 'Offering activated.' : 'Offering deactivated.' })
      await load()
    } catch (err) {
      $q.notify({ type: 'negative', message: err?.response?.data?.message || 'The offering was not saved.' })
    } finally {
      busy.value = false
    }
  })
}

watch(() => route.params.section, () => {
  if (!allowed.has(String(route.params.section || 'overview'))) router.replace('/institute/hmo/overview')
})
load()
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
