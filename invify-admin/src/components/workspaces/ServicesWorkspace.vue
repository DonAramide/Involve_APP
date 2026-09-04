<template>
  <div class="services workspace">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5 text-white">Services Workspace</div>
        <div class="text-caption text-grey-5">Jobs, collections, and funds held with Invify/Quasar</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn dense unelevated color="cyan-8" text-color="white" icon="work_outline" label="Jobs" to="/tenant/services/jobs" />
        <q-btn dense outline color="cyan-4" icon="people" label="Customers" to="/tenant/users" />
        <q-btn dense outline color="cyan-4" icon="receipt" label="Invoices" to="/tenant/retail/invoices" />
        <q-btn dense outline color="amber-4" icon="account_balance_wallet" label="Wallet" to="/tenant/wallet" />
      </div>
    </div>
    <DashboardRenderer />
  </div>
</template>
<script setup>
import DashboardRenderer from '../DashboardRenderer.vue';
</script>
