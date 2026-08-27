<template>
  <q-page class="bg-white text-dark">
    <section class="public-hero--compact public-section--muted text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow">The Invify platform</div>
        <h1 class="public-page-title">{{ t('platform.title') }}</h1>
        <p class="public-lead text-grey-7">{{ t('platform.subtitle') }}</p>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container">
        <div class="platform-grid">
          <q-card v-for="feature in platformFeatures" :key="feature.title" flat class="public-card">
            <q-card-section>
              <span class="public-card-icon"><q-icon :name="feature.icon" size="27px" /></span>
              <h2 class="text-h6 text-weight-bold q-my-none">{{ feature.title }}</h2>
              <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">{{ feature.description }}</p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </section>

    <section class="public-cta">
      <div class="public-cta__content">
        <h2>Choose the capabilities your operation needs</h2>
        <p>Start with your core workflow and bring more teams into Invify as your operation grows.</p>
        <div class="public-cta-actions">
          <q-btn unelevated color="white" text-color="primary" no-caps to="/register" label="Get Started" />
          <q-btn outline color="white" no-caps to="/features" label="View Features" />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { usePublicLocale } from '../../composables/usePublicLocale'

const { t } = usePublicLocale()

const platformFeatures = computed(() => [
  { icon: 'receipt_long', title: t('platform.invoicingTitle'), description: t('platform.invoicingBody') },
  { icon: 'payment', title: t('platform.paymentsTitle'), description: t('platform.paymentsBody') },
  { icon: 'account_balance_wallet', title: t('platform.financeTitle'), description: t('platform.financeBody') },
  { icon: 'inventory', title: t('platform.inventoryTitle'), description: t('platform.inventoryBody') },
  { icon: 'rule', title: t('platform.reconciliationTitle'), description: t('platform.reconciliationBody') },
  { icon: 'analytics', title: t('platform.analyticsTitle'), description: t('platform.analyticsBody') },
  { icon: 'point_of_sale', title: t('platform.posTitle'), description: t('platform.posBody') },
  { icon: 'manage_accounts', title: t('platform.staffTitle'), description: t('platform.staffBody') }
])
</script>

<style scoped>
.platform-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.public-card p {
  line-height: 1.65;
}

@media (max-width: 1023px) {
  .platform-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .platform-grid {
    grid-template-columns: 1fr;
  }
}
</style>
