<!-- invify-admin/src/pages/tenant/TenantIndustryBillingPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Ambient Sleek Background Glow -->
    <div class="ambient-glow" :style="`background: radial-gradient(circle, rgba(${activeManifest.glowRgb}, 0.05) 0%, rgba(5,7,13,0) 70%);`" />

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-xl relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon :name="activeManifest.icon" :color="activeManifest.color + '-4'" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">{{ activeManifest.title }}</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Draft dynamic billing invoices, log dispatch timelines, and schedule operations.
        </div>
      </div>

      <!-- Action Button -->
      <div class="row items-center op-gap-8 bg-black-transparent border-grey-9 q-px-md q-py-sm rounded-borders font-mono text-metric-sm">
        <span class="live-indicator-dot bg-green-5 animate-pulse"></span>
        <span class="text-grey-4 text-weight-bold">CONVERGENCE NODE READY</span>
      </div>
    </div>

    <!-- Main Grid Workspace -->
    <div class="row q-col-gutter-lg relative-position" style="z-index: 10;">
      
      <!-- Left Column: Scheduler or Invoice Creator depending on Mode -->
      <div class="col-12 col-md-7">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit column justify-between">
          <div>
            <div class="text-h6 text-weight-bold text-white q-mb-md">Workspace Workspace Panel</div>
            
            <div class="column q-gutter-y-md">
              <q-input dark filled v-model="invoice.recipient" :label="activeManifest.labels.recipient" color="indigo-4" dense class="bg-black-transparent rounded-borders" />
              <q-input dark filled v-model="invoice.metaValue" :label="activeManifest.labels.metaValue" color="indigo-4" dense class="bg-black-transparent rounded-borders" />
              <q-input dark filled v-model="invoice.notes" label="Notes & Operational Constraints" type="textarea" color="indigo-4" dense class="bg-black-transparent rounded-borders" rows="3" />
            </div>

            <q-separator dark class="q-my-lg opacity-10" />

            <!-- Catalog Selector in Workspace -->
            <div>
              <div class="text-operator-title text-grey-5 q-mb-sm" style="font-size: 9.5px; letter-spacing: 1px;">CHOOSE DISPATCH ITEM</div>
              <q-btn-toggle
                v-model="invoice.selectedItem"
                toggle-color="indigo-9"
                color="black"
                dense
                flat
                class="border-grey-9 q-px-sm font-mono text-caption full-width"
                :options="activeManifest.items"
              />
            </div>
          </div>

          <div class="q-pt-md">
            <q-btn 
              unelevated 
              :color="activeManifest.color + '-10'" 
              :text-color="activeManifest.color + '-3'" 
              icon="assignment" 
              label="SAVE RECORD DIRECTLY TO LEDGER" 
              class="full-width text-weight-bold font-mono text-caption letter-spacing-1" 
              @click="submitInvoice"
              :disabled="!invoice.recipient || !invoice.metaValue"
            />
          </div>
        </q-card>
      </div>

      <!-- Right Column: Historic Logs -->
      <div class="col-12 col-md-5">
        <q-card class="bg-card-dark border-grey-9 q-pa-lg fit">
          <div class="text-h6 text-weight-bold text-white q-mb-xs">Audit History Records</div>
          <div class="text-caption text-grey-5 q-mb-md">Realtime transaction matching indices.</div>

          <q-list separator class="border-grey-9 rounded-borders">
            <q-item v-for="log in logsList" :key="log.id" class="q-py-md">
              <q-item-section avatar>
                <q-icon :name="activeManifest.icon" :color="activeManifest.color + '-4'" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-white">{{ log.recipient }}</q-item-label>
                <q-item-label caption class="text-grey-5 font-mono" style="font-size: 10px;">{{ log.metaValue }}</q-item-label>
              </q-item-section>
              <q-item-section side class="text-right">
                <span class="text-metric-mono font-mono text-white text-weight-bold" style="font-size: 11.5px;">{{ log.itemFormatted }}</span>
                <span class="text-metric-sm text-grey-6 q-mt-xs font-mono">CONVERGED</span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

    </div>

  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const activeIndustry = ref(localStorage.getItem('tenant_type') || 'school')

const invoice = ref({
  recipient: '',
  metaValue: '',
  notes: '',
  selectedItem: 'standard'
})

// Dynamic industry-specific layouts
const INDUSTRY_LAYOUT = {
  school: {
    title: 'Daily Lesson Notes',
    icon: 'menu_book',
    color: 'indigo',
    glowRgb: '99,102,241',
    labels: { recipient: 'Syllabus Topic Title', metaValue: 'Target Classroom / Grade' },
    items: [
      { label: 'Calculus Principles', value: 'standard' },
      { label: 'Organic Equations', value: 'advanced' }
    ],
    logs: [
      { id: 1, recipient: 'Electro-Magnetic Induction', metaValue: 'Grade 11 Physics', itemFormatted: 'Completed' },
      { id: 2, recipient: 'Alkanes & Alkynes Synthesis', metaValue: 'Grade 10 Chemistry', itemFormatted: 'Draft' }
    ]
  },
  retail: {
    title: 'Billing Invoices',
    icon: 'receipt',
    color: 'amber',
    glowRgb: '245,158,11',
    labels: { recipient: 'B2B Client Name', metaValue: 'Tax Identification Number' },
    items: [
      { label: 'Invify POS Terminals Pack', value: 'standard' },
      { label: 'Bulk Thermal Rolls Delivery', value: 'advanced' }
    ],
    logs: [
      { id: 1, recipient: 'Alhaji Musa Abubakar B2B', metaValue: 'TIN-INV-38290-QS', itemFormatted: '₦150,000' },
      { id: 2, recipient: 'Chinelo Enterprise Ltd', metaValue: 'TIN-INV-81204-QS', itemFormatted: '₦45,000' }
    ]
  },
  hospitality: {
    title: 'Reservations & Bookings',
    icon: 'calendar_today',
    color: 'green',
    glowRgb: '16,185,129',
    labels: { recipient: 'Guest Principal Name', metaValue: 'Corporate Email Scope' },
    items: [
      { label: 'Suite Booking (4 Nights)', value: 'standard' },
      { label: 'F&B Corporate Buffet Tab', value: 'advanced' }
    ],
    logs: [
      { id: 1, recipient: 'Dr. Evelyn Peters (VIP)', metaValue: 'evelyn@hospitality.com', itemFormatted: 'RM-204 CheckedIn' },
      { id: 2, recipient: 'Engr. David Alabi', metaValue: 'david@alabi-corp.com', itemFormatted: 'RM-105 Reserved' }
    ]
  },
  logistics: {
    title: 'Driver Dispatch Grid',
    icon: 'explore',
    color: 'purple',
    glowRgb: '139,92,246',
    labels: { recipient: 'Client Destination Node', metaValue: 'Bill of Lading Identifier' },
    items: [
      { label: 'Mercedes Axor Heavy Transit', value: 'standard' },
      { label: 'Scania Cargo Hauler Dispatch', value: 'advanced' }
    ],
    logs: [
      { id: 1, recipient: 'Lagos Port Terminal Vault', metaValue: 'BOL-LGT-98241', itemFormatted: 'Active' },
      { id: 2, recipient: 'Kano Warehouse Dispatch #3', metaValue: 'BOL-LGT-30122', itemFormatted: 'Dispatched' }
    ]
  },
  healthcare: {
    title: 'Schedules & Appointments',
    icon: 'event',
    color: 'red',
    glowRgb: '239,68,68',
    labels: { recipient: 'Patient Roster Name', metaValue: 'Referral Doctor Identifier' },
    items: [
      { label: 'Pediatric Specialist Block', value: 'standard' },
      { label: 'General Diagnostics Panel', value: 'advanced' }
    ],
    logs: [
      { id: 1, recipient: 'Alhaji Musa Abubakar', metaValue: 'Dr. Evelyn Peters Scoped', itemFormatted: 'Wait 12m' },
      { id: 2, recipient: 'Miss Chinelo Okeke', metaValue: 'Dr. Evelyn Peters Scoped', itemFormatted: 'Consultation' }
    ]
  }
}

const activeManifest = computed(() => {
  return INDUSTRY_LAYOUT[activeIndustry.value] || INDUSTRY_LAYOUT.school
})

const logsList = ref([...activeManifest.value.logs])

const submitInvoice = () => {
  const newLogObj = {
    id: Date.now(),
    recipient: invoice.value.recipient,
    metaValue: invoice.value.metaValue,
    itemFormatted: activeIndustry.value === 'school' ? 'Draft' : activeIndustry.value === 'retail' ? '₦85,000' : 'Confirmed'
  }

  logsList.value.unshift(newLogObj)
  
  invoice.value.recipient = ''
  invoice.value.metaValue = ''
  invoice.value.notes = ''

  $q.notify({
    type: 'positive',
    message: 'Operational record converged dynamically.'
  })
}
</script>

<style scoped>
.ambient-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 400px;
  pointer-events: none;
  z-index: 1;
  transition: background 0.8s ease;
}

.border-grey-9 { border: 1px solid rgba(255,255,255,0.06); }
.bg-card-dark { background: #0b0f19; }

.border-top {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.letter-spacing-1 { letter-spacing: 1px; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
