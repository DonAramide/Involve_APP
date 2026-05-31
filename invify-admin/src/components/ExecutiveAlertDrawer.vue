<!-- invify-admin/src/components/ExecutiveAlertDrawer.vue -->
<template>
  <q-drawer v-model="isOpen" side="right" overlay bordered class="bg-panel border-left drawer-shadow" :width="400">
    <div class="column full-height no-wrap">
      
      <!-- Header -->
      <div class="q-pa-md border-bottom bg-subpanel row items-center justify-between">
        <div class="row items-center op-gap-8">
          <q-icon name="notifications_active" color="amber-4" size="sm" />
          <div class="text-h6 font-mono text-main">Executive Alerts</div>
          <q-badge v-if="unreadCount > 0" color="red-5" text-color="white" rounded>{{ unreadCount }}</q-badge>
        </div>
        <q-btn flat dense round icon="close" color="grey-5" @click="closeDrawer" />
      </div>

      <!-- Actions -->
      <div class="q-px-md q-py-sm border-bottom row items-center justify-end bg-dark">
        <q-btn flat dense size="sm" color="cyan-4" label="Mark All Read" @click="markAllRead" class="font-mono text-caption" />
      </div>

      <!-- Alert List -->
      <q-scroll-area class="col q-pa-md">
        <div v-if="alerts.length === 0" class="text-center text-muted font-mono q-mt-xl">
          <q-icon name="check_circle" size="xl" color="green-4" class="q-mb-md opacity-50" />
          <div>No active alerts.</div>
        </div>

        <div v-else class="column op-gap-12">
          <q-card 
            v-for="alert in alerts" 
            :key="alert.id" 
            flat 
            class="bg-subpanel border-muted rounded-borders cursor-pointer alert-card"
            :class="{ 'opacity-60': alert.read }"
            @click="handleAlertClick(alert)"
          >
            <div class="row items-stretch no-wrap">
              <div :class="getSeverityColor(alert.severity)" class="severity-bar"></div>
              <div class="col q-pa-sm">
                <div class="row justify-between items-start q-mb-xs">
                  <div class="text-caption font-mono text-weight-bold" :class="getSeverityTextColor(alert.severity)">
                    {{ alert.type }}
                  </div>
                  <div class="text-caption font-mono text-muted" style="font-size: 10px;">{{ formatTime(alert.timestamp) }}</div>
                </div>
                <div class="text-subtitle2 text-main text-weight-bold" style="line-height: 1.2;">{{ alert.title }}</div>
                <div class="text-caption text-muted q-mt-xs">{{ alert.message }}</div>
              </div>
            </div>
          </q-card>
        </div>
      </q-scroll-area>
    </div>
  </q-drawer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ExecutiveAlertEngine } from 'src/services/ExecutiveAlertEngine'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const alerts = ref([])
const unreadCount = ref(0)

const updateAlerts = (newAlerts) => {
  alerts.value = [...newAlerts]
  unreadCount.value = ExecutiveAlertEngine.getUnreadCount()
}

onMounted(() => {
  ExecutiveAlertEngine.subscribe(updateAlerts)
})

onUnmounted(() => {
  ExecutiveAlertEngine.unsubscribe(updateAlerts)
})

const closeDrawer = () => {
  isOpen.value = false
}

const markAllRead = () => {
  ExecutiveAlertEngine.markAllAsRead()
}

const handleAlertClick = (alert) => {
  ExecutiveAlertEngine.markAsRead(alert.id)
  if (alert.link) {
    router.push(alert.link)
    closeDrawer()
  }
}

const formatTime = (isoString) => {
  const d = new Date(isoString)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-5'
    case 'HIGH': return 'bg-orange-5'
    case 'MEDIUM': return 'bg-amber-4'
    case 'LOW': return 'bg-cyan-4'
    default: return 'bg-grey-5'
  }
}

const getSeverityTextColor = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'text-red-4'
    case 'HIGH': return 'text-orange-4'
    case 'MEDIUM': return 'text-amber-4'
    case 'LOW': return 'text-cyan-4'
    default: return 'text-grey-4'
  }
}
</script>

<style scoped>
.border-bottom { border-bottom: 1px solid var(--enterprise-border); }
.border-left { border-left: 1px solid var(--enterprise-border); }
.border-muted { border: 1px solid var(--enterprise-border); }
.opacity-60 { opacity: 0.6; }
.opacity-50 { opacity: 0.5; }

.alert-card {
  transition: all 0.2s ease;
}
.alert-card:hover {
  background: rgba(255,255,255,0.05);
}

.severity-bar {
  width: 4px;
  min-height: 100%;
}
</style>
