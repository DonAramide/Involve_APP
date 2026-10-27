<!-- invify-admin/src/pages/agent/components/HmoProductCatalogueView.vue -->
<template>
  <div class="column op-gap-16">
    <!-- Header Banner -->
    <div class="bg-panel border-muted rounded-borders q-pa-md row items-center justify-between op-gap-12 shrink-0">
      <div class="row items-center op-gap-12">
        <q-avatar color="indigo-9" text-color="indigo-2" icon="inventory_2" size="44px" />
        <div>
          <div class="row items-center op-gap-8">
            <span class="text-subtitle1 text-weight-bold">Super Admin Product Catalogue & Commercial Pricing</span>
            <q-badge color="indigo-9" text-color="indigo-2">SUPER ADMIN PUBLISHED</q-badge>
            <q-badge color="teal-9" text-color="teal-2">HMO DISTRIBUTABLE</q-badge>
          </div>
          <div class="text-caption text-muted">
            Select platform products published by Invify Super Admin, set permitted tenant-facing markups or discounts, and assign to managed schools.
          </div>
        </div>
      </div>
      <div class="row op-gap-8">
        <q-btn dense color="teal-4" text-color="black" icon="add_link" label="Assign to School" no-caps class="text-weight-bold q-px-sm" @click="showAssignDialog = true" />
        <q-btn dense outline color="amber-4" icon="refresh" label="Refresh Catalogue" no-caps class="q-px-sm" :loading="loading" @click="loadCatalogData" />
      </div>
    </div>

    <!-- Catalogue Sub-tabs -->
    <div class="shrink-0">
      <q-tabs
        v-model="subTab"
        dense
        class="bg-panel text-muted rounded-borders border-muted"
        active-color="teal-3"
        indicator-color="teal-3"
        align="left"
        narrow-indicator
      >
        <q-tab name="offers" label="My HMO Offers & Pricing" icon="price_change" no-caps />
        <q-tab name="master" label="Super Admin Master Catalogue" icon="auto_stories" no-caps />
        <q-tab name="assignments" label="School Tenant Assignments" icon="school" no-caps />
      </q-tabs>
    </div>

    <!-- Tab 1: HMO Offers & Tenant Pricing -->
    <div v-if="subTab === 'offers'" class="column op-gap-16">
      <div class="row q-col-gutter-md">
        <div v-for="offer in offers" :key="offer.id" class="col-xs-12 col-sm-6 col-md-4">
          <div class="bg-panel border-muted rounded-borders q-pa-md column justify-between full-height">
            <div>
              <div class="row items-center justify-between q-mb-xs">
                <q-badge color="indigo-9" text-color="indigo-2">{{ offer.category }}</q-badge>
                <q-badge :color="offer.isPublished ? 'green-9' : 'amber-9'" :text-color="offer.isPublished ? 'green-2' : 'amber-2'">
                  {{ offer.isPublished ? 'PUBLISHED' : 'DRAFT' }}
                </q-badge>
              </div>
              <div class="text-subtitle1 text-weight-bold q-my-xs">{{ offer.productName }}</div>
              <div class="text-caption text-muted font-mono" style="font-size: 10px;">{{ offer.productCode }}</div>

              <!-- Price Box -->
              <div class="bg-panel-darker border-muted rounded-borders q-pa-sm q-my-md column op-gap-4">
                <div class="row justify-between text-caption">
                  <span class="text-muted">Master Base:</span>
                  <span class="font-mono text-grey-4">₦{{ (offer.basePriceKobo / 100).toLocaleString() }}</span>
                </div>
                <div class="row justify-between text-caption">
                  <span class="text-muted">HMO Adjustment:</span>
                  <span class="font-mono" :class="offer.hmoAdjustmentKobo >= 0 ? 'text-green-4' : 'text-amber-4'">
                    {{ offer.hmoAdjustmentKobo >= 0 ? '+' : '' }}₦{{ (offer.hmoAdjustmentKobo / 100).toLocaleString() }}
                  </span>
                </div>
                <q-separator dark class="opacity-10 q-my-xs" />
                <div class="row justify-between items-center">
                  <span class="text-caption text-weight-bold text-teal-3">Tenant Price:</span>
                  <span class="text-h6 text-weight-bolder text-teal-3 font-mono">
                    ₦{{ (offer.tenantPriceKobo / 100).toLocaleString() }}<span class="text-caption text-muted font-inter">/{{ offer.billingModel.toLowerCase() }}</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="row op-gap-8 q-mt-sm">
              <q-btn outline dense color="teal-3" label="Adjust Pricing" icon="edit" class="col text-caption" no-caps @click="openPricingDialog(offer)" />
              <q-btn dense color="teal-4" text-color="black" label="Assign" icon="add" class="col text-caption text-weight-bold" no-caps @click="quickAssign(offer)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Super Admin Master Catalogue (Immutable) -->
    <div v-else-if="subTab === 'master'" class="column op-gap-16">
      <div class="row q-col-gutter-md">
        <div v-for="prod in masterProducts" :key="prod.id" class="col-xs-12 col-sm-6 col-md-4">
          <div class="bg-panel border-muted rounded-borders q-pa-md column justify-between full-height">
            <div>
              <div class="row items-center justify-between q-mb-xs">
                <q-badge color="grey-9" text-color="grey-3">v{{ prod.version }}</q-badge>
                <q-badge color="green-9" text-color="green-2">SUPER ADMIN CANONICAL</q-badge>
              </div>
              <div class="text-subtitle1 text-weight-bold q-my-xs">{{ prod.name }}</div>
              <div class="text-caption text-muted q-mb-sm" style="min-height: 40px;">{{ prod.description }}</div>

              <div class="column op-gap-4 q-mb-md">
                <div class="text-caption text-weight-bold text-muted" style="font-size: 10px;">INCLUDED FEATURES</div>
                <div class="row op-gap-4 wrap">
                  <q-badge v-for="feat in prod.features" :key="feat" color="indigo-10" text-color="indigo-2" style="font-size: 10px;">
                    {{ feat }}
                  </q-badge>
                </div>
              </div>

              <div class="bg-panel-darker border-muted rounded-borders q-pa-sm row items-center justify-between">
                <div>
                  <div class="text-caption text-muted" style="font-size: 9px;">BASE PRICE (IMMUTABLE)</div>
                  <div class="text-subtitle1 text-weight-bolder text-white font-mono">
                    ₦{{ (prod.basePriceKobo / 100).toLocaleString() }}
                  </div>
                </div>
                <q-badge color="grey-8" text-color="grey-4">{{ prod.billingModel }}</q-badge>
              </div>
            </div>

            <div class="q-mt-md">
              <q-btn color="teal-4" text-color="black" icon="tune" label="Configure HMO Offer" class="full-width text-weight-bold text-caption" no-caps @click="openPricingDialogFromMaster(prod)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: School Tenant Assignments -->
    <div v-else-if="subTab === 'assignments'" class="column op-gap-16">
      <div class="bg-panel border-muted rounded-borders column overflow-hidden">
        <div class="bg-panel-darker q-pa-md border-bottom row items-center justify-between">
          <div>
            <div class="text-subtitle2 text-weight-bold">Active School Tenant Subscriptions & Entitlements</div>
            <div class="text-caption text-muted">Products and feature entitlements provisioned to your managed school tenants</div>
          </div>
          <q-btn dense color="teal-4" text-color="black" icon="add" label="New School Assignment" no-caps class="text-weight-bold" @click="showAssignDialog = true" />
        </div>

        <div v-if="!assignments.length" class="text-center text-muted q-pa-xl column flex-center op-gap-8">
          <q-icon name="assignment_late" size="3rem" color="grey-7" />
          <div class="text-subtitle2">No tenant product assignments registered yet.</div>
          <div class="text-caption" style="max-width: 400px;">Assign an approved product offer to one of your school partners to provision software entitlements.</div>
        </div>

        <div v-else class="overflow-auto">
          <table class="enterprise-table full-width text-left" style="border-collapse: collapse;">
            <thead class="bg-panel-darker text-muted text-metric-mono" style="font-size: 10px;">
              <tr>
                <th class="q-pa-sm border-bottom">School Tenant</th>
                <th class="q-pa-sm border-bottom">Assigned Product</th>
                <th class="q-pa-sm border-bottom">Effective Price</th>
                <th class="q-pa-sm border-bottom">Billing Model</th>
                <th class="q-pa-sm border-bottom">Status</th>
                <th class="q-pa-sm border-bottom">Assigned Date</th>
                <th class="q-pa-sm border-bottom text-right">Action</th>
              </tr>
            </thead>
            <tbody class="text-caption" style="font-size: 12px;">
              <tr v-for="asgn in assignments" :key="asgn.id" class="border-bottom-light hover-row">
                <td class="q-pa-sm text-weight-bold text-main">{{ asgn.tenantName }}</td>
                <td class="q-pa-sm text-teal-3">{{ asgn.productName }}</td>
                <td class="q-pa-sm font-mono text-white">₦{{ (asgn.effectivePriceKobo / 100).toLocaleString() }}</td>
                <td class="q-pa-sm text-muted">{{ asgn.billingModel }}</td>
                <td class="q-pa-sm">
                  <q-badge color="green-9" text-color="green-2">{{ asgn.status }}</q-badge>
                </td>
                <td class="q-pa-sm text-muted font-mono" style="font-size: 10px;">{{ new Date(asgn.assignedAt).toLocaleDateString() }}</td>
                <td class="q-pa-sm text-right">
                  <q-btn dense flat color="red-4" icon="delete" size="sm" @click="revokeAssignment(asgn.id)">
                    <q-tooltip>Revoke Assignment</q-tooltip>
                  </q-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pricing Adjustment Dialog (Phase 5 Commercial Controls) -->
    <q-dialog v-model="showPricingDialog">
      <q-card class="bg-panel text-main font-inter border-muted" style="width: 500px; max-width: 95vw;">
        <q-card-section class="bg-panel-darker border-bottom row items-center justify-between">
          <div class="row items-center op-gap-8">
            <q-icon name="price_change" color="teal-3" size="sm" />
            <div class="text-weight-bold text-subtitle1">Configure HMO Tenant Pricing</div>
          </div>
          <q-btn flat round dense icon="close" v-close-popup size="sm" />
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pa-md" v-if="selectedOffer">
          <div class="text-weight-bold text-subtitle2 text-teal-3">{{ selectedOffer.productName }}</div>
          <div class="text-caption text-muted font-mono" style="font-size: 10px;">{{ selectedOffer.productCode }}</div>

          <div class="bg-panel-darker rounded-borders border-muted q-pa-sm row items-center justify-between">
            <span class="text-caption text-muted">Super Admin Master Base Price:</span>
            <span class="text-weight-bold font-mono text-white">₦{{ (selectedOffer.basePriceKobo / 100).toLocaleString() }}</span>
          </div>

          <!-- HMO Markup / Discount Input -->
          <div class="column op-gap-4">
            <label class="text-caption text-muted" style="font-size: 11px;">HMO ADJUSTMENT (NAIRA - POSITIVE FOR MARKUP, NEGATIVE FOR DISCOUNT)</label>
            <q-input
              v-model.number="pricingForm.adjustmentNaira"
              type="number"
              dark filled dense
              label="Adjustment in Naira (e.g. +3000 or -1500)"
              class="bg-panel-darker text-caption"
            />
            <div class="text-caption text-muted" style="font-size: 10px;">
              Max platform policy discount: 30% (₦{{ (Math.floor(selectedOffer.basePriceKobo * 0.3) / 100).toLocaleString() }}).
            </div>
          </div>

          <!-- Live Price Preview -->
          <div class="bg-panel-darker border-muted rounded-borders q-pa-md column op-gap-4">
            <div class="text-caption text-muted" style="font-size: 10px;">CALCULATED TENANT-FACING PRICE</div>
            <div class="text-h5 text-weight-bolder font-mono" :class="calculatedFinalPriceNaira > 0 ? 'text-teal-3' : 'text-red-4'">
              ₦{{ calculatedFinalPriceNaira.toLocaleString() }}
            </div>
            <div v-if="calculatedFinalPriceNaira <= 0" class="text-caption text-red-4">
              Error: Tenant price must be greater than ₦0.
            </div>
          </div>

          <q-input
            v-model="pricingForm.reason"
            dark filled dense
            label="Pricing Change Rationale *"
            placeholder="e.g. Volume discount for school cluster agreement"
            class="bg-panel-darker text-caption"
          />

          <!-- Audit Trail of Previous Price Changes -->
          <div v-if="selectedOffer.auditTrail?.length" class="column op-gap-4 q-mt-xs">
            <div class="text-caption text-weight-bold text-muted" style="font-size: 10px;">PRICING AUDIT TRAIL</div>
            <div class="bg-panel-darker rounded-borders border-muted q-pa-xs column op-gap-4" style="max-height: 120px; overflow-y: auto;">
              <div v-for="(entry, idx) in selectedOffer.auditTrail" :key="idx" class="row justify-between text-caption text-muted" style="font-size: 10px;">
                <span>₦{{ (entry.newPriceKobo / 100).toLocaleString() }} ({{ entry.reason }})</span>
                <span class="font-mono">{{ new Date(entry.timestamp).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-panel-darker border-top q-pa-sm">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn
            color="teal-4"
            text-color="black"
            label="Save & Publish Offer"
            class="text-weight-bold"
            no-caps
            :loading="savingPricing"
            :disable="calculatedFinalPriceNaira <= 0 || !pricingForm.reason"
            @click="saveOfferPricing"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- School Product Assignment Dialog -->
    <q-dialog v-model="showAssignDialog">
      <q-card class="bg-panel text-main font-inter border-muted" style="width: 500px; max-width: 95vw;">
        <q-card-section class="bg-panel-darker border-bottom row items-center justify-between">
          <div class="row items-center op-gap-8">
            <q-icon name="add_link" color="teal-3" size="sm" />
            <div class="text-weight-bold text-subtitle1">Assign Product to School Tenant</div>
          </div>
          <q-btn flat round dense icon="close" v-close-popup size="sm" />
        </q-card-section>

        <q-card-section class="column op-gap-12 q-pa-md">
          <div class="column op-gap-4">
            <label class="text-caption text-muted" style="font-size: 10px;">SELECT SCHOOL TENANT *</label>
            <q-select
              v-model="assignForm.tenantId"
              :options="tenantOptions"
              emit-value
              map-options
              dark filled dense
              label="Choose school tenant..."
              class="bg-panel-darker text-caption"
            />
          </div>

          <div class="column op-gap-4">
            <label class="text-caption text-muted" style="font-size: 10px;">SELECT HMO PRODUCT OFFER *</label>
            <q-select
              v-model="assignForm.productId"
              :options="productOfferOptions"
              emit-value
              map-options
              dark filled dense
              label="Choose product offer..."
              class="bg-panel-darker text-caption"
            />
          </div>

          <div v-if="chosenOffer" class="bg-panel-darker border-muted rounded-borders q-pa-sm column op-gap-4">
            <div class="text-caption text-weight-bold text-teal-3">{{ chosenOffer.productName }}</div>
            <div class="row justify-between text-caption">
              <span class="text-muted">Effective Subscription Rate:</span>
              <span class="text-weight-bolder text-white font-mono">₦{{ (chosenOffer.tenantPriceKobo / 100).toLocaleString() }} / {{ chosenOffer.billingModel.toLowerCase() }}</span>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-panel-darker border-top q-pa-sm">
          <q-btn flat label="Cancel" color="white" v-close-popup />
          <q-btn
            color="teal-4"
            text-color="black"
            label="Confirm & Provision"
            class="text-weight-bold"
            no-caps
            :loading="assigningProduct"
            :disable="!assignForm.tenantId || !assignForm.productId"
            @click="submitAssignment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const props = defineProps({
  identity: { type: Object, default: () => ({}) }
})

const $q = useQuasar()
const loading = ref(true)
const subTab = ref('offers')

const masterProducts = ref([])
const offers = ref([])
const assignments = ref([])
const managedTenants = ref([])

const showPricingDialog = ref(false)
const selectedOffer = ref(null)
const pricingForm = ref({ adjustmentNaira: 0, reason: '' })
const savingPricing = ref(false)

const showAssignDialog = ref(false)
const assignForm = ref({ tenantId: '', productId: '' })
const assigningProduct = ref(false)

function authHeaders() {
  const token = localStorage.getItem('invify_agent_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const calculatedFinalPriceNaira = computed(() => {
  if (!selectedOffer.value) return 0
  const baseNaira = selectedOffer.value.basePriceKobo / 100
  return baseNaira + (Number(pricingForm.value.adjustmentNaira) || 0)
})

const tenantOptions = computed(() =>
  managedTenants.value.map(t => ({ label: `${t.name} (${t.code || t.id.slice(0, 8)})`, value: t.id }))
)

const productOfferOptions = computed(() =>
  offers.value.map(o => ({
    label: `${o.productName} — ₦${(o.tenantPriceKobo / 100).toLocaleString()}/${o.billingModel.toLowerCase()}`,
    value: o.productId
  }))
)

const chosenOffer = computed(() =>
  offers.value.find(o => o.productId === assignForm.value.productId)
)

async function loadCatalogData() {
  loading.value = true
  try {
    const [prodRes, offerRes, asgnRes, tenantRes] = await Promise.all([
      axios.get('/api/agent/catalog/products', { headers: authHeaders() }),
      axios.get('/api/agent/catalog/offers', { headers: authHeaders() }),
      axios.get('/api/agent/catalog/assignments', { headers: authHeaders() }),
      axios.get('/api/agent/dashboard', { headers: authHeaders() })
    ])
    masterProducts.value = prodRes.data?.data || []
    offers.value = offerRes.data?.data || []
    assignments.value = asgnRes.data?.data || []
    managedTenants.value = (tenantRes.data?.recentMerchants || []).map(m => ({
      id: m.id,
      name: m.business_name || 'School Partner',
      code: m.agent_code
    }))
  } catch (err) {
    console.error('[HmoProductCatalogueView] load error:', err)
  } finally {
    loading.value = false
  }
}

function openPricingDialog(offer) {
  selectedOffer.value = offer
  pricingForm.value = {
    adjustmentNaira: (offer.hmoAdjustmentKobo || 0) / 100,
    reason: ''
  }
  showPricingDialog.value = true
}

function openPricingDialogFromMaster(prod) {
  const existingOffer = offers.value.find(o => o.productId === prod.id)
  if (existingOffer) {
    openPricingDialog(existingOffer)
  } else {
    selectedOffer.value = {
      productId: prod.id,
      productName: prod.name,
      productCode: prod.productCode,
      basePriceKobo: prod.basePriceKobo,
      hmoAdjustmentKobo: 0,
      tenantPriceKobo: prod.basePriceKobo,
      billingModel: prod.billingModel,
      auditTrail: []
    }
    pricingForm.value = { adjustmentNaira: 0, reason: 'Initial HMO offer creation' }
    showPricingDialog.value = true
  }
}

function quickAssign(offer) {
  assignForm.value.productId = offer.productId
  showAssignDialog.value = true
}

async function saveOfferPricing() {
  savingPricing.value = true
  try {
    const adjustmentKobo = Math.round((Number(pricingForm.value.adjustmentNaira) || 0) * 100)
    await axios.post('/api/agent/catalog/offers', {
      productId: selectedOffer.value.productId,
      hmoAdjustmentKobo: adjustmentKobo,
      reason: pricingForm.value.reason
    }, { headers: authHeaders() })

    $q.notify({ type: 'positive', message: 'HMO offer pricing updated successfully' })
    showPricingDialog.value = false
    await loadCatalogData()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to update pricing' })
  } finally {
    savingPricing.value = false
  }
}

async function submitAssignment() {
  assigningProduct.value = true
  try {
    await axios.post('/api/agent/catalog/assignments', {
      tenantId: assignForm.value.tenantId,
      productId: assignForm.value.productId
    }, { headers: authHeaders() })

    $q.notify({ type: 'positive', message: 'Product successfully provisioned to school tenant' })
    showAssignDialog.value = false
    assignForm.value = { tenantId: '', productId: '' }
    subTab.value = 'assignments'
    await loadCatalogData()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to assign product' })
  } finally {
    assigningProduct.value = false
  }
}

async function revokeAssignment(id) {
  try {
    await axios.delete(`/api/agent/catalog/assignments/${id}`, { headers: authHeaders() })
    $q.notify({ type: 'positive', message: 'Product assignment revoked' })
    await loadCatalogData()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to revoke' })
  }
}

onMounted(() => {
  loadCatalogData()
})
</script>
