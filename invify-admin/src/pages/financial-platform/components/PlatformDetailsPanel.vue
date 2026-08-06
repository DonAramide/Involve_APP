<template>
  <q-card flat bordered class="ops-card" role="region" aria-labelledby="fp-details-title">
    <q-expansion-item
      v-model="expanded"
      dark
      dense
      expand-separator
      header-class="text-white"
      :aria-label="'Toggle financial platform details'"
    >
      <template #header>
        <div class="row items-center full-width">
          <q-icon name="info" color="indigo-3" class="q-mr-sm" />
          <div>
            <div id="fp-details-title" class="text-subtitle2 text-weight-bold">Financial Platform Details</div>
            <div class="text-caption text-grey-5">Tenant identifiers, environment, and sync metadata</div>
          </div>
        </div>
      </template>

      <div class="details-grid q-pa-md">
        <div class="detail-cell">
          <div class="detail-label">Tenant ID</div>
          <div class="detail-value text-mono">{{ details?.tenantId || 'N/A' }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Quasar Tenant ID</div>
          <div class="detail-value text-mono">{{ details?.quasarTenantId || 'N/A' }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Environment</div>
          <div class="detail-value text-capitalize">{{ details?.environment || 'test' }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Platform version</div>
          <div class="detail-value">Financial Platform · v1</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Integration version</div>
          <div class="detail-value">Quasar Connector · v1</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Connected since</div>
          <div class="detail-value">{{ connectedSince }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Last synchronisation</div>
          <div class="detail-value">{{ lastSync }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">API endpoint</div>
          <div class="detail-value text-mono">/api/v1/tenants/…/financial-platform</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Webhook status</div>
          <div class="detail-value">
            <PlatformStatusBadge
              :status="details?.webhookStatus || (isActive ? 'HEALTHY' : 'DISABLED')"
              :label="details?.webhookStatus || (isActive ? 'Configured' : 'Inactive')"
            />
          </div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Provisioning token</div>
          <div class="detail-value text-mono">{{ details?.provisioningToken || 'N/A' }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Vault state</div>
          <div class="detail-value">{{ details?.vaultStatus || 'N/A' }}</div>
        </div>
        <div class="detail-cell">
          <div class="detail-label">Platform status</div>
          <div class="detail-value">
            <PlatformStatusBadge :status="status" />
          </div>
        </div>
      </div>
    </q-expansion-item>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import PlatformStatusBadge from './PlatformStatusBadge.vue'

const props = defineProps({
  status: { type: String, default: '' },
  details: { type: Object, default: () => ({}) }
})

const expanded = ref(false)
const isActive = computed(() => ['ACTIVE', 'DEGRADED'].includes(props.status))

const connectedSince = computed(() => {
  const ts = props.details?.activatedAt || props.details?.connectedAt || props.details?.createdAt
  return ts ? new Date(ts).toLocaleString() : '—'
})

const lastSync = computed(() => {
  const ts = props.details?.lastHealthCheckAt
  return ts ? new Date(ts).toLocaleString() : '—'
})
</script>

<style scoped>
.ops-card {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
}
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
@media (min-width: 960px) {
  .details-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.detail-cell {
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
}
.detail-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 4px;
}
.detail-value {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  word-break: break-all;
}
.text-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
</style>
