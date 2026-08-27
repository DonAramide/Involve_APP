<template>
  <q-page class="bg-white text-dark">
    <section class="public-hero--compact public-section--muted text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow">Pricing</div>
        <h1 class="public-page-title">A plan shaped around your operation</h1>
        <p class="public-lead text-grey-7">Invify pricing depends on the capabilities, locations, users, and connected devices your organization needs.</p>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container">
        <div class="pricing-grid">
          <q-card v-for="item in pricingFactors" :key="item.title" flat class="public-card">
            <q-card-section>
              <span class="public-card-icon"><q-icon :name="item.icon" size="27px" /></span>
              <h2 class="text-h6 text-weight-bold q-my-none">{{ item.title }}</h2>
              <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">{{ item.body }}</p>
            </q-card-section>
          </q-card>
        </div>
        <q-card flat class="pricing-contact q-mt-xl">
          <q-card-section class="row items-center q-col-gutter-lg">
            <div class="col-12 col-md">
              <h2 class="text-h4 text-weight-bold q-mt-none q-mb-sm">Get a clear recommendation</h2>
              <p class="text-body1 text-grey-7 q-mb-none">Tell us about your workflow. We’ll help identify the relevant Invify capabilities and rollout scope without presenting unsupported list prices.</p>
            </div>
            <div class="col-12 col-md-auto">
              <q-btn unelevated color="primary" size="lg" no-caps to="/contact" label="Contact Our Team" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </section>
  </q-page>
</template>
<script setup>
const pricingFactors = [
  { icon: 'apps', title: 'Capabilities', body: 'Select the operational modules that match your billing, inventory, finance, or school workflow.' },
  { icon: 'groups', title: 'Team access', body: 'Scope access around the users and operational roles your organization needs.' },
  { icon: 'store', title: 'Locations', body: 'Account for the branches, schools, stores, or business units included in your rollout.' },
  { icon: 'devices', title: 'Connected devices', body: 'Include point-of-sale devices, receipt printers, and other supported hardware where needed.' }
]
</script>

<style scoped>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.public-card p {
  line-height: 1.65;
}

.pricing-contact {
  padding: 12px;
  border: 1px solid rgba(25, 118, 210, 0.28);
  border-radius: 18px;
  background: rgba(25, 118, 210, 0.05);
}

@media (max-width: 1023px) {
  .pricing-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .pricing-contact .q-btn {
    width: 100%;
  }
}
</style>
