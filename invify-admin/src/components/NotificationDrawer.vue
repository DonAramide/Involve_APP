<!-- invify-admin/src/components/NotificationDrawer.vue -->
<template>
  <q-drawer v-model="isOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="450">
    <div class="column full-height no-wrap">
      
      <!-- Header -->
      <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
        <div class="row items-center op-gap-8">
          <q-icon name="notifications" :color="headerIconColor" size="sm" />
          <div class="text-h6 font-mono text-main">Global Notifications</div>
          <q-badge v-if="unreadCount > 0" :color="headerBadgeColor" text-color="white" rounded>{{ unreadCount }}</q-badge>
        </div>
        <q-btn flat dense round icon="close" color="grey-5" @click="isOpen = false" />
      </div>

      <!-- Filters -->
      <div class="q-px-md q-py-sm border-bottom row items-center justify-between bg-dark">
        <div class="row op-gap-8">
          <q-btn flat dense size="sm" color="cyan-4" label="All" class="font-mono text-caption" :class="{ 'bg-cyan-10': filter === 'All' }" @click="filter = 'All'" />
          <q-btn flat dense size="sm" color="grey-5" label="Unread" class="font-mono text-caption" :class="{ 'bg-grey-9': filter === 'Unread' }" @click="filter = 'Unread'" />
          <q-btn flat dense size="sm" color="red-4" label="Critical" class="font-mono text-caption" :class="{ 'bg-red-10': filter === 'Critical' }" @click="filter = 'Critical'" />
        </div>
        <q-btn flat dense size="sm" color="grey-5" icon="more_vert">
          <q-menu class="bg-panel border-muted">
            <q-list dark class="font-mono text-caption">
              <q-item clickable v-close-popup @click="markAllRead">
                <q-item-section>Mark All Read</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="showPreferences = true">
                <q-item-section>Preferences</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>

      <!-- Extended Tabs -->
      <q-tabs v-model="tab" dense class="text-muted border-bottom bg-subpanel" active-color="cyan-4" indicator-color="cyan-4" align="left" narrow-indicator>
        <q-tab name="all" label="All" />
        <q-tab name="assigned" label="Assigned To Me" />
        <q-tab name="approvals" label="Approvals" />
        <q-tab name="workflow" label="Workflow" />
        <q-tab name="resolved" label="Resolved" />
      </q-tabs>

      <!-- List -->
      <q-scroll-area class="col q-pa-md">
        <div v-if="filteredNotifications.length === 0" class="text-center text-muted font-mono q-mt-xl">
          <q-icon name="done_all" size="xl" color="green-4" class="q-mb-md opacity-50" />
          <div>No notifications in this view.</div>
        </div>

        <div v-else class="column op-gap-12">
          <q-card 
            v-for="notif in filteredNotifications" 
            :key="notif.notificationId" 
            flat 
            class="bg-subpanel border-muted rounded-borders cursor-pointer alert-card"
            :class="{ 'opacity-60': ['Read', 'Acknowledged', 'Resolved', 'Archived'].includes(notif.status) }"
            @click="selectNotification(notif)"
          >
            <div class="row items-stretch no-wrap">
              <div :class="getPriorityColor(notif.priority)" class="priority-bar"></div>
              <div class="col q-pa-sm">
                <div class="row justify-between items-start q-mb-xs">
                  <div class="text-caption font-mono text-weight-bold" :class="`text-${getCategoryColor(notif.category)}`">
                    {{ notif.category }}
                  </div>
                  <div class="text-caption font-mono text-muted" style="font-size: 10px;">{{ formatTime(notif.createdAt) }}</div>
                </div>
                <div class="text-subtitle2 text-main text-weight-bold" style="line-height: 1.2;">{{ notif.title }}</div>
                <div class="text-caption text-muted q-mt-xs text-ellipsis-2">{{ notif.message }}</div>
                <div class="row q-mt-xs justify-between items-center">
                  <div class="text-caption font-mono text-cyan-4" style="font-size: 10px;">{{ notif.entityId }}</div>
                  <q-badge color="grey-8" class="font-mono">{{ notif.status }}</q-badge>
                </div>
              </div>
            </div>
          </q-card>
        </div>
      </q-scroll-area>
    </div>

    <q-dialog v-model="showPreferences" position="standard">
      <q-card class="bg-panel border-muted" style="width: 700px; max-width: 90vw;">
        <div class="row justify-between items-center q-pa-md border-bottom bg-subpanel">
          <div class="text-h6 font-mono text-main">Communication Preferences</div>
          <q-btn dense flat icon="close" color="grey-5" v-close-popup />
        </div>
        <NotificationPreferences />
      </q-card>
    </q-dialog>
  </q-drawer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NotificationEngine } from 'src/services/NotificationEngine'
import NotificationPreferences from './NotificationPreferences.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select-notification'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const notifications = ref([])
const filter = ref('All')
const tab = ref('all')
const showPreferences = ref(false)

const unreadCount = computed(() => notifications.value.filter(n => n.status === 'Unread').length)
const hasCriticalUnread = computed(() => notifications.value.some(n => n.status === 'Unread' && n.priority === 'Critical'))

const headerIconColor = computed(() => {
  if (hasCriticalUnread.value) return 'red-5'
  if (unreadCount.value > 0) return 'amber-4'
  return 'green-4'
})

const headerBadgeColor = computed(() => {
  return hasCriticalUnread.value ? 'red-5' : 'amber-5'
})

const filteredNotifications = computed(() => {
  let result = [...notifications.value]
  
  if (filter.value === 'Unread') {
    result = result.filter(n => n.status === 'Unread')
  } else if (filter.value === 'Critical') {
    result = result.filter(n => n.priority === 'Critical')
  }

  if (tab.value === 'assigned') {
    result = result.filter(n => n.assignedTo === 'current_user@invify.app') // Mock
  } else if (tab.value === 'approvals') {
    result = result.filter(n => n.category === 'Approvals')
  } else if (tab.value === 'workflow') {
    result = result.filter(n => n.category === 'Workflow')
  } else if (tab.value === 'resolved') {
    result = result.filter(n => n.status === 'Resolved')
  }

  return result
})

const handleUpdate = (data) => {
  notifications.value = [...data]
}

onMounted(() => {
  NotificationEngine.subscribe(handleUpdate)
})

onUnmounted(() => {
  NotificationEngine.unsubscribe(handleUpdate)
})

const selectNotification = (notif) => {
  if (notif.status === 'Unread') {
    NotificationEngine.updateStatus(notif.notificationId, 'Read')
  }
  emit('select-notification', notif)
}

const markAllRead = () => {
  NotificationEngine.markAllAsRead()
}

const formatTime = (isoString) => {
  const d = new Date(isoString)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Critical': return 'bg-red-5'
    case 'High': return 'bg-orange-5'
    case 'Medium': return 'bg-amber-4'
    case 'Low': return 'bg-cyan-4'
    default: return 'bg-grey-5'
  }
}

const getCategoryColor = (category) => {
  switch (category) {
    case 'Fraud': return 'red-4'
    case 'Compliance': return 'purple-4'
    case 'Settlement': return 'indigo-4'
    case 'Treasury': return 'green-4'
    case 'Executive': return 'amber-4'
    case 'Approvals': return 'pink-4'
    default: return 'cyan-4'
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
.opacity-60 { opacity: 0.6; }
.opacity-50 { opacity: 0.5; }
.drawer-shadow { box-shadow: -4px 0 24px rgba(0,0,0,0.5); }
.op-gap-8 { gap: 8px; }
.op-gap-12 { gap: 12px; }

.alert-card { transition: all 0.2s ease; }
.alert-card:hover { background: rgba(255,255,255,0.05); }
.priority-bar { width: 4px; min-height: 100%; }
.text-ellipsis-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
