<template>
  <q-layout
    view="hHh lpR fFf"
    class="public-layout"
    :class="isDarkMode ? 'public-layout--dark bg-dark text-white' : 'bg-white text-dark'"
  >
    <q-header
      elevated
      class="public-header"
      :class="isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'"
    >
      <div v-if="isStaging" class="staging-indicator" role="status">
        <q-icon name="science" size="16px" class="q-mr-xs" />
        STAGING — TEST ENVIRONMENT
      </div>
      <q-toolbar class="public-toolbar">
        <q-btn flat no-caps to="/" class="public-brand-link" aria-label="Invify home">
          <img :src="logoImg" alt="Invify Logo" class="public-brand-logo" />
        </q-btn>

        <q-space />

        <!-- Desktop Navigation -->
        <nav class="gt-sm public-desktop-nav" aria-label="Primary navigation">
          <q-btn flat no-caps to="/" :label="t('nav.home')" />
          <q-btn flat no-caps to="/platform" :label="t('nav.platform')" />
          <q-btn flat no-caps to="/solutions" :label="t('nav.solutions')" />
          <q-btn flat no-caps to="/financial-operations" :label="t('nav.financialOperations')" />
          <q-btn flat no-caps to="/pricing" :label="t('nav.pricing')" />
          <q-btn-dropdown flat no-caps label="More">
            <q-list class="public-menu-list">
              <q-item clickable v-close-popup to="/features"><q-item-section>Features</q-item-section></q-item>
              <q-item clickable v-close-popup to="/security"><q-item-section>Security</q-item-section></q-item>
              <q-item clickable v-close-popup to="/about"><q-item-section>{{ t('nav.about') }}</q-item-section></q-item>
              <q-item clickable v-close-popup to="/contact"><q-item-section>Contact</q-item-section></q-item>
            </q-list>
          </q-btn-dropdown>
        </nav>

        <q-space />

        <!-- CTAs -->
        <div class="gt-sm public-header-actions">
          <q-btn
            flat
            dense
            round
            :icon="isDarkMode ? 'light_mode' : 'dark_mode'"
            :aria-label="isDarkMode ? 'Use light mode' : 'Use dark mode'"
            @click="togglePublicTheme"
          >
            <q-tooltip>{{ isDarkMode ? 'Light mode' : 'Dark mode' }}</q-tooltip>
          </q-btn>

          <q-btn-dropdown
            flat
            dense
            no-caps
            icon="language"
            :label="currentLanguage.shortLabel"
            :aria-label="t('language.choose')"
          >
            <q-list dense style="min-width: 160px">
              <q-item
                v-for="language in languageOptions"
                :key="language.value"
                v-close-popup
                clickable
                :active="locale === language.value"
                active-class="text-primary bg-blue-1"
                @click="setLocale(language.value)"
              >
                <q-item-section>{{ language.label }}</q-item-section>
                <q-item-section v-if="locale === language.value" side>
                  <q-icon name="check" color="primary" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>

          <template v-if="!isAuthenticated">
            <q-btn-dropdown outline color="primary" no-caps :label="t('nav.signIn')" class="text-weight-medium">
              <q-list class="public-signin-menu">
                <q-item clickable v-close-popup to="/tenant/login">
                  <q-item-section avatar><q-icon name="storefront" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label>{{ t('nav.businessTenant') }}</q-item-label>
                    <q-item-label caption>Business workspace sign in</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item clickable v-close-popup to="/admin/login">
                  <q-item-section avatar><q-icon name="admin_panel_settings" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label>{{ t('nav.superAdmin') }}</q-item-label>
                    <q-item-label caption>Platform administration sign in</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            
            <q-btn unelevated color="primary" no-caps to="/register" :label="t('nav.getStarted')" class="public-header-cta" />
          </template>
          <template v-else>
            <q-btn unelevated color="primary" no-caps :to="dashboardUrl" :label="t('nav.dashboard')" class="q-px-md" />
          </template>
        </div>

        <!-- Mobile Menu Toggle -->
        <q-btn flat round icon="menu" aria-label="Open navigation menu" class="lt-md public-menu-toggle" @click="toggleMobileMenu" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="mobileMenuOpen"
      side="right"
      bordered
      :width="320"
      :class="isDarkMode ? 'bg-dark text-white' : 'bg-white text-dark'"
    >
      <q-list class="mobile-navigation q-py-md" aria-label="Mobile navigation">
        <q-item>
          <q-item-section>
            <div class="row items-center justify-between">
              <span class="text-subtitle1 text-weight-bold">Menu</span>
              <q-btn flat round icon="close" aria-label="Close navigation menu" @click="mobileMenuOpen = false" />
            </div>
          </q-item-section>
        </q-item>
        <q-item clickable @click="togglePublicTheme">
          <q-item-section avatar>
            <q-icon :name="isDarkMode ? 'light_mode' : 'dark_mode'" />
          </q-item-section>
          <q-item-section>{{ isDarkMode ? 'Light mode' : 'Dark mode' }}</q-item-section>
        </q-item>

        <q-separator class="q-my-sm" />

        <q-item clickable v-ripple to="/" @click="mobileMenuOpen = false">
          <q-item-section>{{ t('nav.home') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/platform" @click="mobileMenuOpen = false">
          <q-item-section>{{ t('nav.platform') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/solutions" @click="mobileMenuOpen = false">
          <q-item-section>{{ t('nav.solutions') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/financial-operations" @click="mobileMenuOpen = false">
          <q-item-section>{{ t('nav.financialOperations') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/pricing" @click="mobileMenuOpen = false">
          <q-item-section>{{ t('nav.pricing') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/features" @click="mobileMenuOpen = false">
          <q-item-section>Features</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security" @click="mobileMenuOpen = false">
          <q-item-section>Security</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/about" @click="mobileMenuOpen = false">
          <q-item-section>{{ t('nav.about') }}</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/contact" @click="mobileMenuOpen = false">
          <q-item-section>Contact</q-item-section>
        </q-item>

        <q-item-label header>{{ t('language.choose') }}</q-item-label>
        <q-item
          v-for="language in languageOptions"
          :key="language.value"
          clickable
          :active="locale === language.value"
          active-class="text-primary bg-blue-1"
          @click="setLocale(language.value)"
        >
          <q-item-section avatar>
            <q-icon name="language" />
          </q-item-section>
          <q-item-section>{{ language.label }}</q-item-section>
          <q-item-section v-if="locale === language.value" side>
            <q-icon name="check" color="primary" />
          </q-item-section>
        </q-item>
        
        <q-separator class="q-my-md" />
        
        <template v-if="!isAuthenticated">
          <div class="q-px-md q-pb-sm column q-gutter-sm">
            <q-btn outline color="primary" no-caps to="/tenant/login" icon="storefront" :label="t('nav.signInBusiness')" @click="mobileMenuOpen = false" />
            <q-btn outline color="primary" no-caps to="/admin/login" icon="admin_panel_settings" :label="t('nav.signInAdmin')" @click="mobileMenuOpen = false" />
            <q-btn unelevated color="primary" no-caps to="/register" :label="t('nav.getStarted')" @click="mobileMenuOpen = false" />
          </div>
        </template>
        <template v-else>
          <q-item clickable v-ripple :to="dashboardUrl" class="text-primary text-weight-bold">
            <q-item-section>{{ t('nav.dashboard') }}</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <footer class="public-footer bg-dark text-white">
      <div class="public-footer__content row q-col-gutter-xl q-px-lg">
        <div class="col-12 col-md-4">
          <img :src="logoImg" alt="Invify Logo" class="public-footer__logo q-mb-sm" />
          <div class="text-body2 text-grey-4">
            {{ t('footer.description') }}
          </div>
        </div>
        
        <div class="col-6 col-md-2">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ t('footer.product') }}</div>
          <div class="column public-footer__links">
            <router-link to="/platform" class="text-grey-4" style="text-decoration: none;">{{ t('nav.platform') }}</router-link>
            <router-link to="/features" class="text-grey-4" style="text-decoration: none;">{{ t('footer.features') }}</router-link>
            <router-link to="/pricing" class="text-grey-4" style="text-decoration: none;">{{ t('nav.pricing') }}</router-link>
            <router-link to="/security" class="text-grey-4" style="text-decoration: none;">{{ t('footer.security') }}</router-link>
          </div>
        </div>

        <div class="col-6 col-md-2">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ t('nav.solutions') }}</div>
          <div class="column public-footer__links">
            <router-link to="/solutions" class="text-grey-4" style="text-decoration: none;">{{ t('footer.retail') }}</router-link>
            <router-link to="/solutions" class="text-grey-4" style="text-decoration: none;">{{ t('footer.schools') }}</router-link>
            <router-link to="/solutions" class="text-grey-4" style="text-decoration: none;">{{ t('footer.enterprises') }}</router-link>
          </div>
        </div>
        
        <div class="col-12 col-md-2">
          <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ t('footer.company') }}</div>
          <div class="column public-footer__links">
            <router-link to="/about" class="text-grey-4" style="text-decoration: none;">{{ t('footer.aboutUs') }}</router-link>
            <router-link to="/contact" class="text-grey-4" style="text-decoration: none;">{{ t('footer.contact') }}</router-link>
          </div>
        </div>
      </div>
      <div class="public-footer__legal text-center text-grey-5 text-caption">
        &copy; {{ new Date().getFullYear() }} Invify. {{ t('footer.rights') }}
      </div>
    </footer>
  </q-layout>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import logoImg from '../assets/logo_transparent.png'
import { usePublicLocale } from '../composables/usePublicLocale'

export default {
  name: 'PublicLayout',
  setup() {
    const router = useRouter()
    const $q = useQuasar()
    const mobileMenuOpen = ref(false)
    const isStaging = ref(false)
    const isAuthenticated = ref(false)
    const operatorRole = ref('')
    const isDarkMode = ref($q.dark.isActive)
    const {
      currentLanguage,
      languageOptions,
      locale,
      setLocale,
      t
    } = usePublicLocale()

    onMounted(() => {
      const savedTheme = window.localStorage.getItem('invify_public_dark_mode')
      if (savedTheme !== null) {
        setPublicDarkMode(savedTheme === 'true')
      }

      // Check staging environment
      isStaging.value = window.location.hostname.includes('staging') || import.meta.env.MODE === 'staging' || import.meta.env.VITE_APP_ENV === 'staging'
      
      // Check authentication
      const token = localStorage.getItem('invify_token')
      const mfaPending = sessionStorage.getItem('mfa_setup_token') || localStorage.getItem('mfa_status_verified') === 'false'
      
      if (token && !mfaPending) {
        isAuthenticated.value = true
        operatorRole.value = localStorage.getItem('operator_role') || ''
      }
    })

    function setPublicDarkMode(value) {
      isDarkMode.value = value
      $q.dark.set(value)
      window.localStorage.setItem('invify_public_dark_mode', String(value))
      document.body.classList.toggle('theme-dark', value)
      document.body.classList.toggle('theme-light', !value)
    }

    function togglePublicTheme() {
      setPublicDarkMode(!isDarkMode.value)
    }

    const dashboardUrl = computed(() => {
      if (!isAuthenticated.value) return '/login'
      
      const roles = operatorRole.value ? operatorRole.value.split(',').map(r => r.trim()) : []
      const staffRoles = [
        'SUPER_ADMIN', 'STAFF', 'ADMIN_FINANCE', 'ADMIN_TREASURY', 
        'ADMIN_RISK', 'ADMIN_OPS', 'ADMIN_EXECUTIVE', 'ADMIN_DEPLOY'
      ]
      
      const isStaff = roles.some(r => staffRoles.includes(r))
      return isStaff ? '/fleet/overview' : '/tenant/dashboard'
    })

    return {
      currentLanguage,
      languageOptions,
      locale,
      logoImg,
      mobileMenuOpen,
      setLocale,
      t,
      isDarkMode,
      togglePublicTheme,
      toggleMobileMenu: () => { mobileMenuOpen.value = !mobileMenuOpen.value },
      isStaging,
      isAuthenticated,
      dashboardUrl
    }
  }
}
</script>

<style scoped>
.letter-spacing-1 {
  letter-spacing: 1px;
}

.staging-indicator {
  position: relative;
  z-index: 3001;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  background: #fff3cd;
  color: #513c06;
  border-bottom: 1px solid #e6c768;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.public-toolbar {
  width: 100%;
  max-width: 1440px;
  min-height: 72px;
  margin: 0 auto;
  padding: 8px 24px;
}

.public-brand-link {
  min-height: 52px;
  padding: 2px 8px;
}

.public-brand-logo {
  display: block;
  width: auto;
  height: 44px;
  object-fit: contain;
}

.public-desktop-nav,
.public-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.public-header-actions {
  gap: 8px;
}

.public-header-cta {
  min-height: 42px;
  padding-inline: 18px;
}

.public-menu-toggle {
  min-width: 44px;
  min-height: 44px;
}

.public-menu-list {
  min-width: 180px;
}

.public-signin-menu {
  min-width: 300px;
}

.mobile-navigation .q-item {
  min-height: 48px;
}

.public-footer {
  padding: 48px 0 24px;
}

.public-footer__content {
  max-width: 1200px;
  margin: 0 auto;
}

.public-footer__links {
  gap: 10px;
}

.public-footer__logo {
  display: block;
  width: auto;
  height: 64px;
  object-fit: contain;
}

.public-footer a:hover {
  color: white !important;
}

.public-footer a:focus-visible {
  outline: 2px solid #90caf9;
  outline-offset: 3px;
  border-radius: 2px;
}

.public-footer__legal {
  margin-top: 32px;
  padding: 20px 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

@media (max-width: 599px) {
  .public-toolbar {
    min-height: 64px;
    padding: 6px 10px;
  }

  .public-brand-logo {
    height: 38px;
  }

  .public-footer {
    padding-top: 36px;
  }

  .public-footer__logo {
    height: 52px;
  }
}
</style>

<style>
.public-layout,
.public-layout .q-page,
.public-layout .q-card,
.public-layout .public-header {
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.public-layout * {
  box-sizing: border-box;
}

.public-layout .q-page {
  overflow-x: hidden;
}

.public-layout .q-btn,
.public-layout .q-item {
  -webkit-tap-highlight-color: transparent;
}

.public-layout .q-btn:focus-visible,
.public-layout .q-item:focus-visible,
.public-layout a:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.45);
  outline-offset: 2px;
}

.public-hero {
  padding: clamp(64px, 8vw, 112px) 20px;
}

.public-hero--compact {
  padding: clamp(48px, 6vw, 80px) 20px;
}

.public-container {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.public-container--narrow {
  max-width: 820px;
}

.public-eyebrow {
  margin-bottom: 12px;
  color: var(--q-primary);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.public-display {
  margin: 0;
  font-size: clamp(2.35rem, 5.4vw, 4.6rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.public-page-title {
  margin: 0;
  font-size: clamp(2.15rem, 4.2vw, 3.6rem);
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.public-lead {
  max-width: 720px;
  margin: 20px auto 0;
  font-size: clamp(1.05rem, 1.7vw, 1.25rem);
  line-height: 1.7;
}

.public-section {
  padding: clamp(56px, 7vw, 88px) 20px;
}

.public-section--muted {
  background: #f5f8fb;
}

.public-section-heading {
  max-width: 720px;
  margin: 0 auto 40px;
  text-align: center;
}

.public-section-heading h2 {
  margin: 0 0 12px;
  font-size: clamp(1.8rem, 3vw, 2.65rem);
  line-height: 1.18;
  letter-spacing: -0.025em;
}

.public-section-heading p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.7;
}

.public-card {
  height: 100%;
  border: 1px solid #dce4ec;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(24, 33, 43, 0.05);
}

.public-card .q-card__section {
  padding: 28px;
}

.public-card-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  border-radius: 12px;
  background: rgba(25, 118, 210, 0.1);
  color: var(--q-primary);
}

.public-cta {
  padding: clamp(48px, 7vw, 80px) 20px;
  background: var(--q-primary);
  color: #fff;
  text-align: center;
}

.public-cta__content {
  max-width: 760px;
  margin: 0 auto;
}

.public-cta h2 {
  margin: 0 0 12px;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  line-height: 1.2;
}

.public-cta p {
  margin: 0 auto 28px;
  max-width: 620px;
  font-size: 1.05rem;
  line-height: 1.65;
  opacity: 0.92;
}

.public-cta-actions,
.public-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.public-cta-actions .q-btn,
.public-hero-actions .q-btn {
  min-height: 48px;
  padding-inline: 24px;
}

.public-layout--dark .q-page.bg-white {
  background: #0f1419 !important;
  color: #f4f7fa !important;
}

.public-layout--dark .q-page .bg-grey-1 {
  background: #151c23 !important;
}

.public-layout--dark .public-section--muted {
  background: #111820;
}

.public-layout--dark .q-page .q-card.bg-white,
.public-layout--dark .q-page .q-card.bg-grey-1,
.public-layout--dark .public-card {
  background: #18212a !important;
  color: #f4f7fa !important;
  border-color: #34414d !important;
}

.public-layout--dark .q-page .text-dark,
.public-layout--dark .q-page .q-timeline__title,
.public-layout--dark .q-page .contact-section-label {
  color: #f4f7fa !important;
}

.public-layout--dark .q-page .text-grey-8,
.public-layout--dark .q-page .contact-address,
.public-layout--dark .q-page .q-timeline__content {
  color: #d1d8df !important;
}

.public-layout--dark .q-page .text-grey-7 {
  color: #aeb9c3 !important;
}

.public-layout--dark .q-page .lifecycle-card__title {
  color: #fff !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.public-layout:not(.public-layout--dark) .q-page .lifecycle-card__title {
  color: #18212b !important;
}

.public-layout--dark .q-page .q-separator {
  background: #34414d;
}

.public-layout--dark .q-page .public-field,
.public-layout--dark .q-page .public-field .q-field__control {
  background: #f8fafc !important;
}

@media (max-width: 599px) {
  .public-hero,
  .public-hero--compact {
    padding: 48px 16px;
  }

  .public-section {
    padding: 48px 16px;
  }

  .public-display {
    font-size: clamp(2.2rem, 11vw, 3.25rem);
  }

  .public-page-title {
    font-size: clamp(2rem, 10vw, 2.75rem);
  }

  .public-lead {
    font-size: 1rem;
    line-height: 1.65;
  }

  .public-section-heading {
    margin-bottom: 28px;
  }

  .public-card .q-card__section {
    padding: 22px;
  }

  .public-hero-actions,
  .public-cta-actions {
    width: 100%;
    flex-direction: column;
  }

  .public-hero-actions .q-btn,
  .public-cta-actions .q-btn {
    width: 100%;
  }
}
</style>
