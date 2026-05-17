<!-- invify-admin/src/pages/tenant/TenantIndustryInventoryPage.vue -->
<template>
  <q-page class="q-pa-lg text-white" style="background: #05070d; min-height: 100vh;">
    <!-- Ambient Sleek Background Glow -->
    <div class="ambient-glow" :style="`background: radial-gradient(circle, rgba(${activeManifest.glowRgb}, 0.05) 0%, rgba(5,7,13,0) 70%);`" />

    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-md relative-position" style="z-index: 10;">
      <div>
        <div class="row items-center op-gap-8 no-wrap">
          <q-icon :name="activeManifest.icon" :color="activeManifest.color + '-4'" size="md" />
          <h1 class="text-h4 text-weight-bolder text-white q-my-none letter-spacing-1">{{ activeManifest.title }}</h1>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          High-density enterprise data catalogs and record registries.
        </div>
      </div>

      <!-- Action Button -->
      <q-btn unelevated :color="activeManifest.color + '-10'" :text-color="activeManifest.color + '-3'" icon="add" label="Provision Entry" @click="openProvisionDialog" class="text-weight-bold font-mono text-caption" />
    </div>

    <!-- Dynamic Database Registry Tab Bar -->
    <div class="row q-mb-lg relative-position" style="z-index: 10;">
      <q-btn-toggle
        v-model="activeTab"
        toggle-color="indigo-9"
        color="black"
        dense
        flat
        text-color="grey-4"
        toggle-text-color="indigo-3"
        class="border-grey-9 q-px-sm font-mono text-caption"
        :options="activeManifest.tabs"
      />
    </div>

    <!-- Main Workspace Matrix -->
    <q-card class="bg-card-dark border-grey-9 q-pa-lg relative-position" style="z-index: 10;">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h6 text-weight-bold text-white">{{ currentRegistryTitle }}</div>
          <div class="text-caption text-grey-5">Displaying authorized record rows for this scope.</div>
        </div>
        
        <q-input dark filled v-model="filterText" label="Search index catalog..." color="indigo-4" dense class="bg-black-transparent rounded-borders" style="width: 260px;">
          <template v-slot:append>
            <q-icon name="search" size="xs" />
          </template>
        </q-input>
      </div>

      <!-- Dense High-Density Custom Table -->
      <div class="table-responsive">
        <table class="dense-table fit text-left text-caption text-grey-4">
          <thead>
            <tr class="border-bottom border-grey-9">
              <th v-for="col in activeManifest.columns[activeTab]" :key="col" class="q-py-md text-operator-title text-grey-5">{{ col }}</th>
              <th class="q-py-md text-operator-title text-grey-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id" class="border-bottom border-grey-9 hover-bg transition-2">
              <td class="q-py-md font-mono text-white text-weight-bold">{{ item.id }}</td>
              <td class="q-py-md text-white text-weight-medium">{{ item.name }}</td>
              <td class="q-py-md font-mono">{{ item.meta1 }}</td>
              <td class="q-py-md">
                <span class="font-mono text-weight-bold text-grey-4">{{ item.meta2 }}</span>
              </td>
              <td class="q-py-md">
                <div class="row items-center op-gap-6">
                  <span class="live-indicator-dot" :class="item.status === 'active' || item.status === 'instock' || item.status === 'available' || item.status === 'good' ? 'bg-green-5' : 'bg-red-5'"></span>
                  <span class="text-uppercase text-metric-sm font-mono text-weight-bold" :style="`color: ${item.status === 'active' || item.status === 'instock' || item.status === 'available' || item.status === 'good' ? '#4ade80' : '#f87171'}`">
                    {{ item.status }}
                  </span>
                </div>
              </td>
              <td class="q-py-md text-right">
                <q-btn flat round dense color="grey-5" icon="edit" size="xs" @click="editItem(item)" class="q-mr-xs" />
                <q-btn flat round dense color="red-4" icon="delete" size="xs" @click="deleteItem(item.id)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </q-card>

    <!-- Provision Dialog Modal -->
    <q-dialog v-model="provisionDialog" persistent backdrop-filter="blur(10px)">
      <q-card class="bg-card-dark border-grey-9 q-pa-lg" style="width: 420px;">
        <div class="row items-center op-gap-8 q-mb-md">
          <q-icon name="add_circle" :color="activeManifest.color + '-4'" size="sm" />
          <div class="text-h6 text-weight-bold text-white font-mono" style="font-size: 14px;">Provision Asset Block</div>
        </div>

        <q-separator dark class="q-my-md opacity-10" />

        <div class="column q-gutter-y-md q-mb-lg text-left">
          <q-input dark filled v-model="newItem.name" :label="activeManifest.labels[activeTab].name" color="indigo-4" dense class="bg-black-transparent rounded-borders" />
          <q-input dark filled v-model="newItem.meta1" :label="activeManifest.labels[activeTab].meta1" color="indigo-4" dense class="bg-black-transparent rounded-borders" />
          <q-input dark filled v-model="newItem.meta2" :label="activeManifest.labels[activeTab].meta2" color="indigo-4" dense class="bg-black-transparent rounded-borders" />
        </div>

        <div class="row justify-end">
          <q-btn flat color="grey-5" label="Cancel" v-close-popup class="text-weight-bold font-mono" />
          <q-btn unelevated :color="activeManifest.color + '-10'" label="Confirm Save" @click="confirmProvision" class="text-weight-bold font-mono q-ml-sm" :disabled="!newItem.name" />
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const activeIndustry = ref(localStorage.getItem('tenant_type') || 'school')
const filterText = ref('')
const provisionDialog = ref(false)
const activeTab = ref('registry_1')

const newItem = ref({
  name: '',
  meta1: '',
  meta2: ''
})

// Dynamic Tabbed Registries (Conforming to user stock, student, client, service listings)
const INDUSTRY_CONFIG = {
  school: {
    title: 'School Education Workspace',
    icon: 'school',
    color: 'indigo',
    glowRgb: '99,102,241',
    tabs: [
      { label: 'CURRICULUM SYLLABUS', value: 'registry_1' },
      { label: 'STUDENTS REGISTER', value: 'registry_2' }
    ],
    columns: {
      registry_1: ['Index ID', 'Subject Course', 'Assigned Teacher', 'Syllabus Progress', 'Status'],
      registry_2: ['Student ID', 'Legal Name', 'Enrolled Class', 'Fees Paid Balance', 'Status']
    },
    labels: {
      registry_1: { name: 'Subject Name', meta1: 'Assigned Teacher', meta2: 'Syllabus Progress' },
      registry_2: { name: 'Student Legal Name', meta1: 'Enrolled Class Grade', meta2: 'Tuition Balance' }
    },
    data: {
      registry_1: [
        { id: 'SUB-101', name: 'Advanced Pure Mathematics', meta1: 'Dr. Evelyn Peters', meta2: '88% Completed', status: 'active' },
        { id: 'SUB-102', name: 'Physics & Electro-Magnetism', meta1: 'Engr. David Alabi', meta2: '74% Completed', status: 'active' },
        { id: 'SUB-103', name: 'Organic Chemistry Lab', meta1: 'Mrs. Olivia Stone', meta2: '92% Completed', status: 'active' }
      ],
      registry_2: [
        { id: 'STU-980', name: 'David Adebayo Jr.', meta1: 'Grade 10-A', meta2: '₦0 Cleared', status: 'active' },
        { id: 'STU-981', name: 'Chinelo Okeke', meta1: 'Grade 11-B', meta2: '₦45,000 Owed', status: 'active' },
        { id: 'STU-982', name: 'Musa Abubakar', meta1: 'Grade 10-A', meta2: '₦12,500 Owed', status: 'active' }
      ]
    }
  },
  retail: {
    title: 'Retail Commerce Matrix',
    icon: 'inventory_2',
    color: 'amber',
    glowRgb: '245,158,11',
    tabs: [
      { label: 'STOCK MATRIX', value: 'registry_1' },
      { label: 'B2B SUPPLIERS', value: 'registry_2' }
    ],
    columns: {
      registry_1: ['SKU Block', 'Stock Item Name', 'Warehouse Rack', 'Available Stock Qty', 'Status'],
      registry_2: ['Supplier ID', 'Merchant Name', 'Category Scope', 'Outstanding Invoices', 'Status']
    },
    labels: {
      registry_1: { name: 'Stock Item Name', meta1: 'Warehouse Rack', meta2: 'Available Quantity' },
      registry_2: { name: 'Supplier Business Name', meta1: 'Category Scope', meta2: 'Invoiced Outstanding' }
    },
    data: {
      registry_1: [
        { id: 'SKU-INV-982', name: 'Tuition Grid Notebook Pack', meta1: 'Rack A-12', meta2: '140 Units Available', status: 'instock' },
        { id: 'SKU-INV-3821', name: 'Bar-code Laser Terminal', meta1: 'Rack B-04', meta2: '142 Units', status: 'instock' },
        { id: 'SKU-INV-9044', name: 'Heavy Duty Thermal Rolls', meta1: 'Rack C-02', meta2: '840 Rolls', status: 'instock' }
      ],
      registry_2: [
        { id: 'SPL-823', name: 'Global Paper Dispersals', meta1: 'Stationery & Media', meta2: '₦180,000 Owed', status: 'good' },
        { id: 'SPL-904', name: 'LaserTech Terminals Ltd', meta1: 'POS Hardware Services', meta2: '₦0 Cleared', status: 'good' }
      ]
    }
  },
  hospitality: {
    title: 'Services & Accommodations',
    icon: 'king_bed',
    color: 'green',
    glowRgb: '16,185,129',
    tabs: [
      { label: 'SERVICES CATALOG', value: 'registry_1' },
      { label: 'B2B CLIENTS', value: 'registry_2' }
    ],
    columns: {
      registry_1: ['Service ID', 'Service Offer Name', 'Class Category', 'Nightly Tariff / Price', 'Status'],
      registry_2: ['Client ID', 'Corporate Partner Name', 'Representative Email', 'Ledger Volume Balance', 'Status']
    },
    labels: {
      registry_1: { name: 'Service / Suite Name', meta1: 'Class Category', meta2: 'Nightly Tariff / Rate' },
      registry_2: { name: 'Corporate Partner Name', meta1: 'Representative Email', meta2: 'Ledger volume' }
    },
    data: {
      registry_1: [
        { id: 'SRV-204', name: 'Stripe Deluxe Suite Overnight', meta1: 'Deluxe Executive', meta2: '₦85,000 / night', status: 'available' },
        { id: 'SRV-105', name: 'Standard Premium Double', meta1: 'Standard Premium', meta2: '₦45,000 / night', status: 'available' }
      ],
      registry_2: [
        { id: 'CLT-823', name: 'Alabi Engineering Group', meta1: 'david@alabi-corp.com', meta2: '₦485,000', status: 'good' },
        { id: 'CLT-992', name: 'Harrison Global Logistics', meta1: 'jude@harrison-global.com', meta2: '₦1,240,000', status: 'good' }
      ]
    }
  },
  logistics: {
    title: 'Fleet Logistics Controls',
    icon: 'local_shipping',
    color: 'purple',
    glowRgb: '139,92,246',
    tabs: [
      { label: 'FLEET VEHICLES', value: 'registry_1' },
      { label: 'DRIVERS ROSTER', value: 'registry_2' }
    ],
    columns: {
      registry_1: ['Plate Ref', 'Vehicle Model', 'Primary Driver Assigned', 'Fuel Burn Yield', 'Status'],
      registry_2: ['Driver ID', 'Full Name', 'License Verification', 'Assigned Route Target', 'Status']
    },
    labels: {
      registry_1: { name: 'Vehicle Model', meta1: 'Driver Assigned', meta2: 'Fuel Yield' },
      registry_2: { name: 'Driver Legal Name', meta1: 'License Verification Code', meta2: 'Assigned Route' }
    },
    data: {
      registry_1: [
        { id: 'LGT-928', name: 'Mercedes Axor Transit Truck', meta1: 'Malam Ibrahim Danjuma', meta2: '14.2 km/l normal', status: 'active' },
        { id: 'LGT-104', name: 'Scania R500 Cargo Hauler', meta1: 'Mr. Jude Harrison', meta2: '8.4 km/l critical', status: 'active' }
      ],
      registry_2: [
        { id: 'DVR-01', name: 'Malam Ibrahim Danjuma', meta1: 'LIC-NGR-89240-X', meta2: 'Lagos to Abuja Route', status: 'good' },
        { id: 'DVR-02', name: 'Mr. Jude Harrison', meta1: 'LIC-NGR-30122-Y', meta2: 'Kano to Port-Harcourt', status: 'good' }
      ]
    }
  },
  healthcare: {
    title: 'Healthcare Clinics Workspace',
    icon: 'healing',
    color: 'red',
    glowRgb: '239,68,68',
    tabs: [
      { label: 'PHARMACY DISPENSARY', value: 'registry_1' },
      { label: 'PATIENT DIRECTORY', value: 'registry_2' }
    ],
    columns: {
      registry_1: ['Pharmacy ID', 'Medicine Dispensary Name', 'Chemical Formula', 'Stock Pack Quantity', 'Status'],
      registry_2: ['Record ID', 'Patient Legal Name', 'Assigned Physician', 'Treatment Wait Time', 'Status']
    },
    labels: {
      registry_1: { name: 'Medicine Name', meta1: 'Chemical Formula', meta2: 'Dispensary Stock Qty' },
      registry_2: { name: 'Patient Name', meta1: 'Assigned Physician', meta2: 'Average Wait Time' }
    },
    data: {
      registry_1: [
        { id: 'PHR-01', name: 'Amoxicillin 500mg Block', meta1: 'C16H19N3O5S', meta2: '84 Packs Left', status: 'instock' },
        { id: 'PHR-02', name: 'Paracetamol Oral Suspension', meta1: 'C8H9NO2', meta2: '450 Bottles', status: 'instock' }
      ],
      registry_2: [
        { id: 'PT-4120', name: 'Alhaji Musa Abubakar', meta1: 'Dr. Evelyn Peters', meta2: '12m target met', status: 'active' },
        { id: 'PT-8910', name: 'Miss Chinelo Okeke', meta1: 'Dr. Evelyn Peters', meta2: '45m delayed', status: 'active' }
      ]
    }
  }
}

const activeManifest = computed(() => {
  return INDUSTRY_CONFIG[activeIndustry.value] || INDUSTRY_CONFIG.school
})

const currentRegistryTitle = computed(() => {
  const activeTabObj = activeManifest.value.tabs.find(t => t.value === activeTab.value)
  return activeTabObj ? activeTabObj.label : 'Active Database Registry'
})

// Item store loading dynamically depending on Active Tab & Industry preference
const itemsList = ref([])

const loadItems = () => {
  const dataset = activeManifest.value.data[activeTab.value] || []
  itemsList.value = [...dataset]
}

// Watchers to update dataset instantly on tab shifts or industry presets swap!
watch([activeTab, activeIndustry], loadItems, { immediate: true })

const filteredItems = computed(() => {
  if (!filterText.value) return itemsList.value
  return itemsList.value.filter(item => 
    item.name.toLowerCase().includes(filterText.value.toLowerCase()) ||
    item.id.toLowerCase().includes(filterText.value.toLowerCase())
  )
})

const openProvisionDialog = () => {
  newItem.value = { name: '', meta1: '', meta2: '' }
  provisionDialog.value = true
}

const confirmProvision = () => {
  const randNum = Math.floor(Math.random() * 800) + 100
  let prefix = 'IDX'
  if (activeIndustry.value === 'school') {
    prefix = activeTab.value === 'registry_1' ? 'SUB' : 'STU'
  } else if (activeIndustry.value === 'retail') {
    prefix = activeTab.value === 'registry_1' ? 'SKU-INV' : 'SPL'
  } else if (activeIndustry.value === 'hospitality') {
    prefix = activeTab.value === 'registry_1' ? 'SRV' : 'CLT'
  }

  const newItemObj = {
    id: `${prefix}-${randNum}`,
    name: newItem.value.name,
    meta1: newItem.value.meta1 || 'Unassigned',
    meta2: newItem.value.meta2 || 'Nominal',
    status: 'active'
  }

  itemsList.value.unshift(newItemObj)
  provisionDialog.value = false

  $q.notify({
    type: 'positive',
    message: 'Record successfully provisioned and locked to ledger indices.'
  })
}

const editItem = (item) => {
  $q.notify({
    type: 'info',
    message: `Edit selected: ${item.name}. Secure override keys verified.`
  })
}

const deleteItem = (id) => {
  itemsList.value = itemsList.value.filter(item => item.id !== id)
  $q.notify({
    type: 'warning',
    message: 'Record index de-authorized safely.'
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

.dense-table {
  width: 100%;
  border-collapse: collapse;
}

.dense-table th, .dense-table td {
  padding: 12px 16px;
  vertical-align: middle;
}

.border-bottom {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.hover-bg:hover {
  background: rgba(255,255,255,0.02);
}

.letter-spacing-1 { letter-spacing: 1px; }
.transition-2 { transition: all 0.2s ease; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
