<template>
  <q-page class="home-page bg-white text-dark">
    <section class="home-hero">
      <div class="public-container row items-center q-col-gutter-xl">
        <div class="col-12 col-md-6">
          <div class="public-eyebrow text-blue-2">Business operations, connected</div>
          <h1 class="public-display text-white">{{ t('home.heroTitle') }}</h1>
          <p class="home-hero__lead">{{ t('home.heroBody') }}</p>
          <div class="public-hero-actions home-hero__actions">
            <q-btn unelevated color="white" text-color="primary" size="lg" no-caps to="/register" :label="t('home.getStarted')" class="text-weight-bold" />
            <q-btn outline color="white" size="lg" no-caps to="/platform" :label="t('home.explorePlatform')" />
          </div>
          <p class="home-hero__note">
            <q-icon name="check_circle" class="q-mr-xs" />
            Built for retailers, schools, service businesses, and growing teams.
          </p>
        </div>
        <div class="col-12 col-md-6">
          <div class="home-hero__visual">
            <transition name="hero-fade" mode="out-in">
              <img 
                v-if="activeImages.length > 0" 
                :key="activeIndex"
                :src="activeImages[activeIndex].src" 
                :alt="activeImages[activeIndex].alt" 
              />
              <img 
                v-else
                src="/invify-showcase/imgtab001.jpg" 
                alt="Invify business interface displayed on connected devices" 
              />
            </transition>
          </div>
        </div>
      </div>
    </section>

    <section class="public-section">
      <div class="public-container">
        <div class="public-section-heading">
          <div class="public-eyebrow">How Invify helps</div>
          <h2>Keep daily operations in one clear workflow</h2>
          <p class="text-grey-7">Move from billing to payment, inventory, and reporting without switching between disconnected tools.</p>
        </div>
        <div class="row q-col-gutter-lg">
          <div v-for="capability in capabilities" :key="capability.title" class="col-12 col-sm-6 col-lg-3">
            <q-card flat class="public-card">
              <q-card-section>
                <span class="public-card-icon"><q-icon :name="capability.icon" size="26px" /></span>
                <h3 class="text-h6 text-weight-bold q-my-none">{{ capability.title }}</h3>
                <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">{{ capability.body }}</p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </section>

    <section class="public-section public-section--muted">
      <div class="public-container">
        <div class="public-section-heading">
          <div class="public-eyebrow">Connected hardware and software</div>
          <h2>{{ t('home.showcaseTitle') }}</h2>
          <p class="text-grey-7">{{ t('home.showcaseBody') }}</p>
        </div>
        <div class="showcase-grid">
          <figure v-for="item in showcaseItems" :key="item.src" class="showcase-card">
            <img :src="item.src" :alt="item.title" loading="lazy" class="showcase-card__image" />
            <figcaption class="showcase-card__caption">
              <div class="text-subtitle1 text-weight-bold">{{ item.title }}</div>
              <div class="text-body2 q-mt-xs">{{ item.description }}</div>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="public-cta">
      <div class="public-cta__content">
        <h2>Ready to bring your operations together?</h2>
        <p>Start onboarding or explore the platform to see which Invify capabilities fit your business.</p>
        <div class="public-cta-actions">
          <q-btn unelevated color="white" text-color="primary" no-caps to="/register" label="Get Started" />
          <q-btn outline color="white" no-caps to="/contact" label="Talk to Our Team" />
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { usePublicLocale } from '../../composables/usePublicLocale'

const { t } = usePublicLocale()

const capabilities = [
  { icon: 'receipt_long', title: 'Invoice and collect', body: 'Create invoices, follow payment status, and keep receivables visible.' },
  { icon: 'inventory_2', title: 'Track stock', body: 'Manage inventory and connected point-of-sale activity from one workspace.' },
  { icon: 'account_balance', title: 'Reconcile money', body: 'Connect transactions, invoices, wallets, and financial records.' },
  { icon: 'manage_accounts', title: 'Control access', body: 'Give teams role-appropriate access across operational workspaces.' }
]

const showcaseItems = computed(() => [
  {
    src: '/invify-showcase/invify-product-boxes.png',
    title: t('home.boxesTitle'),
    description: t('home.boxesBody')
  },
  {
    src: '/invify-showcase/invify-complete-kit.png',
    title: t('home.kitTitle'),
    description: t('home.kitBody')
  },
  {
    src: '/invify-showcase/invify-receipt-printer.png',
    title: t('home.receiptTitle'),
    description: t('home.receiptBody')
  },
  {
    src: '/invify-showcase/invify-device-interface.png',
    title: t('home.interfaceTitle'),
    description: t('home.interfaceBody')
  }
])

const heroImages = [
  { src: '/invify-showcase/imgtab001.jpg', alt: 'Samsung tablet showing Invify Student Analytics dashboard' },
  { src: '/invify-showcase/imgkit001.jpg', alt: 'Invify complete retail POS hardware kit' }
]

// Shuffled array of images to cycle through
const activeImages = ref([])
const activeIndex = ref(0)
let timer = null

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

onMounted(() => {
  activeImages.value = shuffle(heroImages)
  timer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % activeImages.value.length
  }, 5000) // Change image every 5 seconds for a smooth rotation
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.home-hero {
  position: relative;
  padding: clamp(64px, 8vw, 108px) 20px;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 16%, rgba(74, 144, 226, 0.42), transparent 34%),
    linear-gradient(135deg, #0d47a1 0%, #1565c0 54%, #0b3d84 100%);
}

.home-hero__lead {
  max-width: 650px;
  margin: 22px 0 28px;
  color: rgba(255, 255, 255, 0.9);
  font-size: clamp(1.05rem, 1.6vw, 1.24rem);
  line-height: 1.7;
}

.home-hero__actions {
  justify-content: flex-start;
}

.home-hero__note {
  display: flex;
  align-items: flex-start;
  margin: 22px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.92rem;
  line-height: 1.5;
}

.home-hero__visual {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 70px rgba(5, 25, 55, 0.38);
  transform: rotate(1.5deg);
  position: relative;
  min-height: 300px;
}

.home-hero__visual img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

/* Beautiful Hero Carousel Crossfade transition */
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 1.2s ease-in-out;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.showcase-card {
  position: relative;
  min-width: 0;
  height: 340px;
  margin: 0;
  overflow: hidden;
  border: 1px solid #dfe4ea;
  border-radius: 16px;
  background: #111820;
}

.showcase-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 240ms ease;
}

.showcase-card:hover .showcase-card__image {
  transform: scale(1.025);
}

.showcase-card__caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 48px 22px 20px;
  color: #fff;
  background: linear-gradient(transparent, rgba(7, 12, 18, 0.92));
}

:global(.public-layout--dark) .product-showcase {
  background: #111820;
}

:global(.public-layout--dark) .showcase-card {
  border-color: #34414d;
}

@media (max-width: 599px) {
  .home-hero {
    padding: 52px 16px 56px;
    text-align: center;
  }

  .home-hero__lead {
    margin-inline: auto;
  }

  .home-hero__actions {
    justify-content: center;
  }

  .home-hero__note {
    justify-content: center;
  }

  .home-hero__visual {
    margin-top: 16px;
    transform: none;
  }

  .showcase-grid {
    grid-template-columns: 1fr;
  }

  .showcase-card {
    height: 280px;
  }

  .showcase-card__caption {
    padding: 42px 18px 16px;
  }
}

@media (min-width: 600px) and (max-width: 1023px) {
  .home-hero {
    text-align: center;
  }

  .home-hero__lead {
    margin-inline: auto;
  }

  .home-hero__actions,
  .home-hero__note {
    justify-content: center;
  }

  .home-hero__visual {
    max-width: 720px;
    margin: 20px auto 0;
    transform: none;
  }
}
</style>
