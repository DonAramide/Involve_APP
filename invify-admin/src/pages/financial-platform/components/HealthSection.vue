<template>
  <q-card class="health-section shadow-2">
    <q-card-section>
      <div class="row items-center q-mb-md">
        <q-icon name="monitor_heart" size="sm" color="primary" class="q-mr-sm" />
        <div class="text-h6">Connection Health</div>
      </div>
      
      <p class="text-body2 text-grey-8">
        Ensure the Quasar Financial Platform is responsive. The backend regularly pings the Quasar sandbox health endpoint.
      </p>

      <q-list bordered separator class="q-mt-md rounded-borders">
        <q-item>
          <q-item-section>
            <q-item-label>Status</q-item-label>
            <q-item-label caption>{{ details?.healthStatus || 'Unknown' }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon 
              :name="details?.healthStatus === 'HEALTHY' ? 'check_circle' : 'warning'" 
              :color="details?.healthStatus === 'HEALTHY' ? 'positive' : 'warning'" 
            />
          </q-item-section>
        </q-item>
        <q-item v-if="testResult">
          <q-item-section>
            <q-item-label>Latency</q-item-label>
            <q-item-label caption>{{ testResult.latencyMs }} ms</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge color="grey-3" text-color="black">{{ testResult.timestamp }}</q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
    
    <q-card-actions align="right" class="q-pa-md">
      <q-btn 
        outline 
        color="primary" 
        icon="sync" 
        label="Test Connection" 
        @click="runTest"
        :loading="testing"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import financialPlatformApi from 'src/api/financialPlatformApi'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  details: {
    type: Object,
    default: () => ({})
  }
})

const testing = ref(false)
const testResult = ref(null)

const runTest = async () => {
  testing.value = true
  const startTime = performance.now()
  try {
    await financialPlatformApi.testConnection()
    const endTime = performance.now()
    
    testResult.value = {
      latencyMs: Math.round(endTime - startTime),
      timestamp: new Date().toLocaleTimeString()
    }
    
    $q.notify({ type: 'positive', message: 'Connection is healthy' })
  } catch (error) {
    testResult.value = {
      latencyMs: 'Timeout/Error',
      timestamp: new Date().toLocaleTimeString()
    }
    $q.notify({ type: 'negative', message: 'Connection test failed' })
  } finally {
    testing.value = false
  }
}
</script>
