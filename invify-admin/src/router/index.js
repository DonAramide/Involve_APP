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
  sessionStorage.removeItem('invify_chunk_reload')
  const routeTitle = typeof to.meta?.title === 'string' ? to.meta.title.trim() : ''
  document.title = routeTitle
    ? routeTitle.startsWith('Invify') ? routeTitle : `${routeTitle} | Invify`
    : 'Invify - Enterprise Business & Financial Operations Platform'
})

// Recover from a stale deploy/chunk once. Repeated reloads left the boot splash spinning forever.
router.onError((error) => {
  const message = String(error?.message || '')
  const isChunkError = message.includes('Failed to fetch dynamically imported module') ||
                       message.includes('Importing a module script failed') ||
                       message.includes('chunk') ||
                       message.includes('net::ERR_CONNECTION_REFUSED')
  if (!isChunkError) return
  const reloadKey = 'invify_chunk_reload'
  if (sessionStorage.getItem(reloadKey) === '1') {
    console.warn('[Router] Chunk load failed after one reload. Staying put so the page can recover.', error)
    return
  }
  sessionStorage.setItem(reloadKey, '1')
  console.warn('[Router] Dynamic module chunk loading failed. Reloading once...', error)
  window.location.reload()
})

export default router
