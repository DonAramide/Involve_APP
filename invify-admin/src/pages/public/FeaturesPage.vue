<template>
  <q-page class="bg-white text-dark">
    <section class="public-hero--compact public-section--muted text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow">Product capabilities</div>
        <h1 class="public-page-title">Features that support real operations</h1>
        <p class="public-lead text-grey-7">Practical tools for billing, stock, access, reporting, and connected business workflows.</p>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container features-grid">
        <q-card v-for="feature in features" :key="feature.title" flat class="public-card">
          <q-card-section>
            <span class="public-card-icon"><q-icon :name="feature.icon" size="27px" /></span>
            <h2 class="text-h6 text-weight-bold q-my-none">{{ feature.title }}</h2>
            <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">{{ feature.body }}</p>
          </q-card-section>
        </q-card>
      </div>
    </section>

    <section class="public-cta">
      <div class="public-cta__content">
        <h2>See how the features work together</h2>
        <p>Explore the platform workflow or contact the team about your operating model.</p>
        <div class="public-cta-actions">
          <q-btn unelevated color="white" text-color="primary" no-caps to="/platform" label="Explore Platform" />
          <q-btn outline color="white" no-caps to="/contact" label="Contact Us" />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
const features = [
  { icon: 'receipt_long', title: 'Invoicing and receivables', body: 'Create invoices, monitor their status, and keep customer balances visible.' },
  { icon: 'point_of_sale', title: 'Point of sale', body: 'Support day-to-day sales through connected business and device workflows.' },
  { icon: 'inventory_2', title: 'Inventory control', body: 'Track products, stock movement, locations, and supplier information.' },
  { icon: 'account_balance', title: 'Financial records', body: 'Connect invoices, payments, wallet activity, and ledger reporting.' },
  { icon: 'rule', title: 'Reconciliation', body: 'Review and match financial activity with its underlying business records.' },
  { icon: 'manage_accounts', title: 'Role-based access', body: 'Assign access according to administrative and operational responsibilities.' },
  { icon: 'domain', title: 'Tenant-aware workspaces', body: 'Keep business workspaces and their operational context clearly separated.' },
  { icon: 'analytics', title: 'Operational reporting', body: 'Review business activity through dashboards and structured reports.' }
]
</script>

<style scoped>
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.public-card p {
  line-height: 1.65;
}

@media (max-width: 1023px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
