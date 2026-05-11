<template>
  <q-page class="q-pa-md bg-dark text-white">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <div class="text-h4 text-weight-bold text-indigo-3">Device Activation Hub</div>
        <div class="text-caption text-grey-5">Manage hardware terminals and generate secure activation codes.</div>
      </div>
      <div class="col-auto">
        <q-btn 
          color="indigo-6" 
          icon="add_circle" 
          label="New Activation Code" 
          unelevated 
          class="q-px-md"
          @click="showCodeDialog = true"
        />
      </div>
    </div>

    <!-- STATS CARDS -->
    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-blue-grey-10 shadow-2 border-indigo">
          <q-card-section class="q-pa-md">
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-caption text-grey-5">Active Devices</div>
                <div class="text-h5 text-weight-bold">{{ activeCount }}</div>
              </div>
              <div class="col-auto">
                <q-icon name="devices" color="indigo-4" size="2em" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-blue-grey-10 shadow-2 border-indigo">
          <q-card-section class="q-pa-md">
            <div class="row items-center no-wrap">
              <div class="col">
                <div class="text-caption text-grey-5">Pending Codes</div>
                <div class="text-h5 text-weight-bold">{{ pendingCount }}</div>
              </div>
              <div class="col-auto">
                <q-icon name="vpn_key" color="amber-4" size="2em" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- TABS -->
    <q-tabs
      v-model="tab"
      dense
      class="text-grey-5 q-mb-md"
      active-color="indigo-3"
      indicator-color="indigo-3"
      align="left"
      narrow-indicator
    >
      <q-tab name="active" label="Activated Devices" />
      <q-tab name="codes" label="Activation History" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated class="bg-transparent">
      <q-tab-panel name="active" class="q-pa-none">
        <q-table
          :rows="devices"
          :columns="deviceColumns"
          row-key="id"
          flat
          bordered
          class="bg-blue-grey-10 text-white border-indigo-10"
          card-class="bg-blue-grey-10"
          table-header-class="bg-indigo-10 text-white text-weight-bold"
          dark
          :loading="loading"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.value === 'active' ? 'green-6' : 'red-6'">
                {{ props.value.toUpperCase() }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-plan="props">
            <q-td :props="props">
              <div class="text-weight-bold text-indigo-3">{{ props.value.toUpperCase() }}</div>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>

      <q-tab-panel name="codes" class="q-pa-none">
        <q-table
          :rows="activations"
          :columns="activationColumns"
          row-key="id"
          flat
          bordered
          class="bg-blue-grey-10 text-white border-indigo-10"
          card-class="bg-blue-grey-10"
          table-header-class="bg-indigo-10 text-white text-weight-bold"
          dark
          :loading="loading"
        >
          <template v-slot:body-cell-code="props">
            <q-td :props="props">
              <div class="text-h6 text-weight-bolder text-amber-5">{{ props.value }}</div>
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.row.is_used ? 'green-6' : 'blue-6'">
                {{ props.row.is_used ? 'ACTIVATED' : 'PENDING' }}
              </q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense icon="card_membership" color="amber-5" @click="reviewCertificate(props.row)">
                <q-tooltip>Review Certificate</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>

    <!-- NEW CODE DIALOG -->
    <q-dialog v-model="showCodeDialog" persistent>
      <q-card style="min-width: 400px" class="bg-blue-grey-10 text-white border-indigo">
        <q-card-section>
          <div class="text-h6">Create Activation Code</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-select
            v-model="newCode.tenantId"
            :options="filteredTenantOptions"
            use-input
            input-debounce="300"
            @filter="filterTenants"
            label="Target School/Business"
            dark filled 
            emit-value map-options
            class="q-mb-md"
            @update:model-value="onTenantChange"
          >
            <template v-slot:after>
              <q-btn round flat icon="refresh" color="indigo-3" @click="loadData" :loading="loading">
                <q-tooltip>Reload Businesses</q-tooltip>
              </q-btn>
            </template>
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  No businesses found. Try refreshing.
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-select
            v-model="newCode.serviceMode"
            :options="['School', 'Retail', 'Service']"
            label="Service Mode"
            dark filled 
            class="q-mb-md"
          />

          <div class="text-caption text-indigo-3 q-mb-sm" v-if="tenants.length > 0">
            {{ tenants.length }} businesses found in database.
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-select
                v-model="newCode.planIndex"
                :options="planOptions"
                label="Plan Type"
                dark filled 
                emit-value map-options
                class="q-mb-md"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="newCode.deviceSuffix"
                label="Device Suffix (Hex)"
                placeholder="e.g. 7A2"
                dark filled
                class="q-mb-md"
              />
            </div>
          </div>
          <q-select
            v-model="newCode.duration"
            :options="durationOptions"
            label="Duration"
            dark filled 
            emit-value map-options
            class="q-mb-md"
          />
        </q-card-section>

        <q-card-actions align="right" class="text-indigo-3">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="indigo-6" label="Generate Code" @click="generateCode" :loading="generating" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- LICENSE VALIDATOR SECTION -->
    <div class="q-mt-xl">
      <div class="text-h6 text-indigo-3 q-mb-md">License Validator</div>
      <q-card class="bg-blue-grey-10 border-indigo">
        <q-card-section class="q-pa-lg">
          <div class="row q-col-gutter-md items-center">
            <div class="col">
              <q-input
                v-model="validationCode"
                label="Paste activation code here..."
                dark filled
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              />
            </div>
            <div class="col-auto">
              <q-btn 
                color="indigo-6" 
                round 
                icon="search" 
                size="lg"
                @click="validateCode"
                :loading="validating"
              />
            </div>
          </div>

          <div v-if="validationResult" class="q-mt-lg q-pa-md bg-blue-grey-11 rounded-borders border-grey-9">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <div class="text-caption text-grey-5">Business Name Hash</div>
                <div class="text-subtitle1 text-weight-bold">{{ validationResult.bizHash }}</div>
              </div>
              <div class="col-12 col-md-4">
                <div class="text-caption text-grey-5">Plan Type</div>
                <div class="text-subtitle1 text-weight-bold text-indigo-3">{{ validationResult.planType }}</div>
              </div>
              <div class="col-12 col-md-4">
                <div class="text-caption text-grey-5">Expiry Date</div>
                <div class="text-subtitle1 text-weight-bold">{{ validationResult.expiryDate }}</div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- LUXURY LICENSE CERTIFICATE DIALOG -->
    <q-dialog v-model="showSuccessDialog" persistent transition-show="scale" transition-hide="scale">
      <q-card class="certificate-card relative-position overflow-hidden shadow-24" style="min-width: 650px; max-height: 90vh; display: flex; flex-direction: column;">
        
        <!-- Watermark Background -->
        <div class="absolute-center full-width text-center no-pointer-events" style="opacity: 0.03; font-size: 10rem; transform: translate(-50%, -50%) rotate(-30deg); font-weight: 900; color: white;">INVIFY</div>

        <!-- Scrollable Content -->
        <q-card-section class="q-pa-xl text-center scroll" id="printable-certificate" style="flex: 1;">
          <!-- Premium Header with ONLY Official Logo -->
          <div class="column items-center q-mb-xl">
             <div class="q-mb-sm">
                <img :src="logo" style="height: 120px; width: auto; object-fit: contain;" />
             </div>
             <div class="text-overline text-amber-2 letter-spacing-10 q-mt-none opacity-8">LICENSED TERMINAL</div>
          </div>
          
          <div class="q-my-xl">
             <div class="text-caption text-amber-2 text-weight-medium uppercase letter-spacing-3 q-mb-sm">CERTIFIED FOR OPERATION</div>
             <div class="text-h2 text-weight-bold text-white q-my-md text-shadow-glow">{{ certificateData.businessName }}</div>
             <div class="row justify-center items-center q-gutter-sm no-wrap">
                <div class="text-subtitle1 text-grey-4">Licensed Mode:</div>
                <div class="text-subtitle1 text-amber-5 text-weight-bolder uppercase">{{ certificateData.mode }}</div>
             </div>
          </div>

          <!-- Info Grid -->
          <div class="row q-col-gutter-xl q-my-xl justify-center">
            <div class="col-4 border-right-grey">
              <div class="text-caption text-amber-2 text-weight-bold">PLAN LEVEL</div>
              <div class="text-h6 text-white text-weight-medium">{{ certificateData.plan }}</div>
            </div>
            <div class="col-4 border-right-grey">
              <div class="text-caption text-amber-2 text-weight-bold">VALIDITY</div>
              <div class="text-h6 text-white text-weight-medium">{{ certificateData.duration }}</div>
            </div>
            <div class="col-4">
              <div class="text-caption text-amber-2 text-weight-bold">EXPIRATION</div>
              <div class="text-h6 text-white text-weight-medium">{{ certificateData.expiry }}</div>
            </div>
          </div>

          <!-- Secure Code Area (Glassmorphism) -->
          <div class="code-container q-pa-lg q-mt-md">
             <div class="text-overline text-amber-3 letter-spacing-5 q-mb-md">SECURE ACTIVATION KEY</div>
             <div class="text-h2 text-weight-bolder text-amber-5 font-mono code-glow" style="font-size: 2.8rem;">{{ lastGeneratedCode }}</div>
          </div>

          <div class="text-caption text-grey-5 q-mt-lg italic opacity-6">
            Authorized by Invify Global Licensing Authority. This document is encrypted and non-transferable.
          </div>
          
          <div class="q-mt-xl text-caption text-weight-bold text-amber-2 letter-spacing-3 opacity-8">
            Powered by www.invify.iips.app
          </div>
        </q-card-section>

        <!-- Fixed Actions Bottom -->
        <q-card-actions align="between" class="q-pa-lg bg-black-transparent backdrop-blur" style="border-top: 1px solid rgba(255,255,255,0.05)">
          <q-btn flat color="grey-5" label="Dismiss" v-close-popup class="text-weight-bold" />
          <div class="row q-gutter-md">
            <q-btn unelevated color="indigo-10" icon="content_copy" label="Copy Key" @click="copyCode" class="q-px-lg text-weight-bold" />
            <q-btn unelevated color="amber-9" icon="print" label="Download PDF / Print" @click="printCertificate" class="q-px-lg text-weight-bold text-black" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { deviceApi, adminApi } from '../api'
import { date } from 'quasar'
import logo from '../assets/logo.png'

const tab = ref('active')
const loading = ref(false)
const generating = ref(false)
const showCodeDialog = ref(false)
const showSuccessDialog = ref(false)
const lastGeneratedCode = ref('')
const validationCode = ref('')
const validating = ref(false)
const validationResult = ref(null)

const certificateData = ref({
  businessName: '',
  mode: '',
  plan: '',
  duration: '',
  expiry: ''
})

const copyCode = () => {
  const el = document.createElement('textarea')
  el.value = lastGeneratedCode.value
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  $q.notify({ type: 'positive', message: 'Activation code copied to clipboard!' })
}

const printCertificate = () => {
  const printWindow = window.open('', '_blank')
  const content = document.getElementById('printable-certificate').innerHTML
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Invify License Certificate - ${certificateData.value.businessName}</title>
        <style>
          @page { margin: 0; size: A4; }
          body { 
            margin: 0; 
            padding: 0; 
            background: #0f172a; 
            color: white; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 210mm;
            height: 297mm;
            overflow: hidden;
          }
          .certificate-print-container {
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            position: relative;
            overflow: hidden;
          }
          .text-h2 { font-size: 2.5rem; font-weight: bold; margin: 15px 0; }
          .text-h3 { font-size: 2.2rem; font-weight: 900; color: #fbbf24; margin: 0; letter-spacing: 2px; }
          .text-subtitle1 { font-size: 1.2rem; }
          .text-amber-5 { color: #fbbf24; }
          .text-amber-2 { color: #fde68a; }
          .text-grey-4 { color: #bdbdbd; }
          .text-grey-5 { color: #9e9e9e; }
          .code-container { 
            background: #1e293b; 
            border: 1px solid rgba(251, 191, 36, 0.4); 
            padding: 30px; 
            margin-top: 20px; 
            border-radius: 16px; 
            width: 100%;
          }
          .font-mono { font-family: 'Courier New', Courier, monospace; font-size: 2.5rem; letter-spacing: 6px; color: #fbbf24; }
          .row { display: flex !important; flex-direction: row !important; width: 100%; justify-content: center; gap: 20px; margin: 20px 0; align-items: center; }
          .no-wrap { flex-wrap: nowrap; }
          .col-4 { flex: 1; border-right: 1px solid rgba(255,255,255,0.1); }
          .col-4:last-child { border-right: none; }
          img { height: 100px; margin-bottom: 15px; }
          .uppercase { text-transform: uppercase; }
          .letter-spacing-10 { letter-spacing: 10px; }
          .letter-spacing-3 { letter-spacing: 3px; }
          .opacity-6 { opacity: 0.6; }
          .opacity-8 { opacity: 0.8; }
          .italic { font-style: italic; }
          .q-mt-xl { margin-top: 40px; }
          .q-mt-md { margin-top: 20px; }
          .q-mt-lg { margin-top: 30px; }
          .q-mb-sm { margin-bottom: 8px; }
          .q-mb-md { margin-bottom: 16px; }
          .q-mb-none { margin-bottom: 0; }
        </style>
      </head>
      <body>
        <div class="certificate-print-container">
          ${content}
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

const devices = ref([])
const activations = ref([])
const tenants = ref([])
const filteredTenantOptions = ref([])

const newCode = ref({
  tenantId: null,
  serviceMode: 'School',
  duration: 30,
  planIndex: 0,
  deviceSuffix: '0'
})

const filterTenants = (val, update) => {
  if (val === '') {
    update(() => {
      filteredTenantOptions.value = tenants.value.map(t => ({ label: t.name, value: t.id }))
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredTenantOptions.value = tenants.value
      .filter(t => t.name.toLowerCase().indexOf(needle) > -1)
      .map(t => ({ label: t.name, value: t.id }))
  })
}

const durationOptions = [
  { label: '1 Month', value: 30 },
  { label: '2 Months', value: 60 },
  { label: '3 Months', value: 90 },
  { label: '6 Months', value: 180 },
  { label: '1 Year', value: 365 },
  { label: '2 Years', value: 730 },
  { label: 'Lifetime', value: 36500 }
]

const planOptions = [
  { label: 'BASIC', value: 0 },
  { label: 'STANDARD', value: 1 },
  { label: 'PREMIUM', value: 2 },
  { label: 'ENTERPRISE', value: 3 }
]

const deviceColumns = [
  { name: 'tenant', label: 'School/Business', field: row => row.tenants?.name, align: 'left', sortable: true },
  { name: 'device_id', label: 'Device Serial', field: 'device_id', align: 'left' },
  { name: 'plan', label: 'Plan', field: row => row.tenants?.plan, align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'last_seen', label: 'Last Seen', field: row => row.last_seen ? date.formatDate(row.last_seen, 'YYYY-MM-DD HH:mm') : 'Never', align: 'right' }
]

const activationColumns = [
  { name: 'code', label: 'Activation Code', field: 'activation_code', align: 'left' },
  { name: 'tenant', label: 'Target', field: row => row.tenants?.name, align: 'left' },
  { name: 'duration', label: 'Duration', field: row => `${row.duration_days} Days`, align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'created', label: 'Created At', field: row => date.formatDate(row.created_at, 'YYYY-MM-DD HH:mm'), align: 'right' },
  { name: 'actions', label: 'ACTIONS', align: 'center' }
]

const tenantOptions = computed(() => tenants.value.map(t => ({ label: t.name, value: t.id })))
const activeCount = computed(() => devices.value.filter(d => d.status === 'active').length)
const pendingCount = computed(() => activations.value.filter(a => !a.is_used).length)

const loadData = async () => {
  loading.value = true
  // Load data independently to avoid one failure blocking everything
  deviceApi.getDevices().then(res => { devices.value = res.data || [] }).catch(e => console.error('Devices load fail:', e))
  deviceApi.getActivations().then(res => { activations.value = res.data || [] }).catch(e => console.error('Activations load fail:', e))
  
  try {
    const tenRes = await adminApi.getTenants()
    tenants.value = tenRes.data || []
    
    // Explicitly update options after loading
    filteredTenantOptions.value = tenants.value.map(t => ({ 
      label: t.name, 
      value: t.id 
    }))
    console.log('[Activation] Loaded Tenants:', tenants.value.length)
  } catch (err) {
    console.error('Failed to load tenants:', err)
  } finally {
    loading.value = false
  }
}

const onTenantChange = (val) => {
  const tenant = tenants.value.find(t => t.id === val)
  if (tenant) {
    // Capitalize type (e.g. school -> School)
    newCode.value.serviceMode = tenant.type.charAt(0).toUpperCase() + tenant.type.slice(1)
  }
}

const reviewCertificate = (row) => {
  const expiryDate = new Date(row.created_at)
  expiryDate.setDate(expiryDate.getDate() + row.duration_days)
  
  certificateData.value = {
    businessName: row.tenants?.name || 'Unknown Business',
    mode: 'Retail', // Defaulting to retail for history or we could store this in DB later
    plan: 'STANDARD',
    duration: `${row.duration_days} Days`,
    expiry: expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  
  lastGeneratedCode.value = row.activation_code
  showSuccessDialog.value = true
}

const generateCode = async () => {
  if (!newCode.value.tenantId) return
  
  generating.value = true
  try {
    const { data } = await deviceApi.createActivation({
      tenantId: newCode.value.tenantId,
      durationDays: newCode.value.duration,
      planIndex: newCode.value.planIndex,
      deviceSuffix: newCode.value.deviceSuffix
    })

    // Populate Certificate Data for the UI
    const tenant = tenants.value.find(t => t.id === newCode.value.tenantId)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + newCode.value.duration)
    
    certificateData.value = {
      businessName: tenant ? tenant.name : 'Unknown Business',
      mode: newCode.value.serviceMode,
      plan: planOptions.find(p => p.value === newCode.value.planIndex)?.label || 'BASIC',
      duration: durationOptions.find(d => d.value === newCode.value.duration)?.label || '30 Days',
      expiry: expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    lastGeneratedCode.value = data.activation_code
    showCodeDialog.value = false
    showSuccessDialog.value = true
    loadData()
  } catch (err) {
    console.error('Failed to generate code:', err)
  } finally {
    generating.value = false
  }
}

const validateCode = async () => {
  if (!validationCode.value) return
  validating.value = true
  try {
    // We'll call a new endpoint for this
    const { data } = await deviceApi.validateCode({ code: validationCode.value })
    validationResult.value = data
  } catch (err) {
    console.error('Validation failed:', err)
  } finally {
    validating.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.certificate-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 24px;
}

.certificate-logo-outer {
  border: 2px solid #fbbf24;
  border-radius: 50%;
  display: inline-block;
  background: rgba(251, 191, 36, 0.1);
}

.text-shadow-glow {
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.code-container {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 16px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

.code-glow {
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
  letter-spacing: 8px;
}

.border-right-grey {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.letter-spacing-10 { letter-spacing: 10px; }
.letter-spacing-3 { letter-spacing: 3px; }
.backdrop-blur { backdrop-filter: blur(8px); }
.bg-black-transparent { background: rgba(0, 0, 0, 0.4); }

.border-indigo { border: 1px solid #3f51b5; }
.border-gold { border: 2px solid #FFD700 !important; }
.border-grey-9 { border: 1px solid #263238; }
.bg-blue-grey-11 { background: #1a2327; }
.letter-spacing-5 { letter-spacing: 5px; }
.letter-spacing-1 { letter-spacing: 1px; }
.transition-3 { transition: all 0.3s ease; }
.font-mono { font-family: 'Courier New', Courier, monospace; }
</style>
