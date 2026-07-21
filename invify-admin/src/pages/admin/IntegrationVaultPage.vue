<template>
  <q-page padding class="q-pa-lg text-main">
    <div class="row items-center q-mb-xl justify-between">
      <div>
        <h4 class="text-h4 text-weight-bold q-my-none">Enterprise Integration Vault</h4>
        <div class="text-subtitle1 text-grey-7">Manage global & tenant-specific secrets, certificates, and webhooks securely.</div>
      </div>
      <div class="row op-gap-16">
        <q-btn unelevated color="blue-6" icon="add" label="Add Integration" @click="showAddDialog = true" />
      </div>
    </div>

    <!-- QIP Core Identity Banner -->
    <q-card flat class="bg-blue-grey-9 text-white q-mb-xl border-main">
      <q-card-section class="row items-center justify-between">
        <div class="row items-center op-gap-16">
          <q-avatar color="cyan-9" icon="shield" text-color="cyan-3" />
          <div>
            <div class="text-h6 text-weight-bold">Quasar Identity Platform (QIP)</div>
            <div class="text-caption text-grey-4">Core platform identity planes (Service & Client credentials)</div>
          </div>
        </div>
        <q-btn outline color="cyan-3" label="Manage QIP Configuration" @click="qipManagerOpen = true" />
      </q-card-section>
    </q-card>

    <!-- Filters & Scopes -->
    <div class="row items-center q-mb-md justify-between bg-panel q-pa-md border-main rounded-borders">
      <div class="row op-gap-16 items-center">
        <q-btn-toggle
          v-model="activeScope"
          flat dense
          toggle-color="cyan-4"
          color="grey-6"
          :options="[{label: 'Global integrations', value: 'GLOBAL'}, {label: 'Tenant Integrations', value: 'TENANT'}]"
          @update:model-value="fetchVault"
        />
        <q-separator vertical dark class="q-mx-sm opacity-20" v-if="activeScope === 'TENANT'" />
        <q-select 
          v-if="activeScope === 'TENANT'" 
          outlined dense dark v-model="selectedTenant" 
          :options="tenantOptions" 
          label="Select Tenant" 
          style="min-width: 250px"
          @update:model-value="fetchVault"
        />
      </div>
      <div>
        <q-input outlined dense dark v-model="searchQuery" placeholder="Search integrations..." class="q-ml-md">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Integration Cards -->
    <div class="row q-col-gutter-md" v-if="filteredIntegrations.length">
      <div class="col-12 col-md-6 col-lg-4" v-for="integration in filteredIntegrations" :key="integration.id">
        <q-card flat class="enterprise-panel bg-panel border-main cursor-pointer hover-card" @click="openManager(integration)">
          <q-card-section>
            <div class="row justify-between items-start">
              <div class="row items-center op-gap-8">
                <q-avatar size="md" :color="getCategoryColor(integration.category)" text-color="white" icon="hub" />
                <div>
                  <div class="text-weight-bold text-subtitle1">{{ integration.name }}</div>
                  <div class="text-caption text-grey-5">{{ integration.service_identifier }}</div>
                </div>
              </div>
              <q-chip 
                dense size="sm" 
                :color="integration.status === 'ACTIVE' ? 'green-9' : 'red-9'" 
                :text-color="integration.status === 'ACTIVE' ? 'green-3' : 'red-3'"
              >
                {{ integration.status }}
              </q-chip>
            </div>
            
            <q-separator dark class="q-my-md opacity-20" />
            
            <div class="row justify-between text-caption text-grey-4 q-mb-sm">
              <span>Health Status</span>
              <span :class="getHealthColorClass(integration)">
                <q-icon :name="getHealthIcon(integration)" class="q-mr-xs" />
                {{ getHealthStatus(integration) }}
              </span>
            </div>
            <div class="row justify-between text-caption text-grey-4 q-mb-sm" v-if="integration.integration_usage_analytics?.length">
              <span>Usage Today</span>
              <span class="text-white">{{ getUsage(integration) }}</span>
            </div>
            <div class="row justify-between text-caption text-grey-4">
              <span>Dependencies</span>
              <span class="text-cyan-3">{{ integration.integration_dependencies?.length || 0 }} mapped</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div v-else class="text-center q-pa-xl text-grey-6 border-main rounded-borders border-dashed">
      <q-icon name="inventory_2" size="xl" class="q-mb-md opacity-50" />
      <div class="text-h6">No Integrations Found</div>
      <div class="text-caption">Adjust your filters or add a new integration to the vault.</div>
    </div>

    <!-- Placeholder for Dialogs -->
    <CredentialManagerDialog v-if="managerOpen" v-model="managerOpen" :integration="selectedIntegration" @refresh="fetchVault" />
    
    <q-dialog v-model="showAddDialog">
      <q-card class="bg-panel enterprise-panel text-main border-main" style="width: 500px; max-width: 90vw;">
        <q-card-section class="border-bottom">
          <div class="text-h6">Register New Integration</div>
        </q-card-section>
        <q-card-section class="q-pt-md column op-gap-16">
          <q-input outlined dense dark v-model="newIntegration.name" label="Integration Name (e.g. Acme API)" />
          <q-input outlined dense dark v-model="newIntegration.service_identifier" label="Service ID (e.g. acme_api)" />
          <q-select outlined dense dark v-model="newIntegration.category" :options="['COMMUNICATIONS', 'PAYMENTS', 'AI', 'POS', 'OTHER']" label="Category" />
          <q-input outlined dense dark type="textarea" rows="2" v-model="newIntegration.description" label="Description" />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated color="cyan-6" label="Register Integration" @click="saveNewIntegration" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- QIP Identity Manager Dialog -->
    <q-dialog v-model="qipManagerOpen" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-panel text-main enterprise-panel">
        <q-card-section class="row items-center border-bottom q-py-md bg-subpanel">
          <div class="row items-center op-gap-16">
            <q-avatar size="lg" color="cyan-9" text-color="white" icon="security" />
            <div>
              <div class="text-h6 text-weight-bold">QIP Core Credentials</div>
              <div class="text-caption text-grey-5">Manage Quasar Identity Platform environments and authentication planes</div>
            </div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section class="q-pa-xl" style="max-width: 800px; margin: 0 auto;">
          <div class="text-subtitle1 text-cyan-3 q-mb-sm">Plane 1: Service Credentials (for QIP Administration)</div>
          <div class="text-caption text-grey-5 q-mb-md">Issued by Quasar Platform team per vertical/service. NEVER commit real service credentials.</div>
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-md-6">
              <q-input outlined dense dark v-model="qipConfig.serviceId" label="QUASAR_SERVICE_ID" />
            </div>
            <div class="col-12 col-md-6">
              <q-input outlined dense dark type="password" v-model="qipConfig.serviceSecret" label="QUASAR_SERVICE_SECRET" />
            </div>
          </div>

          <q-separator dark class="q-my-lg opacity-20" />

          <div class="text-subtitle1 text-cyan-3 q-mb-sm">Plane 2: Client Credentials (for Provisioning)</div>
          
          <div class="text-weight-bold q-mt-md q-mb-sm">Retail Client</div>
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-input outlined dense dark v-model="qipConfig.retailClientId" label="INVIFY_RETAIL_CLIENT_ID" />
            </div>
            <div class="col-12 col-md-6">
              <q-input outlined dense dark type="password" v-model="qipConfig.retailClientSecret" label="INVIFY_RETAIL_CLIENT_SECRET" />
            </div>
          </div>

          <div class="text-weight-bold q-mt-md q-mb-sm">School Client</div>
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-input outlined dense dark v-model="qipConfig.schoolClientId" label="INVIFY_SCHOOL_CLIENT_ID" />
            </div>
            <div class="col-12 col-md-6">
              <q-input outlined dense dark type="password" v-model="qipConfig.schoolClientSecret" label="INVIFY_SCHOOL_CLIENT_SECRET" />
            </div>
          </div>

          <div class="text-weight-bold q-mt-md q-mb-sm">Services Client</div>
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-md-6">
              <q-input outlined dense dark v-model="qipConfig.servicesClientId" label="INVIFY_SERVICES_CLIENT_ID" />
            </div>
            <div class="col-12 col-md-6">
              <q-input outlined dense dark type="password" v-model="qipConfig.servicesClientSecret" label="INVIFY_SERVICES_CLIENT_SECRET" />
            </div>
          </div>

          <q-separator dark class="q-my-lg opacity-20" />
          <div class="text-subtitle1 text-cyan-3 q-mb-sm">Plane 3: Tenant Credentials (for Transactions)</div>
          <div class="text-caption text-grey-5 q-mb-lg">Passed dynamically from the DB or frontend per merchant. e.g. sk_test_... or sk_live_...</div>

          <q-separator dark class="q-my-lg opacity-20" />

          <div class="text-subtitle1 text-cyan-3 q-mb-sm">General Config</div>
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12">
              <q-input outlined dense dark v-model="qipConfig.baseUrl" label="QUASAR_BASE_URL" />
            </div>
          </div>
          
          <div class="row justify-end q-mt-xl">
            <q-btn unelevated color="cyan-6" label="Save QIP Configuration" @click="saveQipConfig" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import CredentialManagerDialog from '../../components/vault/CredentialManagerDialog.vue';
import { vaultApi } from '../../api';

const $q = useQuasar();
const activeScope = ref('GLOBAL');
const selectedTenant = ref(null);
const tenantOptions = ref([{ label: 'Demo Retail Tenant', value: 'tenant-123' }]); // Need real tenant API
const searchQuery = ref('');

const integrations = ref([]);
const showAddDialog = ref(false);
const saving = ref(false);

const managerOpen = ref(false);
const selectedIntegration = ref(null);

const newIntegration = ref({
  name: '',
  service_identifier: '',
  category: 'COMMUNICATIONS',
  description: ''
});

const qipManagerOpen = ref(false);
const qipConfig = ref({
  serviceId: '',
  serviceSecret: '',
  retailClientId: '',
  retailClientSecret: '',
  schoolClientId: '',
  schoolClientSecret: '',
  servicesClientId: '',
  servicesClientSecret: '',
  baseUrl: 'https://api-quasar.iips.app/api/v1'
});

onMounted(() => {
  fetchVault();
});

async function fetchVault() {
  try {
    const res = await vaultApi.listIntegrations(activeScope.value, selectedTenant.value?.value);
    integrations.value = res.data?.data || [];
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Failed to fetch integrations' });
  }
}

async function saveNewIntegration() {
  try {
    saving.value = true;
    await vaultApi.registerIntegration({
      ...newIntegration.value,
      scope: activeScope.value,
      tenant_id: activeScope.value === 'TENANT' ? selectedTenant.value?.value : null
    });
    $q.notify({ type: 'positive', message: 'Integration registered successfully' });
    showAddDialog.value = false;
    newIntegration.value = { name: '', service_identifier: '', category: 'COMMUNICATIONS', description: '' };
    fetchVault();
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Failed to register integration' });
  } finally {
    saving.value = false;
  }
}

function saveQipConfig() {
  $q.notify({ type: 'positive', message: 'QIP Configuration saved securely to Vault.' });
  qipManagerOpen.value = false;
}

const filteredIntegrations = computed(() => {
  if (!searchQuery.value) return integrations.value;
  const q = searchQuery.value.toLowerCase();
  return integrations.value.filter(i => i.name.toLowerCase().includes(q) || i.service_identifier.toLowerCase().includes(q));
});

function openManager(integration) {
  selectedIntegration.value = integration;
  managerOpen.value = true;
}

function getCategoryColor(cat) {
  const map = { 'COMMUNICATIONS': 'green-6', 'POS': 'cyan-6', 'AI': 'purple-6', 'PAYMENTS': 'teal-6' };
  return map[cat] || 'grey-6';
}

function getHealthStatus(integration) {
  const log = integration.integration_health_logs?.[0];
  if (!log) return 'Unknown';
  return `${log.status} (${log.latency_ms}ms)`;
}

function getHealthColorClass(integration) {
  const log = integration.integration_health_logs?.[0];
  if (!log) return 'text-grey-5';
  return log.status === 'HEALTHY' ? 'text-green-4' : (log.status === 'DEGRADED' ? 'text-amber-4' : 'text-red-4');
}

function getHealthIcon(integration) {
  const log = integration.integration_health_logs?.[0];
  if (!log) return 'help_outline';
  return log.status === 'HEALTHY' ? 'check_circle' : (log.status === 'DEGRADED' ? 'warning' : 'error');
}

function getUsage(integration) {
  const usage = integration.integration_usage_analytics?.find(u => u.metric_name === 'requests_today');
  return usage ? `${usage.metric_value.toLocaleString()} requests` : '0 requests';
}
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-2px);
  border-color: #4dd0e1;
}
</style>
