/**
 * Phase 1.1 — permission-sensitive finance / user-admin gates (unit).
 */
import { permissionsForOperatorRole, TENANT_WORKSPACE_PERMISSIONS } from '../src/utils/operatorPermissions'

describe('permission-sensitive finance and user administration', () => {
  test('tenant workspace includes user management and reporting capabilities', () => {
    expect(TENANT_WORKSPACE_PERMISSIONS).toEqual(
      expect.arrayContaining([
        'tenant.users.manage',
        'tenant.reports.view',
        'tenant.ledger.view',
        'tenant.settlement.view',
        'tenant.payout.create',
      ]),
    )
  })

  test('ADMIN_TREASURY cannot reverse billing payments or manage HMO fees', () => {
    const perms = permissionsForOperatorRole('ADMIN_TREASURY')
    expect(perms).toContain('billing.view')
    expect(perms).toContain('read_finance')
    expect(perms).not.toContain('billing.reverse_payment')
    expect(perms).not.toContain('platform.hmo_fees.approve')
    expect(perms).not.toContain('WITHDRAWAL_APPROVE')
  })

  test('ADMIN_FINANCE can post billing payments but not approve platform withdrawals', () => {
    const perms = permissionsForOperatorRole('ADMIN_FINANCE')
    expect(perms).toContain('billing.post_payment')
    expect(perms).toContain('approve_finance')
    expect(perms).not.toContain('platform.withdrawals.approve')
    expect(perms).not.toContain('admin_deploy')
  })

  test('cashier tenant alias currently receives full workspace permissions including payout (documented gap)', () => {
    // Current source maps CASHIER → TENANT_WORKSPACE_PERMISSIONS (same as owner/admin).
    // Do not invent a narrower cashier policy here; Product must approve any restriction.
    const perms = permissionsForOperatorRole('cashier')
    expect(perms).toEqual(TENANT_WORKSPACE_PERMISSIONS)
    expect(perms).toContain('tenant.payout.create')
    expect(perms).toContain('tenant.bank_accounts.manage')
    expect(perms).not.toContain('billing.reverse_payment')
  })
})
