<template>
  <q-card class="q-mb-lg connection-status-card">
    <q-card-section>
      <div class="row items-center justify-between">
        <div class="text-h6">Financial Platform Status</div>
        <q-chip :color="statusColor" text-color="white" icon="circle" size="sm">
          {{ formattedStatus }}
        </q-chip>
      </div>
    </q-card-section>
    
    <q-separator />
    
    <q-card-section class="q-pt-md">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Tenant ID</div>
          <div class="text-body1 text-weight-medium text-mono">{{ details?.tenantId || 'N/A' }}</div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Vault State</div>
          <div class="text-body1 text-weight-medium">{{ details?.vaultStatus || 'N/A' }}</div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Environment</div>
          <div class="text-body1 text-weight-medium text-capitalize">{{ details?.environment || 'Unknown' }}</div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Quasar Tenant</div>
          <div class="text-body1 text-weight-medium">{{ details?.quasarTenantId || 'N/A' }}</div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Health</div>
          <div class="text-body1 text-weight-medium row items-center">
            <q-icon :name="healthIcon" :color="healthColor" size="xs" class="q-mr-xs"/>
            {{ details?.healthStatus || 'N/A' }}
          </div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Provisioning Token</div>
          <div class="text-body1 text-weight-medium text-mono">{{ details?.provisioningToken || 'N/A' }}</div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Last Checked</div>
          <div class="text-body1">{{ details?.lastHealthCheckAt ? new Date(details.lastHealthCheckAt).toLocaleString() : 'N/A' }}</div>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <div class="text-caption text-grey">Last Rotation</div>
          <div class="text-body1">{{ details?.lastRotationAt ? new Date(details.lastRotationAt).toLocaleString() : 'Never' }}</div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  details: {
    type: Object,
    default: () => ({})
  }
})

const formattedStatus = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1).toLowerCase()
})

const statusColor = computed(() => {
  switch (props.status) {
    case 'ACTIVE': return 'positive'
    case 'PROVISIONING': return 'info'
    case 'DEGRADED': return 'warning'
    case 'SUSPENDED': return 'negative'
    default: return 'grey'
  }
})

const healthColor = computed(() => {
  switch (props.details?.healthStatus) {
    case 'HEALTHY': return 'positive'
    case 'DEGRADED': return 'warning'
    case 'OFFLINE': return 'negative'
    default: return 'grey'
  }
})

const healthIcon = computed(() => {
  switch (props.details?.healthStatus) {
    case 'HEALTHY': return 'check_circle'
    case 'DEGRADED': return 'warning'
    case 'OFFLINE': return 'error'
    default: return 'help'
  }
})
</script>

<style scoped>
.connection-status-card {
  border-left: 4px solid var(--q-primary);
}
.text-mono {
  font-family: monospace;
}
</style>
