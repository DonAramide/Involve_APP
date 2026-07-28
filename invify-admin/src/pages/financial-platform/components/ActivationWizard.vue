<template>
  <q-card class="activation-wizard q-pa-lg text-center shadow-2">
    <q-card-section>
      <q-icon name="account_balance" size="80px" color="primary" class="q-mb-md" />
      <div class="text-h4 text-weight-bold q-mb-sm">Activate Financial Platform</div>
      <p class="text-subtitle1 text-grey-8 q-mb-xl">
        Unlock enterprise ledgers, virtual accounts, and real-time reconciliation powered by Quasar.
        Activation takes only a few seconds.
      </p>
      
      <q-btn 
        color="primary" 
        size="xl" 
        label="Activate Financial Services" 
        icon="power_settings_new" 
        class="full-width" 
        style="max-width: 400px"
        @click="activate"
        :loading="activating"
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['activate'])
const activating = ref(false)

const activate = () => {
  activating.value = true
  emit('activate')
}
</script>

<style scoped>
.activation-wizard {
  border-radius: 12px;
  background: linear-gradient(to bottom right, #ffffff, #f5f7fa);
}
</style>
