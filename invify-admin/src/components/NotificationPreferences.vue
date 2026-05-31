<!-- invify-admin/src/components/NotificationPreferences.vue -->
<template>
  <div class="q-pa-md">
    <div class="text-h6 font-mono text-main q-mb-md">Notification Preferences</div>
    <div class="text-caption text-muted q-mb-lg">Configure delivery channels for different categories of operational events.</div>

    <q-list dark separator class="border-muted rounded-borders bg-subpanel">
      <q-item v-for="category in categories" :key="category.name" class="q-py-md">
        <q-item-section>
          <q-item-label class="text-main font-mono text-weight-bold">{{ category.name }} Alerts</q-item-label>
          <q-item-label caption class="text-muted">{{ category.description }}</q-item-label>
        </q-item-section>
        
        <q-item-section side>
          <div class="row items-center op-gap-12">
            <q-checkbox v-model="category.channels.inApp" label="In-App" color="cyan-4" dark dense size="sm" class="text-caption text-grey-4" />
            <q-checkbox v-model="category.channels.email" label="Email" color="cyan-4" dark dense size="sm" class="text-caption text-grey-4" />
            <q-checkbox v-model="category.channels.sms" label="SMS" color="cyan-4" dark dense size="sm" class="text-caption text-grey-4" />
            <q-checkbox v-model="category.channels.push" label="Push" color="cyan-4" dark dense size="sm" class="text-caption text-grey-4" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const categories = ref([
  { name: 'System', description: 'Platform health and infrastructure events', channels: { inApp: true, email: false, sms: false, push: false } },
  { name: 'Fraud', description: 'Velocity breaches and anomaly detection', channels: { inApp: true, email: true, sms: true, push: true } },
  { name: 'Compliance', description: 'KYC expirations and sanctions hits', channels: { inApp: true, email: true, sms: false, push: false } },
  { name: 'Settlement', description: 'Batch failures and liquidity warnings', channels: { inApp: true, email: true, sms: true, push: false } },
  { name: 'Treasury', description: 'Float alerts and sweeping confirmations', channels: { inApp: true, email: true, sms: false, push: false } },
  { name: 'Revenue', description: 'Fee extraction reports and reconciliation', channels: { inApp: true, email: false, sms: false, push: false } }
])
</script>

<style scoped>
.bg-subpanel { background: rgba(0, 0, 0, 0.2); }
.border-muted { border: 1px solid var(--enterprise-border); }
.text-main { color: var(--enterprise-text-main); }
.text-muted { color: var(--enterprise-text-muted); }
.op-gap-12 { gap: 12px; }
</style>
