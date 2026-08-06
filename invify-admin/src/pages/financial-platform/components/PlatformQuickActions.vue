<template>
  <q-card flat bordered class="ops-card" role="region" aria-labelledby="fp-actions-title">
    <q-card-section>
      <div id="fp-actions-title" class="text-subtitle1 text-weight-bold text-white q-mb-xs">Quick Actions</div>
      <div class="text-caption text-grey-5 q-mb-md">Operational controls using existing platform endpoints</div>
      <div class="action-grid">
        <q-btn
          outline
          color="cyan-4"
          icon="sync"
          label="Test Connection"
          class="action-btn"
          :loading="busy === 'test'"
          :disable="!!busy"
          @click="$emit('testConnection')"
        />
        <q-btn
          outline
          color="amber-4"
          icon="autorenew"
          label="Rotate Credentials"
          class="action-btn"
          :loading="busy === 'rotate'"
          :disable="!!busy"
          @click="$emit('rotate')"
        />
        <q-btn
          outline
          color="indigo-4"
          icon="refresh"
          label="Refresh Health"
          class="action-btn"
          :loading="busy === 'refresh'"
          :disable="!!busy"
          @click="$emit('refresh')"
        />
        <q-btn
          outline
          color="grey-5"
          icon="history"
          label="View Logs"
          class="action-btn"
          :disable="!!busy"
          @click="$emit('viewLogs')"
        />
        <q-btn
          outline
          color="grey-5"
          icon="download"
          label="Download Audit"
          class="action-btn"
          :disable="!!busy"
          @click="$emit('downloadAudit')"
        />
        <q-btn
          outline
          color="green-4"
          icon="link"
          label="Reconnect Platform"
          class="action-btn"
          :loading="busy === 'reconnect'"
          :disable="!!busy"
          @click="$emit('reconnect')"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  busy: { type: String, default: '' }
})

defineEmits(['testConnection', 'rotate', 'refresh', 'viewLogs', 'downloadAudit', 'reconnect'])
</script>

<style scoped>
.ops-card {
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.18) !important;
  border-radius: 12px;
}
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
@media (min-width: 900px) {
  .action-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.action-btn {
  justify-content: flex-start;
  padding: 8px 12px;
}
</style>
