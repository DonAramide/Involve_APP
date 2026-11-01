import {
  emptyProviderRegistrationForm,
  isProviderAssignable,
  providerChannelLabel,
  providerGovernanceLabel,
  providerStatusColor,
  REGISTRATION_CHANNEL_OPTIONS
} from '../src/hmo/providerLifecycle'

describe('provider lifecycle helpers', () => {
  test('maps integration_status to governance labels', () => {
    expect(providerGovernanceLabel('none')).toBe('DRAFT')
    expect(providerGovernanceLabel('pending_verification')).toBe('PENDING_APPROVAL')
    expect(providerGovernanceLabel('verified')).toBe('ACTIVE')
    expect(providerGovernanceLabel('rejected')).toBe('REJECTED')
    expect(providerGovernanceLabel('suspended')).toBe('SUSPENDED')
  })

  test('only verified providers are assignable', () => {
    expect(isProviderAssignable('verified')).toBe(true)
    expect(isProviderAssignable('pending_verification')).toBe(false)
    expect(isProviderAssignable('suspended')).toBe(false)
    expect(isProviderAssignable('rejected')).toBe(false)
  })

  test('registration form defaults are empty and safe', () => {
    const form = emptyProviderRegistrationForm()
    expect(form.displayName).toBe('')
    expect(form.regulatorType).toBe('NHIA')
    expect(form.registrationChannel).toBe('platform')
    expect(form.logoImage).toBe('')
  })

  test('registration channel labels cover platform self-service and agent', () => {
    expect(providerChannelLabel('platform')).toBe('Platform')
    expect(providerChannelLabel('self_service')).toBe('Self-service')
    expect(providerChannelLabel('agent')).toBe('Agent / institute')
    expect(REGISTRATION_CHANNEL_OPTIONS.map((o) => o.value)).toEqual([
      'platform',
      'self_service',
      'agent'
    ])
  })

  test('status colors are defined for known statuses', () => {
    expect(providerStatusColor('verified')).toBeTruthy()
    expect(providerStatusColor('suspended')).toBeTruthy()
  })
})
