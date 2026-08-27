// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { registerAuthBootstrapGuard } from './AuthBootstrapGuard'
import { registerRuntimeGuards } from './RuntimeGuard'

const router = createRouter({
  history: createWebHistory(),
  routes
})

// FINAL REFINEMENT #2: Inject primary authentication bootstrap gates natively
registerAuthBootstrapGuard(router)

// RC2.1.2: Inject enterprise runtime guards
registerRuntimeGuards(router)

router.afterEach((to) => {
  const routeTitle = typeof to.meta?.title === 'string' ? to.meta.title.trim() : ''
  document.title = routeTitle
    ? routeTitle.startsWith('Invify') ? routeTitle : `${routeTitle} | Invify`
    : 'Invify - Enterprise Business & Financial Operations Platform'
})

// Gracefully recover from dynamic import/chunk loading failures due to HMR/network drift or server port changes
router.onError((error, to) => {
  const isChunkError = error.message.includes('Failed to fetch dynamically imported module') || 
                       error.message.includes('Importing a module script failed') ||
                       error.message.includes('chunk') ||
                       error.message.includes('net::ERR_CONNECTION_REFUSED')
  if (isChunkError) {
    console.warn('[Vite HMR/Router] Dynamic module chunk loading failed. Initiating systemic layout recovery reload...', error)
    window.location.reload()
  }
})

export default router
