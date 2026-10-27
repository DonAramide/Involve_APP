import fs from 'fs'
import path from 'path'
import { resolveInstituteQuickAction } from '../src/pages/agent/instituteQuickActions'

describe('institute dashboard quick actions', () => {
  const cards = [
    { label: 'Create Lead', route: '/agent/coming-soon/create-lead', expect: '/institute/leads' },
    { label: 'Upload KYC', route: '/agent/coming-soon/upload-kyc', expect: '/institute/profile' },
    { label: 'Assign Device', route: '/agent/coming-soon/assign-device', expect: '/institute/assign-device' },
    { label: 'Assign Terminal', route: '/agent/coming-soon/assign-terminal', expect: '/institute/assign-terminal' },
    { label: 'Request Withdrawal', route: '/agent/coming-soon/request-withdrawal', expect: '/institute/wallet' },
    { label: 'Support Ticket', route: '/agent/coming-soon/support-ticket', expect: '/institute/support' }
  ]

  test('the six dashboard cards do not open the coming-soon placeholder', () => {
    cards.forEach((card) => {
      const destination = resolveInstituteQuickAction(card)
      const path = typeof destination === 'string' ? destination : destination.path
      expect(path).toBe(card.expect)
      expect(path).not.toContain('coming-soon')
    })
    expect(resolveInstituteQuickAction({ label: 'Upload KYC', route: '' })).toEqual({
      path: '/institute/profile',
      query: { tab: 'kyc' }
    })
  })

  test('the dashboard and API payload no longer point those cards at coming-soon', () => {
    const page = fs.readFileSync(path.join(__dirname, '../src/pages/agent/AgentDashboardPage.vue'), 'utf8')
    const controller = fs.readFileSync(path.join(__dirname, '../../invify-backend/src/modules/agent-portal/agent.controller.ts'), 'utf8')
    const hold = fs.readFileSync(path.join(__dirname, '../src/pages/agent/InstituteAssignmentHoldPage.vue'), 'utf8')
    expect(page).toContain('openQuickAction')
    expect(page).not.toContain("$router.push(action.route)")
    expect(page).not.toContain('hardwareModal.open')
    expect(controller).not.toContain('/agent/coming-soon/')
    expect(hold).toContain('does not save an assignment')
    expect(hold).not.toContain('/agent/hardware/assign')
  })
})
