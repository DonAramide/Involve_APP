<template>
  <q-page padding class="q-pa-lg text-main">
    <div class="row items-center q-mb-xl justify-between">
      <div>
        <h4 class="text-h4 text-weight-bold q-my-none">Platform Configuration</h4>
        <div class="text-subtitle1 text-grey-7">Manage Global Platform Settings & Policies</div>
      </div>
      <div>
        <q-btn unelevated color="blue-6" icon="save" label="Save All Changes" @click="saveAllSettings" />
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey-5 q-mb-md"
      active-color="cyan-3"
      indicator-color="cyan-3"
      align="left"
      narrow-indicator
    >
      <q-tab name="general" icon="settings" label="General" />
      <q-tab name="localization" icon="language" label="Localization & Currency" />
      <q-tab name="security" icon="security" label="Security Policies" />
      <q-tab name="branding" icon="palette" label="Branding & Whitelabel" />
    </q-tabs>

    <q-separator dark class="q-mb-md opacity-20" />

    <q-tab-panels v-model="activeTab" animated class="bg-transparent">
      
      <!-- GENERAL TAB -->
      <q-tab-panel name="general" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">System Defaults</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input outlined dense dark v-model="mockSettings.platformName" label="Platform Name" class="q-mb-md" />
                <q-input outlined dense dark v-model="mockSettings.supportEmail" label="Global Support Email" class="q-mb-md" />
                <q-select outlined dense dark v-model="mockSettings.timezone" :options="['UTC', 'GMT', 'EST', 'WAT', 'PST']" label="System Timezone" />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-subpanel text-muted border-main">
                  <template v-slot:avatar>
                    <q-icon name="info" color="blue-4" />
                  </template>
                  General settings affect all core modules unless overridden at the tenant level. Ensure compliance with operating guidelines before changing system timezones.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- LOCALIZATION TAB (Contains existing currency logic) -->
      <q-tab-panel name="localization" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">Currency & Market</div>
            <q-banner rounded class="bg-subpanel text-main q-mb-md border-main row items-center">
              <q-icon name="payments" color="green-4" size="sm" class="q-mr-sm" />
              Active Platform Currency: <strong class="text-cyan-3 q-mx-xs">{{ currentCurrency.name }} ({{ currentCurrency.symbol }})</strong> - {{ currentCurrency.code }}
            </q-banner>

            <q-table
              :rows="currencyList"
              :columns="currencyColumns"
              row-key="code"
              flat
              dark
              class="bg-subpanel border-main"
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.row.code === currentCurrency.code ? 'blue-8' : 'blue-grey-9'"
                    text-color="white"
                    dense
                    size="sm"
                  >
                    {{ props.row.code === currentCurrency.code ? 'ACTIVE' : 'INACTIVE' }}
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn
                    v-if="props.row.code !== currentCurrency.code"
                    outline
                    dense
                    color="cyan-3"
                    label="Set Active"
                    size="sm"
                    @click="activateCurrency(props.row)"
                  />
                  <q-btn
                    flat
                    round
                    color="grey-4"
                    icon="edit"
                    size="sm"
                    class="q-ml-sm hover-text-cyan"
                    @click="editCurrency(props.row)"
                  />
                </q-td>
              </template>
            </q-table>
            
            <div class="row justify-end q-mt-md">
              <q-btn outline color="cyan-3" icon="add" label="Add Custom Currency" size="sm" @click="showAddCurrencyDialog = true" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- SECURITY TAB -->
      <q-tab-panel name="security" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">Session & Access Control</div>
            <div class="row q-col-gutter-lg items-center">
              <div class="col-12 col-md-6 column op-gap-16">
                <q-toggle v-model="mockSettings.requireMFA" color="red-5" label="Enforce MFA for all Tenant Admins" dark />
                <q-toggle v-model="mockSettings.strictIPBinding" color="blue-5" label="Strict Session IP Binding" dark />
                <q-toggle v-model="mockSettings.enforceDeviceControl" color="red-5" label="Enforce Strict Device Fingerprint on Login" dark />
                <q-input outlined dense dark type="number" v-model="mockSettings.sessionTimeout" label="Idle Session Timeout (Minutes)" />
                <q-input outlined dense dark type="number" v-model="mockSettings.auditArchiveHours" label="Audit Trail Retention Limit (Hours)" />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-red-10 text-red-2 border-critical">
                  <template v-slot:avatar>
                    <q-icon name="warning" color="red-4" />
                  </template>
                  Disabling IP Binding or MFA enforcement will trigger a compliance drift alert in the Governance Center.
                </q-banner>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- BRANDING TAB -->
      <q-tab-panel name="branding" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main">White-Label Customization</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6 column op-gap-16">
                <q-input outlined dense dark v-model="mockSettings.primaryColor" label="Primary Theme Color (Hex)" />
                <q-input outlined dense dark v-model="mockSettings.logoUrl" label="Enterprise Logo URL" />
                <q-toggle v-model="mockSettings.hideInvifyWatermark" color="purple-4" label="Hide 'Powered by Invify' Watermark" dark />
              </div>
              <div class="col-12 col-md-6 row items-center justify-center">
                <div class="column items-center bg-subpanel q-pa-xl rounded-borders border-main" style="width: 100%;">
                  <q-icon name="dashboard" size="xl" :style="{ color: mockSettings.primaryColor }" />
                  <div class="q-mt-sm text-weight-bold" style="letter-spacing: 2px;">{{ mockSettings.platformName.toUpperCase() }}</div>
                  <div class="text-caption text-muted q-mt-md" v-if="!mockSettings.hideInvifyWatermark">Powered by Invify OPS Core</div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Add/Edit Currency Dialog -->
    <q-dialog v-model="showAddCurrencyDialog">
      <q-card style="width: 400px; max-width: 90vw;" class="enterprise-panel bg-panel text-main border-main">
        <q-card-section class="row items-center q-pb-none border-bottom q-py-sm">
          <div class="text-subtitle2 text-weight-bold">{{ isEditing ? 'Edit Currency' : 'Add Currency' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input outlined dense dark v-model="form.name" label="Currency Name (e.g. Naira)" class="q-mb-md" />
          <q-input outlined dense dark v-model="form.code" label="Currency Code (e.g. NGN)" class="q-mb-md" />
          <q-input outlined dense dark v-model="form.symbol" :label="`Currency Symbol (e.g. ${currentCurrency.symbol})`" class="q-mb-md" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md border-top">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated color="cyan-6" label="Save Config" @click="saveCurrency" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useCurrency } from '../../composables/useCurrency';
import { adminApi } from '../../api';

const $q = useQuasar();
const { currentCurrency, setCurrency } = useCurrency();

const activeTab = ref('general');
const mockSettings = ref({
  platformName: 'INVIFY ENTERPRISE CORE',
  supportEmail: 'soc-support@invify.com',
  timezone: 'UTC',
  requireMFA: true,
  strictIPBinding: true,
  sessionTimeout: 15,
  primaryColor: '#26A69A',
  logoUrl: 'https://cdn.invify.com/enterprise-logo.png',
  hideInvifyWatermark: false,
  auditArchiveHours: 72,
  enforceDeviceControl: false
});

const currencyColumns = [
  { name: 'name', label: 'Currency Name', align: 'left', field: 'name', sortable: true },
  { name: 'code', label: 'Code', align: 'left', field: 'code', sortable: true },
  { name: 'symbol', label: 'Symbol', align: 'center', field: 'symbol' },
  { name: 'status', label: 'Status', align: 'center' },
  { name: 'actions', label: 'Actions', align: 'right' },
];

const defaultCurrencies = [
  { name: 'Naira', code: 'NGN', symbol: '₦' },
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'British Pound', code: 'GBP', symbol: '£' },
];

const currencyList = ref([]);

onMounted(async () => {
  await fetchSettings();
  const savedList = localStorage.getItem('platform_currencies_list');
  if (savedList) {
    currencyList.value = JSON.parse(savedList);
  } else {
    currencyList.value = [...defaultCurrencies];
    localStorage.setItem('platform_currencies_list', JSON.stringify(currencyList.value));
  }
});

async function fetchSettings() {
  try {
    const res = await adminApi.getGlobalSettings();
    if (res.data) {
      const data = res.data;
      mockSettings.value.platformName = data.platform_name || data.platformName || mockSettings.value.platformName;
      mockSettings.value.supportEmail = data.support_email || data.supportEmail || mockSettings.value.supportEmail;
      mockSettings.value.timezone = data.timezone || mockSettings.value.timezone;
      mockSettings.value.requireMFA = data.require_mfa !== undefined ? data.require_mfa : (data.requireMFA !== undefined ? data.requireMFA : mockSettings.value.requireMFA);
      mockSettings.value.strictIPBinding = data.strict_ip_binding !== undefined ? data.strict_ip_binding : (data.strictIPBinding !== undefined ? data.strictIPBinding : mockSettings.value.strictIPBinding);
      mockSettings.value.sessionTimeout = data.session_timeout !== undefined ? data.session_timeout : (data.sessionTimeout !== undefined ? data.sessionTimeout : mockSettings.value.sessionTimeout);
      mockSettings.value.primaryColor = data.primary_color || data.primaryColor || mockSettings.value.primaryColor;
      mockSettings.value.logoUrl = data.logo_url || data.logoUrl || mockSettings.value.logoUrl;
      mockSettings.value.hideInvifyWatermark = data.hide_invify_watermark !== undefined ? data.hide_invify_watermark : (data.hideInvifyWatermark !== undefined ? data.hideInvifyWatermark : mockSettings.value.hideInvifyWatermark);
      mockSettings.value.auditArchiveHours = data.audit_retention_hours !== undefined ? data.audit_retention_hours : (data.auditArchiveHours !== undefined ? data.auditArchiveHours : 72);
      mockSettings.value.enforceDeviceControl = data.enforce_device_control !== undefined ? data.enforce_device_control : (data.enforceDeviceControl !== undefined ? data.enforceDeviceControl : false);
    }
  } catch (err) {
    console.error('Failed to load global platform settings:', err);
  }
}

async function saveAllSettings() {
  try {
    const payload = {
      platform_name: mockSettings.value.platformName,
      support_email: mockSettings.value.supportEmail,
      timezone: mockSettings.value.timezone,
      require_mfa: mockSettings.value.requireMFA,
      strict_ip_binding: mockSettings.value.strictIPBinding,
      session_timeout: Number(mockSettings.value.sessionTimeout),
      primary_color: mockSettings.value.primaryColor,
      logo_url: mockSettings.value.logoUrl,
      hide_invify_watermark: mockSettings.value.hideInvifyWatermark,
      audit_retention_hours: Number(mockSettings.value.auditArchiveHours),
      enforce_device_control: mockSettings.value.enforceDeviceControl
    };
    await adminApi.updateGlobalSettings(payload);
    $q.notify({
      type: 'positive',
      message: 'Global platform configuration saved successfully.'
    });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save global platform configuration: ' + (err.response?.data?.error || err.message)
    });
  }
}

const showAddCurrencyDialog = ref(false);
const isEditing = ref(false);
const form = ref({ name: '', code: '', symbol: '' });
let editingIndex = -1;

function activateCurrency(currency) {
  setCurrency(currency);
  $q.notify({
    type: 'positive',
    message: `Global platform currency updated to ${currency.name} (${currency.symbol})`
  });
}

function editCurrency(currency) {
  isEditing.value = true;
  form.value = { ...currency };
  editingIndex = currencyList.value.findIndex(c => c.code === currency.code);
  showAddCurrencyDialog.value = true;
}

function saveCurrency() {
  if (!form.value.name || !form.value.code || !form.value.symbol) {
    $q.notify({ type: 'negative', message: 'All fields are required.' });
    return;
  }

  if (isEditing.value && editingIndex > -1) {
    currencyList.value[editingIndex] = { ...form.value };
    // update current if active
    if (currentCurrency.value.code === form.value.code) {
      setCurrency({ ...form.value });
    }
  } else {
    currencyList.value.push({ ...form.value });
  }

  localStorage.setItem('platform_currencies_list', JSON.stringify(currencyList.value));
  showAddCurrencyDialog.value = false;
  
  $q.notify({
    type: 'positive',
    message: isEditing.value ? 'Currency updated.' : 'New currency added.'
  });
}

watch(showAddCurrencyDialog, (val) => {
  if (!val) {
    isEditing.value = false;
    form.value = { name: '', code: '', symbol: '' };
    editingIndex = -1;
  }
});
</script>
