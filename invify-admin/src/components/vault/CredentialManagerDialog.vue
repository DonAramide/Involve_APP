<template>
  <q-dialog v-model="isOpen" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="bg-panel text-main enterprise-panel">
      <!-- HEADER -->
      <q-card-section class="row items-center border-bottom q-py-md bg-subpanel">
        <div class="row items-center op-gap-16">
          <q-avatar size="lg" :color="getCategoryColor(integration?.category)" text-color="white" icon="hub" />
          <div>
            <div class="text-h6 text-weight-bold">{{ integration?.name }} Vault</div>
            <div class="text-caption text-grey-5">Manage credentials, certificates, and environments</div>
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
          />
          <q-btn outline color="cyan-4" icon="add" label="Add New Version" @click="showAddDialog = true" />
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
                  <span class="text-grey-4 q-mr-sm text-monospace" v-if="!props.row.revealed">••••••••••••••••</span>
                  <span class="text-white q-mr-sm text-monospace" v-else>{{ props.row.mockPlaintext }}</span>
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
                      <q-item clickable v-close-popup v-if="props.row.status !== 'REVOKED'">
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
          <q-input outlined dense dark v-model="newCred.key_name" label="Key Name (e.g. KEY-002)" />
          <q-input outlined dense dark type="password" v-model="newCred.value" label="Secret Value" />
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
import { ref, watch, computed } from 'vue';
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

const newCred = ref({ type: 'API_KEY', key_name: '', value: '', expires_at: '', rotate: false });

const columns = [
  { name: 'key_name', label: 'Version Name', align: 'left', field: 'key_name' },
  { name: 'type', label: 'Type', align: 'left', field: 'credential_type' },
  { name: 'status', label: 'Status', align: 'left', field: 'status' },
  { name: 'secret', label: 'Masked Secret', align: 'left' },
  { name: 'expires', label: 'Expires', align: 'left', field: 'expires_at' },
  { name: 'actions', label: 'Actions', align: 'right' }
];

const mockCredentials = ref([]);

const credentialsForEnv = computed(() => {
  const creds = props.integration?.integration_credentials || [];
  return creds.filter(c => c.environment === activeEnvironment.value);
});

function getCategoryColor(cat) {
  const map = { 'COMMUNICATIONS': 'green-6', 'POS': 'cyan-6', 'AI': 'purple-6', 'PAYMENTS': 'teal-6' };
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
  showAddDialog.value = true;
  newCred.value.rotate = true;
}

async function saveNewCredential() {
  try {
    await vaultApi.addCredential(props.integration.id, {
      credential_type: newCred.value.type,
      environment: activeEnvironment.value,
      plaintext_value: newCred.value.value,
      key_name: newCred.value.key_name,
      expires_at: newCred.value.expires_at || null,
      rotate_existing: newCred.value.rotate
    });
    $q.notify({ type: 'positive', message: 'Credential encrypted and saved successfully.' });
    showAddDialog.value = false;
    newCred.value = { type: 'API_KEY', key_name: '', value: '', expires_at: '', rotate: false };
    emit('refresh');
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Failed to save credential.' });
  }
}
</script>
