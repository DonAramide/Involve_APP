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
      <q-tab name="payout" icon="schedule" label="Payout Settings" />
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

        <q-card flat class="enterprise-panel bg-panel border-main q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-md text-main text-red-4">Maintenance Mode Controls</div>
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-6 column op-gap-16">
                <q-toggle 
                  v-model="mockSettings.isMaintenanceLocked" 
                  color="red-6" 
                  label="Enforce Maintenance Mode Global Lockout" 
                  dark 
                />
                <q-input 
                  v-model="mockSettings.maintenanceMessage" 
                  outlined dense dark type="textarea" rows="2"
                  label="Maintenance Message to Show Users" 
                  placeholder="System is currently under maintenance. Please try again later."
                />
              </div>
              <div class="col-12 col-md-6">
                <q-banner rounded class="bg-red-10 text-red-2 border-critical">
                  <template v-slot:avatar>
                    <q-icon name="report_problem" color="red-4" />
                  </template>
                  Activating Maintenance Mode will immediately prevent logins for all normal tenant operator and agent accounts globally. Only Super Admins will be permitted to access.
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

      <!-- PAYOUT SETTINGS TAB -->
      <q-tab-panel name="payout" class="q-pa-none">
        <q-card flat class="enterprise-panel bg-panel border-main">
          <q-card-section>
            <div class="row items-center op-gap-10 q-mb-md">
              <q-icon name="schedule" color="green-4" size="sm" />
              <div>
                <div class="text-h6 text-main">Automated Daily Payout Time</div>
                <div class="text-caption text-muted">Set the global time at which the platform will trigger automated daily payout sweeps for all tenants.</div>
              </div>
            </div>

            <div class="row q-col-gutter-lg items-start">
              <div class="col-12 col-md-5">
                <q-banner rounded class="bg-subpanel border-main q-mb-md">
                  <template v-slot:avatar><q-icon name="info" color="cyan-4" /></template>
                  <span class="text-caption text-main">This time will appear on the tenant's Payout Orchestrator as the configured daily sweep time. Tenants cannot override this value.</span>
                </q-banner>

                <div class="enterprise-subpanel q-pa-md rounded-borders border-main q-mb-md">
                  <div class="text-caption text-muted font-mono q-mb-sm">DAILY PAYOUT TRIGGER TIME (WAT)</div>
                  <div class="row items-center op-gap-12">
                    <q-input
                      id="daily-payout-time-input"
                      v-model="payoutStore.dailyPayoutTime"
                      outlined dense dark
                      type="time"
                      label="Payout Time (HH:MM)"
                      style="width: 180px;"
                      class="font-mono text-weight-bold"
                    />
                    <div class="column">
                      <div class="text-caption text-muted">Current setting</div>
                      <div class="text-weight-bold text-green-4 font-mono text-subtitle1">{{ payoutStore.dailyPayoutTime || '23:59' }} WAT</div>
                    </div>
                  </div>
                </div>

                <div class="enterprise-subpanel q-pa-md rounded-borders border-main">
                  <div class="text-caption text-muted font-mono q-mb-sm">ON-DEMAND (MANUAL) DISPATCH FEE</div>
                  <div class="text-caption text-grey-5 q-mb-sm">Fee charged to tenants who choose to manually dispatch a payout outside the automated schedule.</div>
                  <div class="row items-center op-gap-12">
                    <q-input
                      id="manual-dispatch-fee-input"
                      v-model.number="payoutStore.manualDispatchFee"
                      outlined dense dark
                      type="number"
                      label="Fee Amount"
                      style="width: 140px;"
                      class="font-mono"
                    />
                    <q-select
                      id="manual-dispatch-fee-type-select"
                      v-model="payoutStore.manualDispatchFeeType"
                      outlined dense dark
                      :options="['Fixed Amount', 'Percentage (%)']" 
                      label="Fee Type"
                      style="width: 180px;"
                    />
                  </div>
                </div>
              </div>

              <div class="col-12 col-md-7">
                <q-card flat class="bg-subpanel border-main q-pa-md">
                  <div class="text-caption text-muted font-mono q-mb-md border-bottom q-pb-xs">PAYOUT SCHEDULE PREVIEW</div>
                  <div class="column q-gutter-y-sm">
                    <div class="row items-center op-gap-12 q-pa-sm rounded-borders" style="background: rgba(81,207,102,0.07); border: 1px solid rgba(81,207,102,0.2);">
                      <q-icon name="today" color="green-4" size="sm" />
                      <div class="col">
                        <div class="text-caption text-weight-bold text-white">Automated Daily Sweep</div>
                        <div class="text-caption text-grey-5 font-mono">Triggers every day at <span class="text-green-4">{{ payoutSettings.dailyPayoutTime || '23:59' }} WAT</span></div>
                      </div>
                      <q-badge color="green-10" text-color="green-3">ACTIVE</q-badge>
                    </div>
                    <div class="row items-center op-gap-12 q-pa-sm rounded-borders" style="background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);">
                      <q-icon name="date_range" color="indigo-4" size="sm" />
                      <div class="col">
                        <div class="text-caption text-weight-bold text-white">Automated Weekly Sweep</div>
                        <div class="text-caption text-grey-5 font-mono">Tenant selects preferred day & time — <span class="text-indigo-4">admin notified on setup</span></div>
                      </div>
                      <q-badge color="indigo-10" text-color="indigo-3">TENANT-CONFIGURED</q-badge>
                    </div>
                    <div class="row items-center op-gap-12 q-pa-sm rounded-borders" style="background: rgba(252,100,25,0.07); border: 1px solid rgba(252,100,25,0.2);">
                      <q-icon name="touch_app" color="orange-4" size="sm" />
                      <div class="col">
                        <div class="text-caption text-weight-bold text-white">Manual On-Demand Dispatch</div>
                        <div class="text-caption text-grey-5 font-mono">Extra fee applies: <span class="text-orange-4">{{ payoutSettings.manualDispatchFeeType === 'Percentage (%)' ? payoutSettings.manualDispatchFee + '%' : (currentCurrency.symbol + (payoutSettings.manualDispatchFee || 0).toLocaleString()) }}</span></div>
                      </div>
                      <q-badge color="orange-10" text-color="orange-3">FEE APPLIES</q-badge>
                    </div>
                  </div>
                </q-card>
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

    <!-- Debug section at the bottom -->
    <div class="q-mt-xl q-pa-sm bg-dark text-grey-5 rounded-borders font-mono text-caption text-center border-main">
      [LOCALSTORAGE DEBUG] Active Key: platform_payout_settings | Raw Value: {{ localStorageDebug }}
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useCurrency } from '../../composables/useCurrency';
import { adminApi } from '../../api';
import { usePlatformPayoutSettingsStore } from '../../stores/platformPayoutSettings.store';

const $q = useQuasar();
const { currentCurrency, setCurrency } = useCurrency();
const payoutStore = usePlatformPayoutSettingsStore();

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
  enforceDeviceControl: false,
  isMaintenanceLocked: false,
  maintenanceMessage: 'System is currently under maintenance. Please try again later.',
  metaAccessToken: '',
  whatsappPhoneNumberId: '',
  whatsappBusinessAccountId: '',
  quasarClientId: '',
  quasarClientSecret: '',
  lessonAiApiKey: ''
});

// Payout settings — thin alias to the shared Pinia store.
// The store auto-hydrates from localStorage and is reactive:
// tenant page reacts instantly when admin saves.
const payoutSettings = {
  get dailyPayoutTime()      { return payoutStore.dailyPayoutTime },
  get manualDispatchFee()    { return payoutStore.manualDispatchFee },
  get manualDispatchFeeType(){ return payoutStore.manualDispatchFeeType },
};

const currencyColumns = [
  { name: 'name', label: 'Currency Name', align: 'left', field: 'name', sortable: true },
  { name: 'code', label: 'Code', align: 'left', field: 'code', sortable: true },
  { name: 'symbol', label: 'Symbol', align: 'center', field: 'symbol' },
  { name: 'status', label: 'Status', align: 'center' },
  { name: 'actions', label: 'Actions', align: 'right' },
];

const defaultCurrencies = [
  { name: 'Naira', code: 'NGN', symbol: currentCurrency.symbol },
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'British Pound', code: 'GBP', symbol: '£' },
];

const currencyList = ref([]);

const localStorageDebug = ref('NOT_LOADED');

function updateDebug() {
  localStorageDebug.value = localStorage.getItem('platform_payout_settings') || 'NOT_FOUND';
}

onMounted(async () => {
  updateDebug();
  setInterval(updateDebug, 1000);
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
      mockSettings.value.isMaintenanceLocked = data.is_maintenance_locked !== undefined ? data.is_maintenance_locked : false;
      mockSettings.value.maintenanceMessage = data.maintenance_message || 'System is currently under maintenance. Please try again later.';
      
      // Integrations
      mockSettings.value.metaAccessToken = data.meta_access_token || '';
      mockSettings.value.whatsappPhoneNumberId = data.whatsapp_phone_number_id || '';
      mockSettings.value.whatsappBusinessAccountId = data.whatsapp_business_account_id || '';
      mockSettings.value.quasarClientId = data.quasar_client_id || '';
      mockSettings.value.quasarClientSecret = data.quasar_client_secret || '';
      mockSettings.value.lessonAiApiKey = data.lesson_ai_api_key || '';

      // Populate Payout Settings Store
      payoutStore.dailyPayoutTime = data.daily_payout_time || data.dailyPayoutTime || payoutStore.dailyPayoutTime;
      payoutStore.manualDispatchFee = data.manual_dispatch_fee ?? data.manualDispatchFee ?? payoutStore.manualDispatchFee;
      payoutStore.manualDispatchFeeType = data.manual_dispatch_fee_type || data.manualDispatchFeeType || payoutStore.manualDispatchFeeType;
    }
  } catch (err) {
    console.error('Failed to load global platform settings:', err);
  }
}

async function saveAllSettings() {
  // Step 1: Always persist payout settings locally first (store → localStorage).
  // These fields are not yet in the backend schema — saving them client-side is safe and instant.
  payoutStore.persist();

  // Step 2: Send only the known platform config fields to the backend.
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
      enforce_device_control: mockSettings.value.enforceDeviceControl,
      is_maintenance_locked: mockSettings.value.isMaintenanceLocked,
      maintenance_message: mockSettings.value.maintenanceMessage,
      meta_access_token: mockSettings.value.metaAccessToken,
      whatsapp_phone_number_id: mockSettings.value.whatsappPhoneNumberId,
      whatsapp_business_account_id: mockSettings.value.whatsappBusinessAccountId,
      quasar_client_id: mockSettings.value.quasarClientId,
      quasar_client_secret: mockSettings.value.quasarClientSecret,
      lesson_ai_api_key: mockSettings.value.lessonAiApiKey,
      // Payout settings keys — written to global_settings.json on the server
      daily_payout_time: payoutStore.dailyPayoutTime,
      manual_dispatch_fee: payoutStore.manualDispatchFee,
      manual_dispatch_fee_type: payoutStore.manualDispatchFeeType
    };
    await adminApi.updateGlobalSettings(payload);
    $q.notify({
      type: 'positive',
      message: 'Platform configuration saved successfully. Payout settings applied.'
    });
  } catch (err) {
    $q.notify({
      type: 'warning',
      icon: 'cloud_off',
      message: 'Payout settings applied locally! (Server settings failed to sync: ' + (err.response?.data?.error || err.message) + ')'
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
