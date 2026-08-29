<template>
  <q-page padding class="bg-dark text-white">
    <div class="row items-center q-mb-lg">
      <q-icon name="security" size="md" color="indigo-4" class="q-mr-md" />
      <div>
        <h1 class="text-h5 q-my-none text-weight-bold">Authentication Settings</h1>
        <div class="text-caption text-grey-4">Manage onboarding verification channels</div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-8">
        <q-card class="bg-grey-10 border-indigo">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Onboarding Verification Channels</div>
            <div class="text-body2 text-grey-4 q-mb-lg">
              Toggle the required verification channels for new devices/tenants during onboarding. 
              The system will dynamically route users through enabled channels.
            </div>

            <q-list dark separator>
              <q-item tag="label" v-ripple>
                <q-item-section avatar>
                  <q-icon name="email" color="indigo-4" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Email Verification</q-item-label>
                  <q-item-label caption class="text-grey-5">Send a 6-digit OTP to the registered email address</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle color="indigo" v-model="channels.email" />
                </q-item-section>
              </q-item>

              <q-item tag="label" v-ripple>
                <q-item-section avatar>
                  <q-icon name="chat" color="green-4" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>WhatsApp Verification</q-item-label>
                  <q-item-label caption class="text-grey-5">Send a verification code via WhatsApp. Off by default; enable here to require it during web and mobile onboarding.</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle color="green" v-model="channels.whatsapp" />
                </q-item-section>
              </q-item>

              <!-- Future channels can be added here easily -->
              <q-item tag="label" v-ripple class="opacity-50">
                <q-item-section avatar>
                  <q-icon name="sms" color="grey-6" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-grey-5">SMS Verification (Coming Soon)</q-item-label>
                  <q-item-label caption class="text-grey-6">Send an OTP via traditional SMS</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle color="grey" disable :model-value="false" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat color="grey-4" label="Cancel" @click="fetchSettings" :disable="loading" />
            <q-btn unelevated color="indigo" label="Save Changes" @click="saveSettings" :loading="loading" />
          </q-card-actions>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card class="bg-grey-10 border-indigo">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <q-icon name="info" color="indigo-4" class="q-mr-sm" />
              <div class="text-weight-bold">How it works</div>
            </div>
            <div class="text-caption text-grey-4">
              <p>When multiple channels are enabled, the onboarding engine will route the user sequentially through each required channel.</p>
              <p>If all channels are disabled, the onboarding engine will automatically skip verification and activate the account instantly.</p>
              <div class="q-mt-md q-pa-sm bg-dark rounded-borders border-indigo-light">
                <div class="text-weight-bold text-indigo-2 q-mb-xs">Current JSON Payload:</div>
                <pre class="q-ma-none text-grey-5" style="font-size: 11px;">{{ computedPayload }}</pre>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, reactive, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'AuthenticationSettingsPage',
  
  setup () {
    const $q = useQuasar()
    const loading = ref(false)
    
    const channels = reactive({
      email: true,
      whatsapp: false
    })

    const computedPayload = computed(() => {
      const active = []
      if (channels.email) active.push('EMAIL')
      if (channels.whatsapp) active.push('WHATSAPP')
      return JSON.stringify({ requiredChannels: active }, null, 2)
    })

    const fetchSettings = async () => {
      try {
        loading.value = true
        const response = await api.get('/settings/onboarding')
        const requiredChannels = response.data.requiredChannels || []
        
        channels.email = requiredChannels.includes('EMAIL')
        channels.whatsapp = requiredChannels.includes('WHATSAPP')
      } catch (error) {
        console.error('Failed to fetch settings', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to load onboarding settings'
        })
      } finally {
        loading.value = false
      }
    }

    const saveSettings = async () => {
      try {
        loading.value = true
        const payload = []
        if (channels.email) payload.push('EMAIL')
        if (channels.whatsapp) payload.push('WHATSAPP')
        
        await api.patch('/settings/onboarding', { requiredChannels: payload })
        
        $q.notify({
          type: 'positive',
          message: 'Authentication settings updated successfully'
        })
      } catch (error) {
        console.error('Failed to save settings', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to save settings'
        })
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      fetchSettings()
    })

    return {
      channels,
      loading,
      fetchSettings,
      saveSettings,
      computedPayload
    }
  }
})
</script>

<style scoped>
.border-indigo {
  border: 1px solid rgba(99, 102, 241, 0.2);
}
.border-indigo-light {
  border: 1px solid rgba(99, 102, 241, 0.1);
}
</style>
