<template>
  <q-page class="q-pa-md" :class="{ 'bg-grey-1': !$q.dark.isActive, 'bg-dark': $q.dark.isActive }">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h4 class="text-weight-bold text-primary q-my-none">Communications & Support</h4>
        <div class="text-subtitle1" :class="{'text-grey-7': !$q.dark.isActive, 'text-grey-4': $q.dark.isActive}">Manage support contacts and send real-time broadcasts.</div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Contact Settings Column -->
      <div class="col-12 col-md-6">
        <q-card class="my-card shadow-2 rounded-borders q-mb-md">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">
              <q-icon name="support_agent" size="sm" class="q-mr-sm" />
              Support Contacts
            </div>
            <div class="text-subtitle2">Update contact numbers displayed in the mobile app.</div>
          </q-card-section>

          <q-card-section class="q-pa-md">
            <q-select
              outlined
              v-model="selectedTenant"
              :options="tenantOptions"
              label="Select Tenant Scope"
              emit-value
              map-options
              @update:model-value="onTenantChanged"
              class="q-mb-md"
            />
            
            <q-form @submit="saveSettings" class="q-gutter-md">
              <q-input
                outlined
                v-model="supportPhone"
                label="Support Phone Number"
                hint="e.g. +234 800 INVIFY or +1 (800) 123-4567"
              >
                <template v-slot:prepend><q-icon name="phone" color="primary" /></template>
              </q-input>

              <q-input
                outlined
                v-model="supportEmail"
                label="Support Email Address"
                hint="e.g. support@invify.app"
              >
                <template v-slot:prepend><q-icon name="email" color="primary" /></template>
              </q-input>

              <q-input
                outlined
                v-model="supportWhatsapp"
                label="WhatsApp Contact Number"
                hint="e.g. +2348023552282"
              >
                <template v-slot:prepend><q-icon name="chat" color="green" /></template>
              </q-input>

              <div class="row justify-end q-mt-md">
                <q-btn
                  :label="selectedTenant === 'global' ? 'Save Global Contacts' : 'Save Tenant Contacts'"
                  type="submit"
                  color="primary"
                  icon="save"
                  :loading="saving"
                  unelevated
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- Broadcast Column -->
      <div class="col-12 col-md-6">
        <q-card class="my-card shadow-2 rounded-borders">
          <q-card-section class="bg-orange-9 text-white">
            <div class="text-h6">
              <q-icon name="campaign" size="sm" class="q-mr-sm" />
              Live Broadcasts
            </div>
            <div class="text-subtitle2">Push real-time socket notifications to active devices.</div>
          </q-card-section>

          <q-card-section class="q-pa-md">
            <q-form @submit="sendBroadcast" class="q-gutter-md">
              <q-select
                outlined
                v-model="broadcastTargetType"
                :options="[{label: 'All Active Devices', value: 'all'}, {label: 'Specific Plan', value: 'plan'}, {label: 'Specific Type', value: 'type'}, {label: 'Specific Tenant', value: 'tenant'}, {label: 'Agent Base Tenant', value: 'agent'}]"
                label="Target Audience"
                emit-value
                map-options
              />

              <q-select
                v-if="broadcastTargetType === 'plan'"
                outlined
                v-model="broadcastTargetValue"
                :options="[{label: 'Free Plan', value: 'Free'}, {label: 'Starter Plan', value: 'Starter'}, {label: 'Standard Plan', value: 'Standard'}, {label: 'Premium Plan', value: 'Premium'}, {label: 'Enterprise Plan', value: 'Enterprise'}]"
                label="Select Plan to target"
                emit-value
                map-options
              />
              <q-select
                v-else-if="broadcastTargetType === 'type'"
                outlined
                v-model="broadcastTargetValue"
                :options="[{label: 'School Mode', value: 'school'}, {label: 'Retail Mode', value: 'retail'}, {label: 'Service Mode', value: 'service'}]"
                label="Select Mode to target"
                emit-value
                map-options
              />
              <q-select
                v-else-if="broadcastTargetType === 'tenant'"
                outlined
                v-model="broadcastTargetValue"
                :options="tenantOptions.filter(t => t.value !== 'global')"
                label="Select Tenant to target"
                emit-value
                map-options
              />
              <q-select
                v-else-if="broadcastTargetType === 'agent'"
                outlined
                v-model="broadcastTargetValue"
                :options="agentOptions"
                label="Select Agent to target"
                emit-value
                map-options
              />

              <q-input
                outlined
                v-model="broadcastMessage"
                type="textarea"
                label="Broadcast Message"
                autogrow
                placeholder="Type your alert here..."
                :rules="[val => !!val || 'Message is required']"
              />

              <div class="row justify-end q-mt-md">
                <q-btn
                  label="Send Live Broadcast"
                  type="submit"
                  color="orange-9"
                  icon="send"
                  :loading="broadcasting"
                  unelevated
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { adminApi } from '../../api'

const $q = useQuasar()

// Contact form state
const selectedTenant = ref('global')
const tenantOptions = ref([{ label: 'Global Settings (Fallback)', value: 'global' }])
const agentOptions = ref([])
const tenantsData = ref([])

const supportPhone = ref('')
const supportEmail = ref('')
const supportWhatsapp = ref('')
const saving = ref(false)

// Broadcast state
const broadcastTargetType = ref('all')
const broadcastTargetValue = ref('')
const broadcastMessage = ref('')
const broadcasting = ref(false)

const loadData = async () => {
  try {
    // Load Global Settings
    const resSettings = await adminApi.getGlobalSettings()
    if (resSettings.data) {
      if (resSettings.data.support_phone) supportPhone.value = resSettings.data.support_phone
      if (resSettings.data.support_email) supportEmail.value = resSettings.data.support_email
      if (resSettings.data.support_whatsapp) supportWhatsapp.value = resSettings.data.support_whatsapp
    }

    // Load Tenants
    const { data } = await adminApi.getTenants()
    tenantsData.value = data
    
    const uniqueAgents = new Set()
    
    data.forEach(t => {
      tenantOptions.value.push({ label: `${t.name} (Tenant)`, value: t.id })
      if (t.agent_code) {
        uniqueAgents.add(t.agent_code)
      }
    })
    
    agentOptions.value = Array.from(uniqueAgents).map(code => ({ label: `Agent ${code}`, value: code }))
  } catch (error) {
    console.error('Failed to load data', error)
    $q.notify({ color: 'negative', message: 'Failed to load page data.' })
  }
}

const onTenantChanged = (val) => {
  if (val === 'global') {
    loadData() // reload globals
  } else {
    const tenant = tenantsData.value.find(t => t.id === val)
    if (tenant) {
      supportPhone.value = tenant.support_phone || ''
      supportEmail.value = tenant.support_email || ''
      supportWhatsapp.value = tenant.support_whatsapp || ''
    }
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    if (selectedTenant.value === 'global') {
      await adminApi.updateGlobalSettings({ 
        support_phone: supportPhone.value,
        support_email: supportEmail.value,
        support_whatsapp: supportWhatsapp.value
      })
    } else {
      await adminApi.updateTenant(selectedTenant.value, {
        support_phone: supportPhone.value,
        support_email: supportEmail.value,
        support_whatsapp: supportWhatsapp.value
      })
      // Update local tenant data
      const index = tenantsData.value.findIndex(t => t.id === selectedTenant.value)
      if (index !== -1) {
        tenantsData.value[index].support_phone = supportPhone.value
        tenantsData.value[index].support_email = supportEmail.value
        tenantsData.value[index].support_whatsapp = supportWhatsapp.value
      }
    }
    $q.notify({ color: 'positive', message: 'Contacts saved successfully!' })
  } catch (error) {
    console.error('Failed to save settings', error)
    $q.notify({ color: 'negative', message: 'Failed to save contacts.' })
  } finally {
    saving.value = false
  }
}

const sendBroadcast = async () => {
  if (!broadcastMessage.value.trim()) {
    $q.notify({ color: 'warning', message: 'Please enter a broadcast message.' })
    return
  }
  broadcasting.value = true
  try {
    const payload = {
      message: broadcastMessage.value,
      targetType: broadcastTargetType.value,
      targetValue: broadcastTargetValue.value
    }
    await adminApi.sendBroadcast(payload)
    $q.notify({ color: 'positive', icon: 'campaign', message: 'Broadcast sent to active devices!' })
    broadcastMessage.value = ''
  } catch (error) {
    console.error('Broadcast failed', error)
    $q.notify({ color: 'negative', message: 'Failed to send broadcast.' })
  } finally {
    broadcasting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.my-card {
  border-radius: 12px;
}
</style>
