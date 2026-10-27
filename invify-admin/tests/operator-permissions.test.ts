import { permissionsForOperatorRole, TENANT_WORKSPACE_PERMISSIONS } from '../src/utils/operatorPermissions'
import { homePathForRole } from '../src/utils/authLoginPaths'

describe('tenant operator route permissions', () => {
  test('tenant_admin can open the tenant dashboard', () => {
    const perms = permissionsForOperatorRole('tenant_admin')
    expect(perms).toContain('tenant.dashboard.view')
    expect(homePathForRole('tenant_admin')).toBe('/tenant/dashboard')
  })

  test('owner and tenant_admin share workspace capabilities', () => {
    expect(permissionsForOperatorRole('owner')).toEqual(TENANT_WORKSPACE_PERMISSIONS)
    expect(permissionsForOperatorRole('TENANT_ADMIN')).toContain('tenant.dashboard.view')
  })

  test('super admin can open the HMO shell without implicit cross-tenant health grants', () => {
    const perms = permissionsForOperatorRole('SUPER_ADMIN')
    expect(perms).toContain('hmo.workspace')
    expect(perms).not.toContain('platform.integration.health')
    expect(perms).not.toContain('platform.providers.manage')
    expect(perms).not.toContain('platform.plans.manage')
    expect(perms).not.toContain('platform.tenant_access')
    expect(permissionsForOperatorRole('tenant_admin')).not.toContain('hmo.workspace')
  })

  test('unknown tenant roles do not fall back to super-admin-only claims', () => {
    expect(permissionsForOperatorRole('cashier')).toContain('tenant.dashboard.view')
    expect(permissionsForOperatorRole('cashier')).not.toContain('admin_deploy')
  })
})
