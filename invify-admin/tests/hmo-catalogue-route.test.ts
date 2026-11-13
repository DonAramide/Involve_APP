import { createMemoryHistory, createRouter } from 'vue-router'
import { registerAuthBootstrapGuard } from '../src/router/AuthBootstrapGuard'
import routes from '../src/router/routes.js'
import { isPlatformShellPath } from '../src/utils/platformShellPaths'
import { permissionsForOperatorRole } from '../src/utils/operatorPermissions'

const store: Record<string, string> = {}
const sessionStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key: string, value: string) => {
    store[key] = String(value)
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    Object.keys(store).forEach((key) => delete store[key])
  }
}

const sessionStorageMock = {
  getItem: (key: string) =>
    Object.prototype.hasOwnProperty.call(sessionStore, key) ? sessionStore[key] : null,
  setItem: (key: string, value: string) => {
    sessionStore[key] = String(value)
  },
  removeItem: (key: string) => {
    delete sessionStore[key]
  },
  clear: () => {
    Object.keys(sessionStore).forEach((key) => delete sessionStore[key])
  }
}

Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, configurable: true })

const Dummy = { name: 'Dummy', render: () => null }

function stubComponents(records: any[]): any[] {
  return records.map((record) => {
    const next: any = { ...record }
    if (typeof record.component === 'function' || record.component) {
      next.component = Dummy
    }
    if (Array.isArray(record.children)) {
      next.children = stubComponents(record.children)
    }
    return next
  })
}

function createGuardedRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: stubComponents(routes)
  })
  registerAuthBootstrapGuard(router)
  return router
}

describe('HMO catalogue route registration', () => {
  test('the live route table registers /hmo/catalogue behind hmo.workspace', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: stubComponents(routes)
    })
    const resolved = router.resolve('/hmo/catalogue')
    expect(resolved.matched.length).toBeGreaterThan(0)
    expect(resolved.name).toBe('hmoCatalogue')
    expect(resolved.meta.requiresAuth).toBe(true)
    expect(resolved.meta.permission).toBe('hmo.workspace')
    expect(resolved.matched.some((record) => record.path.includes('hmo/catalogue'))).toBe(true)
    expect(resolved.matched.some((record) => String(record.name || '').includes('catchAll') || record.path.includes('catchAll'))).toBe(false)
  })

  test('/hmo is a platform shell path and login return-to keeps the catalogue URL', () => {
    expect(isPlatformShellPath('/hmo/catalogue')).toBe(true)
    expect(permissionsForOperatorRole('SUPER_ADMIN')).toContain('hmo.workspace')
    expect(permissionsForOperatorRole('SUPER_ADMIN')).not.toContain('platform.plans.manage')
    expect(permissionsForOperatorRole('tenant_admin')).not.toContain('hmo.workspace')
    expect(permissionsForOperatorRole('ADMIN_OPS')).not.toContain('hmo.workspace')
  })
})

describe('HMO catalogue auth bootstrap', () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
  })

  test('unauthenticated visitors are sent to Super Admin login with redirect', async () => {
    const router = createGuardedRouter()
    await router.push('/hmo/catalogue')
    expect(router.currentRoute.value.path).toBe('/admin/login')
    expect(router.currentRoute.value.query.redirect).toBe('/hmo/catalogue')
  })

  test('unauthenticated visitors do not land on the generic 404 for unmatched HMO paths', async () => {
    const router = createGuardedRouter()
    await router.push('/hmo/not-a-registered-section')
    expect(router.currentRoute.value.path).toBe('/admin/login')
    expect(router.currentRoute.value.query.redirect).toBe('/hmo/not-a-registered-section')
    expect(router.currentRoute.value.matched.some((record) => record.path.includes('ErrorNotFound') || record.path.includes('catchAll'))).toBe(false)
  })

  test('tenant operators are kept off the platform catalogue shell', async () => {
    localStorage.setItem('invify_token', 'tenant-session')
    localStorage.setItem('operator_role', 'tenant_admin')
    const router = createGuardedRouter()
    await router.push('/hmo/catalogue')
    expect(router.currentRoute.value.path).toBe('/tenant/dashboard')
  })

  test('platform operators without hmo.workspace cannot open the catalogue shell', async () => {
    localStorage.setItem('invify_token', 'ops-session')
    localStorage.setItem('operator_role', 'ADMIN_OPS')
    const router = createGuardedRouter()
    await router.push('/hmo/catalogue')
    expect(router.currentRoute.value.path).toBe('/fleet/overview')
  })

  test('authorized Super Admin reaches the catalogue route without dropping permission meta', async () => {
    localStorage.setItem('invify_token', 'super-session')
    localStorage.setItem('operator_role', 'SUPER_ADMIN')
    const router = createGuardedRouter()
    await router.push('/hmo/catalogue')
    expect(router.currentRoute.value.path).toBe('/hmo/catalogue')
    expect(router.currentRoute.value.meta.permission).toBe('hmo.workspace')
    expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
  })
})
