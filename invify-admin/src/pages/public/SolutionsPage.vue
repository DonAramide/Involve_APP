<template>
  <q-page class="solutions-page bg-white text-dark">
    <section class="public-hero--compact public-section--muted text-center">
      <div class="public-container public-container--narrow">
        <div class="public-eyebrow">Flexible by design</div>
        <h1 class="public-page-title">{{ t('solutions.title') }}</h1>
        <p class="public-lead text-grey-7">{{ t('solutions.subtitle') }}</p>
      </div>
    </section>

    <div class="solutions-grid q-py-xl q-px-md">
      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-6">
          <q-card :dark="false" flat bordered class="solution-card bg-white text-dark h-100 column">
            <q-card-section>
              <div class="row items-center q-gutter-sm q-mb-md">
                <q-icon name="school" size="28px" color="primary" />
                <div class="text-h5 text-weight-bold">{{ t('solutions.schoolsTitle') }}</div>
              </div>
              <p class="text-body1 text-grey-8">
                {{ t('solutions.schoolsBody') }}
              </p>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card :dark="false" flat bordered class="solution-card bg-white text-dark h-100 column">
            <q-card-section>
              <div class="row items-center q-gutter-sm q-mb-md">
                <q-icon name="storefront" size="28px" color="primary" />
                <div class="text-h5 text-weight-bold">{{ t('solutions.retailTitle') }}</div>
              </div>
              <p class="text-body1 text-grey-8">
                {{ t('solutions.retailBody') }}
              </p>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card :dark="false" flat bordered class="solution-card bg-white text-dark h-100 column">
            <q-card-section>
              <div class="row items-center q-gutter-sm q-mb-md">
                <q-icon name="handyman" size="28px" color="primary" />
                <div class="text-h5 text-weight-bold">{{ t('solutions.servicesTitle') }}</div>
              </div>
              <p class="text-body1 text-grey-8">
                {{ t('solutions.servicesBody') }}
              </p>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card :dark="false" flat bordered class="solution-card bg-white text-dark h-100 column">
            <q-card-section>
              <div class="row items-center q-gutter-sm q-mb-md">
                <q-icon name="domain" size="28px" color="primary" />
                <div class="text-h5 text-weight-bold">{{ t('solutions.enterprisesTitle') }}</div>
              </div>
              <p class="text-body1 text-grey-8">
                {{ t('solutions.enterprisesBody') }}
              </p>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <section class="public-cta">
      <div class="public-cta__content">
        <h2>Let’s map Invify to your workflow</h2>
        <p>Tell us how your business operates and which teams, locations, or devices need to work together.</p>
        <div class="public-cta-actions">
          <q-btn unelevated color="white" text-color="primary" no-caps to="/register" label="Get Started" />
          <q-btn outline color="white" no-caps to="/contact" label="Contact Our Team" />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { usePublicLocale } from '../../composables/usePublicLocale'

const { t } = usePublicLocale()
</script>

<style scoped>
.solutions-page {
  min-height: auto;
}

.solutions-grid {
  max-width: 1000px;
  margin: 24px auto;
}

.solution-card {
  padding: 16px;
  border-color: #dfe4ea;
  border-top: 4px solid var(--q-primary);
  border-radius: 12px;
  transition: border-color 160ms ease, transform 160ms ease;
}

.solution-card:hover {
  border-color: var(--q-primary);
  transform: translateY(-2px);
}

.solution-card p {
  line-height: 1.7;
  margin-bottom: 0;
}

.h-100 {
  height: 100%;
}

@media (max-width: 599px) {
  .solutions-grid {
    margin: 0 auto;
    padding-top: 28px;
    padding-bottom: 32px;
  }
}
</style>
