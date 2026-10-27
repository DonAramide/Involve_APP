<template>
  <q-page class="q-pa-md column q-gutter-md">
    <div>
      <div class="text-caption text-grey-6">Institute / {{ kind === 'terminal' ? 'Terminals' : 'Devices' }}</div>
      <h1 class="text-h5 q-my-none">Assign {{ kind === 'terminal' ? 'terminal' : 'device' }}</h1>
    </div>
    <q-banner rounded class="bg-amber-1 text-dark">
      This page does not save an assignment. The institute hardware endpoint can move a serial that is already assigned, or create an inventory row for a serial it does not know. It does not prove the hardware belongs to this institute, and it does not write an audit event.
    </q-banner>
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle2">What is still required before assignment can be saved</div>
        <ul class="q-mb-none">
          <li>A list of eligible {{ kind === 'terminal' ? 'terminals' : 'devices' }} limited to this institute.</li>
          <li>A server check that the target tenant is one this institute may manage.</li>
          <li>Refusal when the hardware is already assigned, unless an explicit reassignment is authorized.</li>
          <li>A confirmation step and an audit record of who assigned it.</li>
        </ul>
      </q-card-section>
    </q-card>
    <div class="row q-gutter-sm">
      <q-btn outline no-caps color="primary" label="View tenants" to="/institute/portfolio" />
      <q-btn flat no-caps color="primary" label="Back to dashboard" to="/institute/dashboard" />
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const kind = computed(() => (route.path.includes('terminal') ? 'terminal' : 'device'))
</script>
