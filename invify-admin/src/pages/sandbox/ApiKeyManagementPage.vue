<template>
  <q-page class="q-pa-md bg-grey-1">
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" color="primary" to="/sandbox" class="q-mr-sm" />
      <div>
        <h1 class="text-h4 text-weight-bold q-my-none text-primary">API Key Management</h1>
        <p class="text-subtitle1 text-grey-7 q-mt-sm">Provision and manage sandbox access keys (sk_test_*) for tenants</p>
      </div>
      <q-space />
      <q-btn icon="add" label="Generate New Key" color="primary" unelevated @click="showCreateDialog = true" />
    </div>

    <!-- Active Keys Table -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold text-dark">Sandbox Keys</div>
          <q-space />
          <q-input v-model="filterTenantId" debounce="300" placeholder="Filter by Tenant ID" dense outlined class="q-mr-sm" style="width: 300px">
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn flat icon="refresh" color="primary" @click="fetchKeys" :loading="loading" />
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-table
          flat
          :rows="apiKeys"
          :columns="columns"
          row-key="id"
          :loading="loading"
        >
          <template v-slot:body-cell-key_prefix="props">
            <q-td :props="props">
              <code class="text-secondary bg-grey-2 q-pa-xs rounded-borders">{{ props.value }}</code>
            </q-td>
          </template>
          <template v-slot:body-cell-scopes="props">
            <q-td :props="props">
              <q-chip v-for="scope in props.value" :key="scope" size="sm" color="blue-1" text-color="primary" :label="scope" />
            </q-td>
          </template>
          <template v-slot:body-cell-is_active="props">
            <q-td :props="props">
              <q-chip size="sm" :color="props.value ? 'positive' : 'negative'" text-color="white" :label="props.value ? 'Active' : 'Revoked'" />
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn v-if="props.row.is_active" flat round size="sm" icon="block" color="negative" @click="confirmRevoke(props.row.id)">
                <q-tooltip>Revoke Key</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Create Key Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <div class="text-h6">Generate Sandbox Key</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="createKey" class="q-gutter-md">
            <q-input
              v-model="newKeyData.tenantId"
              label="Tenant ID (UUID) *"
              outlined
              :rules="[val => !!val || 'Tenant ID is required']"
            />
            <q-input
              v-model="newKeyData.label"
              label="Key Label (Optional)"
              outlined
              placeholder="e.g. Acme Corp Sandbox Key"
            />
            <div class="text-subtitle2 q-mb-sm">Scopes</div>
            <div class="q-gutter-sm">
              <q-checkbox v-model="newKeyData.scopes" val="sandbox:read" label="sandbox:read" color="primary" />
              <q-checkbox v-model="newKeyData.scopes" val="sandbox:write" label="sandbox:write" color="primary" />
            </div>

            <div class="row justify-end q-mt-lg">
              <q-btn label="Cancel" color="grey-7" flat v-close-popup />
              <q-btn label="Generate Key" color="primary" type="submit" :loading="creating" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- New Key Display Dialog (Shown Once) -->
    <q-dialog v-model="showNewKeyDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="bg-warning text-dark">
          <div class="text-h6 row items-center">
            <q-icon name="warning" size="md" class="q-mr-sm" />
            Copy this key now
          </div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <p class="text-body1">This API key will <strong>never be shown again</strong>. Please copy it and securely transmit it to the tenant.</p>
          
          <div class="q-pa-md bg-grey-2 rounded-borders row items-center q-my-md">
            <code class="text-h6 text-weight-bold text-dark q-mr-md" style="word-break: break-all;">
              {{ generatedKey }}
            </code>
            <q-space />
            <q-btn round flat icon="content_copy" color="primary" @click="copyKey">
              <q-tooltip>Copy to clipboard</q-tooltip>
            </q-btn>
          </div>
          
          <div class="text-caption text-grey-8">
            Tenant: {{ generatedKeyTenantName }} <br/>
            Scopes: {{ generatedKeyScopes.join(', ') }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn label="I have copied the key" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { sandboxApi } from 'src/api'
import { useQuasar, copyToClipboard } from 'quasar'

export default {
  name: 'ApiKeyManagementPage',
  setup () {
    const $q = useQuasar()
    const loading = ref(false)
    const apiKeys = ref([])
    const filterTenantId = ref('')
    
    // Create Dialog
    const showCreateDialog = ref(false)
    const creating = ref(false)
    const newKeyData = ref({ tenantId: '', label: '', scopes: ['sandbox:read', 'sandbox:write'] })

    // New Key Display Dialog
    const showNewKeyDialog = ref(false)
    const generatedKey = ref('')
    const generatedKeyTenantName = ref('')
    const generatedKeyScopes = ref([])

    const columns = [
      { name: 'label', label: 'Label', field: 'label', align: 'left', sortable: true },
      { name: 'key_prefix', label: 'Prefix', field: 'key_prefix', align: 'left' },
      { name: 'tenant_id', label: 'Tenant ID', field: 'tenant_id', align: 'left' },
      { name: 'scopes', label: 'Scopes', field: 'scopes', align: 'left' },
      { name: 'is_active', label: 'Status', field: 'is_active', align: 'center', sortable: true },
      { name: 'created_at', label: 'Created', field: 'created_at', align: 'left', format: val => new Date(val).toLocaleString() },
      { name: 'last_used_at', label: 'Last Used', field: 'last_used_at', align: 'left', format: val => val ? new Date(val).toLocaleString() : 'Never' },
      { name: 'actions', label: 'Actions', align: 'right' }
    ]

    const fetchKeys = async () => {
      loading.value = true
      try {
        const params = filterTenantId.value ? { tenantId: filterTenantId.value } : {}
        const res = await sandboxApi.listApiKeys(params)
        apiKeys.value = res.data.keys
      } catch (err) {
        console.error('Failed to fetch API keys', err)
        $q.notify({ type: 'negative', message: 'Failed to load API keys' })
      } finally {
        loading.value = false
      }
    }

    const createKey = async () => {
      creating.value = true
      try {
        const res = await sandboxApi.createApiKey(newKeyData.value)
        showCreateDialog.value = false
        
        // Show raw key
        generatedKey.value = res.data.apiKey
        generatedKeyTenantName.value = res.data.tenantName
        generatedKeyScopes.value = res.data.scopes
        showNewKeyDialog.value = true
        
        // Reset form
        newKeyData.value = { tenantId: '', label: '', scopes: ['sandbox:read', 'sandbox:write'] }
        fetchKeys()
      } catch (err) {
        $q.notify({ type: 'negative', message: err.response?.data?.error || 'Failed to generate key' })
      } finally {
        creating.value = false
      }
    }

    const confirmRevoke = (id) => {
      $q.dialog({
        title: 'Confirm Revocation',
        message: 'Are you sure you want to revoke this API key? This action cannot be undone and any integrations using it will break instantly.',
        cancel: true,
        persistent: true,
        color: 'negative'
      }).onOk(async () => {
        try {
          await sandboxApi.revokeApiKey(id)
          $q.notify({ type: 'positive', message: 'API key revoked' })
          fetchKeys()
        } catch (err) {
          $q.notify({ type: 'negative', message: 'Failed to revoke key' })
        }
      })
    }
    
    const copyKey = async () => {
      try {
        await copyToClipboard(generatedKey.value)
        $q.notify({ type: 'positive', message: 'API Key copied to clipboard', icon: 'content_copy' })
      } catch (err) {
        $q.notify({ type: 'negative', message: 'Failed to copy text' })
      }
    }

    watch(filterTenantId, () => {
      fetchKeys()
    })

    onMounted(() => {
      fetchKeys()
    })

    return {
      loading,
      apiKeys,
      columns,
      filterTenantId,
      showCreateDialog,
      creating,
      newKeyData,
      showNewKeyDialog,
      generatedKey,
      generatedKeyTenantName,
      generatedKeyScopes,
      fetchKeys,
      createKey,
      confirmRevoke,
      copyKey
    }
  }
}
</script>
