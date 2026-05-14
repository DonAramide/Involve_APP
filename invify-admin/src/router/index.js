// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { registerAuthBootstrapGuard } from './AuthBootstrapGuard'

const router = createRouter({
  history: createWebHistory(),
  routes
})

// FINAL REFINEMENT #2: Inject primary authentication bootstrap gates natively
registerAuthBootstrapGuard(router)

export default router
