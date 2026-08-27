<template>
  <q-dialog v-model="isOpen" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="bg-panel text-main enterprise-panel">
      <!-- HEADER -->
      <q-card-section class="row items-center border-bottom q-py-md bg-subpanel">
        <div class="row items-center op-gap-16">
          <q-avatar size="lg" :color="getCategoryColor(integration?.category)" text-color="white" :icon="isQuasar ? 'webhook' : (isMetaWhatsApp ? 'chat' : 'hub')" />
          <div>
            <div class="text-h6 text-weight-bold">{{ integration?.name }} Vault</div>
            <div class="text-caption text-grey-5">
              <template v-if="isQuasar">Manage Quasar webhook signing secret and payment credentials</template>
              <template v-else-if="isMetaWhatsApp">Manage Meta WhatsApp Cloud API credentials and webhook config</template>
              <template v-else>Manage credentials, certificates, and environments</template>
            </div>
          </div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pa-xl" style="max-width: 1200px; margin: 0 auto;">

        <!-- Environment Toggle -->
        <div class="row items-center q-mb-lg justify-between">
          <q-btn-toggle
            v-model="activeEnvironment"
            unelevated dense
            toggle-color="cyan-6"
            color="blue-grey-9"
            :options="[
              {label: 'PRODUCTION', value: 'PRODUCTION'},
              {label: 'SANDBOX', value: 'SANDBOX'}
            ]"
            @update:model-value="onEnvironmentChange"
          />
          <q-btn outline color="cyan-4" icon="add" label="Add New Version" @click="openAddDialog()" />
        </div>

        <!-- Quasar webhook card (same visual language as vault cards) -->
        <div v-if="isQuasar" class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-md-6">
            <q-card flat class="enterprise-panel bg-subpanel border-main">
              <q-card-section>
                <div class="row justify-between items-start">
                  <div class="row items-center op-gap-8">
                    <q-avatar size="md" color="teal-8" text-color="teal-2" icon="webhook" />
                    <div>
                      <div class="text-weight-bold text-subtitle1">Outbound Webhook Signing</div>
                      <div class="text-caption text-grey-5">QUASAR_WEBHOOK_SIGNING_SECRET</div>
                    </div>
                  </div>
                  <q-chip
                    dense size="sm"
                    :color="webhookStatus?.configured ? 'green-9' : 'orange-10'"
                    :text-color="webhookStatus?.configured ? 'green-3' : 'orange-2'"
                  >
                    {{ webhookStatus?.configured ? 'CONFIGURED' : 'MISSING' }}
                  </q-chip>
                </div>

                <q-separator dark class="q-my-md opacity-20" />

                <div class="row justify-between text-caption text-grey-4 q-mb-sm">
                  <span>Header</span>
                  <span class="text-cyan-3">x-quasar-signature</span>
                </div>
                <div class="row justify-between text-caption text-grey-4 q-mb-sm">
                  <span>Endpoint</span>
                  <span class="text-white">POST /webhooks/quasar</span>
                </div>
                <div class="row justify-between text-caption text-grey-4 q-mb-md">
                  <span>Sources</span>
                  <span>
                    <span :class="webhookStatus?.sources?.runtimeEnv ? 'text-green-4' : 'text-grey-6'">env</span>
                    ·
                    <span :class="webhookStatus?.sources?.integrationVault ? 'text-green-4' : 'text-grey-6'">vault</span>
                  </span>
                </div>

                <q-input
                  outlined dense dark
                  v-model="webhookSecretInput"
                  :type="revealWebhook ? 'text' : 'password'"
                  label="Paste Quasar Outbound signing secret"
                  hint="From Quasar Admin → Webhooks → Outbound defaults"
                  autocomplete="new-password"
                  data-lpignore="true"
                  class="q-mb-md"
                >
                  <template #append>
                    <q-btn flat round dense :icon="revealWebhook ? 'visibility_off' : 'visibility'" @click="revealWebhook = !revealWebhook" />
                  </template>
                </q-input>

                <q-btn
                  unelevated color="cyan-6" class="full-width"
                  icon="lock"
                  label="Save Webhook Secret"
                  :loading="savingWebhook"
                  :disable="!webhookSecretInput || webhookSecretInput.length < 10"
                  @click="saveWebhookSecret"
                />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-6">
            <q-card flat class="enterprise-panel bg-subpanel border-main">
              <q-card-section>
                <div class="row justify-between items-start">
                  <div class="row items-center op-gap-8">
                    <q-avatar size="md" color="deep-purple-8" text-color="purple-2" icon="admin_panel_settings" />
                    <div>
                      <div class="text-weight-bold text-subtitle1">Quasar Admin Login</div>
                      <div class="text-caption text-grey-5">QUASAR_ADMIN_USERNAME / PASSWORD</div>
                    </div>
                  </div>
                  <q-chip
                    dense size="sm"
                    :color="adminCredStatus?.configured ? 'green-9' : 'orange-10'"
                    :text-color="adminCredStatus?.configured ? 'green-3' : 'orange-2'"
                  >
                    {{ adminCredStatus?.configured ? 'CONFIGURED' : 'MISSING' }}
                  </q-chip>
                </div>

                <q-separator dark class="q-my-md opacity-20" />

                <div class="text-caption text-grey-4 q-mb-md">
                  Used by Platform Config → Generate Global POS Key to call
                  <code>POST /admin/auth/login</code> then rotate the POS encryption key.
                </div>
                <div class="row justify-between text-caption text-grey-4 q-mb-md">
                  <span>Sources</span>
                  <span>
                    <span :class="adminCredStatus?.sources?.runtimeEnv ? 'text-green-4' : 'text-grey-6'">env</span>
                    ·
                    <span :class="adminCredStatus?.sources?.integrationVault ? 'text-green-4' : 'text-grey-6'">vault</span>
                    ·
                    <span :class="adminCredStatus?.sources?.adminJwtEnv ? 'text-green-4' : 'text-grey-6'">jwt-env</span>
                  </span>
                </div>

                <q-input
                  outlined dense dark
                  v-model="adminUsernameInput"
                  label="Quasar Admin Username"
                  autocomplete="off"
                  data-lpignore="true"
                  class="q-mb-md"
                />
                <q-input
                  outlined dense dark
                  v-model="adminPasswordInput"
                  :type="revealAdminPassword ? 'text' : 'password'"
                  label="Quasar Admin Password"
                  autocomplete="new-password"
                  data-lpignore="true"
                  class="q-mb-md"
                >
                  <template #append>
                    <q-btn
                      flat round dense
                      :icon="revealAdminPassword ? 'visibility_off' : 'visibility'"
                      @click="revealAdminPassword = !revealAdminPassword"
                    />
                  </template>
                </q-input>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-6">
                    <q-btn
                      unelevated color="deep-purple-6" class="full-width"
                      icon="lock"
                      label="Save Admin Credentials"
                      :loading="savingAdminCreds"
                      :disable="!adminUsernameInput || !adminPasswordInput"
                      @click="saveAdminCredentials"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-btn
                      outline color="deep-purple-3" class="full-width"
                      icon="wifi_tethering"
                      label="Test Admin Login"
                      :loading="testingAdminCreds"
                      :disable="!adminCredStatus?.configured && (!adminUsernameInput || !adminPasswordInput)"
                      @click="testAdminLogin"
                    />
                  </div>
                </div>
                <div
                  v-if="adminLoginPing"
                  class="q-mt-md text-caption"
                  :class="adminLoginPing.ok ? 'text-green-4' : 'text-negative'"
                >
                  {{ adminLoginPing.message }}
                  <span v-if="adminLoginPing.latencyMs != null" class="text-grey-5">
                    · {{ adminLoginPing.latencyMs }}ms · {{ adminLoginPing.quasarBaseUrl }}
                  </span>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-6">
            <q-card flat class="enterprise-panel bg-subpanel border-main">
              <q-card-section>
                <div class="row justify-between items-start">
                  <div class="row items-center op-gap-8">
                    <q-avatar size="md" color="blue-grey-8" text-color="cyan-2" icon="info" />
                    <div>
                      <div class="text-weight-bold text-subtitle1">How to configure</div>
                      <div class="text-caption text-grey-5">Quasar → Invify HMAC + Admin</div>
                    </div>
                  </div>
                </div>
                <q-separator dark class="q-my-md opacity-20" />
                <ol class="text-caption text-grey-4 q-pl-md" style="line-height: 1.7;">
                  <li>Open Quasar Admin → Platform → Webhooks → Outbound</li>
                  <li>Set Invify service URL to your approved HTTPS webhook receiver.</li>
                  <li>Copy the one-time Signing secret → Save Webhook Secret</li>
                  <li>Save Quasar Admin Username/Password here for POS key rotate</li>
                  <li>Click Test Admin Login to verify Quasar accepts those credentials</li>
                  <li>Then open Platform Config → Quasar Switch → Generate Global POS Key (leave JWT blank)</li>
                </ol>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Meta WhatsApp Cloud API panel -->
        <div v-if="isMetaWhatsApp" class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-md-7">
            <q-card flat class="enterprise-panel bg-subpanel border-main">
              <q-card-section>
                <div class="row justify-between items-start">
                  <div class="row items-center op-gap-8">
                    <q-avatar size="md" color="green-9" text-color="green-2" icon="chat" />
                    <div>
                      <div class="text-weight-bold text-subtitle1">Meta WhatsApp Cloud API</div>
                      <div class="text-caption text-grey-5">META_WHATSAPP · {{ activeEnvironment }}</div>
                    </div>
                  </div>
                  <q-chip
                    dense size="sm"
                    :color="metaStatus?.ready ? 'green-9' : 'orange-10'"
                    :text-color="metaStatus?.ready ? 'green-3' : 'orange-2'"
                  >
                    {{ metaStatus?.ready ? 'READY' : 'INCOMPLETE' }}
                  </q-chip>
                </div>

                <q-separator dark class="q-my-md opacity-20" />

                <div class="row justify-between text-caption text-grey-4 q-mb-sm">
                  <span>Webhook</span>
                  <span class="text-cyan-3">{{ metaStatus?.webhookCallbackUrl || 'GET/POST /webhooks/whatsapp' }}</span>
                </div>
                <div class="row justify-between text-caption text-grey-4 q-mb-md">
                  <span>Required keys</span>
                  <span class="text-white">{{ metaConfiguredCount }}/{{ META_WHATSAPP_KEYS.length }}</span>
                </div>

                <div class="column op-gap-8 q-mb-md">
                  <div
                    v-for="key in META_WHATSAPP_KEYS"
                    :key="key"
                    class="row items-center justify-between text-caption"
                  >
                    <span class="text-grey-4 text-monospace">{{ key }}</span>
                    <span :class="metaKeyConfigured(key) ? 'text-green-4' : 'text-orange-4'">
                      <q-icon :name="metaKeyConfigured(key) ? 'verified' : 'warning'" size="xs" class="q-mr-xs" />
                      {{ metaKeyConfigured(key) ? 'Configured' : 'Missing' }}
                    </span>
                  </div>
                </div>

                <q-input
                  outlined dense dark
                  v-model="metaForm.PUBLIC_API_BASE_URL"
                  label="PUBLIC_API_BASE_URL"
                  hint="e.g. https://api.invify.app"
                  class="q-mb-sm"
                />
                <q-input
                  outlined dense dark
                  v-model="metaForm.WHATSAPP_GRAPH_API_VERSION"
                  label="WHATSAPP_GRAPH_API_VERSION"
                  hint="default v19.0"
                  class="q-mb-sm"
                />
                <q-input
                  outlined dense dark
                  v-model="metaForm.WHATSAPP_PHONE_NUMBER_ID"
                  label="WHATSAPP_PHONE_NUMBER_ID"
                  class="q-mb-sm"
                />
                <q-input
                  outlined dense dark
                  v-model="metaForm.WHATSAPP_BUSINESS_ACCOUNT_ID"
                  label="WHATSAPP_BUSINESS_ACCOUNT_ID"
                  class="q-mb-sm"
                />
                <q-input
                  outlined dense dark
                  v-model="metaForm.WHATSAPP_ACCESS_TOKEN"
                  :type="revealMetaToken ? 'text' : 'password'"
                  label="WHATSAPP_ACCESS_TOKEN"
                  autocomplete="new-password"
                  data-lpignore="true"
                  class="q-mb-sm"
                >
                  <template #append>
                    <q-btn flat round dense :icon="revealMetaToken ? 'visibility_off' : 'visibility'" @click="revealMetaToken = !revealMetaToken" />
                  </template>
                </q-input>
                <q-input
                  outlined dense dark
                  v-model="metaForm.WHATSAPP_APP_SECRET"
                  :type="revealMetaAppSecret ? 'text' : 'password'"
                  label="WHATSAPP_APP_SECRET"
                  autocomplete="new-password"
                  data-lpignore="true"
                  class="q-mb-sm"
                >
                  <template #append>
                    <q-btn flat round dense :icon="revealMetaAppSecret ? 'visibility_off' : 'visibility'" @click="revealMetaAppSecret = !revealMetaAppSecret" />
                  </template>
                </q-input>
                <q-input
                  outlined dense dark
                  v-model="metaForm.WHATSAPP_WEBHOOK_VERIFY_TOKEN"
                  :type="revealMetaVerify ? 'text' : 'password'"
                  label="WHATSAPP_WEBHOOK_VERIFY_TOKEN"
                  hint="Must match Meta App → WhatsApp → Webhooks → Verify Token"
                  autocomplete="new-password"
                  data-lpignore="true"
                  class="q-mb-md"
                >
                  <template #append>
                    <q-btn flat round dense :icon="revealMetaVerify ? 'visibility_off' : 'visibility'" @click="revealMetaVerify = !revealMetaVerify" />
                  </template>
                </q-input>

                <q-btn
                  unelevated color="green-7" class="full-width"
                  icon="lock"
                  label="Save Meta WhatsApp Credentials"
                  :loading="savingMeta"
                  :disable="!metaFormHasValues"
                  @click="saveMetaWhatsApp"
                />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-5">
            <q-card flat class="enterprise-panel bg-subpanel border-main">
              <q-card-section>
                <div class="row items-center op-gap-8 q-mb-md">
                  <q-avatar size="md" color="blue-grey-8" text-color="cyan-2" icon="info" />
                  <div>
                    <div class="text-weight-bold text-subtitle1">How to configure</div>
                    <div class="text-caption text-grey-5">Meta App → WhatsApp → Webhooks</div>
                  </div>
                </div>
                <q-separator dark class="q-my-md opacity-20" />
                <ol class="text-caption text-grey-4 q-pl-md" style="line-height: 1.7;">
                  <li>Save credentials here for the <strong>PRODUCTION</strong> (or SANDBOX) tab</li>
                  <li>In Meta Developer Console open WhatsApp → Configuration</li>
                  <li>Callback URL = <code>{{ metaStatus?.webhookCallbackUrl || '{PUBLIC_API_BASE_URL}/webhooks/whatsapp' }}</code></li>
                  <li>Verify Token = exact <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> value</li>
                  <li>Subscribe to field <code>messages</code></li>
                  <li>Approve templates: OTP, invoice, receipt, payment reminder</li>
                </ol>
                <div class="text-caption text-grey-5 q-mt-md">
                  Empty fields are skipped on save (partial updates allowed). Secrets are never shown after save.
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Credentials Table -->
        <q-card flat class="bg-subpanel border-main">
          <q-table
            :rows="credentialsForEnv"
            :columns="columns"
            row-key="id"
            flat dark class="bg-transparent"
            :pagination="{ rowsPerPage: 10 }"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip dense size="sm" :color="getStatusColor(props.row.status)" text-color="white">
                  {{ props.row.status }}
                </q-chip>
                <q-chip dense size="sm" color="red-9" text-color="red-2" v-if="isExpired(props.row.expires_at)" class="q-ml-sm">
                  EXPIRED
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-secret="props">
              <q-td :props="props">
                <div class="row items-center">
                  <span class="text-grey-4 q-mr-sm text-monospace" v-if="!props.row.revealed">{{ getMaskedSecret(props.row.plaintext_value) }}</span>
                  <span class="text-white q-mr-sm text-monospace" v-else>{{ props.row.plaintext_value || '********' }}</span>
                  <q-btn flat round dense size="sm" color="grey-5" :icon="props.row.revealed ? 'visibility_off' : 'visibility'" @click="props.row.revealed = !props.row.revealed" />
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn flat dense color="cyan-3" label="Test Connection" size="sm" @click="testConnection(props.row)" v-if="props.row.status === 'ACTIVE'" />
                <q-btn flat round dense color="grey-5" icon="more_vert" size="sm">
                  <q-menu dark class="bg-panel border-main">
                    <q-list dense style="min-width: 150px">
                      <q-item clickable v-close-popup v-if="props.row.status === 'ACTIVE'" @click="rotateSecret(props.row)">
                        <q-item-section class="text-warning">Rotate Secret</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup v-if="props.row.status === 'STANDBY'" @click="activateSecret(props.row)">
                        <q-item-section class="text-positive">Promote to Active</q-item-section>
                      </q-item>
                      <q-item clickable v-close-popup v-if="props.row.status !== 'REVOKED'" @click="deleteSecret(props.row)">
                        <q-item-section class="text-red-4">Revoke Access</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card>

        <!-- Analytics and Health Info blocks -->
        <div class="row q-col-gutter-lg q-mt-md">
          <div class="col-12 col-md-6">
            <q-card flat class="bg-subpanel border-main q-pa-md">
              <div class="text-subtitle2 text-grey-4 q-mb-md">Dependency Mapping</div>
              <q-list dark dense>
                <q-item v-for="(dep, i) in integration?.integration_dependencies" :key="i">
                  <q-item-section avatar>
                    <q-icon name="check_circle" color="green-4" size="sm" />
                  </q-item-section>
                  <q-item-section>Used by Core Feature</q-item-section>
                </q-item>
                <q-item v-if="!integration?.integration_dependencies?.length">
                  <q-item-section class="text-grey-5">No known dependencies.</q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </div>
          <div class="col-12 col-md-6">
            <q-card flat class="bg-subpanel border-main q-pa-md">
              <div class="text-subtitle2 text-grey-4 q-mb-md">Latest Health Check</div>
              <div class="row items-center op-gap-8">
                <q-icon name="monitor_heart" size="md" color="green-4" />
                <div>
                  <div class="text-h6">Healthy</div>
                  <div class="text-caption text-grey-5">Latency: 112ms • Tested 2 mins ago</div>
                </div>
              </div>
            </q-card>
          </div>
        </div>

      </q-card-section>
    </q-card>

    <!-- Dialog for Adding new credential -->
    <q-dialog v-model="showAddDialog">
      <q-card class="bg-panel enterprise-panel text-main border-main" style="width: 500px; max-width: 90vw;">
        <q-card-section class="border-bottom">
          <div class="text-h6">Add New Credential</div>
        </q-card-section>
        <q-card-section class="q-pt-md column op-gap-16">
          <q-select outlined dense dark v-model="newCred.type" :options="['API_KEY', 'TOKEN', 'CLIENT_SECRET', 'CERTIFICATE', 'WEBHOOK_SECRET']" label="Credential Type" />
          <q-input outlined dense dark v-model="newCred.key_name" label="Key Name (e.g. KEY-002)" autocomplete="off" data-lpignore="true" spellcheck="false" />
          <q-input outlined dense dark type="password" v-model="newCred.value" label="Secret Value" autocomplete="new-password" data-lpignore="true" />
          <q-input outlined dense dark type="date" v-model="newCred.expires_at" label="Expiration Date" stack-label />
          <q-toggle v-model="newCred.rotate" color="warning" label="Rotate instantly (Demotes current ACTIVE key to STANDBY)" dark />
        </q-card-section>
        <q-card-actions align="right" class="border-top q-pa-md">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn unelevated color="cyan-6" label="Encrypt & Save" @click="saveNewCredential" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { vaultApi } from '../../api';

const props = defineProps({
  modelValue: Boolean,
  integration: Object
});
const emit = defineEmits(['update:modelValue', 'refresh']);

const $q = useQuasar();
const isOpen = ref(props.modelValue);
watch(() => props.modelValue, val => isOpen.value = val);
watch(isOpen, val => emit('update:modelValue', val));

const activeEnvironment = ref('PRODUCTION');
const showAddDialog = ref(false);
const webhookSecretInput = ref('');
const revealWebhook = ref(false);
const savingWebhook = ref(false);
const webhookStatus = ref(null);

const adminUsernameInput = ref('');
const adminPasswordInput = ref('');
const revealAdminPassword = ref(false);
const savingAdminCreds = ref(false);
const testingAdminCreds = ref(false);
const adminCredStatus = ref(null);
const adminLoginPing = ref(null);

const META_WHATSAPP_KEYS = [
  'PUBLIC_API_BASE_URL',
  'WHATSAPP_GRAPH_API_VERSION',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_PHONE_NUMBER_ID',
];

const metaStatus = ref(null);
const savingMeta = ref(false);
const revealMetaToken = ref(false);
const revealMetaAppSecret = ref(false);
const revealMetaVerify = ref(false);
const metaForm = ref({
  PUBLIC_API_BASE_URL: '',
  WHATSAPP_GRAPH_API_VERSION: 'v19.0',
  WHATSAPP_ACCESS_TOKEN: '',
  WHATSAPP_APP_SECRET: '',
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: '',
  WHATSAPP_PHONE_NUMBER_ID: '',
});

const newCred = ref({ type: 'API_KEY', key_name: '', value: '', expires_at: '', rotate: false });

const isQuasar = computed(() => {
  const id = String(props.integration?.service_identifier || '').toLowerCase();
  return id === 'quasar' || id === 'quasar_ledger' || id.includes('quasar');
});

const isMetaWhatsApp = computed(() => {
  const id = String(props.integration?.service_identifier || '').toUpperCase();
  return id === 'META_WHATSAPP' || id.includes('WHATSAPP');
});

const metaFormHasValues = computed(() =>
  META_WHATSAPP_KEYS.some((k) => String(metaForm.value[k] || '').trim() !== '')
);

const metaConfiguredCount = computed(() =>
  META_WHATSAPP_KEYS.filter((k) => metaKeyConfigured(k)).length
);

const columns = [
  { name: 'key_name', label: 'Version Name', align: 'left', field: 'key_name' },
  { name: 'type', label: 'Type', align: 'left', field: 'credential_type' },
  { name: 'status', label: 'Status', align: 'left', field: 'status' },
  { name: 'secret', label: 'Masked Secret', align: 'left' },
  { name: 'expires', label: 'Expires', align: 'left', field: 'expires_at' },
  { name: 'actions', label: 'Actions', align: 'right' }
];

const credentialsForEnv = computed(() => {
  const creds = props.integration?.integration_credentials || [];
  return creds.filter(c => c.environment === activeEnvironment.value);
});

function getCategoryColor(cat) {
  const map = { 'COMMUNICATIONS': 'green-6', 'MESSAGING': 'green-6', 'POS': 'cyan-6', 'AI': 'purple-6', 'PAYMENTS': 'teal-6' };
  return map[cat] || 'grey-6';
}

function getStatusColor(status) {
  if (status === 'ACTIVE') return 'green-8';
  if (status === 'STANDBY') return 'orange-8';
  return 'grey-8';
}

function isExpired(dateString) {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

function getMaskedSecret(secret) {
  if (!secret) return '••••••••••••••••';
  if (secret.length <= 6) return secret.substring(0, 1) + '••••' + secret.substring(secret.length - 1);
  return secret.substring(0, 3) + '••••••••••' + secret.substring(secret.length - 3);
}

async function loadWebhookStatus() {
  if (!isQuasar.value) return;
  try {
    const res = await vaultApi.getQuasarWebhookSecretStatus(activeEnvironment.value);
    webhookStatus.value = res.data?.data || res.data || null;
  } catch (err) {
    console.error(err);
    webhookStatus.value = { configured: false, sources: { runtimeEnv: false, integrationVault: false } };
  }
}

async function loadAdminCredStatus() {
  if (!isQuasar.value) return;
  try {
    const res = await vaultApi.getQuasarAdminCredentialsStatus(activeEnvironment.value);
    adminCredStatus.value = res.data?.data || res.data || null;
  } catch (err) {
    console.error(err);
    adminCredStatus.value = {
      configured: false,
      sources: { runtimeEnv: false, integrationVault: false, adminJwtEnv: false },
    };
  }
}

function onEnvironmentChange() {
  loadWebhookStatus();
  loadAdminCredStatus();
  loadMetaWhatsAppStatus();
}

function metaKeyConfigured(key) {
  return Boolean(metaStatus.value?.keys?.[key]?.configured);
}

async function loadMetaWhatsAppStatus() {
  if (!isMetaWhatsApp.value) return;
  try {
    const res = await vaultApi.getMetaWhatsAppStatus(activeEnvironment.value);
    metaStatus.value = res.data?.data || res.data || null;
  } catch (err) {
    console.error(err);
    metaStatus.value = { ready: false, keys: {}, webhookCallbackUrl: '/webhooks/whatsapp' };
  }
}

async function saveMetaWhatsApp() {
  if (!metaFormHasValues.value) {
    $q.notify({ type: 'warning', message: 'Enter at least one WhatsApp credential value.' });
    return;
  }
  try {
    savingMeta.value = true;
    const payload = { environment: activeEnvironment.value };
    for (const key of META_WHATSAPP_KEYS) {
      const val = String(metaForm.value[key] || '').trim();
      if (val) payload[key] = val;
    }
    const res = await vaultApi.saveMetaWhatsAppCredentials(payload);
    $q.notify({
      type: 'positive',
      message: res.data?.message || 'Meta WhatsApp credentials saved to Integration Vault.',
    });
    // Clear secrets after save; keep non-secret fields for convenience
    metaForm.value.WHATSAPP_ACCESS_TOKEN = '';
    metaForm.value.WHATSAPP_APP_SECRET = '';
    metaForm.value.WHATSAPP_WEBHOOK_VERIFY_TOKEN = '';
    revealMetaToken.value = false;
    revealMetaAppSecret.value = false;
    revealMetaVerify.value = false;
    await loadMetaWhatsAppStatus();
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Failed to save Meta WhatsApp credentials.',
    });
  } finally {
    savingMeta.value = false;
  }
}

async function saveWebhookSecret() {
  if (!webhookSecretInput.value || webhookSecretInput.value.length < 10) {
    $q.notify({ type: 'warning', message: 'Paste a valid signing secret (min 10 characters).' });
    return;
  }
  try {
    savingWebhook.value = true;
    const res = await vaultApi.saveQuasarWebhookSigningSecret({
      signingSecret: webhookSecretInput.value.trim(),
      environment: activeEnvironment.value,
    });
    $q.notify({
      type: 'positive',
      message: res.data?.responseMessage || 'Webhook signing secret saved.',
    });
    webhookSecretInput.value = '';
    revealWebhook.value = false;
    await loadWebhookStatus();
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({
      type: 'negative',
      message: err.response?.data?.responseMessage || err.response?.data?.error || 'Failed to save webhook secret.',
    });
  } finally {
    savingWebhook.value = false;
  }
}

async function saveAdminCredentials() {
  if (!adminUsernameInput.value || !adminPasswordInput.value) {
    $q.notify({ type: 'warning', message: 'Username and password are required.' });
    return;
  }
  try {
    savingAdminCreds.value = true;
    const res = await vaultApi.saveQuasarAdminCredentials({
      username: adminUsernameInput.value.trim(),
      password: adminPasswordInput.value,
      environment: activeEnvironment.value,
    });
    $q.notify({
      type: 'positive',
      message: res.data?.responseMessage || 'Quasar admin credentials saved.',
    });
    adminPasswordInput.value = '';
    revealAdminPassword.value = false;
    adminLoginPing.value = null;
    await loadAdminCredStatus();
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({
      type: 'negative',
      message: err.response?.data?.responseMessage || err.response?.data?.error || 'Failed to save admin credentials.',
    });
  } finally {
    savingAdminCreds.value = false;
  }
}

async function testAdminLogin() {
  const hasFormCreds = Boolean(adminUsernameInput.value && adminPasswordInput.value);
  if (!hasFormCreds && !adminCredStatus.value?.configured) {
    $q.notify({
      type: 'warning',
      message: 'Save Quasar admin credentials first, or enter username/password to ping.',
    });
    return;
  }
  try {
    testingAdminCreds.value = true;
    adminLoginPing.value = null;
    const payload = hasFormCreds
      ? {
          username: adminUsernameInput.value.trim(),
          password: adminPasswordInput.value,
          environment: activeEnvironment.value,
        }
      : { environment: activeEnvironment.value };
    const res = await vaultApi.testQuasarAdminCredentials(payload);
    const data = res.data?.data || res.data || {};
    adminLoginPing.value = {
      ok: true,
      message: res.data?.responseMessage || data.message || 'Login OK',
      latencyMs: data.latencyMs,
      quasarBaseUrl: data.quasarBaseUrl,
    };
    $q.notify({
      type: 'positive',
      message: adminLoginPing.value.message,
      timeout: 5000,
    });
  } catch (err) {
    console.error(err);
    const data = err.response?.data?.data || {};
    const message =
      err.response?.data?.responseMessage ||
      err.response?.data?.error ||
      err.message ||
      'Login ping failed';
    adminLoginPing.value = {
      ok: false,
      message,
      latencyMs: data.latencyMs,
      quasarBaseUrl: data.quasarBaseUrl,
    };
    $q.notify({ type: 'negative', message, timeout: 8000 });
  } finally {
    testingAdminCreds.value = false;
  }
}

function openAddDialog(prefill = {}) {
  showAddDialog.value = true;
  if (prefill.type) newCred.value.type = prefill.type;
  if (prefill.key_name) newCred.value.key_name = prefill.key_name;
  if (prefill.rotate) newCred.value.rotate = true;
}

async function testConnection(cred) {
  $q.notify({ type: 'info', message: `Pinging ${props.integration?.name}...` });
  try {
    const res = await vaultApi.testConnection(props.integration.id, {
      serviceIdentifier: props.integration.service_identifier,
      environment: activeEnvironment.value
    });
    $q.notify({ type: 'positive', message: `Connection successful! Latency: ${res.data.latency_ms}ms` });
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Connection test failed.' });
    emit('refresh');
  }
}

function rotateSecret() {
  openAddDialog({ rotate: true });
}

async function activateSecret(cred) {
  try {
    await vaultApi.activateCredential(props.integration.id, cred.id);
    $q.notify({ type: 'positive', message: 'Credential promoted to active.' });
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Failed to promote credential.' });
  }
}

function deleteSecret(cred) {
  $q.dialog({
    title: 'Confirm Revocation',
    message: `Are you sure you want to permanently delete the credential '${cred.key_name}'?`,
    cancel: true,
    persistent: true,
    ok: { color: 'negative', label: 'Revoke Access' }
  }).onOk(async () => {
    try {
      await vaultApi.deleteCredential(props.integration.id, cred.id);
      $q.notify({ type: 'positive', message: 'Credential deleted successfully.' });
      emit('refresh');
    } catch (err) {
      console.error(err);
      $q.notify({ type: 'negative', message: 'Failed to delete credential.' });
    }
  });
}

async function saveNewCredential() {
  if (!newCred.value.rotate) {
    const isDuplicate = props.integration?.credentials?.some(
      (c) => c.key_name === newCred.value.key_name && c.credential_type === newCred.value.type && c.environment === activeEnvironment.value
    );
    if (isDuplicate) {
      $q.notify({ type: 'negative', message: 'A credential with this Version Name and Type already exists. Please toggle "Rotate instantly" to rotate it, or use a different name.' });
      return;
    }
  }

  try {
    // Quasar webhook secrets also activate runtime HMAC verification
    if (isQuasar.value && newCred.value.type === 'WEBHOOK_SECRET') {
      await vaultApi.saveQuasarWebhookSigningSecret({
        signingSecret: newCred.value.value.trim(),
        environment: activeEnvironment.value,
      });
    } else {
      await vaultApi.addCredential(props.integration.id, {
        credential_type: newCred.value.type,
        environment: activeEnvironment.value,
        plaintext_value: newCred.value.value,
        key_name: newCred.value.key_name,
        expires_at: newCred.value.expires_at || null,
        rotate_existing: newCred.value.rotate
      });
    }
    $q.notify({ type: 'positive', message: 'Credential encrypted and saved successfully.' });
    showAddDialog.value = false;
    newCred.value = { type: 'API_KEY', key_name: '', value: '', expires_at: '', rotate: false };
    await loadWebhookStatus();
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Failed to save credential.' });
  }
}

watch(isQuasar, (val) => {
  if (val) {
    loadWebhookStatus();
    loadAdminCredStatus();
  }
}, { immediate: true });

watch(isMetaWhatsApp, (val) => {
  if (val) loadMetaWhatsAppStatus();
}, { immediate: true });

onMounted(() => {
  if (isQuasar.value) {
    loadWebhookStatus();
    loadAdminCredStatus();
  }
  if (isMetaWhatsApp.value) {
    loadMetaWhatsAppStatus();
  }
});
</script>

<style scoped>
.op-gap-8 { gap: 8px; }
.op-gap-16 { gap: 16px; }
</style>
