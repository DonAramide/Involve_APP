<template>
  <q-page padding class="q-pa-lg text-main bg-page">
    <div class="row items-center q-mb-xl justify-between">
      <div>
        <h4 class="text-h4 text-weight-bold q-my-none">Enterprise Configuration Workspace</h4>
        <div class="text-subtitle1 text-grey-7">Schema-driven global integration configuration engine</div>
      </div>
      <div class="row op-gap-16 items-center">
        <q-btn outline color="cyan-4" icon="arrow_back" label="Back to Legacy Vault" to="/admin/vault" />
        <q-select
          outlined dense dark
          v-model="selectedEnvironment"
          :options="['GLOBAL', 'PRODUCTION', 'STAGING', 'DEVELOPMENT']"
          label="Environment Scope"
          style="min-width: 200px"
        />
      </div>
    </div>

    <div class="row q-col-gutter-md h-full">
      <!-- Left Sidebar: Providers -->
      <div class="col-12 col-md-3">
        <q-card flat class="bg-panel border-main fit">
          <q-card-section class="border-bottom bg-subpanel">
            <div class="text-h6 text-weight-bold">Providers</div>
          </q-card-section>
          
          <q-list separator dark class="opacity-80">
            <q-item
              v-for="provider in providers"
              :key="provider.namespace"
              clickable
              v-ripple
              :active="activeProvider?.namespace === provider.namespace"
              active-class="bg-cyan-9 text-cyan-3"
              @click="selectProvider(provider)"
            >
              <q-item-section avatar>
                <q-icon :name="getProviderIcon(provider.category)" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ provider.displayName }}</q-item-label>
                <q-item-label caption class="text-grey-5">{{ provider.namespace }} v{{ provider.version }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-inner-loading :showing="loadingProviders">
            <q-spinner-dots size="40px" color="cyan-4" />
          </q-inner-loading>
        </q-card>
      </div>

      <!-- Right Panel: Configuration Form -->
      <div class="col-12 col-md-9">
        <q-card flat class="bg-panel border-main fit column" v-if="activeProvider">
          <q-card-section class="border-bottom bg-subpanel row justify-between items-center col-auto">
            <div>
              <div class="text-h6 text-weight-bold">{{ activeProvider.displayName }} Configuration</div>
              <div class="text-caption text-grey-5">{{ activeProvider.category }} • {{ selectedEnvironment }}</div>
            </div>
            <q-chip dense outline color="cyan-3" v-if="activeProvider.supportsSecrets">
              <q-icon name="lock" size="xs" class="q-mr-xs" />
              Vault Integrated
            </q-chip>
          </q-card-section>

          <q-card-section class="q-pa-lg col scroll" style="min-height: 400px;">
            <q-inner-loading :showing="loadingDefinitions">
              <q-spinner-dots size="40px" color="cyan-4" />
            </q-inner-loading>

            <div v-if="!loadingDefinitions && definitions.length > 0">
              <q-form @submit.prevent="saveConfiguration">
                <div class="row q-col-gutter-md">
                  <div v-for="def in definitions" :key="def.key" :class="def.valueType === 'boolean' ? 'col-12' : 'col-12 col-md-6'">
                    
                    <!-- Boolean Input -->
                    <template v-if="def.valueType === 'boolean'">
                      <q-toggle dark color="cyan-5" v-model="formValues[def.key]" :label="def.key" />
                    </template>

                    <!-- Secret Input -->
                    <template v-else-if="def.isSecretReference">
                      <div class="text-weight-bold q-mb-xs">{{ def.key }} <span class="text-red" v-if="def.isRequired">*</span></div>
                      
                      <div v-if="secretMasks[def.key]" class="row items-center justify-between border-main rounded-borders q-pa-sm bg-dark" style="height: 40px;">
                        <div class="row items-center op-gap-8">
                          <q-icon name="lock" color="green-4" />
                          <span class="text-grey-5 text-monospace" style="letter-spacing: 2px;">{{ secretMaskStrings[def.key] || '••••••••••••••••••••' }}</span>
                        </div>
                        <q-btn flat dense size="sm" color="warning" label="Replace" @click="secretMasks[def.key] = false" />
                      </div>
                      
                      <q-input 
                        v-else
                        outlined dense dark 
                        type="password" 
                        v-model="formValues[def.key]" 
                        :placeholder="`Enter new ${def.key}`"
                        autocomplete="new-password"
                        :rules="def.isRequired ? [val => !!val || 'Required field'] : []"
                      />
                    </template>

                    <!-- Standard String/Number Input -->
                    <template v-else>
                      <q-input 
                        outlined dense dark 
                        :type="def.valueType === 'number' ? 'number' : 'text'"
                        v-model="formValues[def.key]" 
                        :label="def.key"
                        :rules="def.isRequired ? [val => !!val || 'Required field'] : []"
                      />
                    </template>
                    
                    <div class="text-caption text-grey-6 q-mt-xs" v-if="def.description">{{ def.description }}</div>
                  </div>
                </div>

                <div class="row justify-between q-mt-xl items-center border-top q-pt-md">
                  <div class="row op-gap-8">
                    <q-btn 
                      v-if="activeProvider.supportsHealthChecks"
                      outline color="amber-6" 
                      label="Test Connection" 
                      icon="network_check" 
                      @click="testConnection"
                      :loading="testingConnection"
                    />
                    <q-chip v-if="healthResult" :color="healthResult.status === 'connected' ? 'green-9' : 'red-9'" text-color="white">
                      {{ healthResult.message }}
                    </q-chip>
                  </div>
                  
                  <q-btn unelevated color="cyan-6" label="Save Configuration" type="submit" :loading="saving" />
                </div>
              </q-form>
            </div>
            <div v-else-if="!loadingDefinitions" class="text-center text-grey-6 q-pa-xl">
              <q-icon name="warning" size="xl" />
              <div class="text-h6 q-mt-md">No definitions found for this provider.</div>
            </div>
          </q-card-section>
        </q-card>
        
        <div v-else class="flex flex-center bg-panel border-main rounded-borders" style="height: 100%; min-height: 400px;">
          <div class="text-center text-grey-6">
            <q-icon name="dns" size="xl" class="opacity-50 q-mb-md" />
            <div class="text-h6">Select a Provider</div>
            <div class="text-caption">Choose a provider from the sidebar to manage its configuration.</div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { ecsApi } from '../../api';

const $q = useQuasar();

const selectedEnvironment = ref('PRODUCTION');
const providers = ref([]);
const activeProvider = ref(null);
const definitions = ref([]);
const formValues = ref({});
const secretMasks = ref({}); // tracks { "qip.serviceSecret": true } if masked
const secretMaskStrings = ref({}); // stores the actual mask string (e.g. abc...xyz)
const healthResult = ref(null);

const loadingProviders = ref(false);
const loadingDefinitions = ref(false);
const saving = ref(false);
const testingConnection = ref(false);

onMounted(() => {
  fetchProviders();
});

watch(selectedEnvironment, () => {
  if (activeProvider.value) {
    fetchDefinitionsAndConfig(activeProvider.value.namespace);
  }
});

async function fetchProviders() {
  try {
    loadingProviders.value = true;
    const res = await ecsApi.getProviders();
    if (res.data?.success) {
      providers.value = res.data.data;
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Failed to load ECS providers' });
  } finally {
    loadingProviders.value = false;
  }
}

async function selectProvider(provider) {
  activeProvider.value = provider;
  await fetchDefinitionsAndConfig(provider.namespace);
}

async function fetchDefinitionsAndConfig(namespace) {
  try {
    loadingDefinitions.value = true;
    healthResult.value = null; // reset health on reload
    
    const defRes = await ecsApi.getDefinitions(namespace);
    if (defRes.data?.success) {
      // Sort definitions by displayOrder
      definitions.value = defRes.data.data.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    // Now fetch current config state for environment
    const confRes = await ecsApi.getConfiguration(namespace, selectedEnvironment.value);
    const configState = confRes.data?.data || {};

    const newForm = {};
    const newMasks = {};
    const newMaskStrings = {};

    definitions.value.forEach(def => {
      const val = configState[def.key];
      
      if (def.isSecretReference) {
        if (val && val.configured) {
          // Secret is configured in vault. Setup mask.
          newMasks[def.key] = true;
          newMaskStrings[def.key] = val.displayMask || '••••••••••••••••••••';
          newForm[def.key] = ''; // don't put vault ref in text box
        } else {
          newMasks[def.key] = false;
          newMaskStrings[def.key] = '';
          newForm[def.key] = '';
        }
      } else {
        newForm[def.key] = val !== undefined ? val : def.defaultValue;
      }
    });

    formValues.value = newForm;
    secretMasks.value = newMasks;
    secretMaskStrings.value = newMaskStrings;

  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Failed to load provider configuration' });
  } finally {
    loadingDefinitions.value = false;
  }
}

async function saveConfiguration() {
  try {
    saving.value = true;
    
    // Clean payload (remove empty secrets so we don't overwrite vault with empty string)
    const payloadValues = { ...formValues.value };
    for (const key of Object.keys(payloadValues)) {
      if (secretMasks.value[key] === true) {
        // Unmodified masked secret - delete from payload so backend ignores it
        delete payloadValues[key];
      }
    }

    const payload = {
      environment: selectedEnvironment.value,
      values: payloadValues
    };

    const res = await ecsApi.saveConfiguration(activeProvider.value.namespace, payload);
    if (res.data?.success) {
      $q.notify({ type: 'positive', message: 'Configuration saved successfully' });
      // Reload to restore masks
      fetchDefinitionsAndConfig(activeProvider.value.namespace);
    }
  } catch (error) {
    console.error(error);
    const errMsg = error.response?.data?.error?.message || 'Failed to save configuration';
    $q.notify({ type: 'negative', message: errMsg });
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  if (!activeProvider.value) return;
  
  try {
    testingConnection.value = true;
    const res = await ecsApi.testConnection(activeProvider.value.namespace, selectedEnvironment.value);
    
    if (res.data?.success) {
      healthResult.value = res.data.data;
    }
  } catch (error) {
    healthResult.value = { status: 'failed', message: error.response?.data?.error?.message || 'Connection test failed' };
  } finally {
    testingConnection.value = false;
  }
}

function getProviderIcon(category) {
  const map = {
    'Identity': 'shield',
    'Cloud Storage': 'cloud',
    'Payment': 'payment',
    'Communications': 'chat'
  };
  return map[category] || 'settings_applications';
}
</script>

<style scoped>
.bg-page { background: var(--q-dark); }
.border-main { border: 1px solid rgba(255,255,255,0.12); }
.border-bottom { border-bottom: 1px solid rgba(255,255,255,0.12); }
.border-top { border-top: 1px solid rgba(255,255,255,0.12); }
.bg-panel { background: rgba(30,35,45,0.9); }
.bg-subpanel { background: rgba(20,25,35,0.9); }
.opacity-80 { opacity: 0.8; }
</style>
