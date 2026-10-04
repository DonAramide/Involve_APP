<template>
  <q-page class="q-pa-md bg-main text-main font-inter column op-gap-16" style="height: calc(100vh - 50px); overflow-y: auto;">
    <div class="row items-center justify-between border-bottom q-pb-sm">
      <div>
        <div class="text-operator-title text-weight-bold" style="font-size: 16px;">DEVELOPER & WEBHOOKS</div>
        <div class="text-caption text-muted">Signed commission events for your tenants. Test events do not affect your balance.</div>
      </div>
      <q-btn flat color="amber-4" label="Dashboard" no-caps @click="$router.push('/institute/dashboard')" />
    </div>

    <div class="bg-panel-darker border-muted rounded-borders q-pa-sm text-caption text-amber-4">
      Never share your private key. Invify will never request your private key. Webhook events are signed.
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl"><q-spinner color="amber-4" /></div>
    <div v-else class="column op-gap-16">
      <div class="row op-gap-16">
        <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-caption text-muted">Webhook Status</div>
          <div class="text-h6">{{ snap.webhook?.status || 'DISABLED' }}</div>
        </div>
        <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-caption text-muted">Last Delivery</div>
          <div class="text-caption">{{ snap.webhook?.last_delivery_at || '—' }}</div>
        </div>
        <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-caption text-muted">Success Rate</div>
          <div class="text-h6">{{ snap.stats?.success_rate || 0 }}%</div>
        </div>
        <div class="col-xs-12 col-sm bg-panel border-muted rounded-borders q-pa-md">
          <div class="text-caption text-muted">Failed Deliveries</div>
          <div class="text-h6 text-amber-4">{{ snap.stats?.failed_events || 0 }}</div>
        </div>
      </div>

      <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-8">
        <div class="text-weight-bold">Webhook configuration</div>
        <q-input dark outlined v-model="webhookUrl" label="Webhook URL" color="amber-4" />
        <div class="row op-gap-8">
          <q-btn color="amber-4" text-color="black" label="Save Webhook" no-caps @click="saveWebhook" />
          <q-btn outline color="amber-4" label="Enable" no-caps @click="setStatus('enable')" />
          <q-btn outline color="grey-4" label="Disable" no-caps @click="setStatus('disable')" />
          <q-btn outline color="amber-4" label="Send Test Webhook" no-caps @click="testWebhook" />
        </div>
        <div class="text-caption text-muted">Created {{ snap.webhook?.created_at || '—' }} · Updated {{ snap.webhook?.updated_at || '—' }}</div>
        <div class="text-caption text-muted">Last success {{ snap.webhook?.last_success_at || '—' }} · Last failure {{ snap.webhook?.last_failure_at || '—' }} · Failures {{ snap.webhook?.failure_count || 0 }}</div>
      </div>

      <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-8">
        <div class="text-weight-bold">Webhook security (Invify signing public key)</div>
        <div class="text-caption text-muted">Key ID {{ snap.webhook_signing?.key_id }} · {{ snap.webhook_signing?.fingerprint }}</div>
        <q-input dark outlined autogrow v-model="snap.webhook_signing.public_key" readonly label="Public key" color="amber-4" />
        <q-btn outline color="amber-4" label="Rotate webhook signing key" no-caps @click="rotateWebhook" />
      </div>

      <div class="bg-panel border-muted rounded-borders q-pa-md column op-gap-8">
        <div class="text-weight-bold">API credentials (separate from webhook signing)</div>
        <div class="text-caption text-muted">Key ID {{ snap.api_credentials?.key_id }} · {{ snap.api_credentials?.fingerprint }}</div>
        <div v-if="snap.api_credentials?.private_key" class="bg-panel-darker q-pa-md rounded-borders">
          <div class="text-amber-4 text-caption q-mb-sm">Your private key will not be shown again. Copy and store it now.</div>
          <q-input dark outlined autogrow v-model="snap.api_credentials.private_key" readonly />
          <q-btn dense color="amber-4" text-color="black" label="Copy private key" class="q-mt-sm" @click="copy(snap.api_credentials.private_key)" />
        </div>
        <q-btn outline color="amber-4" label="Rotate API credentials" no-caps @click="rotateApi" />
      </div>

      <div class="bg-panel border-muted rounded-borders q-pa-md">
        <div class="text-weight-bold q-mb-sm">Delivery history</div>
        <div class="text-caption text-muted" v-if="!deliveries.length">No deliveries yet.</div>
        <table v-else class="full-width text-left" style="border-collapse: collapse;">
          <thead class="text-caption text-muted">
            <tr>
              <th class="q-pa-xs">Event ID</th>
              <th class="q-pa-xs">Type</th>
              <th class="q-pa-xs">Tenant</th>
              <th class="q-pa-xs">Status</th>
              <th class="q-pa-xs">Attempts</th>
              <th class="q-pa-xs">HTTP</th>
              <th class="q-pa-xs">Created</th>
            </tr>
          </thead>
          <tbody class="text-caption">
            <tr v-for="d in deliveries" :key="d.event_id">
              <td class="q-pa-xs text-metric-mono">{{ String(d.event_id).slice(0, 8) }}</td>
              <td class="q-pa-xs">{{ d.event_type }}</td>
              <td class="q-pa-xs">{{ d.tenant_id ? String(d.tenant_id).slice(0, 8) : '—' }}</td>
              <td class="q-pa-xs">{{ d.status }}</td>
              <td class="q-pa-xs">{{ d.attempts }}</td>
              <td class="q-pa-xs">{{ d.http_status || '—' }}</td>
              <td class="q-pa-xs">{{ d.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(true)
const snap = ref({ webhook: {}, webhook_signing: {}, api_credentials: {}, stats: {} })
const webhookUrl = ref('')
const deliveries = ref([])

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('invify_agent_token')}` })

const load = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/agent/developer', { headers: headers() })
    snap.value = res.data.data
    webhookUrl.value = snap.value.webhook?.webhook_url || ''
    const hist = await axios.get('/api/agent/developer/deliveries', { headers: headers() })
    deliveries.value = hist.data.data || []
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Failed to load developer settings' })
  } finally {
    loading.value = false
  }
}

const saveWebhook = async () => {
  try {
    await axios.put('/api/agent/developer/webhook', { webhook_url: webhookUrl.value }, { headers: headers() })
    $q.notify({ type: 'positive', message: 'Webhook saved' })
    await load()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.message || 'Save failed' })
  }
}

const setStatus = async (action) => {
  await axios.post(`/api/agent/developer/webhook/${action}`, {}, { headers: headers() })
  await load()
}

const testWebhook = async () => {
  await axios.post('/api/agent/developer/webhook/test', {}, { headers: headers() })
  $q.notify({ type: 'info', message: 'Test event queued. It does not affect your balance.' })
  await load()
}

const rotateWebhook = async () => {
  if (!confirm('Rotate webhook signing key? Agents must update the public key.')) return
  await axios.post('/api/agent/developer/webhook/rotate', { confirm: true }, { headers: headers() })
  await load()
}

const rotateApi = async () => {
  if (!confirm('Rotate API credentials? The old private key stops working.')) return
  const res = await axios.post('/api/agent/developer/api-credentials/rotate', { confirm: true }, { headers: headers() })
  snap.value.api_credentials = res.data.data
  $q.notify({ type: 'warning', message: 'Copy your new private key now. It will not be shown again.' })
}

const copy = async (text) => {
  await navigator.clipboard.writeText(text)
  $q.notify({ type: 'positive', message: 'Copied' })
}

onMounted(load)
</script>

<style scoped>
.bg-main { background-color: #0b0f12; }
.bg-panel { background-color: #12181c; }
.bg-panel-darker { background-color: #0e1216; }
.text-main { color: #f8f9fa; }
.text-muted { color: #868e96; }
.border-muted { border: 1px solid #2a3339; }
.border-bottom { border-bottom: 1px solid #1a2024; }
.font-inter { font-family: 'Inter', Roboto, sans-serif; }
</style>
