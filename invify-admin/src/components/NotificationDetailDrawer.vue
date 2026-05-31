<!-- invify-admin/src/components/NotificationDetailDrawer.vue -->
<template>
  <q-drawer v-model="isOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="500">
    <div class="column full-height no-wrap" v-if="notification">
      
      <!-- Header -->
      <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
        <div class="row items-center op-gap-8">
          <q-btn flat dense icon="arrow_back" color="cyan-4" @click="close" />
          <div class="text-h6 font-mono text-main truncate">{{ notification.notificationId }}</div>
        </div>
        <q-btn flat dense round icon="close" color="grey-5" @click="close" />
      </div>

      <q-tabs v-model="activeTab" dense class="text-muted border-bottom bg-dark" active-color="cyan-4" indicator-color="cyan-4" align="left">
        <q-tab name="overview" label="Overview" />
        <q-tab name="related" label="Related Record" />
        <q-tab name="timeline" label="Timeline" />
        <q-tab name="actions" label="Actions" />
        <q-tab name="audit" label="Audit Trail" />
        <q-tab name="history" label="Resolution" />
      </q-tabs>

      <q-scroll-area class="col q-pa-md">
        <q-tab-panels v-model="activeTab" animated class="bg-transparent">
          
          <q-tab-panel name="overview" class="q-pa-none">
            <div class="row items-center q-mb-md op-gap-8">
              <q-badge :color="getPriorityColorClass(notification.priority)">{{ notification.priority }}</q-badge>
              <q-badge color="grey-8">{{ notification.status }}</q-badge>
            </div>
            <div class="text-h5 text-main text-weight-bold q-mb-md">{{ notification.title }}</div>
            <div class="text-body2 text-muted q-mb-lg">{{ notification.message }}</div>
            
            <q-list dark separator class="border-muted rounded-borders bg-dark">
              <q-item>
                <q-item-section class="text-muted text-caption">Source Module</q-item-section>
                <q-item-section side class="text-main font-mono">{{ notification.sourceModule }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section class="text-muted text-caption">Created At</q-item-section>
                <q-item-section side class="text-main font-mono">{{ new Date(notification.createdAt).toLocaleString() }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section class="text-muted text-caption">Assigned To</q-item-section>
                <q-item-section side class="text-main font-mono text-cyan-4">{{ notification.assignedTo || 'Unassigned' }}</q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="related" class="q-pa-none">
            <div class="column op-gap-12">
              <q-card flat class="bg-dark border-muted q-pa-md rounded-borders">
                <div class="text-caption text-muted">Entity Type</div>
                <div class="text-h6 text-main font-mono q-mb-sm">{{ notification.entityType }}</div>
                <div class="text-caption text-muted">Entity ID</div>
                <div class="text-h6 text-cyan-4 font-mono">{{ notification.entityId }}</div>
                <q-btn unelevated color="cyan-5" text-color="black" label="Open Record" class="q-mt-md font-mono" />
              </q-card>
            </div>
          </q-tab-panel>

          <q-tab-panel name="timeline" class="q-pa-none">
            <q-timeline color="cyan-4" dark>
              <q-timeline-entry title="Generated" :subtitle="new Date(notification.createdAt).toLocaleString()" />
              <q-timeline-entry v-if="notification.readAt" title="Read" :subtitle="new Date(notification.readAt).toLocaleString()" color="grey-5" />
              <q-timeline-entry v-if="notification.acknowledgedAt" title="Acknowledged" :subtitle="new Date(notification.acknowledgedAt).toLocaleString()" color="amber-4" />
              <q-timeline-entry v-if="notification.resolvedAt" title="Resolved" :subtitle="new Date(notification.resolvedAt).toLocaleString()" color="green-4" />
            </q-timeline>
          </q-tab-panel>

          <q-tab-panel name="actions" class="q-pa-none">
            <div class="column op-gap-12">
              <q-btn outline color="cyan-4" label="Acknowledge" class="font-mono" @click="updateState('Acknowledged')" v-if="!notification.acknowledgedAt" />
              <q-btn outline color="green-4" label="Resolve" class="font-mono" @click="updateState('Resolved')" v-if="!notification.resolvedAt" />
              <q-btn outline color="amber-4" label="Escalate" class="font-mono" @click="updateState('Escalated')" />
              <q-btn outline color="purple-4" label="Assign To Me" class="font-mono" @click="assign" />
              <q-btn outline color="grey-5" label="Archive" class="font-mono" @click="updateState('Archived')" />
              <q-separator dark class="opacity-20 q-my-sm" />
              <q-btn flat color="red-4" label="Generate Incident" class="font-mono bg-red-10" />
            </div>
          </q-tab-panel>

          <q-tab-panel name="audit" class="q-pa-none text-muted">
            <div class="text-caption">Immutable Audit Lineage...</div>
          </q-tab-panel>

          <q-tab-panel name="history" class="q-pa-none text-muted">
            <div class="text-caption">Resolution Case History...</div>
          </q-tab-panel>
        </q-tab-panels>
      </q-scroll-area>
    </div>
  </q-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NotificationEngine } from 'src/services/NotificationEngine'

const props = defineProps({
  notification: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const isOpen = computed({
  get: () => !!props.notification,
  set: (val) => { if (!val) close() }
})

const activeTab = ref('overview')

const close = () => {
  emit('close')
}

const updateState = (state) => {
  if (props.notification) {
    NotificationEngine.updateStatus(props.notification.notificationId, state)
    close()
  }
}

const assign = () => {
  if (props.notification) {
    NotificationEngine.assign(props.notification.notificationId, 'current_user@invify.app')
  }
}

const getPriorityColorClass = (priority) => {
  switch (priority) {
    case 'Critical': return 'red-5'
    case 'High': return 'orange-5'
    case 'Medium': return 'amber-4'
    case 'Low': return 'cyan-4'
    default: return 'grey-5'
  }
}
</script>

<style scoped>
.bg-panel { background: var(--sidebar-panel-bg); }
.bg-subpanel { background: rgba(0, 0, 0, 0.2); }
.bg-dark { background: rgba(0, 0, 0, 0.4); }
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.text-main { color: var(--enterprise-text-main); }
.text-muted { color: var(--enterprise-text-muted); }
.opacity-20 { opacity: 0.2; }
.drawer-shadow { box-shadow: -4px 0 24px rgba(0,0,0,0.5); }
.op-gap-8 { gap: 8px; }
.op-gap-12 { gap: 12px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
