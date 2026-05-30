<template>
  <q-page class="q-pa-md bg-grey-1">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h4 class="text-weight-bold text-primary q-my-none">Platform Contact Maintenance</h4>
        <div class="text-subtitle1 text-grey-7">Manage global support contact information across the platform.</div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="my-card shadow-2 rounded-borders">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">
              <q-icon name="support_agent" size="sm" class="q-mr-sm" />
              Global Support Settings
            </div>
            <div class="text-subtitle2">This phone number will be displayed to users in the app when they need help.</div>
          </q-card-section>

          <q-card-section class="q-pa-lg">
            <q-form @submit="saveSettings" class="q-gutter-md">
              <q-input
                outlined
                v-model="supportPhone"
                label="Support Phone Number"
                hint="e.g. +234 800 INVIFY or +1 (800) 123-4567"
                lazy-rules
                :rules="[val => val && val.length > 0 || 'Please enter a valid phone number']"
              >
                <template v-slot:prepend>
                  <q-icon name="phone" color="primary" />
                </template>
              </q-input>

              <div class="row justify-end q-mt-lg">
                <q-btn
                  label="Save Contact Information"
                  type="submit"
                  color="primary"
                  icon="save"
                  :loading="saving"
                  unelevated
                  class="full-width-sm"
                  padding="sm xl"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-4 col-lg-4">
         <q-card class="shadow-1 rounded-borders bg-blue-1">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <q-icon name="info" color="info" size="sm" class="q-mr-sm"/>
              <div class="text-subtitle1 text-weight-bold">How this works</div>
            </div>
            <p class="text-body2 text-grey-8">
              The phone number you enter here is immediately pushed to the central backend configuration. 
              Any MPOS tablet or mobile device syncing to the platform will display this number if a hardware mismatch or unassigned terminal error occurs.
            </p>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const supportPhone = ref('')
const saving = ref(false)

const loadSettings = async () => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    const response = await axios.get(`${API_BASE}/admin/settings`)
    if (response.data && response.data.support_phone) {
      supportPhone.value = response.data.support_phone
    }
  } catch (error) {
    console.error('Failed to load global settings', error)
    $q.notify({
      color: 'negative',
      position: 'top',
      message: 'Failed to load contact settings.',
      icon: 'report_problem'
    })
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004'
    await axios.patch(`${API_BASE}/admin/settings`, { support_phone: supportPhone.value })
    $q.notify({
      color: 'positive',
      position: 'top',
      message: 'Support phone number updated successfully!',
      icon: 'check_circle'
    })
  } catch (error) {
    console.error('Failed to update settings', error)
    $q.notify({
      color: 'negative',
      position: 'top',
      message: 'Failed to save contact settings.',
      icon: 'report_problem'
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.my-card {
  border-radius: 12px;
}
.full-width-sm {
  width: 100%;
}
@media (min-width: 600px) {
  .full-width-sm {
    width: auto;
  }
}
</style>
